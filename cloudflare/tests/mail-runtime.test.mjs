import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {Miniflare} from 'miniflare';
const origin='https://mail-runtime.test';
async function fixture(t,status=201,body={messageId:'local-test-message'},headers={}){
 const requests=[],payloads=[];
 const outboundService=async request=>{requests.push(request.url);assert.equal(request.url,'https://api.brevo.com/v3/smtp/email');assert.equal(request.headers.get('api-key'),'local-fake-key');assert.equal(request.method,'POST');payloads.push(await request.json());return new Response(JSON.stringify(body),{status,headers});};
 const mf=new Miniflare({cf:false,modules:true,scriptPath:fileURLToPath(new URL('../../.wrangler/test-worker.mjs',import.meta.url)),compatibilityDate:'2026-08-01',d1Databases:{DB:'mail-runtime'},durableObjects:{REMINDERS:{className:'ReminderScheduler',useSQLite:true}},bindings:{SUN_ADMIN_PASSWORD:'local-admin-test-password',SUN_BREVO_API_KEY:'local-fake-key',SUN_MAIL_FROM:'sender@example.test'},outboundService});
 t.after(()=>mf.dispose());
 const post=(path,body,token)=>mf.dispatchFetch(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
 const registered=await post('/api/user/register',{username:'runtimeuser',password:'local-password-123',displayName:'Runtime test',consentVersion:'group4-account-v1'});assert.equal(registered.status,200);const {sessionToken}=await registered.json();
 return{mf,requests,payloads,post,sessionToken,send:(codeFormat)=>post('/api/user/recovery/email',{email:'recipient@example.test',password:'local-password-123',codeFormat},sessionToken)};
}
test('real workerd fetch reaches Brevo transport for verification without unsupported options',async t=>{
 const f=await fixture(t),response=await f.send();assert.equal(response.status,200,await response.clone().text());assert.match((await response.json()).message,/Đã gửi/);assert.deepEqual(f.requests,['https://api.brevo.com/v3/smtp/email']);
 const db=await f.mf.getD1Database('DB');assert.equal((await db.prepare('SELECT COUNT(*) n FROM recovery_tokens').first()).n,1);
});
test('real workerd fetch does not forward the API key to redirects',async t=>{
 const f=await fixture(t,302,{}, {Location:'https://untrusted.example/collect'}),response=await f.send();assert.equal(response.status,503);assert.match((await response.json()).error,/MAIL_REDIRECT/);assert.deepEqual(f.requests,['https://api.brevo.com/v3/smtp/email']);
 const db=await f.mf.getD1Database('DB');assert.equal((await db.prepare('SELECT COUNT(*) n FROM recovery_tokens').first()).n,0);
});
test('real workerd fetch preserves Brevo authentication errors',async t=>{
 const f=await fixture(t,401,{code:'unauthorized',message:'Key not found'}),response=await f.send();assert.equal(response.status,503);assert.match((await response.json()).error,/MAIL_AUTH/);assert.deepEqual(f.requests,['https://api.brevo.com/v3/smtp/email']);
});

test('full Worker OTP verification enables unified email login',async t=>{
 const f=await fixture(t),response=await f.send('otp6');assert.equal(response.status,200);const result=await response.json();assert.match(result.challenge,/^[a-f0-9]{64}$/);const content=f.payloads[0].textContent,code=content.match(/là: (\d{6})/)[1];assert.doesNotMatch(content,/#verify-email/);
 const verified=await f.post('/api/user/recovery/verify',{challenge:result.challenge,code});assert.equal(verified.status,200,await verified.clone().text());
 const login=await f.post('/api/login',{username:'RECIPIENT@EXAMPLE.TEST',password:'local-password-123'});assert.equal(login.status,200,await login.clone().text());assert.equal((await login.json()).user.username,'runtimeuser');
});
