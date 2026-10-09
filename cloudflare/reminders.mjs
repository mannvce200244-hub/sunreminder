import { buildPushPayload } from '@block65/webcrypto-web-push';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const bad=()=>{throw Object.assign(Error('Lịch nhắc hoặc đăng ký thông báo chưa hợp lệ.'),{status:400});};
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
export function validateReminder(body,now=Date.now()){
 if(!body||!Number.isSafeInteger(body.revision)||body.revision<1)bad();
 if(body.task===null)return{revision:body.revision,task:null};
 const t=body.task,s=body.subscription;let endpoint;try{endpoint=new URL(s.endpoint);}catch{bad();}
 const allowed=endpoint.hostname==='fcm.googleapis.com'||endpoint.hostname==='updates.push.services.mozilla.com'||endpoint.hostname.endsWith('.push.services.mozilla.com')||endpoint.hostname==='web.push.apple.com'||endpoint.hostname.endsWith('.notify.windows.com');
 if(endpoint.protocol!=='https:'||endpoint.port||endpoint.username||endpoint.password||endpoint.hash||!allowed||s.endpoint.length>2048||!s.keys||!/^[A-Za-z0-9_-]{87}$/.test(s.keys.p256dh)||!/^[A-Za-z0-9_-]{22}$/.test(s.keys.auth))bad();
 if(!t||!['due','complete'].includes(t.kind)||!/^[-a-zA-Z0-9]{16,64}$/.test(t.id)||!Number.isFinite(t.deadline)||t.deadline<now-30000||t.deadline>now+121*60000||typeof t.sound!=='boolean')bad();
 return{revision:body.revision,subscription:{endpoint:endpoint.href,expirationTime:null,keys:{p256dh:s.keys.p256dh,auth:s.keys.auth}},task:{id:t.id,kind:t.kind,deadline:t.deadline,sound:t.sound}};
}
export class ReminderScheduler {
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 async keys(){return this.ctx.blockConcurrencyWhile(async()=>{let keys=await this.ctx.storage.get('keys');if(!keys){const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const jwk=await crypto.subtle.exportKey('jwk',pair.privateKey);keys={publicKey:b64(await crypto.subtle.exportKey('raw',pair.publicKey)),privateKey:jwk.d,subject:'https://sunreminder.mannvce200244.workers.dev'};await this.ctx.storage.put('keys',keys);}return keys;});}
 async fetch(request){try{if(new URL(request.url).pathname==='/keys')return json(await this.keys());const body=validateReminder(await request.json());return this.ctx.blockConcurrencyWhile(async()=>{const revision=await this.ctx.storage.get('revision')||0;if(body.revision<=revision)return json({ok:true,revision,stale:true});await this.ctx.storage.put('revision',body.revision);if(body.task){await this.ctx.storage.put('job',{...body,attempt:0});await this.ctx.storage.setAlarm(Math.max(Date.now()+10,body.task.deadline));}else{await this.ctx.storage.delete('job');await this.ctx.storage.deleteAlarm();}return json({ok:true,revision:body.revision,scheduled:!!body.task});});}catch(error){return json({error:error.status?error.message:'Chưa lưu được lịch nhắc.'},error.status||503);}}
 async alarm(){
  const job=await this.ctx.blockConcurrencyWhile(async()=>{const item=await this.ctx.storage.get('job');if(item)await this.ctx.storage.delete('job');return item;});
  if(!job||Date.now()>job.task.deadline+300000)return;
  try{
   const keys=await(await this.env.REMINDERS.get(this.env.REMINDERS.idFromName('vapid-keys')).fetch('https://internal/keys')).json();
   const payload=await buildPushPayload({data:{id:job.task.id,kind:job.task.kind,deadline:job.task.deadline,sound:job.task.sound},options:{ttl:300,urgency:'high'}},job.subscription,keys);
   if(await this.ctx.storage.get('revision')!==job.revision)return;
   const response=await fetch(job.subscription.endpoint,{...payload,redirect:'error',signal:AbortSignal.timeout(10000)});
   if(response.status===404||response.status===410)return;
   if(!response.ok)throw Error('Push service unavailable');
  }catch{
   // At most two retries, and never after a newer schedule or cancellation.
   await this.ctx.blockConcurrencyWhile(async()=>{if(job.attempt>=2||Date.now()>job.task.deadline+120000||await this.ctx.storage.get('revision')!==job.revision)return;await this.ctx.storage.put('job',{...job,attempt:job.attempt+1});await this.ctx.storage.setAlarm(Date.now()+30000);});
  }
 }
}
