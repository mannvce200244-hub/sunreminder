// Server-only email recovery. Raw tokens are emailed, never stored or returned by the API.
import {accountHash,accountRandom,accountPasswordHash,accountEqual} from './accounts-backend.mjs';
export const RECOVERY_SCHEMA=[
 'CREATE TABLE IF NOT EXISTS recovery_emails(user_id TEXT PRIMARY KEY REFERENCES user_accounts(id) ON DELETE CASCADE,email TEXT NOT NULL,verified_at TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS recovery_tokens(user_id TEXT NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,kind TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,email TEXT NOT NULL,password_hash TEXT NOT NULL,expires INTEGER NOT NULL,PRIMARY KEY(user_id,kind))',
 'CREATE INDEX IF NOT EXISTS recovery_tokens_expiry ON recovery_tokens(expires)'
];
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const emailOf=v=>{if(typeof v!=='string'||v.length>254||! /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(v)||/[\r\n\x00-\x1f]/.test(v))fail(400,'Nhập địa chỉ email hợp lệ.');return v.trim().toLowerCase();};
export function recoveryMailer(env,request=fetch){
 const apiKey=typeof env.SUN_BREVO_API_KEY==='string'?env.SUN_BREVO_API_KEY.trim():'',from=typeof env.SUN_MAIL_FROM==='string'?env.SUN_MAIL_FROM.trim():'';
 if(!apiKey||!from)return null;
 return async({to,kind,token,origin})=>{
  const link=origin+'/#'+(kind==='verify'?'verify-email=':'reset-password=')+token;
  if(/[\r\n\x00-\x1f]/.test(apiKey))fail(503,'Khóa gửi thư chưa đúng định dạng (MAIL_CONFIG). Group 4 cần kiểm tra SUN_BREVO_API_KEY.');
  try{emailOf(from);}catch{fail(503,'Địa chỉ gửi thư chưa hợp lệ (MAIL_SENDER). Group 4 cần kiểm tra SUN_MAIL_FROM.');}
  let response;
  try{response=await request('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'Content-Type':'application/json','api-key':apiKey},body:JSON.stringify({sender:{name:'SunReminder · Group 4',email:from},to:[{email:to}],subject:kind==='verify'?'Xác minh email khôi phục SunReminder':'Đặt lại mật khẩu SunReminder',textContent:(kind==='verify'?'Bạn vừa yêu cầu liên kết email này với tài khoản SunReminder.':'Bạn vừa yêu cầu đặt lại mật khẩu SunReminder.')+'\n\nMở liên kết sau (có hiệu lực 15 phút, chỉ dùng một lần):\n'+link+(kind==='verify'?'\n\nNếu không bấm được liên kết, sao chép toàn bộ liên kết vào thanh địa chỉ trình duyệt.':'\n\nNếu không mở được liên kết, nhập mã sau vào mục Khôi phục tài khoản trong app:\n'+token)+'\n\nNếu không phải bạn yêu cầu, hãy bỏ qua thư. Không chia sẻ liên kết hoặc mã này với người khác.'}),signal:AbortSignal.timeout(12000),redirect:'manual'});}
  catch(error){fail(503,['AbortError','TimeoutError'].includes(error?.name)?'Dịch vụ gửi thư phản hồi quá lâu (MAIL_TIMEOUT). Vui lòng thử lại sau.':'Chưa kết nối được dịch vụ gửi thư (MAIL_NETWORK). Vui lòng thử lại sau.');}
  // workerd only supports follow/manual. Reject redirects ourselves so API keys never leave Brevo.
  if(response.status>=300&&response.status<400)fail(503,'Dịch vụ gửi thư yêu cầu chuyển hướng không được phép (MAIL_REDIRECT). Group 4 cần kiểm tra kết nối Brevo.');
  if(!response.ok){
   // Provider text is inspected only for classification, never exposed or logged.
   const detail=await response.json().catch(()=>null),code=typeof detail?.code==='string'?detail.code:'',message=typeof detail?.message==='string'?detail.message.slice(0,1500):'';
   if(/(?:ip address|whitelist|allowlist|unauthori[sz]ed ip|unrecogni[sz]ed ip)/i.test(message))fail(503,'Brevo đang chặn địa chỉ IP máy chủ (MAIL_IP). Group 4 cần kiểm tra Brevo → Security → Authorized IPs.');
   if(code==='account_under_validation'||/(?:not.{0,15}activat|activat.{0,15}account|account.{0,25}(?:validat|suspend|block|disable)|smtp.{0,25}(?:activat|disable))/i.test(message))fail(503,'Tài khoản gửi thư Brevo chưa sẵn sàng (MAIL_ACTIVATION). Group 4 cần kiểm tra trạng thái Transactional trên Brevo.');
   if(response.status===401||code==='unauthorized')fail(503,'Brevo chưa xác thực được khóa gửi thư (MAIL_AUTH). Group 4 cần kiểm tra SUN_BREVO_API_KEY. Đây không phải lỗi mật khẩu tài khoản SunReminder.');
   if(response.status===429||code==='not_enough_credits')fail(503,'Dịch vụ gửi thư đã chạm giới hạn (MAIL_LIMIT). Vui lòng đợi rồi thử lại; Group 4 có thể kiểm tra hạn mức Brevo.');
   if(response.status===402)fail(503,'Brevo yêu cầu kiểm tra kích hoạt hoặc hạn mức gửi thư (MAIL_ACCOUNT). Group 4 cần kiểm tra tài khoản Brevo.');
   if(response.status===403||code==='permission_denied')fail(503,'Brevo chưa cho phép gửi thư (MAIL_PERMISSION). Group 4 cần kiểm tra quyền API và trạng thái Transactional.');
   if(/sender|from.email/i.test(message))fail(503,'Brevo chưa chấp nhận địa chỉ gửi thư (MAIL_SENDER). Group 4 cần kiểm tra SUN_MAIL_FROM có khớp người gửi đã xác minh.');
   if(response.status>=500)fail(503,'Dịch vụ Brevo đang gặp lỗi (MAIL_SERVICE). Vui lòng thử lại sau.');
   fail(503,'Brevo từ chối yêu cầu gửi thư (MAIL_REJECTED). Group 4 cần kiểm tra cấu hình người gửi và nhật ký Brevo.');
  }
 };
}
export async function recoveryApi({path,method,authorization,readBody,db,rate,sendMail,origin,clock=()=>Date.now()}){
 if(method!=='POST')fail(405,'Chức năng này cần POST.');
 const now=clock(),q=(sql,...args)=>db.prepare(sql).bind(...args),body=await readBody();
 await rate('recovery-ip',15,900000);
 const tokenDigest=async()=>{if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))fail(400,'Liên kết hoặc mã xác nhận không hợp lệ.');return accountHash(body.token);};
 async function issue(user,email,kind){
  await rate('recovery-send-user:'+user.id,3,900000,true);
  await rate('recovery-send-email:'+await accountHash(email),5,3600000,true);
  await rate('recovery-send-global',100,86400000,true);
  const token=accountRandom(),digest=await accountHash(token);
  await q('DELETE FROM recovery_tokens WHERE expires<=?',now).run();
  await q('INSERT INTO recovery_tokens(user_id,kind,token_hash,email,password_hash,expires) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,kind) DO UPDATE SET token_hash=excluded.token_hash,email=excluded.email,password_hash=excluded.password_hash,expires=excluded.expires',user.id,kind,digest,email,user.password_hash,now+900000).run();
  try{await sendMail({to:email,kind,token,origin});}catch(error){await q('DELETE FROM recovery_tokens WHERE token_hash=?',digest).run();throw error;}
 }
 if(path==='/api/user/recovery/request'){
  if(!sendMail)fail(503,'Group 4 chưa bật dịch vụ gửi email. Tài khoản và lịch sử vẫn được giữ.');
  const email=emailOf(body.email),username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
  if(!/^[a-z0-9_]{3,32}$/.test(username))fail(400,'Nhập tên đăng nhập hợp lệ.');
  await rate('recovery-request:'+await accountHash(username+'|'+email),3,900000,true);
  const user=await q('SELECT u.* FROM user_accounts u JOIN recovery_emails e ON e.user_id=u.id WHERE u.username=? AND e.email=?',username,email).first();
  // Same response for absent accounts, unverified emails, or a failed provider delivery.
  if(user){try{await issue(user,email,'reset');}catch{}}
  return{ok:true,message:'Nếu tên đăng nhập và email đã xác minh khớp, thư sẽ được gửi. Kiểm tra cả thư rác; chỉ liên kết mới nhất còn hiệu lực.'};
 }
 if(path==='/api/user/recovery/verify'||path==='/api/user/recovery/reset'){
  const digest=await tokenDigest(),kind=path.endsWith('/verify')?'verify':'reset';
  await rate('recovery-token:'+digest,5,900000,true);
  const row=await q('SELECT t.* FROM recovery_tokens t JOIN user_accounts u ON u.id=t.user_id WHERE t.token_hash=? AND t.kind=? AND t.expires>? AND t.password_hash=u.password_hash',digest,kind,now).first();
  if(!row)fail(400,'Liên kết đã hết hạn, đã dùng hoặc không hợp lệ. Hãy yêu cầu thư mới.');
  let result;
  if(kind==='verify'){
   result=await db.batch([
    q('INSERT INTO recovery_emails(user_id,email,verified_at) SELECT t.user_id,t.email,? FROM recovery_tokens t JOIN user_accounts u ON u.id=t.user_id WHERE t.token_hash=? AND t.kind=? AND t.expires>? AND t.password_hash=u.password_hash ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,verified_at=excluded.verified_at',new Date(now).toISOString(),digest,kind,now),
    q('DELETE FROM recovery_tokens WHERE user_id=? AND kind=? AND EXISTS(SELECT 1 FROM recovery_emails WHERE user_id=? AND email=?)',row.user_id,'reset',row.user_id,row.email),
    q('DELETE FROM recovery_tokens WHERE token_hash=?',digest)
   ]);
  }else{
   if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)fail(400,'Mật khẩu mới cần từ 12 đến 128 ký tự.');
   const salt=accountRandom(),password=await accountPasswordHash(body.password,salt);
   result=await db.batch([
    q('UPDATE user_accounts SET salt=?,password_hash=? WHERE id=? AND password_hash=? AND EXISTS(SELECT 1 FROM recovery_tokens WHERE token_hash=? AND kind=? AND expires>?)',salt,password,row.user_id,row.password_hash,digest,kind,now),
    q('DELETE FROM user_sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM user_accounts WHERE id=? AND password_hash=?)',row.user_id,row.user_id,password),
    q('DELETE FROM recovery_tokens WHERE user_id=? AND EXISTS(SELECT 1 FROM user_accounts WHERE id=? AND password_hash=?)',row.user_id,row.user_id,password)
   ]);
  }
  if(!(result[0].meta?.changes??result[0].changes))fail(400,'Liên kết đã được dùng hoặc đã thay đổi. Hãy yêu cầu thư mới.');
  return{ok:true,message:kind==='verify'?'Đã xác minh email khôi phục.':'Đã đặt mật khẩu mới và đăng xuất các phiên cũ. Hãy đăng nhập lại.'};
 }
 const token=authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 if(!token)fail(401,'Vui lòng đăng nhập để thêm email khôi phục.');
 const user=await q('SELECT u.* FROM user_accounts u JOIN user_sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires>?',await accountHash(token),now).first();
 if(!user)fail(401,'Phiên đã hết hạn. Vui lòng đăng nhập lại.');
 if(path==='/api/user/recovery/status'){
  const email=await q('SELECT email FROM recovery_emails WHERE user_id=?',user.id).first();
  return{ok:true,enabled:!!sendMail,email:email?.email||null};
 }
 if(path==='/api/user/recovery/email'){
  if(!sendMail)fail(503,'Group 4 chưa bật dịch vụ gửi email. Hãy thử lại sau.');
  const email=emailOf(body.email);
  await rate('recovery-password:'+user.id,5,900000,true);
  if(typeof body.password!=='string'||body.password.length>128||!accountEqual(await accountPasswordHash(body.password,user.salt),user.password_hash))fail(400,'Mật khẩu hiện tại chưa đúng.');
  await issue(user,email,'verify');
  return{ok:true,message:'Đã gửi thư xác minh. Email cũ (nếu có) vẫn được giữ đến khi bạn xác minh email mới.'};
 }
 fail(404,'Không tìm thấy chức năng khôi phục.');
}
