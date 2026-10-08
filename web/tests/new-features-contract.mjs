import assert from 'node:assert/strict';
export async function unifiedContract(call,password){
 assert.equal((await call('/api/login',{body:{username:'group4',password:'wrong-password'}})).status,401);
 let r=await call('/api/login',{body:{username:' Group4 ',password}});assert.equal(r.status,200,await r.clone().text());const login=await r.json();assert.equal(login.role,'admin');assert.equal(login.redirect,'/admin');assert.equal(login.sessionToken,undefined);const transfer=r.headers.get('set-cookie');assert.match(transfer,/HttpOnly/);assert.match(transfer,/Max-Age=60/);const headers={Cookie:transfer.split(';')[0]};
 assert.equal((await call('/api/admin/stats',{headers})).status,401);
 assert.equal((await call('/api/admin/claim',{body:{},headers:{...headers,Origin:'https://wrong.example'}})).status,403);
 const claims=await Promise.all([call('/api/admin/claim',{body:{},headers}),call('/api/admin/claim',{body:{},headers})]);assert.deepEqual(claims.map(r=>r.status).sort(),[200,401]);const session=await claims.find(r=>r.status===200).json();assert.ok(session.sessionToken);
 assert.equal((await call('/api/admin/stats',{token:session.sessionToken})).status,200);
 assert.equal((await call('/api/admin/claim',{body:{},headers})).status,401,'refresh cannot claim a consumed transfer');
 await call('/api/admin/logout',{token:session.sessionToken,body:{}});
 assert.equal((await call('/api/admin/stats',{token:session.sessionToken})).status,401);
 const account={username:'unified_user',password:'test-passphrase-2026',displayName:'Người dùng',consentVersion:'group4-account-v1'};
 await call('/api/user/register',{body:account});r=await call('/api/login',{body:account});assert.equal(r.status,200);const u=await r.json();assert.equal(u.user.displayName,account.displayName);assert.equal(u.role,undefined);assert.equal((await call('/api/admin/stats',{token:u.sessionToken})).status,401);
}
export async function usageContract(call,adminToken){
 const participantId='p_'+'d'.repeat(32),token='e'.repeat(64),base={participantId,revision:1,source:'web',consentVersion:'group4-stats-v1',days:[],usageDays:[{day:'2026-01-01',seconds:300},{day:'2026-01-02',seconds:420}],usageConsentVersion:'group4-usage-v1'};
 const report=range=>call('/api/admin/stats'+(range||''),{token:adminToken}).then(r=>r.json());
 assert.equal((await call('/api/sync',{token,body:{...base,usageConsentVersion:null}})).status,400);
 assert.equal((await call('/api/sync',{token,body:base})).status,200);
 await call('/api/sync',{token,body:base});let data=await report();assert.equal(data.totals.usageSeconds,720);assert.equal(data.totals.breakCount,0);assert.equal(data.totals.activeDeviceDays,0,'usage must not invent check-ins or change prior activity semantics');assert.equal(data.participants[0].usageSeconds,720);assert.equal(data.usageDays.length,2);
 assert.equal((await report('?from=2026-01-02&to=2026-01-02')).totals.usageSeconds,420);
 const csv=await(await call('/api/admin/export',{token:adminToken})).text();assert.match(csv,/UsageSeconds/);assert.equal(csv.trim().split('\r\n').length,3);assert.match(csv,/2026-01-02,0,0,0,.*420/);
 for(const bad of [-1,86401,1.5])assert.equal((await call('/api/sync',{token,body:{...base,revision:2,usageDays:[{day:'2026-01-01',seconds:bad}]}})).status,400);
 assert.equal((await call('/api/sync',{token:'f'.repeat(64),body:{...base,revision:2}})).status,401);
 const later={...base,revision:3,usageDays:[{day:'2026-01-02',seconds:500}]};await Promise.all([call('/api/sync',{token,body:{...base,revision:2}}),call('/api/sync',{token,body:later})]);assert.equal((await report()).totals.usageSeconds,500);
 const legacy={...base,revision:4};delete legacy.usageDays;delete legacy.usageConsentVersion;await call('/api/sync',{token,body:legacy});assert.equal((await report()).totals.usageSeconds,500);
 await Promise.all([call('/api/sync',{token,body:{...base,revision:5}}),call('/api/withdraw',{token,body:{participantId}})]);assert.equal((await report()).totals.usageSeconds,0);assert.equal((await call('/api/sync',{token,body:{...base,revision:6}})).status,410);
}
