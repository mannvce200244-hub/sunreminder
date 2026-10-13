import { BackgroundReminders, TIMER_KEY, workerMessage } from './background.js';
import { UsageTracker, formatUsage } from './usage.js';
import { mountRecovery } from './recovery-ui.js';
import { mountAccount } from './user-account.js';
import { mountSharing } from './profile-ui.js';
import { ReminderEngine } from './engine.js';
import { STORAGE_KEY, defaults, dayKey, validateData } from './data.js';
import { SharingClient } from './sharing.js';
const $ = id => document.getElementById(id);
document.querySelectorAll('nav a').forEach(link => link.setAttribute('aria-label',link.querySelector('span').textContent));
let data = defaults(), storageBlocked = false, ownsApp = false, preview = false, installPrompt, toastTimeout, audio;
const engine = new ReminderEngine();
const form = $('settings-form');
let currentDay = dayKey(), previousState;
let sharing, background, sharingUI;
let historyLimit=50;
let timerRestored=false;
function toast(message) { $('toast').textContent=message; $('toast').hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').hidden=true,5500); }
function storageWarning(message) { $('storage-warning').textContent=message;$('storage-warning').hidden=false; }
try { const saved=localStorage.getItem(STORAGE_KEY);if(saved) data=validateData(JSON.parse(saved)); }
catch { storageBlocked=true;storageWarning('Không đọc được dữ liệu đã lưu. Dữ liệu gốc vẫn được giữ; app đang dùng mặc định và chưa ghi đè. Hãy liên hệ Group 4 để hỗ trợ khôi phục; chưa xóa dữ liệu trình duyệt.'); }
engine.configure(data.Settings.IntervalMinutes,data.Settings.BreakSeconds,data.Settings.SnoozeMinutes);
function persist(next) {
  if(!ownsApp) {toast('SunReminder đang được dùng trong cửa sổ khác.');return false;}
  if(storageBlocked) {toast('Chưa thể lưu. Hãy liên hệ Group 4 để kiểm tra dữ liệu gốc.');return false;}
  try {localStorage.setItem(STORAGE_KEY,JSON.stringify(next));data=next;$('storage-warning').hidden=true;sharing?.changed();return true;}
  catch {storageWarning('Không lưu được dữ liệu: bộ nhớ có thể đầy hoặc bị chặn. Chưa đóng app; hãy kiểm tra quyền lưu trữ hoặc liên hệ Group 4.');return false;}
}
const clockText = seconds => {const n=Math.ceil(seconds);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;};
function renderClock() {
  const map={Idle:['Sẵn sàng','ĐẾN LẦN NGHỈ TIẾP THEO','Bắt đầu tập trung','Bạn cứ tập trung. Mình sẽ nhắc bạn nghỉ.'],Running:['Đang tập trung','ĐẾN LẦN NGHỈ TIẾP THEO','Tạm dừng','Từng việc một thôi. Bạn đang làm tốt rồi.'],Snoozed:['Đã tạm hoãn','SẼ NHẮC LẠI SAU','Tạm dừng','Mình sẽ nhắc lại khi bạn sẵn sàng hơn.'],Due:['Đến giờ nghỉ','SẴN SÀNG NHÌN RA XA','Bắt đầu nghỉ','Cho đôi mắt một chút thảnh thơi nhé.'],Breaking:['Đang nghỉ mắt','HÃY NHÌN RA XA','Tạm dừng','Thả lỏng vai. Chớp mắt thật tự nhiên.'],Paused:['Đã tạm dừng','TIẾP TỤC KHI SẴN SÀNG','Tiếp tục','Không vội đâu. Tiếp tục khi bạn sẵn sàng.']};
  const [state,caption,action,hint]=map[engine.state];
  $('timer').textContent=clockText(engine.remaining);$('timer').setAttribute('aria-label',`Còn ${clockText(engine.remaining)}`);
  $('timer-caption').textContent=caption;$('state-badge').lastChild.textContent=state;$('timer-hint').textContent=hint;
  if(previousState !== engine.state) {$('primary').textContent=action;previousState=engine.state;}
  $('dial-progress').style.strokeDashoffset=854.513*(engine.state==='Idle'?1:Math.max(0,engine.remaining/engine.total));
  $('dial').classList.toggle('resting',engine.state==='Breaking'||(engine.state==='Paused'&&engine.pausedState==='Breaking'));
  $('snooze').textContent=`Hoãn ${data.Settings.SnoozeMinutes} phút`;$('snooze').disabled=engine.state==='Idle';$('stop').disabled=engine.state==='Idle';
  $('rest-now').disabled=engine.state==='Breaking';
  if($('reminder-dialog').open&&!preview){$('break-time').textContent=clockText(engine.state==='Due'?engine.rest:engine.remaining);$('begin-break').disabled=engine.state==='Breaking';$('begin-break').textContent=engine.state==='Breaking'?'Đang nghỉ mắt…':'Bắt đầu nghỉ';}
  document.title=engine.state==='Idle'?'SunReminder — Nắng sớm, mắt khỏe':`${engine.state==='Due'?'🔔 ĐẾN GIỜ NGHỈ':clockText(engine.remaining)+' · '+state} — SunReminder`;
  $('reminder-readiness').textContent=(data.Settings.Sound?'Âm thanh: bật. ':'Âm thanh: tắt. ')+(background?.state.enabled?(background.state.pending?'Nhắc nền: đang chờ máy chủ.':'Nhắc nền: đã bật.'):'Nhắc nền: chưa bật; cần bật để được nhắc khi khóa màn hình.');
}
function renderStats() {
  const today=dayKey();const records=data.Breaks.filter(r=>dayKey(new Date(r.CompletedAt))===today);const seconds=records.reduce((s,r)=>s+r.DurationSeconds,0);
  $('today-count').textContent=records.length;
  $('today-duration').replaceChildren(document.createTextNode(seconds<60?String(seconds):String(Math.floor(seconds/60))));
  const unit=document.createElement('span');unit.textContent=seconds<60?' giây':` phút${seconds%60?' '+seconds%60+'s':''}`;$('today-duration').append(unit);
  $('encouragement').textContent=records.length?'Đã check-in nghỉ mắt hôm nay · '+records.length+' lần hoàn thành.':'Chạy hết đồng hồ nghỉ để tự động check-in nghỉ mắt.';
  const done=data.OutdoorDays.includes(today);$('outdoor').classList.toggle('checked',done);$('outdoor').setAttribute('aria-pressed',String(done));$('outdoor').lastChild.textContent=done?'Đã check-in · Bỏ đánh dấu':'Hôm nay tôi đã ra ngoài';$('outdoor-title').textContent=done?'Một khoảng trời đã được ghi lại':'Ra ngoài một chút nhé?';
  $('today-date').textContent=new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
}
function renderHistory() {
  $('history-empty').hidden=data.Breaks.length>0;$('history-table-wrap').hidden=!data.Breaks.length;$('clear-history').disabled=!data.Breaks.length&&!data.OutdoorDays.length;
  const rows=document.createDocumentFragment();
  for(const r of [...data.Breaks].sort((a,b)=>Date.parse(b.CompletedAt)-Date.parse(a.CompletedAt)).slice(0,historyLimit)){
    const row=document.createElement('tr');const date=new Date(r.CompletedAt);
    for(const text of [date.toLocaleDateString('vi-VN'),date.toLocaleTimeString('vi-VN'),`${r.DurationSeconds} giây`,'Đã check-in nghỉ mắt']){const td=document.createElement('td');td.textContent=text;row.append(td);}rows.append(row);
  }$('history-body').replaceChildren(rows);
  $('history-summary').textContent='Đang hiển thị '+Math.min(historyLimit,data.Breaks.length)+' / '+data.Breaks.length+' lần nghỉ.';
  $('history-more').hidden=data.Breaks.length<=historyLimit;
  const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-6+i);return d;});
  const counts=days.map(d=>data.Breaks.filter(r=>dayKey(new Date(r.CompletedAt))===dayKey(d)).length);const max=Math.max(1,...counts);
  $('week-summary').textContent=`${counts.reduce((a,b)=>a+b,0)} lần nghỉ mắt · ${days.filter(d=>data.OutdoorDays.includes(dayKey(d))).length}/7 ngày check-in ngoài trời`;
  const chart=document.createDocumentFragment();days.forEach((d,i)=>{const el=document.createElement('div');el.className=`chart-day${i===6?' today':''}`;const label=d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'});el.setAttribute('aria-label',`${label}: ${counts[i]} lần nghỉ`);const count=document.createElement('b');count.textContent=counts[i];const bar=document.createElement('div');bar.className='bar';bar.style.height=`${counts[i]/max*125+3}px`;const caption=document.createElement('span');caption.textContent=i===6?'Hôm nay':label;el.append(count,bar,caption);chart.append(el);});$('week-chart').replaceChildren(chart);
}
function fillSettings() {
  for(const [key,value] of Object.entries(data.Settings)){const field=form.elements.namedItem(key);if(!field)continue;if(field.type==='checkbox')field.checked=value;else field.value=value;}
  form.elements.MorningTime.value=`${String(data.Settings.MorningHour).padStart(2,'0')}:${String(data.Settings.MorningMinute).padStart(2,'0')}`;
  form.elements.MorningTime.disabled=!data.Settings.MorningReminder;
}
function navigate() {
  const requested=location.hash.slice(1);const page=['focus','history','settings','guide','about'].includes(requested)?requested:'focus';
  document.querySelectorAll('.page').forEach(el=>el.hidden=el.id!==`page-${page}`);
  document.querySelectorAll('nav a').forEach(a=>{const active=a.dataset.page===page;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(page==='history')renderHistory();window.scrollTo({top:0,behavior:'instant'});
}
window.addEventListener('hashchange',()=>{navigate();const heading=document.querySelector('.page:not([hidden]) h1');heading.tabIndex=-1;heading.focus({preventScroll:true});});
let audioReady = false;
function prepareAudio(){try{if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')void audio.resume().catch(()=>{});audioReady=true;}catch{}}
function chime(){if(!data.Settings.Sound||!audioReady||!audio)return;try{if(audio.state==='suspended')void audio.resume().catch(()=>{});for(const [offset,freq] of [[0,660],[.38,880],[.76,660]]){const t=audio.currentTime+offset,tone=audio.createOscillator(),gain=audio.createGain();tone.type='sine';tone.frequency.setValueAtTime(freq,t);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.16,t+.035);gain.gain.exponentialRampToValueAtTime(.0001,t+.32);tone.connect(gain).connect(audio.destination);tone.start(t);tone.stop(t+.34);}}catch{}}
async function notify(title,body,notice=null){
  if(!('Notification'in window)||Notification.permission!=='granted')return;
  if(notice&&Date.now()>notice.deadline+300000)return;
  if(notice){try{await workerMessage({type:'SUN_LOCAL_NOTICE',notice:{...notice,sound:data.Settings.Sound,foregroundSound:!document.hidden&&audioReady&&audio?.state==='running'}});return;}catch{}}
  try{const options={body,icon:'icon-192.png',tag:notice?'sun-'+notice.id:'sunreminder',silent:!data.Settings.Sound||(!document.hidden&&audioReady&&audio?.state==='running'),requireInteraction:true,data:{url:location.origin+'/#focus'}};
    if('serviceWorker'in navigator&&navigator.serviceWorker.controller){const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,options);}
    else {const n=new Notification(title,options);n.onclick=()=>{window.focus();location.hash='focus';n.close();};}
  }catch{toast('Thông báo thiết bị chưa khả dụng. Lời nhắc trong app vẫn hoạt động.');}
}
function closeReminder(){if($('reminder-dialog').open)$('reminder-dialog').close();preview=false;}
function showReminder(isPreview=false){closeReminder();preview=isPreview;$('reminder-title').textContent=isPreview?'Đây là lời nhắc thử':'Cho đôi mắt chút thảnh thơi';$('break-time').textContent=clockText(data.Settings.BreakSeconds);$('begin-break').textContent=isPreview?'Đóng bản thử':'Bắt đầu nghỉ';$('begin-break').disabled=false;$('later-break').hidden=isPreview;$('later-break').textContent=`Hoãn ${data.Settings.SnoozeMinutes} phút`;$('reminder-foot').textContent=isPreview?'Bản thử không đổi đồng hồ và không ghi lịch sử.':'Đóng cửa sổ sẽ hoãn lời nhắc, không ghi hoàn thành.';$('reminder-dialog').showModal();renderClock();}
function startBreak(){prepareAudio();engine.startBreak();if(data.Settings.Popups)showReminder();renderClock();}
function postpone(){engine.postpone();closeReminder();renderClock();}
function dismissReminder(){if(preview)closeReminder();else postpone();}
$('primary').addEventListener('click',()=>{prepareAudio();switch(engine.state){case 'Idle':engine.start();break;case 'Paused':engine.resume();if(engine.state==='Breaking'&&data.Settings.Popups)showReminder();break;case 'Due':startBreak();break;default:engine.pause();closeReminder();}renderClock();});
$('rest-now').addEventListener('click',startBreak);$('snooze').addEventListener('click',postpone);$('stop').addEventListener('click',()=>{engine.stop();closeReminder();renderClock();toast('Đã kết thúc phiên. Bắt đầu lại khi bạn sẵn sàng.');});
$('begin-break').addEventListener('click',()=>{if(preview)closeReminder();else {engine.startBreak();renderClock();}});$('later-break').addEventListener('click',postpone);$('close-reminder').addEventListener('click',dismissReminder);$('reminder-dialog').addEventListener('cancel',e=>{e.preventDefault();dismissReminder();});
engine.onDue=()=>{if(!document.hidden)chime();void notify('Đến giờ nghỉ mắt',`Dành ${data.Settings.BreakSeconds} giây nhìn ra xa. Mở SunReminder khi bạn sẵn sàng.`,{id:engine.phaseId,kind:'due',deadline:engine.deadline*1000});if(data.Settings.Popups&&!document.hidden)showReminder();else toast('Đến giờ nghỉ mắt. Bấm Bắt đầu nghỉ khi bạn sẵn sàng.');};
engine.onComplete=(seconds,completion)=>{closeReminder();if(!document.hidden)chime();if(data.Breaks.some(r=>r.SessionId===completion.id))return;const next=structuredClone(data);next.Breaks.push({CompletedAt:completion.completedAt,DurationSeconds:seconds,SessionId:completion.id});void notify('Đã hết giờ nghỉ mắt','Mở SunReminder để xem check-in.',{id:completion.id,kind:'complete',deadline:Date.parse(completion.completedAt)});const saved=persist(next);if(!saved)data=next;renderStats();renderHistory();toast(saved?'Đã check-in nghỉ mắt! Nhịp tập trung mới bắt đầu.':'Đã nghỉ xong nhưng chưa lưu được check-in. Chưa đóng app; hãy liên hệ Group 4 để được hỗ trợ.');};
$('outdoor').addEventListener('click',()=>{const next=structuredClone(data),today=dayKey();const done=next.OutdoorDays.includes(today);next.OutdoorDays=done?next.OutdoorDays.filter(d=>d!==today):[...next.OutdoorDays,today];if(persist(next)){renderStats();renderHistory();toast(done?'Đã bỏ check-in hôm nay.':'Đã ghi lại một khoảng trời cho hôm nay!');}});
form.elements.MorningReminder.addEventListener('change',()=>form.elements.MorningTime.disabled=!form.elements.MorningReminder.checked);
form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const next=structuredClone(data),p=next.Settings;for(const key of ['IntervalMinutes','BreakSeconds','SnoozeMinutes'])p[key]=Number(form.elements[key].value);for(const key of ['Popups','Sound','MorningReminder'])p[key]=form.elements[key].checked;[p.MorningHour,p.MorningMinute]=form.elements.MorningTime.value.split(':').map(Number);try{validateData(next);}catch(error){toast(error.message);return;}const timing=['IntervalMinutes','BreakSeconds','SnoozeMinutes'].some(k=>p[k]!==data.Settings[k]);if(!persist(next))return;if(timing){engine.configure(p.IntervalMinutes,p.BreakSeconds,p.SnoozeMinutes);closeReminder();}engine.onChange?.();if(!p.Popups)closeReminder();if(p.Sound)prepareAudio();$('save-feedback').textContent=timing?'Đã lưu. Chu kỳ hiện tại đã được đặt lại.':'Đã lưu cài đặt của bạn.';toast($('save-feedback').textContent);renderClock();});
function notificationStatus(){const supported='Notification'in window;$('notification-status').textContent=!supported?'Trình duyệt này chưa hỗ trợ thông báo thiết bị. Hãy dùng cửa sổ nhắc trong app.':Notification.permission==='granted'?'Đã cấp quyền thông báo. Bật nhắc khi chạy nền bên dưới để nhận nhắc từ máy chủ.':Notification.permission==='denied'?'Thông báo đang bị chặn. Bạn có thể đổi quyền trong cài đặt của trình duyệt.':'Thông báo thiết bị là tùy chọn; cửa sổ nhắc vẫn dùng được khi chưa cấp quyền.';$('notification-permission').disabled=!supported||Notification.permission==='granted'||Notification.permission==='denied';}
$('notification-permission').addEventListener('click',async()=>{try{await Notification.requestPermission();notificationStatus();}catch{toast('Không thể yêu cầu quyền ở trình duyệt này.');}});
$('test-notification').addEventListener('click',()=>{prepareAudio();chime();showReminder(true);void notify('Thông báo thử SunReminder','Bản thử không thay đổi chu kỳ và lịch sử.');});
let confirmAction;
function confirmActionDialog(title,message,action,label='Xác nhận'){confirmAction=action;$('confirm-title').textContent=title;$('confirm-message').textContent=message;$('accept-confirm').textContent=label;$('cancel-confirm').hidden=false;$('confirm-dialog').showModal();$('cancel-confirm').focus();}
$('cancel-confirm').addEventListener('click',()=>{$('confirm-dialog').close();confirmAction=null;});$('accept-confirm').addEventListener('click',()=>{const fn=confirmAction;confirmAction=null;$('confirm-dialog').close();fn?.();});$('confirm-dialog').addEventListener('cancel',()=>confirmAction=null);
$('clear-history').addEventListener('click',()=>confirmActionDialog('Xóa lịch sử trên thiết bị này?','Toàn bộ lần nghỉ và check-in sẽ bị xóa. Cài đặt vẫn được giữ. Nếu đang chia sẻ, thống kê máy chủ sẽ được cập nhật theo lịch sử trống khi gửi thành công. Nếu đã ngừng chia sẻ, dùng nút Xóa thống kê đã gửi để xóa trên máy chủ.',()=>{const next={...data,Breaks:[],OutdoorDays:[]};if(persist(next)){renderStats();renderHistory();toast('Đã xóa lịch sử. Cài đặt vẫn được giữ.');}},'Xóa lịch sử'));
$('history-more').addEventListener('click',()=>{historyLimit+=50;renderHistory();});
function installationHelp(){confirmActionDialog('Mang SunReminder theo bạn','Android: Chrome → menu → Cài đặt ứng dụng. iPhone/iPad: Safari → Chia sẻ → Thêm vào Màn hình chính. Mac: dùng tính năng thêm vào Dock hoặc cài ứng dụng của trình duyệt. Cần mở app qua HTTPS (hoặc localhost trên máy tính).',()=>{},'Đã hiểu');$('cancel-confirm').hidden=true;$('accept-confirm').focus();}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
$('install').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}else installationHelp();});
window.addEventListener('appinstalled',()=>{toast('SunReminder đã có trên thiết bị của bạn.');installPrompt=null;});
// Mobile hides the desktop install control; the guide provides the same action.
const mobileInstall=document.createElement('button');mobileInstall.className='btn secondary';mobileInstall.type='button';mobileInstall.textContent='Cài trên thiết bị';mobileInstall.addEventListener('click',()=>$('install').click());$('page-guide').append(mobileInstall);
document.addEventListener('visibilitychange',()=>{
  if(!ownsApp)return;
  engine.tick();background?.update(engine,data.Settings.Sound);
  renderClock();if(!document.hidden){renderStats();if(engine.state==='Due'&&data.Settings.Popups&&!$('reminder-dialog').open)showReminder();}
});
setInterval(()=>{
  if(!ownsApp)return;
  engine.tick();renderClock();if(document.hidden)return;
  if(dayKey()!==currentDay){currentDay=dayKey();renderStats();renderHistory();}
  const p=data.Settings,d=new Date();if(p.MorningReminder&&d.getHours()===p.MorningHour&&d.getMinutes()===p.MorningMinute&&data.LastMorningNotification!==dayKey()){
    const next={...data,LastMorningNotification:dayKey()};if(!persist(next))data=next;toast('Một khoảng trời cho hôm nay: nếu thời tiết phù hợp, ra ngoài nơi có bóng mát nhé.');void notify('Một khoảng trời cho hôm nay','Ra ngoài nơi có bóng mát nếu thời tiết phù hợp. Không nhìn thẳng vào mặt trời.');
  }
},250);
function connection(){ $('connection-label').textContent=navigator.onLine?'Dữ liệu trên thiết bị':'Đang dùng ngoại tuyến'; }
window.addEventListener('online',connection);window.addEventListener('offline',connection);
if('serviceWorker'in navigator&&window.isSecureContext){navigator.serviceWorker.register('./sw.js').then(async reg=>{await navigator.serviceWorker.ready;if(!sessionStorage.getItem('sunreminder.offline-ready')){toast('Đã sẵn sàng dùng ngoại tuyến trên thiết bị này.');sessionStorage.setItem('sunreminder.offline-ready','1');}reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)toast('Có phiên bản mới. Đóng hết cửa sổ SunReminder rồi mở lại để cập nhật.');});});}).catch(()=>toast('Chưa lưu được bản ngoại tuyến. App vẫn hoạt động khi có kết nối.'));}
function otherWindow(){if($('recovery-dialog').open){$('app-shell').inert=true;$('recovery-dialog').addEventListener('close',otherWindow,{once:true});return;}engine.stop();$('app-shell').inert=true;confirmActionDialog('SunReminder đang mở ở cửa sổ khác','Để tránh ghi lịch sử trùng hoặc đè dữ liệu, hãy dùng cửa sổ đang mở. Đóng cửa sổ đó rồi tải lại trang này để tiếp tục.',()=>location.reload(),'Tải lại');$('cancel-confirm').hidden=true;$('confirm-dialog').addEventListener('cancel',e=>e.preventDefault());$('accept-confirm').focus();}
if(navigator.locks){navigator.locks.request('sunreminder-active-window',{ifAvailable:true},async lock=>{if(!lock){otherWindow();return;}ownsApp=true;restoreTimer();sharingUI?.maybeOffer();await new Promise(()=>{});}).catch(()=>{storageWarning('Không khóa được phiên an toàn. Hãy đóng các cửa sổ SunReminder khác rồi tải lại.');$('app-shell').inert=true;});}
else{ownsApp=true;queueMicrotask(()=>{restoreTimer();sharingUI?.maybeOffer();});storageWarning('Trình duyệt này không hỗ trợ khóa nhiều cửa sổ. Chỉ mở một cửa sổ SunReminder để tránh ghi đè lịch sử.');window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY){ownsApp=false;otherWindow();}});}
function sharingStatus(){sharingUI?.render();}
// Credentials are separate from history/backup JSON and never imported from another device.
const safeStorage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
sharing=new SharingClient({storage:safeStorage,getData:()=>data,canSend:()=>ownsApp&&!storageBlocked,onChange:sharingStatus});
$('share-delete').addEventListener('click',()=>confirmActionDialog('Ngừng & xóa dữ liệu đã gửi?','Thống kê, thời gian sử dụng, tên và vị trí của thiết bị này sẽ được xóa khỏi máy chủ Group 4. Lịch sử trên máy vẫn giữ. Khi mất mạng, yêu cầu sẽ chờ gửi lại.',()=>{usageTracker.sample(false);sharing.withdraw();sharingUI.reset();},'Ngừng & xóa'));
window.addEventListener('online',()=>void sharing.flush());setInterval(()=>void sharing.flush(),30000);
sharingStatus(sharing);
const usageEligible=()=>ownsApp&&!storageBlocked&&!document.hidden&&sharing.state.enabled&&sharing.state.usageEnabled&&!sharing.state.pendingDelete;
const usageTracker=new UsageTracker({onSeconds:(day,seconds)=>sharing.addUsage(day,seconds)});
setInterval(()=>{usageTracker.sample(usageEligible());$('usage-local').textContent='Đã ghi trên thiết bị: '+formatUsage(sharing.state.usageDays.reduce((sum,d)=>sum+d.seconds,0))+'. '+(usageEligible()?'Đang ghi khi app hiển thị.':'Đang tắt ghi thời gian.');},5000);
document.addEventListener('visibilitychange',()=>{usageTracker.sample(usageEligible());if(document.hidden)void sharing.flush();});
window.addEventListener('pagehide',()=>{usageTracker.sample(false);void sharing.flush();});
window.addEventListener('pageshow',()=>usageTracker.sample(usageEligible()));

function backgroundStatus(client){$('background-status').textContent=client.message;$('background-enable').disabled=client.blocked||client.state.enabled;$('background-disable').disabled=!client.state.enabled;if(changingBackground){$('background-enable').disabled=true;$('background-disable').disabled=true;}}
background=new BackgroundReminders({storage:safeStorage,onChange:backgroundStatus});
engine.onChange=()=>{if(!ownsApp)return;try{safeStorage.setItem(TIMER_KEY,JSON.stringify(engine.snapshot()));}catch{toast('Chưa lưu được đồng hồ để mở lại. Hãy kiểm tra bộ nhớ thiết bị.');}background.update(engine,data.Settings.Sound);};
function restoreTimer(){if(timerRestored)return;timerRestored=true;try{const saved=safeStorage.getItem(TIMER_KEY);if(saved)engine.restore(JSON.parse(saved));}catch{}engine.tick();background?.update(engine,data.Settings.Sound);renderClock();}
let changingBackground=false;
async function changeBackground(enable){if(!ownsApp||changingBackground)return;changingBackground=true;$('background-enable').disabled=true;$('background-disable').disabled=true;try{if(enable){await background.enable();background.update(engine,data.Settings.Sound);}else await background.disable();notificationStatus();}catch(error){background.message=error.message;toast(error.message);}finally{changingBackground=false;backgroundStatus(background);}}
$('quick-reminders').addEventListener('click',async()=>{if(!ownsApp||changingBackground)return;prepareAudio();const next=structuredClone(data);next.Settings.Sound=true;if(!persist(next))return;fillSettings();chime();$('quick-reminders').disabled=true;try{await changeBackground(true);}finally{$('quick-reminders').disabled=false;renderClock();}});
$('quick-test').addEventListener('click',()=>{prepareAudio();chime();void notify('Thông báo thử SunReminder','Nếu chưa thấy thông báo hoặc nghe tiếng, kiểm tra quyền thông báo và Không làm phiền của thiết bị.');toast(data.Settings.Sound?'Đã thử chuông và thông báo.':'Âm thanh đang tắt. Chọn Bật chuông & nhắc nền để bật.');});
$('background-enable').addEventListener('click',()=>void changeBackground(true));
$('background-disable').addEventListener('click',()=>void changeBackground(false));
window.addEventListener('online',()=>{if(ownsApp){background.update(engine,data.Settings.Sound);void background.flush();}});
setInterval(()=>{if(ownsApp)void background.flush();},30000);
window.addEventListener('pagehide',()=>{if(ownsApp)engine.onChange();});
window.addEventListener('pageshow',()=>{if(ownsApp){engine.tick();renderClock();}});
navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='SUN_OPEN_FOCUS')location.hash='focus';if(ownsApp&&['SUN_TIMER_WAKE','SUN_OPEN_FOCUS'].includes(event.data?.type)){engine.tick();renderClock();}});
backgroundStatus(background);
let recoveryUI;
const account=mountAccount({onUserChanged:()=>{void recoveryUI?.refresh();},onSignedIn:user=>toast('Chào '+user.displayName+'! Bạn đã đăng nhập.')});
recoveryUI=mountRecovery(account,{onNotice:toast});
sharingUI=mountSharing(sharing,{storage:safeStorage,getUser:account.getUser,canChange:()=>ownsApp&&!storageBlocked,onBeforeChange:()=>usageTracker.sample(false),onAfterChange:()=>usageTracker.sample(usageEligible())});
fillSettings();notificationStatus();renderStats();renderHistory();renderClock();navigate();connection();
