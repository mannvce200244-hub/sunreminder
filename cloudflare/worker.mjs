export { ReminderScheduler } from './reminders.mjs';
import { validateReminder } from './reminders.mjs';
import { USAGE_CONSENT_VERSION, usageFromPayload, addUsageReport, EXPORT_SQL } from '../web/usage.js';
import { recoveryApi,recoveryMailer } from '../web/recovery-backend.mjs';
import { accountApi } from '../web/accounts-backend.mjs';
import { PROFILE_CONSENT_VERSION, profileFromPayload, withProfile, PROFILE_CSV_HEADER, profileCsv } from '../web/profile.js';
import { ensureSchema } from './schema.mjs';

const CONSENT_VERSION = 'group4-stats-v1';
const encoder = new TextEncoder();
const allowedAssets = new Set(['index.html','app.js','engine.js','data.js','analytics.js','sharing.js','profile.js','profile-ui.js','user-account.js','recovery-ui.js','usage.js','background.js','notification-store.js','admin-session.js','admin-data.js','styles.css','sw.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png','admin.html','admin.js','admin.css']);
const failure = (status, message) => Object.assign(new Error(message), { status });
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const hash = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
});
function secure(response, url) {
  const result = new Response(response.body, response);
  result.headers.set('X-Content-Type-Options', 'nosniff');
  result.headers.set('Referrer-Policy', 'same-origin');
  result.headers.set('X-Frame-Options', 'DENY');
  result.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  if (url.protocol === 'https:') result.headers.set('Strict-Transport-Security', 'max-age=31536000');
  return result;
}
async function body(request) {
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) throw failure(415, 'Cần định dạng JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw failure(400, 'Thiếu dữ liệu.');
  const chunks = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 512 * 1024) { await reader.cancel(); throw failure(413, 'Dữ liệu vượt giới hạn.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw failure(400, 'JSON không hợp lệ.'); }
}
function validDay(day) {
  return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
}
function validateSnapshot(value) {
  if (!value || value.consentVersion !== CONSENT_VERSION || !['web', 'windows'].includes(value.source) || !Number.isSafeInteger(value.revision) || value.revision < 1 || !Array.isArray(value.days) || value.days.length > 4000) throw failure(400, 'Gói thống kê không hợp lệ.');
  const seen = new Set(), tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  for (const d of value.days) {
    if (!d || !validDay(d.day) || d.day < '2000-01-01' || d.day > tomorrow || seen.has(d.day) || !Number.isInteger(d.breakCount) || d.breakCount < 0 || d.breakCount > 4320 || !Number.isInteger(d.restSeconds) || d.restSeconds < d.breakCount * 20 || d.restSeconds > d.breakCount * 120 || d.restSeconds > 86400 || typeof d.outdoor !== 'boolean' || (!d.breakCount && !d.outdoor)) throw failure(400, 'Số liệu theo ngày không hợp lệ.');
    seen.add(d.day);
  }
}
async function rate(db, key, maximum, windowMs) {
  const now = Date.now();
  const row = await db.prepare(`INSERT INTO request_limits(key,count,expires) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<=? THEN 1 ELSE count+1 END,
    expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END RETURNING count`).bind(key, now + windowMs, now, now).first();
  if (row.count > maximum) throw failure(429, 'Quá nhiều yêu cầu. Vui lòng thử lại sau.');
}
function cookie(value, url, expires = 28800) {
  return `sun_admin=${value}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${expires}${url.protocol === 'https:' ? '; Secure' : ''}`;
}
async function admin(request, env) {
  const token = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64}\.[a-f0-9]{64})$/)?.[1];
  if (!token || !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token)) throw failure(401, 'Vui lòng đăng nhập quản trị.');
  const [nonce, mac] = token.split('.');
  // Changing the secret invalidates every session, including sessions held by another isolate.
  if (!equal(mac, await sign('admin-v2:' + nonce, env.SUN_ADMIN_PASSWORD))) throw failure(401, 'Vui lòng đăng nhập quản trị.');
  const digest = await hash(token);
  const session = await env.DB.prepare('SELECT expires FROM admin_sessions WHERE token_hash=?').bind(digest).first();
  if (!session || session.expires <= Date.now()) throw failure(401, 'Vui lòng đăng nhập quản trị.');
  return digest;
}
function dateRange(url) {
  const from = url.searchParams.get('from') || '2000-01-01', to = url.searchParams.get('to') || '9999-12-31';
  if (!validDay(from) || !validDay(to) || from > to) throw failure(400, 'Khoảng ngày không hợp lệ.');
  return [from, to];
}
async function report(db, from, to) {
  const result = await db.batch([
    db.prepare(`SELECT COALESCE(SUM(break_count),0) breakCount,COALESCE(SUM(rest_seconds),0) restSeconds,
      COALESCE(SUM(outdoor),0) outdoorCheckins,COUNT(*) activeDeviceDays,COUNT(DISTINCT day) activeCalendarDays,
      COUNT(DISTINCT participant_id) activeDevices FROM daily WHERE day BETWEEN ? AND ?`).bind(from, to),
    db.prepare(`SELECT p.id,p.source,p.updated_at updatedAt,pr.profile_json,COALESCE(SUM(d.break_count),0) breakCount,
      COALESCE(SUM(d.rest_seconds),0) restSeconds,COALESCE(SUM(d.outdoor),0) outdoorCheckins,COUNT(d.day) activeDays
      FROM participants p LEFT JOIN daily d ON p.id=d.participant_id AND d.day BETWEEN ? AND ?
      LEFT JOIN participant_profiles pr ON pr.participant_id=p.id WHERE p.deleted=0 GROUP BY p.id ORDER BY p.updated_at DESC LIMIT 10000`).bind(from, to),
    db.prepare(`SELECT day,SUM(break_count) breakCount,SUM(outdoor) outdoorCheckins,COUNT(*) activeDevices
      FROM daily WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day`).bind(from, to),
    db.prepare('SELECT participant_id,day,seconds FROM usage_daily WHERE day BETWEEN ? AND ?').bind(from,to)
  ]);
  return addUsageReport({ totals: result[0].results[0], participants: result[1].results.map(withProfile), days: result[2].results,
    registeredDevices: result[1].results.length, generatedAt: new Date().toISOString(), from, to },result[3].results);
}
async function participant(request, value) {
  const id = value?.participantId, token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (typeof id !== 'string' || !/^p_[a-f0-9]{32}$/.test(id) || !token || !/^[a-f0-9]{64}$/.test(token)) throw failure(401, 'Thông tin thiết bị không hợp lệ.');
  return { id, tokenHash: await hash(token) };
}
async function sync(request, env, url, ipKey) {
  const value = await body(request), { id, tokenHash } = await participant(request, value), db = env.DB;
  const previous = await db.prepare('SELECT token_hash,deleted,revision FROM participants WHERE id=?').bind(id).first();
  if (previous && !equal(previous.token_hash, tokenHash)) throw failure(401, 'Không có quyền với thiết bị này.');
  await rate(db, 'device:' + id, 120, 60000);
  if (!previous) await rate(db, 'register:' + ipKey, 30, 3600000);
  const now = new Date().toISOString();
  if (url.pathname === '/api/withdraw') {
    // Guard every write inside one D1 transaction; a racing upload cannot resurrect withdrawn data.
    const results = await db.batch([
      db.prepare(`INSERT INTO participants(id,token_hash,source,consent_version,consented_at,updated_at,deleted)
        SELECT ?,?,'web',?,?,?,1 WHERE (SELECT COUNT(*) FROM participants)<10000 OR EXISTS(SELECT 1 FROM participants WHERE id=?)
        ON CONFLICT(id) DO UPDATE SET deleted=1,updated_at=excluded.updated_at WHERE token_hash=excluded.token_hash`).bind(id, tokenHash, CONSENT_VERSION, now, now, id),
      db.prepare(`DELETE FROM daily WHERE participant_id=? AND EXISTS(SELECT 1 FROM participants WHERE id=? AND token_hash=? AND deleted=1)`).bind(id, id, tokenHash),
      db.prepare('DELETE FROM participant_profiles WHERE participant_id=? AND EXISTS(SELECT 1 FROM participants WHERE id=? AND token_hash=? AND deleted=1)').bind(id,id,tokenHash),
      db.prepare('DELETE FROM usage_daily WHERE participant_id=? AND EXISTS(SELECT 1 FROM participants WHERE id=? AND token_hash=? AND deleted=1)').bind(id,id,tokenHash),
      db.prepare('SELECT token_hash,deleted FROM participants WHERE id=?').bind(id)
    ]);
    const saved = results.at(-1).results[0];
    if (!saved) throw failure(503, 'Máy chủ đã đạt giới hạn thiết bị.');
    if (!equal(saved.token_hash, tokenHash)) throw failure(401, 'Không có quyền với thiết bị này.');
    return json({ ok: true, deleted: true });
  }
  validateSnapshot(value);
  const profile=profileFromPayload(value),usage=usageFromPayload(value);
  if (previous?.deleted) throw failure(410, 'Thiết bị đã rút chia sẻ. Cần đồng ý lại để tham gia bằng mã mới.');
  const uploadId = random(), days = JSON.stringify(value.days);
  const results = await db.batch([
    db.prepare(`INSERT INTO participants(id,token_hash,source,consent_version,consented_at,updated_at,revision,upload_id)
      SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM participants)<10000 OR EXISTS(SELECT 1 FROM participants WHERE id=?)
      ON CONFLICT(id) DO UPDATE SET source=excluded.source,updated_at=excluded.updated_at,revision=excluded.revision,upload_id=excluded.upload_id
      WHERE token_hash=excluded.token_hash AND deleted=0 AND revision<excluded.revision`).bind(id, tokenHash, value.source, CONSENT_VERSION, now, now, value.revision, uploadId, id),
    db.prepare(`DELETE FROM daily WHERE participant_id=? AND EXISTS(SELECT 1 FROM participants WHERE id=? AND upload_id=? AND deleted=0)
      AND day NOT IN(SELECT json_extract(value,'$.day') FROM json_each(?))`).bind(id, id, uploadId, days),
    // Keep unchanged rows instead of rewriting the entire history, reducing free-tier write usage.
    db.prepare(`INSERT INTO daily(participant_id,day,break_count,rest_seconds,outdoor)
      SELECT ?,json_extract(value,'$.day'),json_extract(value,'$.breakCount'),json_extract(value,'$.restSeconds'),json_extract(value,'$.outdoor')
      FROM json_each(?) WHERE EXISTS(SELECT 1 FROM participants WHERE id=? AND upload_id=? AND deleted=0)
      ON CONFLICT(participant_id,day) DO UPDATE SET break_count=excluded.break_count,rest_seconds=excluded.rest_seconds,outdoor=excluded.outdoor
      WHERE break_count!=excluded.break_count OR rest_seconds!=excluded.rest_seconds OR outdoor!=excluded.outdoor`).bind(id, days, id, uploadId),
    ...(profile===undefined?[]:profile===null?[
      db.prepare('DELETE FROM participant_profiles WHERE participant_id=? AND EXISTS(SELECT 1 FROM participants WHERE id=? AND upload_id=? AND deleted=0)').bind(id,id,uploadId)
    ]:[db.prepare('INSERT INTO participant_profiles(participant_id,profile_json) SELECT ?,? WHERE EXISTS(SELECT 1 FROM participants WHERE id=? AND upload_id=? AND deleted=0) ON CONFLICT(participant_id) DO UPDATE SET profile_json=excluded.profile_json').bind(id,JSON.stringify(profile),id,uploadId)]),
    ...(usage===undefined?[]:[
      db.prepare("DELETE FROM usage_daily WHERE participant_id=? AND EXISTS(SELECT 1 FROM participants WHERE id=? AND upload_id=? AND deleted=0) AND day NOT IN (SELECT json_extract(value,'$.day') FROM json_each(?))").bind(id,id,uploadId,JSON.stringify(usage)),
      db.prepare("INSERT INTO usage_daily(participant_id,day,seconds) SELECT ?,json_extract(value,'$.day'),json_extract(value,'$.seconds') FROM json_each(?) WHERE EXISTS(SELECT 1 FROM participants WHERE id=? AND upload_id=? AND deleted=0) ON CONFLICT(participant_id,day) DO UPDATE SET seconds=excluded.seconds WHERE seconds!=excluded.seconds").bind(id,JSON.stringify(usage),id,uploadId)
    ]),
    db.prepare('SELECT token_hash,revision,deleted,upload_id,updated_at FROM participants WHERE id=?').bind(id)
  ]);
  const saved = results.at(-1).results[0];
  if (!saved) throw failure(503, 'Máy chủ đã đạt giới hạn thiết bị.');
  if (!equal(saved.token_hash, tokenHash)) throw failure(401, 'Không có quyền với thiết bị này.');
  if (saved.deleted) throw failure(410, 'Thiết bị đã rút chia sẻ.');
  return json({ ok: true, revision: saved.revision, syncedAt: saved.updated_at, stale: saved.upload_id !== uploadId });
}
async function api(request, env, url) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) throw failure(403, 'Nguồn yêu cầu không được phép.');
  const unified=request.method==='POST'&&url.pathname==='/api/login';
  let loginValue;
  if(unified){if(origin!==url.origin)throw failure(403,'Nguồn yêu cầu không được phép.');loginValue=await body(request);if(typeof loginValue?.username==='string')loginValue.username=loginValue.username.trim().toLowerCase();url=new URL(url);url.pathname=loginValue?.username==='group4'?'/api/admin/login':'/api/user/login';}
  const readInput=()=>unified?Promise.resolve(loginValue):body(request);
  const transferCookie=(token,age)=>'sun_admin_transfer='+token+'; HttpOnly; SameSite=Strict; Path=/api/admin/claim; Max-Age='+age+(url.protocol==='https:'?'; Secure':'');
  const configured = !!env.DB && typeof env.SUN_ADMIN_PASSWORD === 'string' && env.SUN_ADMIN_PASSWORD.length >= 16 && env.SUN_ADMIN_PASSWORD.length <= 256;
  if (request.method === 'GET' && url.pathname === '/api/config') return json({ enabled: configured, collector: 'Group 4', consentVersion: CONSENT_VERSION, profileConsentVersion: PROFILE_CONSENT_VERSION, usageConsentVersion: USAGE_CONSENT_VERSION, backgroundPush: !!env.REMINDERS, emailRecovery: !!recoveryMailer(env) });
  if (!configured) throw failure(503, 'Group 4 cần cấu hình D1 và Secret SUN_ADMIN_PASSWORD (16–256 ký tự). Đồng hồ vẫn dùng được.');
  await ensureSchema(env.DB);
  const ipKey = await hash((request.headers.get('CF-Connecting-IP') || 'local') + env.SUN_ADMIN_PASSWORD);
  if(url.pathname.startsWith('/api/push/')){
    if(!env.REMINDERS)throw failure(503,'Máy chủ chưa bật thông báo nền.');
    await rate(env.DB,'push-ip:'+ipKey,60,60000);
    if(request.method==='GET'&&url.pathname==='/api/push/key'){const keys=await(await env.REMINDERS.get(env.REMINDERS.idFromName('vapid-keys')).fetch('https://internal/keys')).json();return json({publicKey:keys.publicKey});}
    if(request.method!=='POST'||url.pathname!=='/api/push/schedule'||origin!==url.origin)throw failure(403,'Yêu cầu không được phép.');
    const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!token)throw failure(401,'Thiếu khóa thiết bị thông báo.');
    const value=await body(request);if(JSON.stringify(value).length>8192)throw failure(413,'Lịch nhắc vượt giới hạn.');
    const validated=validateReminder(value),digest=await hash(token);
    await rate(env.DB,'push-device:'+digest,60,60000);
    return env.REMINDERS.get(env.REMINDERS.idFromName('device:'+digest)).fetch('https://internal/schedule',{method:'POST',body:JSON.stringify(validated)});
  }
  if(url.pathname.startsWith('/api/user/')){
    if(origin!==url.origin)throw failure(403,'Yêu cầu tài khoản phải đến từ SunReminder.');
    await rate(env.DB,'account:global',120,60000);
    if(url.pathname.startsWith('/api/user/recovery/'))return json(await recoveryApi({path:url.pathname,method:request.method,authorization:request.headers.get('Authorization'),readBody:readInput,db:env.DB,origin:url.origin,sendMail:recoveryMailer(env),rate:(key,max,ms,global)=>rate(env.DB,key+(global?'':':'+ipKey),max,ms)}));
    return json(await accountApi({path:url.pathname,method:request.method,authorization:request.headers.get('Authorization'),readBody:readInput,db:env.DB,rate:(key,max,ms,global)=>rate(env.DB,key+(global?'':':'+ipKey),max,ms)}));
  }
  if (request.method === 'POST' && url.pathname === '/api/admin/login') {
    if (origin !== url.origin) throw failure(403, 'Yêu cầu đăng nhập phải đến từ trang quản trị.');
    await rate(env.DB, 'login:' + ipKey, 10, 900000);
    await rate(env.DB, 'login:global', 100, 60000);
    const value = await readInput();
    if (value?.username !== 'group4' || typeof value.password !== 'string' || value.password.length > 256 || !equal(await hash(value.password), await hash(env.SUN_ADMIN_PASSWORD))) throw failure(401, 'Tên đăng nhập hoặc mật khẩu chưa đúng.');
    const nonce = random(), token = nonce + '.' + await sign('admin-v2:' + nonce, env.SUN_ADMIN_PASSWORD), now = Date.now();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM admin_sessions WHERE expires<=?').bind(now),
      env.DB.prepare('DELETE FROM request_limits WHERE key IN(SELECT key FROM request_limits WHERE expires<=? LIMIT 500)').bind(now),
      env.DB.prepare('INSERT INTO admin_sessions(token_hash,expires) SELECT ?,? WHERE (SELECT COUNT(*) FROM admin_sessions)<1000').bind(await hash(token), now + 1800000)
    ]);
    if (!await env.DB.prepare('SELECT 1 FROM admin_sessions WHERE token_hash=?').bind(await hash(token)).first()) throw failure(429, 'Quá nhiều phiên đăng nhập.');
    if(unified){await env.DB.batch([env.DB.prepare('DELETE FROM admin_transfers WHERE expires<=?').bind(now),env.DB.prepare('INSERT INTO admin_transfers VALUES(?,?)').bind(await hash(token),now+60000)]);return json({ok:true,role:'admin',redirect:'/admin'},200,{'Set-Cookie':transferCookie(token,60)});}
    return json({ ok: true, sessionToken: token, expiresAt: now + 1800000 }, 200, { 'Set-Cookie': cookie('', url, 0) });
  }
  if(request.method==='POST'&&url.pathname==='/api/admin/claim'){
    if(origin!==url.origin)throw failure(403,'Nguồn yêu cầu không được phép.');
    const token=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('sun_admin_transfer='))?.slice(19);
    if(!token||!/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token))throw failure(401,'Vui lòng đăng nhập.');
    const digest=await hash(token),now=Date.now();
    const used=await env.DB.prepare('DELETE FROM admin_transfers WHERE token_hash=? AND expires>? RETURNING token_hash').bind(digest,now).first();
    const session=await env.DB.prepare('SELECT expires FROM admin_sessions WHERE token_hash=?').bind(digest).first();
    if(!used||!session||session.expires<=now)throw failure(401,'Vui lòng đăng nhập lại.');
    await admin(new Request(request,{headers:{Authorization:'Bearer '+token}}),env);
    return json({ok:true,sessionToken:token,expiresAt:session.expires},200,{'Set-Cookie':transferCookie('',0)});
  }
  if (url.pathname.startsWith('/api/admin/')) {
    const sessionHash = await admin(request, env);
    if (request.method === 'POST' && url.pathname === '/api/admin/logout') {
      if (origin !== url.origin) throw failure(403, 'Nguồn yêu cầu không được phép.');
      await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(sessionHash).run();
      return json({ ok: true }, 200, { 'Set-Cookie': cookie('', url, 0) });
    }
    if (request.method === 'GET' && url.pathname === '/api/admin/stats') return json(await report(env.DB, ...dateRange(url)));
    if (request.method === 'GET' && url.pathname === '/api/admin/export') {
      const rows = await env.DB.prepare(EXPORT_SQL).bind(...dateRange(url)).all();
      const csv = '\uFEFFParticipantId,Day,EyeRestCheckins,RestSeconds,OutdoorCheckin'+PROFILE_CSV_HEADER+',UsageSeconds\r\n' + rows.results.map(r => [r.participant_id,r.day,r.break_count,r.rest_seconds,r.outdoor,...profileCsv(r),r.usage_seconds].join(',')).join('\r\n');
      return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="Group4-statistics.csv"', 'Cache-Control': 'no-store' } });
    }
  }
  if (request.method === 'POST' && ['/api/sync', '/api/withdraw'].includes(url.pathname)) return sync(request, env, url, ipKey);
  throw failure(404, 'Không tìm thấy chức năng.');
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (env.PUBLIC_ORIGIN && url.origin !== new URL(env.PUBLIC_ORIGIN).origin) throw failure(421, 'Địa chỉ máy chủ không khớp cấu hình.');
      if (url.pathname.startsWith('/api/')) return secure(await api(request, env, url), url);
      if (!['GET','HEAD'].includes(request.method)) return secure(new Response('Method not allowed', { status: 405 }), url);
      const file = url.pathname === '/' ? 'index.html' : ['/admin','/admin/'].includes(url.pathname) ? 'admin.html' : decodeURIComponent(url.pathname.slice(1));
      if (!allowedAssets.has(file)) return secure(new Response('Not found', { status: 404 }), url);
      const assetUrl = new URL('/' + file, url);
      const response = secure(await env.ASSETS.fetch(new Request(assetUrl, { method: request.method })), url);
      response.headers.set('Cache-Control', file.startsWith('admin') ? 'no-store' : 'no-cache');
      return response;
    } catch (error) {
      return secure(json({ error: error.status ? error.message : 'Máy chủ chưa lưu được dữ liệu. Hãy thử lại sau.' }, error.status || 503), url);
    }
  }
};
