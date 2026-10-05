import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
export const CONSENT_VERSION='group4-stats-v1';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function passwordHash(password,salt=randomBytes(16).toString('hex')) {return {salt,hash:scryptSync(password,salt,64).toString('hex')};}
function equal(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function failure(status,message){return Object.assign(new Error(message),{status});}
export function validDay(day){return typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day;}
export function validateSnapshot(body){
  if(!body||body.consentVersion!==CONSENT_VERSION||!['web','windows'].includes(body.source)||!Number.isSafeInteger(body.revision)||body.revision<1||!Array.isArray(body.days)||body.days.length>4000)throw failure(400,'Gói thống kê không hợp lệ.');
  const seen=new Set();const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
  for(const d of body.days){
    if(!d||!validDay(d.day)||d.day<'2000-01-01'||d.day>tomorrow||seen.has(d.day)||!Number.isInteger(d.breakCount)||d.breakCount<0||d.breakCount>4320||!Number.isInteger(d.restSeconds)||d.restSeconds<d.breakCount*20||d.restSeconds>d.breakCount*120||d.restSeconds>86400||typeof d.outdoor!=='boolean'||(!d.breakCount&&!d.outdoor))throw failure(400,'Số liệu theo ngày không hợp lệ.');
    seen.add(d.day);
  }
  return body;
}
export function createBackend({dataDir,origin,adminPassword,clock=()=>Date.now()}){
  mkdirSync(dataDir,{recursive:true});
  const db=new DatabaseSync(path.join(dataDir,'statistics.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS participants(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL,source TEXT NOT NULL,consent_version TEXT NOT NULL,consented_at TEXT NOT NULL,updated_at TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,deleted INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS daily(participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,day TEXT NOT NULL,break_count INTEGER NOT NULL,rest_seconds INTEGER NOT NULL,outdoor INTEGER NOT NULL,PRIMARY KEY(participant_id,day));
    CREATE INDEX IF NOT EXISTS daily_day ON daily(day);`);
  let auth=null;
  if(adminPassword){if(adminPassword.length<16)throw new Error('SUN_ADMIN_PASSWORD cần ít nhất 16 ký tự.');auth=passwordHash(adminPassword);}
  else if(existsSync(path.join(dataDir,'admin-auth.json')))auth=JSON.parse(readFileSync(path.join(dataDir,'admin-auth.json'),'utf8'));
  if(auth&&(!/^[a-f0-9]{32}$/.test(auth.salt)||!/^[a-f0-9]{128}$/.test(auth.hash)))throw new Error('Cấu hình quản trị không hợp lệ.');
  const sessions=new Map(),limits=new Map();
  function rate(key,max,windowMs){const now=clock();let item=limits.get(key);if(!item||item.until<=now){item={count:0,until:now+windowMs};limits.set(key,item);}if(++item.count>max)throw failure(429,'Quá nhiều yêu cầu. Vui lòng thử lại sau.');if(limits.size>10000){for(const[k,v]of limits)if(v.until<=now)limits.delete(k);if(limits.size>10000)throw failure(503,'Máy chủ đang bận.');}}
  function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
  async function readBody(req){if(!(req.headers['content-type']||'').startsWith('application/json'))throw failure(415,'Cần định dạng JSON.');let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>512*1024)throw failure(413,'Dữ liệu vượt giới hạn.');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw failure(400,'JSON không hợp lệ.');}}
  function admin(req){const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('sun_admin='))?.slice(10);const session=cookie&&sessions.get(hash(cookie));if(!session||session.expires<clock()){if(cookie)sessions.delete(hash(cookie));throw failure(401,'Vui lòng đăng nhập quản trị.');}return cookie;}
  function identity(req,body){const id=body?.participantId,token=req.headers.authorization?.replace(/^Bearer /,'');if(typeof id!=='string'||!/^p_[a-f0-9]{32}$/.test(id)||!token||!/^[a-f0-9]{64}$/.test(token))throw failure(401,'Thông tin thiết bị không hợp lệ.');return{id,tokenHash:hash(token)};}
  function existing(id,tokenHash){const p=db.prepare('SELECT * FROM participants WHERE id=?').get(id);if(p&&!equal(p.token_hash,tokenHash))throw failure(401,'Không có quyền với thiết bị này.');return p;}
  function range(url){const from=url.searchParams.get('from')||'2000-01-01',to=url.searchParams.get('to')||'9999-12-31';if(!validDay(from)||!validDay(to)||from>to)throw failure(400,'Khoảng ngày không hợp lệ.');return[from,to];}
  function report(from,to){
    const totals=db.prepare(`SELECT COALESCE(SUM(break_count),0) breakCount,COALESCE(SUM(rest_seconds),0) restSeconds,COALESCE(SUM(outdoor),0) outdoorCheckins,COUNT(*) activeDeviceDays,COUNT(DISTINCT day) activeCalendarDays,COUNT(DISTINCT participant_id) activeDevices FROM daily WHERE day BETWEEN ? AND ?`).get(from,to);
    const participants=db.prepare(`SELECT p.id,p.source,p.updated_at updatedAt,COALESCE(SUM(d.break_count),0) breakCount,COALESCE(SUM(d.rest_seconds),0) restSeconds,COALESCE(SUM(d.outdoor),0) outdoorCheckins,COUNT(d.day) activeDays FROM participants p LEFT JOIN daily d ON p.id=d.participant_id AND d.day BETWEEN ? AND ? WHERE p.deleted=0 GROUP BY p.id ORDER BY p.updated_at DESC LIMIT 10000`).all(from,to);
    const days=db.prepare(`SELECT day,SUM(break_count) breakCount,SUM(outdoor) outdoorCheckins,COUNT(*) activeDevices FROM daily WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day`).all(from,to);
    return{totals,participants,days,registeredDevices:participants.length,generatedAt:new Date(clock()).toISOString(),from,to};
  }
  async function handle(req,res,url){
    if(!url.pathname.startsWith('/api/'))return false;
    try{
      if(req.headers.origin&&req.headers.origin!==origin)throw failure(403,'Nguồn yêu cầu không được phép.');
      const ip=req.socket.remoteAddress||'unknown';
      if(req.method==='GET'&&url.pathname==='/api/config'){send(res,200,{enabled:!!auth,collector:'Group 4',consentVersion:CONSENT_VERSION});return true;}
      if(!auth)throw failure(503,'Nhóm chưa cấu hình máy chủ thống kê. Đồng hồ vẫn dùng được.');
      if(req.method==='POST'&&url.pathname==='/api/admin/login'){
        if(req.headers.origin!==origin)throw failure(403,'Yêu cầu đăng nhập phải đến từ trang quản trị.');
        rate(`login:${ip}`,10,900000);rate('login:global',100,60000);
        const body=await readBody(req);if(typeof body.password!=='string'||body.password.length>256||body.username!=='group4'||!equal(passwordHash(body.password,auth.salt).hash,auth.hash))throw failure(401,'Tên đăng nhập hoặc mật khẩu chưa đúng.');
        for(const[k,v]of sessions)if(v.expires<clock())sessions.delete(k);
        if(sessions.size>=1000)throw failure(429,'Quá nhiều phiên đăng nhập.');
        const token=randomBytes(32).toString('hex');sessions.set(hash(token),{expires:clock()+8*3600000});
        res.setHeader('Set-Cookie',`sun_admin=${token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=28800${origin.startsWith('https:')?'; Secure':''}`);send(res,200,{ok:true});return true;
      }
      if(url.pathname.startsWith('/api/admin/')){
        const cookie=admin(req);
        if(req.method==='POST'&&url.pathname==='/api/admin/logout'){
          if(req.headers.origin!==origin)throw failure(403,'Nguồn yêu cầu không được phép.');sessions.delete(hash(cookie));res.setHeader('Set-Cookie',`sun_admin=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0${origin.startsWith('https:')?'; Secure':''}`);send(res,200,{ok:true});return true;
        }
        if(req.method==='GET'&&url.pathname==='/api/admin/stats'){send(res,200,report(...range(url)));return true;}
        if(req.method==='GET'&&url.pathname==='/api/admin/export'){
          const[from,to]=range(url);const rows=db.prepare('SELECT participant_id,day,break_count,rest_seconds,outdoor FROM daily WHERE day BETWEEN ? AND ? ORDER BY day DESC,participant_id').all(from,to);
          const csv='\uFEFFParticipantId,Day,EyeRestCheckins,RestSeconds,OutdoorCheckin\r\n'+rows.map(r=>[r.participant_id,r.day,r.break_count,r.rest_seconds,r.outdoor].join(',')).join('\r\n');
          res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="Group4-statistics.csv"','Cache-Control':'no-store'});res.end(csv);return true;
        }
      }
      if(req.method==='POST'&&['/api/sync','/api/withdraw'].includes(url.pathname)){
        const body=await readBody(req),{id,tokenHash}=identity(req,body);rate(`device:${id}`,120,60000);const p=existing(id,tokenHash);
        if(url.pathname==='/api/withdraw'){
          // Tombstones prevent an in-flight request from recreating withdrawn statistics.
          if(!p){rate(`register:${ip}`,30,3600000);if(db.prepare('SELECT COUNT(*) n FROM participants').get().n>=10000)throw failure(503,'Máy chủ đã đạt giới hạn thiết bị.');}
          const now=new Date(clock()).toISOString();
          db.exec('BEGIN IMMEDIATE');try{db.prepare('DELETE FROM daily WHERE participant_id=?').run(id);db.prepare(`INSERT INTO participants(id,token_hash,source,consent_version,consented_at,updated_at,revision,deleted) VALUES(?,?,'web',?,?,?,0,1) ON CONFLICT(id) DO UPDATE SET deleted=1,updated_at=excluded.updated_at`).run(id,tokenHash,CONSENT_VERSION,now,now);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
          send(res,200,{ok:true,deleted:true});return true;
        }
        if(p?.deleted)throw failure(410,'Thiết bị đã rút chia sẻ. Cần đồng ý lại để tham gia bằng mã mới.');
        validateSnapshot(body);
        if(p&&body.revision<=p.revision){send(res,200,{ok:true,revision:p.revision,stale:true});return true;}
        if(!p){rate(`register:${ip}`,30,3600000);if(db.prepare('SELECT COUNT(*) n FROM participants').get().n>=10000)throw failure(503,'Máy chủ đã đạt giới hạn thiết bị.');}
        const now=new Date(clock()).toISOString();
        db.exec('BEGIN IMMEDIATE');try{
          db.prepare(`INSERT INTO participants(id,token_hash,source,consent_version,consented_at,updated_at,revision) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET source=excluded.source,updated_at=excluded.updated_at,revision=excluded.revision`).run(id,tokenHash,body.source,body.consentVersion,now,now,body.revision);
          db.prepare('DELETE FROM daily WHERE participant_id=?').run(id);
          const insert=db.prepare('INSERT INTO daily VALUES(?,?,?,?,?)');for(const d of body.days)insert.run(id,d.day,d.breakCount,d.restSeconds,d.outdoor?1:0);
          db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e;}
        send(res,200,{ok:true,revision:body.revision,syncedAt:now});return true;
      }
      throw failure(404,'Không tìm thấy chức năng.');
    }catch(e){send(res,e.status||500,{error:e.status?e.message:'Máy chủ chưa lưu được dữ liệu. Hãy thử lại sau.'});}
    return true;
  }
  return{handle,close:()=>db.close()};
}
