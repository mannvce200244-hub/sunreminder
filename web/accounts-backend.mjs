// Shared by the local SQLite server and Cloudflare D1. Never served as a public asset.
export const ACCOUNT_SCHEMA=[
 'CREATE TABLE IF NOT EXISTS user_accounts (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS user_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE, expires INTEGER NOT NULL)',
 'CREATE INDEX IF NOT EXISTS user_sessions_expiry ON user_sessions(expires)'
];
const enc=new TextEncoder();const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const hash=async text=>hex(await crypto.subtle.digest('SHA-256',enc.encode(text)));
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;};
async function passwordHash(password,salt){
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256));
}
function displayName(value){if(typeof value!=='string'||!value.trim()||value.trim().length>80||/[\u0000-\u001f\u007f]/.test(value))fail(400,'Tên hiển thị cần từ 1 đến 80 ký tự.');return value.trim();}
export async function accountApi({path,method,authorization,readBody,db,rate,clock=()=>Date.now()}){
 if(method!=='POST')fail(405,'Chức năng này cần yêu cầu POST.');
 const now=clock();const query=(sql,...args)=>db.prepare(sql).bind(...args);
 if(path==='/api/user/register'||path==='/api/user/login'){
  await rate('account-access',12,900000);
  const body=await readBody();const username=typeof body?.username==='string'?body.username.trim().toLowerCase():'';
  const emailLogin=path==='/api/user/login'&&username.length<=254&&/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(username);
  if((!emailLogin&&!/^[a-z0-9_]{3,32}$/.test(username))||username==='group4'||username==='admin')fail(400,'Tên đăng nhập gồm 3–32 chữ thường không dấu, số hoặc dấu gạch dưới; không dùng admin hay group4.');
  if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)fail(400,'Mật khẩu cần từ 12 đến 128 ký tự.');
  await rate('account-name:'+await hash(username),15,900000,true);
  // Legacy duplicate recovery emails are ambiguous: require username until an owner changes email.
  let user=emailLogin?await query('SELECT u.* FROM user_accounts u JOIN recovery_emails e ON e.user_id=u.id WHERE e.email=? AND (SELECT COUNT(*) FROM recovery_emails WHERE email=?)=1',username,username).first():await query('SELECT * FROM user_accounts WHERE username=?',username).first();
  if(user)await rate('account-user:'+user.id,15,900000,true);
  if(path==='/api/user/register'){
   await rate('account-register',5,3600000);
   const name=displayName(body.displayName);
   if(body.consentVersion!=='group4-account-v1')fail(400,'Cần đồng ý lưu tài khoản trước khi tạo.');
   if(user)fail(409,'Tên đăng nhập đã được sử dụng. Hãy chọn tên khác.');
   const id=random(),salt=random(),digest=await passwordHash(body.password,salt);
   await query('INSERT INTO user_accounts(id,username,display_name,salt,password_hash,created_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM user_accounts)<10000 ON CONFLICT(username) DO NOTHING',id,username,name,salt,digest,new Date(now).toISOString()).run();
   user=await query('SELECT * FROM user_accounts WHERE username=?',username).first();
   if(!user)fail(503,'Máy chủ đã đạt giới hạn tài khoản.');
   if(user.id!==id)fail(409,'Tên đăng nhập đã được sử dụng. Hãy chọn tên khác.');
  }else{
   const digest=await passwordHash(body.password,user?.salt||'unknown-account-dummy-salt');
   if(!user||!equal(digest,user.password_hash))fail(401,'Tên đăng nhập hoặc mật khẩu chưa đúng.');
  }
  const token=random(),expiresAt=now+3600000;
  await query('DELETE FROM user_sessions WHERE expires<=?',now).run();
  // Keep a bounded number of concurrent sessions for one account.
  await query('DELETE FROM user_sessions WHERE token_hash IN (SELECT token_hash FROM user_sessions WHERE user_id=? ORDER BY expires DESC LIMIT -1 OFFSET 4)',user.id).run();
  const inserted=await query('INSERT INTO user_sessions SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM user_accounts WHERE id=? AND password_hash=?)',await hash(token),user.id,expiresAt,user.id,user.password_hash).run();
  if(!(inserted.meta?.changes??inserted.changes))fail(401,'Mật khẩu vừa thay đổi. Vui lòng đăng nhập lại.');
  return{ok:true,sessionToken:token,expiresAt,user:{username:user.username,displayName:user.display_name}};
 }
 const token=authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 if(!token)fail(401,'Vui lòng đăng nhập người dùng.');
 const digest=await hash(token);
 const user=await query('SELECT u.id,u.username,u.display_name FROM user_accounts u JOIN user_sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires>?',digest,now).first();
 if(!user)fail(401,'Phiên đã hết hạn. Vui lòng đăng nhập lại.');
 await rate('account-session:'+digest,60,60000,true);
 if(path==='/api/user/logout'){await query('DELETE FROM user_sessions WHERE token_hash=?',digest).run();return{ok:true};}
 if(path==='/api/user/profile'){const body=await readBody(),name=displayName(body?.displayName);await query('UPDATE user_accounts SET display_name=? WHERE id=?',name,user.id).run();return{ok:true,user:{username:user.username,displayName:name}};}
 fail(404,'Không tìm thấy chức năng tài khoản.');
}

export {hash as accountHash,random as accountRandom,passwordHash as accountPasswordHash,equal as accountEqual};
