import assert from 'node:assert/strict';
export async function featureContract(call,adminToken){
 const userPassword='Test-only-passphrase-2026';const base={username:'test_member',password:userPassword,displayName:'Mẫn & bạn',consentVersion:'group4-account-v1'};
 let r=await call('/api/user/register',{body:{...base,consentVersion:null}});assert.equal(r.status,400);
 r=await call('/api/user/register',{body:base});assert.equal(r.status,200,await r.clone().text());const signup=await r.json();assert.equal(signup.user.displayName,base.displayName);assert.ok(signup.sessionToken);assert.equal(signup.user.password,undefined);
 assert.equal((await call('/api/user/register',{body:base})).status,409);
 assert.equal((await call('/api/user/login',{body:{username:base.username,password:'wrong-long-password'}})).status,401);
 assert.equal((await call('/api/admin/stats',{token:signup.sessionToken})).status,401);
 assert.equal((await call('/api/user/profile',{token:adminToken,body:{displayName:'Forged'}})).status,401);
 r=await call('/api/user/profile',{token:signup.sessionToken,body:{displayName:'Tên mới'}});assert.equal(r.status,200);assert.equal((await r.json()).user.displayName,'Tên mới');
 await call('/api/user/logout',{token:signup.sessionToken,body:{}});
 assert.equal((await call('/api/user/profile',{token:signup.sessionToken,body:{displayName:'Stale'}})).status,401);
 r=await call('/api/user/login',{body:{username:base.username.toUpperCase(),password:userPassword}});assert.equal(r.status,200);assert.equal((await r.json()).user.displayName,'Tên mới');
 const stats=()=>call('/api/admin/stats',{token:adminToken}).then(r=>r.json());
 assert.equal((await stats()).registeredDevices,0,'account creation must not opt into statistics');
 const participantId='p_'+'a'.repeat(32),token='b'.repeat(64),time=new Date().toISOString();
 const profile={displayName:'=SUM(1,2)',deviceName:'Máy "của tôi"',location:{latitude:10.77,longitude:106.69,accuracy:30,capturedAt:time},consentedAt:time};
 const payload={participantId,revision:1,source:'web',consentVersion:'group4-stats-v1',days:[{day:'2026-01-02',breakCount:2,restSeconds:40,outdoor:false}],profileConsentVersion:'group4-profile-v1',profile};
 assert.equal((await call('/api/sync',{token,body:{...payload,profileConsentVersion:null}})).status,400);
 assert.equal((await call('/api/sync',{token,body:payload})).status,200);
 let p=(await stats()).participants[0];assert.equal(p.displayName,profile.displayName);assert.equal(p.location.accuracy,30);assert.equal(p.breakCount,2);
 assert.equal((await call('/api/sync',{token,body:{...payload,revision:2,profile:{...profile,location:{...profile.location,latitude:91}}}})).status,400);
 assert.equal((await stats()).participants[0].location.latitude,10.77);
 assert.equal((await call('/api/sync',{token:'c'.repeat(64),body:{...payload,revision:2,profile:null}})).status,401);
 // A legacy app omitting metadata retains the previous opt-in profile.
 const legacy={...payload,revision:2};delete legacy.profile;delete legacy.profileConsentVersion;
 assert.equal((await call('/api/sync',{token,body:legacy})).status,200);assert.equal((await stats()).participants[0].deviceName,profile.deviceName);
 const csv=await(await call('/api/admin/export',{token:adminToken})).text();assert.ok(csv.includes('"\'=SUM(1,2)"'));assert.ok(csv.includes('"Máy ""của tôi"""'));
 assert.equal((await call('/api/sync',{token,body:{...payload,revision:3,profile:null}})).status,200);
 await call('/api/sync',{token,body:payload});p=(await stats()).participants[0];assert.equal(p.location,null);assert.equal(p.deviceName,null);assert.equal(p.breakCount,2);
 assert.equal((await call('/api/sync',{token,body:{...payload,revision:4}})).status,200);
 assert.equal((await call('/api/withdraw',{token,body:{participantId}})).status,200);
 assert.equal((await call('/api/sync',{token,body:{...payload,revision:5}})).status,410);
 assert.equal((await stats()).registeredDevices,0);
 // Old cookies must never grant access, even when containing a currently valid token.
 assert.equal((await call('/api/admin/stats',{headers:{Cookie:'sun_admin='+adminToken}})).status,401);
}
