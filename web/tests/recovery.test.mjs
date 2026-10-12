import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {Miniflare} from 'miniflare';
import {ACCOUNT_SCHEMA,accountApi} from '../accounts-backend.mjs';
import {RECOVERY_SCHEMA,recoveryApi,recoveryMailer} from '../recovery-backend.mjs';
async function fixture(t,cloud=false){
 let db;if(cloud){const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:{DB:'recovery-tests'}});t.after(()=>mf.dispose());db=await mf.getD1Database('DB');await db.batch([...ACCOUNT_SCHEMA,...RECOVERY_SCHEMA].map(s=>db.prepare(s)));}
 else{const raw=new DatabaseSync(':memory:');raw.exec('PRAGMA foreign_keys=ON;');for(const sql of [...ACCOUNT_SCHEMA,...RECOVERY_SCHEMA])raw.exec(sql);t.after(()=>raw.close());db={prepare:sql=>({bind:(...args)=>({first:()=>raw.prepare(sql).get(...args),run:()=>raw.prepare(sql).run(...args)})}),batch:async ss=>{raw.exec('BEGIN');try{const result=ss.map(s=>s.run());raw.exec('COMMIT');return result;}catch(e){raw.exec('ROLLBACK');throw e;}}};}
 let now=Date.now(),failMail=false;const mails=[],rateCalls=[];
 const base={db,clock:()=>now,rate:async(...args)=>rateCalls.push(args),origin:'https://sunreminder.test',sendMail:async mail=>{if(failMail)throw Error('provider unavailable');mails.push(mail);}};
 const call=(path,body={},token=null)=> (path.startsWith('/api/user/recovery/')?recoveryApi:accountApi)({...base,path,method:'POST',authorization:token?'Bearer '+token:null,readBody:async()=>body});
 const password='initial-password-123';const user=await call('/api/user/register',{username:'member',password,displayName:'Member',consentVersion:'group4-account-v1'});
 return{db,call,user,password,mails,rateCalls,advance:ms=>now+=ms,failMail:()=>failMail=true,base};
}
for(const cloud of [false,true]){
 const label=cloud?'D1':'SQLite';
 test(label+': verified email recovery is single-use, atomic, and revokes old sessions',async t=>{
  const f=await fixture(t,cloud),email='member@example.test';
  await assert.rejects(f.call('/api/user/recovery/email',{email,password:'wrong'},f.user.sessionToken),/Mật khẩu/);
  await f.call('/api/user/recovery/email',{email,password:f.password},f.user.sessionToken);const verification=f.mails.at(-1).token;
  const generic=await f.call('/api/user/recovery/request',{email,username:'member'});assert.equal(f.mails.length,1);
  await f.call('/api/user/recovery/verify',{token:verification});await assert.rejects(f.call('/api/user/recovery/verify',{token:verification}),/hết hạn|thay đổi/);
  const status=await f.call('/api/user/recovery/status',{},f.user.sessionToken);assert.equal(status.email,email);
  assert.deepEqual(await f.call('/api/user/recovery/request',{email,username:'missing'}),generic);
  await f.call('/api/user/recovery/request',{email,username:'member'});const reset=f.mails.at(-1).token;assert.equal(f.mails.length,2);
  const stored=await f.db.prepare('SELECT * FROM recovery_tokens WHERE user_id=(SELECT id FROM user_accounts WHERE username=?)').bind('member').first();assert.notEqual(stored.token_hash,reset);assert.equal(JSON.stringify(stored).includes(reset),false);
  await assert.rejects(f.call('/api/user/recovery/reset',{token:reset,password:'short'}),/12/);
  const results=await Promise.allSettled([f.call('/api/user/recovery/reset',{token:reset,password:'new-password-one-123'}),f.call('/api/user/recovery/reset',{token:reset,password:'new-password-two-123'})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  await assert.rejects(f.call('/api/user/profile',{displayName:'Bad'},f.user.sessionToken),/Phiên/);
  await assert.rejects(f.call('/api/user/login',{username:'member',password:f.password}),/chưa đúng/);
  const winning=results[0].status==='fulfilled'?'new-password-one-123':'new-password-two-123';assert.ok((await f.call('/api/user/login',{username:'member',password:winning})).sessionToken);
  await assert.rejects(f.call('/api/user/recovery/reset',{token:reset,password:'new-password-three'}),/hết hạn/);
  assert.ok(f.rateCalls.some(r=>r[0]==='recovery-send-global'));
 });
 test(label+': only latest email link works, expiry and provider failures preserve existing account',async t=>{
  const f=await fixture(t,cloud),email='member@example.test';
  await f.call('/api/user/recovery/email',{email,password:f.password},f.user.sessionToken);const old=f.mails.at(-1).token;
  await f.call('/api/user/recovery/email',{email,password:f.password},f.user.sessionToken);const current=f.mails.at(-1).token;
  await assert.rejects(f.call('/api/user/recovery/verify',{token:old}),/hết hạn/);
  f.advance(900001);await assert.rejects(f.call('/api/user/recovery/verify',{token:current}),/hết hạn/);
  f.failMail();await assert.rejects(f.call('/api/user/recovery/email',{email,password:f.password},f.user.sessionToken),/provider/);
  const row=await f.db.prepare('SELECT COUNT(*) AS n FROM recovery_tokens WHERE user_id=(SELECT id FROM user_accounts WHERE username=?)').bind('member').first();assert.equal(row.n,0);
  assert.ok((await f.call('/api/user/login',{username:'member',password:f.password})).sessionToken);
 });
}
test('unconfigured email service reports unavailable and never manufactures a delivery',async t=>{const f=await fixture(t);assert.equal(recoveryMailer({}),null);await assert.rejects(recoveryApi({...f.base,sendMail:null,path:'/api/user/recovery/request',method:'POST',readBody:async()=>({username:'member',email:'member@example.test'})}),e=>e.status===503);assert.equal(f.mails.length,0);});
test('mailer sends only through Brevo, with secret in headers and token in a fragment link',async()=>{let request;const mailer=recoveryMailer({SUN_BREVO_API_KEY:'test-key',SUN_MAIL_FROM:'group@example.test'},async(url,options)=>{request={url,options};return new Response('{}',{status:201});});await mailer({to:'user@example.test',kind:'reset',token:'a'.repeat(64),origin:'https://sunreminder.test'});assert.equal(request.url,'https://api.brevo.com/v3/smtp/email');const data=JSON.parse(request.options.body);assert.equal(data.to[0].email,'user@example.test');assert.match(data.textContent,/#reset-password=a{64}/);assert.equal(request.options.body.includes('test-key'),false);});
