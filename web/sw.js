importScripts('./notification-store.js');
const {claimNotice,updateNoticeState}=self.SunNotificationStore;
const CACHE = 'sunreminder-shell-v3-7';
const SHELL = ['./','./index.html','./styles.css','./app.js','./engine.js','./data.js','./analytics.js','./sharing.js','./profile.js','./profile-ui.js','./user-account.js','./usage.js','./background.js','./notification-store.js','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./manifest.webmanifest'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))));
// Updates activate after all old windows close, never halfway through a focus session.
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sunreminder-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', e => {
  const url=new URL(e.request.url);
  if(e.request.method !== 'GET' || url.origin !== self.location.origin || /\/(api|admin)(\/|\.|-|$)/.test(url.pathname)) return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});


async function showTimerNotice(notice,remote){if(!await claimNotice(notice,remote))return;const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const visible=windows.some(c=>c.visibilityState==='visible');const complete=notice.kind==='complete';await self.registration.showNotification(complete?'Đã hết giờ nghỉ mắt':'Đến giờ nghỉ mắt',{body:complete?'Bạn đã hoàn thành thời gian nghỉ. Mở SunReminder để xem check-in.':'Dừng tay một chút, nhìn ra xa và cho đôi mắt nghỉ ngơi nhé.',icon:'./icon-192.png',badge:'./icon-192.png',tag:'sun-'+notice.id,renotify:false,silent:visible||!notice.sound,data:{url:new URL('./#focus',self.registration.scope).href}});for(const client of windows)client.postMessage({type:'SUN_TIMER_WAKE'});}
self.addEventListener('push',event=>{event.waitUntil((async()=>{let notice;try{notice=event.data.json();}catch{return;}await showTimerNotice(notice,true);})());});
self.addEventListener('message',event=>{const message=event.data;event.waitUntil((async()=>{try{if(message?.type==='SUN_CAPABILITIES'){event.ports[0]?.postMessage({ok:true});return;}if(message?.type==='SUN_PHASE'){if(message.phaseId!==null&&!/^[-a-zA-Z0-9]{16,64}$/.test(message.phaseId))return;await updateNoticeState(state=>{state.phaseId=message.phaseId;state.enabled=!!message.enabled;});}else if(message?.type==='SUN_LOCAL_NOTICE')await showTimerNotice(message.notice,false);else return;event.ports[0]?.postMessage({ok:true});}catch{event.ports[0]?.postMessage({ok:false});}})());});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const root=new URL('./',self.registration.scope);const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});const current=clients.find(c=>{const u=new URL(c.url);return u.origin===root.origin&&u.pathname===root.pathname;});if(current){await current.focus();current.postMessage({type:'SUN_OPEN_FOCUS'});}else await self.clients.openWindow(root.href+'#focus');})());});
