export const USAGE_CONSENT_VERSION='group4-usage-v1';
export const USAGE_SCHEMA='CREATE TABLE IF NOT EXISTS usage_daily (participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,day TEXT NOT NULL,seconds INTEGER NOT NULL,PRIMARY KEY(participant_id,day))';
export function usageFromPayload(value){
 if(!Object.hasOwn(value,'usageDays'))return undefined;
 const fail=()=>{throw Object.assign(Error('Thời gian sử dụng hoặc lựa chọn đồng ý chưa hợp lệ.'),{status:400});};
 if(value.usageConsentVersion!==USAGE_CONSENT_VERSION||!Array.isArray(value.usageDays)||value.usageDays.length>4000)fail();
 const seen=new Set(),tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
 return value.usageDays.map(d=>{if(!d||typeof d.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d.day)||!Number.isFinite(Date.parse(d.day))||new Date(d.day).toISOString().slice(0,10)!==d.day||d.day<'2000-01-01'||d.day>tomorrow||seen.has(d.day)||!Number.isInteger(d.seconds)||d.seconds<1||d.seconds>86400)fail();seen.add(d.day);return{day:d.day,seconds:d.seconds};});
}
export function formatUsage(seconds){const s=Math.max(0,Math.floor(seconds||0)),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?h+' giờ '+m+' phút':m?m+' phút '+s%60+' giây':s+' giây';}
export function addUsageReport(report,rows){const byDevice=new Map(),byDay=new Map();for(const r of rows){byDevice.set(r.participant_id,(byDevice.get(r.participant_id)||0)+r.seconds);byDay.set(r.day,(byDay.get(r.day)||0)+r.seconds);}report.totals.usageSeconds=rows.reduce((n,r)=>n+r.seconds,0);report.participants=report.participants.map(p=>({...p,usageSeconds:byDevice.get(p.id)||0}));report.usageDays=[...byDay].sort(([a],[b])=>a.localeCompare(b)).map(([day,seconds])=>({day,seconds}));return report;}
export const EXPORT_SQL='WITH activity AS (SELECT participant_id,day FROM daily UNION SELECT participant_id,day FROM usage_daily) SELECT a.participant_id,a.day,COALESCE(d.break_count,0) break_count,COALESCE(d.rest_seconds,0) rest_seconds,COALESCE(d.outdoor,0) outdoor,pr.profile_json,COALESCE(u.seconds,0) usage_seconds FROM activity a LEFT JOIN daily d ON d.participant_id=a.participant_id AND d.day=a.day LEFT JOIN usage_daily u ON u.participant_id=a.participant_id AND u.day=a.day LEFT JOIN participant_profiles pr ON pr.participant_id=a.participant_id WHERE a.day BETWEEN ? AND ? ORDER BY a.day DESC,a.participant_id';
// Clock gaps (sleep/throttling) are discarded rather than counted as foreground use.
export class UsageTracker {
 constructor({clock=()=>Date.now(),monotonic=()=>performance.now(),onSeconds}){Object.assign(this,{clock,monotonic,onSeconds});this.last=null;this.active=false;this.remainders=new Map();}
 sample(active){const wall=this.clock(),mono=this.monotonic(),previous=this.last;this.last={wall,mono};const wasActive=this.active;this.active=active;
  if(!wasActive||!previous)return;
  const elapsed=mono-previous.mono,wallElapsed=wall-previous.wall;
  if(elapsed<=0||elapsed>15000||wallElapsed<=0||Math.abs(elapsed-wallElapsed)>1500)return;
  let cursor=previous.wall;
  while(cursor<wall){const d=new Date(cursor),day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');const midnight=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime();const end=Math.min(wall,midnight),ms=(this.remainders.get(day)||0)+(end-cursor),seconds=Math.floor(ms/1000);this.remainders.set(day,ms%1000);if(seconds)this.onSeconds(day,seconds);cursor=end;}
 }
}
