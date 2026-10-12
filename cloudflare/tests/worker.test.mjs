import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';
import worker from '../worker.mjs';
const password = 'SunReminder-local-test-only-2026';
const origin = 'https://sunreminder.test';
let mf, db;
before(async () => {
  mf = new Miniflare({ cf: false, workers: [{ name: 'sunreminder', modules: true, modulesRules: [{type:'ESModule',include:['**/*.js'],fallthrough:true}], scriptPath: fileURLToPath(new URL('../../.wrangler/test-worker.mjs', import.meta.url)),
    compatibilityDate: '2026-08-01', d1Databases: { DB: 'test-statistics' }, durableObjects:{REMINDERS:{className:'ReminderScheduler',useSQLite:true}}, bindings: { SUN_ADMIN_PASSWORD: password },
    serviceBindings: { ASSETS: async request => {
      try { return new Response(await readFile(new URL('../public' + new URL(request.url).pathname, import.meta.url))); }
      catch { return new Response('Not found', { status: 404 }); }
    } }
  }] });
  await mf.dispatchFetch(origin + '/api/admin/stats');
  db = await mf.getD1Database('DB');
});
after(async () => { await mf?.dispose(); });
beforeEach(async () => { await db.batch(['admin_transfers','usage_daily','participant_profiles','daily','participants','admin_sessions','user_sessions','user_accounts','request_limits'].map(table => db.prepare('DELETE FROM ' + table))); });
const device = () => ({ id: 'p_' + randomBytes(16).toString('hex'), token: randomBytes(32).toString('hex') });
const day = (count = 1, outdoor = false, date = '2026-01-02') => ({ day: date, breakCount: count, restSeconds: count * 20, outdoor });
function post(path, data, headers = {}) {
  return mf.dispatchFetch(origin + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...headers }, body: JSON.stringify(data) });
}
const upload = (d, revision = 1, days = [day()]) => post('/api/sync', { participantId: d.id, source: 'web', revision, consentVersion: 'group4-stats-v1', days }, { Authorization: 'Bearer ' + d.token });
const withdraw = d => post('/api/withdraw', { participantId: d.id }, { Authorization: 'Bearer ' + d.token });
async function login() {
  const response = await post('/api/admin/login', { username: 'group4', password });
  assert.equal(response.status, 200, await response.clone().text());
  assert.match(response.headers.get('Set-Cookie'), /HttpOnly; SameSite=Strict; Path=\/api\/admin/);
  assert.match(response.headers.get('Set-Cookie'), /Secure/);
  assert.match(response.headers.get('Set-Cookie'),/Max-Age=0/);return (await response.json()).sessionToken;
}
async function report(cookie, range = '') {
  const response = await mf.dispatchFetch(origin + '/api/admin/stats' + range, { headers: { Authorization: 'Bearer ' + cookie } });
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}

test('static app and admin are served; generated package excludes private/server files', async () => {
  const publicFiles = await readdir(new URL('../public/', import.meta.url));
  assert.equal(publicFiles.length, 25);
  assert.ok(!publicFiles.some(name => /backend|server|password|sqlite/.test(name)));
  const app = await mf.dispatchFetch(origin + '/');
  assert.equal(app.status, 200); assert.match(await app.text(), /SunReminder/);
  const admin = await mf.dispatchFetch(origin + '/admin');
  assert.equal(admin.status, 200); assert.equal(admin.headers.get('Cache-Control'), 'no-store');
  for (const path of ['/server-data/ADMIN-LOGIN.txt','/backend.mjs','/recovery-backend.mjs','/setup-admin.mjs','/.env','/schema.mjs']) assert.equal((await mf.dispatchFetch(origin + path)).status, 404);
  const config = await (await mf.dispatchFetch(origin + '/api/config')).json();
  assert.equal(config.enabled, true);
  const unavailable = await worker.fetch(new Request(origin + '/api/config'), {});
  assert.equal((await unavailable.json()).enabled, false);
  assert.equal((await worker.fetch(new Request(origin + '/api/admin/stats'), {})).status, 503);
});

test('admin requires same-origin login; logout and secret rotation invalidate sessions', async () => {
  assert.equal((await mf.dispatchFetch(origin + '/api/admin/stats')).status, 401);
  assert.equal((await post('/api/admin/login', { username: 'group4', password }, { Origin: 'https://other.test' })).status, 403);
  assert.equal((await post('/api/admin/login', { username: 'group4', password: 'incorrect' })).status, 401);
  const cookie = await login();
  assert.equal((await report(cookie)).totals.breakCount, 0);
  const changedSecret = await worker.fetch(new Request(origin + '/api/admin/stats', { headers: { Authorization: 'Bearer ' + cookie } }), { DB: db, SUN_ADMIN_PASSWORD: 'Different-local-test-password-2026' });
  assert.equal(changedSecret.status, 401);
  assert.equal((await post('/api/admin/logout', {}, { Authorization: 'Bearer ' + cookie })).status, 200);
  assert.equal((await mf.dispatchFetch(origin + '/api/admin/stats', { headers: { Authorization: 'Bearer ' + cookie } })).status, 401);
});

test('eye-rest, device days, outdoor and CSV agree, including date filtering', async () => {
  const a = device(), b = device();
  assert.equal((await upload(a, 1, [day(2, true), day(0, true, '2026-01-03')])).status, 200);
  assert.equal((await upload(b)).status, 200);
  const cookie = await login(), data = await report(cookie);
  assert.deepEqual(data.totals, { breakCount: 3, restSeconds: 60, outdoorCheckins: 2, activeDeviceDays: 3, activeCalendarDays: 2, activeDevices: 2, usageSeconds: 0 });
  assert.equal((await report(cookie, '?from=2026-01-03&to=2026-01-03')).totals.outdoorCheckins, 1);
  const csv = await mf.dispatchFetch(origin + '/api/admin/export', { headers: { Authorization: 'Bearer ' + cookie } });
  assert.equal(csv.status, 200); assert.equal(csv.headers.get('Cache-Control'), 'no-store');
  assert.match(await csv.text(), /2026-01-02,2,40,1/);
  assert.equal((await mf.dispatchFetch(origin + '/api/admin/stats?from=2026-02-30', { headers: { Authorization: 'Bearer ' + cookie } })).status, 400);
});

test('retries, stale revisions and concurrent snapshots do not double count or overwrite newer data', async () => {
  const a = device();
  assert.equal((await upload(a)).status, 200);
  assert.equal((await upload(a)).status, 200);
  const racing = await Promise.all([upload(a, 3, [day(3)]), upload(a, 2, [day(2)])]);
  assert.ok(racing.every(r => r.status === 200));
  assert.equal((await upload(a, 1, [day(9)])).status, 200);
  const cookie = await login();
  assert.equal((await report(cookie)).totals.breakCount, 3);
  assert.equal((await db.prepare('SELECT revision FROM participants WHERE id=?').bind(a.id).first()).revision, 3);
});

test('racing registrations and forged tokens cannot edit or delete another participant', async () => {
  const a = device(), b = { id: a.id, token: device().token };
  const statuses = (await Promise.all([upload(a), upload(b)])).map(r => r.status).sort();
  assert.deepEqual(statuses, [200, 401]);
  const loser = (await upload(a, 2)).status === 401 ? a : b;
  assert.equal((await withdraw(loser)).status, 401);
  const cookie = await login(); assert.equal((await report(cookie)).totals.breakCount, 1);
});

test('withdrawal survives in-flight and late snapshots; unknown withdrawal leaves a tombstone', async () => {
  const a = device(); await upload(a);
  const racing = await Promise.all([upload(a, 2, [day(2)]), withdraw(a)]);
  assert.equal(racing[1].status, 200);
  assert.equal((await upload(a, 3)).status, 410);
  assert.equal((await withdraw(a)).status, 200);
  const cookie = await login(); assert.equal((await report(cookie)).registeredDevices, 0);
  const unknown = device(); assert.equal((await withdraw(unknown)).status, 200);
  assert.equal((await upload(unknown)).status, 410);
});

test('invalid input never replaces saved history; empty snapshot clears only remote history', async () => {
  const a = device(); await upload(a);
  assert.equal((await upload(a, 2, [day(), day()])).status, 400);
  assert.equal((await upload(a, 2, [{ ...day(), restSeconds: 1 }])).status, 400);
  const cookie = await login(); assert.equal((await report(cookie)).totals.breakCount, 1);
  assert.equal((await upload(a, 2, [])).status, 200);
  const cleared = await report(cookie); assert.equal(cleared.totals.breakCount, 0); assert.equal(cleared.registeredDevices, 1);
});

test('unchanged daily records are not rewritten; malformed content and oversized bodies are rejected', async () => {
  const a = device(); await upload(a);
  await db.prepare('CREATE TABLE audit(count INTEGER)').run();
  await db.prepare('INSERT INTO audit VALUES(0)').run();
  await db.prepare('CREATE TRIGGER daily_update_audit AFTER UPDATE ON daily BEGIN UPDATE audit SET count=count+1; END').run();
  await upload(a, 2);
  assert.equal((await db.prepare('SELECT count FROM audit').first()).count, 0);
  await upload(a, 3, [day(2)]);
  assert.equal((await db.prepare('SELECT count FROM audit').first()).count, 1);
  await db.prepare('DROP TRIGGER daily_update_audit').run(); await db.prepare('DROP TABLE audit').run();
  assert.equal((await post('/api/sync', { padding: 'x'.repeat(513 * 1024) })).status, 413);
  assert.equal((await mf.dispatchFetch(origin + '/api/sync', { method: 'POST', body: 'invalid' })).status, 415);
});

test('login guessing is limited across requests in durable storage', async () => {
  let status;
  for (let i = 0; i < 11; i++) status = (await post('/api/admin/login', { username: 'group4', password: 'incorrect' })).status;
  assert.equal(status, 429);
});

import {featureContract} from '../../web/tests/features-contract.mjs';
test('optional accounts, consented profiles, removal and legacy data work on D1',async()=>{
 const adminToken=await login();
 const call=(route,{body,token,headers={}}={})=>mf.dispatchFetch(origin+route,{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 await featureContract(call,adminToken);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM participant_profiles').first()).n,0);
 const stored=await db.prepare('SELECT password_hash,salt FROM user_accounts').first();assert.equal(stored.password_hash.length,64);assert.notEqual(stored.password_hash,'Test-only-passphrase-2026');
});
test('admin expiry is enforced on the server even with an active tab',async()=>{const token=await login();await db.prepare('UPDATE admin_sessions SET expires=?').bind(Date.now()-1).run();assert.equal((await mf.dispatchFetch(origin+'/api/admin/stats',{headers:{Authorization:'Bearer '+token}})).status,401);});

test('racing profile updates cannot restore an older location or withdrawn metadata',async()=>{
 const d=device(),time=new Date().toISOString(),profile={deviceName:'New name',location:{latitude:10,longitude:106,accuracy:25,capturedAt:time},consentedAt:time};
 const send=(revision,value)=>post('/api/sync',{participantId:d.id,source:'web',consentVersion:'group4-stats-v1',revision,days:[day()],profileConsentVersion:'group4-profile-v1',profile:value},{Authorization:'Bearer '+d.token});
 await upload(d);const results=await Promise.all([send(3,null),send(2,profile)]);assert.ok(results.every(r=>r.status===200));assert.equal((await report(await login())).participants[0].location,null);
 await Promise.all([send(4,profile),withdraw(d)]);assert.equal((await db.prepare('SELECT COUNT(*) n FROM participant_profiles').first()).n,0);
});

import {unifiedContract,usageContract} from '../../web/tests/new-features-contract.mjs';
const newCall=(route,{body,token,headers={}}={})=>mf.dispatchFetch(origin+route,{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
test('single login routes by role and dashboard transfer is single-use on D1',async()=>{await unifiedContract(newCall,password);});
test('consented usage totals, date filters, CSV and withdrawal work on D1',async()=>{await usageContract(newCall,await login());assert.equal((await db.prepare('SELECT COUNT(*) n FROM usage_daily').first()).n,0);});
test('expired dashboard transfer cannot sign in',async()=>{const r=await post('/api/login',{username:'group4',password});const cookie=r.headers.get('set-cookie').split(';')[0];await db.prepare('UPDATE admin_transfers SET expires=?').bind(Date.now()-1).run();assert.equal((await post('/api/admin/claim',{}, {Cookie:cookie})).status,401);});


test('push configuration exposes only the public key and schedules/cancels with origin and token checks',async()=>{
 const config=await(await mf.dispatchFetch(origin+'/api/config')).json();assert.equal(config.backgroundPush,true);
 const key=await(await mf.dispatchFetch(origin+'/api/push/key')).json();assert.deepEqual(Object.keys(key),['publicKey']);assert.match(key.publicKey,/^[A-Za-z0-9_-]{87}$/);
 const again=await(await mf.dispatchFetch(origin+'/api/push/key')).json();assert.equal(again.publicKey,key.publicKey);
 const token=randomBytes(32).toString('hex'),headers={Authorization:'Bearer '+token};
 assert.equal((await post('/api/push/schedule',{revision:1,task:null})).status,401);
 assert.equal((await post('/api/push/schedule',{revision:1,task:null},{...headers,Origin:'https://evil.test'})).status,403);
 const subscription={endpoint:'https://fcm.googleapis.com/no-send-test',keys:{p256dh:key.publicKey,auth:randomBytes(16).toString('base64url')}};
 const scheduled=await post('/api/push/schedule',{revision:1,task:{id:crypto.randomUUID(),kind:'due',deadline:Date.now()+3600000,sound:false},subscription},headers);
 assert.equal(scheduled.status,200,await scheduled.clone().text());assert.equal((await scheduled.json()).scheduled,true);
 const cancel=await post('/api/push/schedule',{revision:2,task:null},headers);assert.equal(cancel.status,200);assert.equal((await cancel.json()).scheduled,false);
 const stale=await post('/api/push/schedule',{revision:1,task:null},headers);assert.equal((await stale.json()).stale,true);
});

test('recovery endpoints enforce origin and disclose missing mail configuration without sending',async()=>{assert.equal((await(await mf.dispatchFetch(origin+'/api/config')).json()).emailRecovery,false);assert.equal((await post('/api/user/recovery/request',{username:'member',email:'member@example.test'},{Origin:'https://other.test'})).status,403);const response=await post('/api/user/recovery/request',{username:'member',email:'member@example.test'});assert.equal(response.status,503);assert.match((await response.json()).error,/chưa bật/);assert.equal((await post('/api/user/recovery/status',{})).status,401);});
