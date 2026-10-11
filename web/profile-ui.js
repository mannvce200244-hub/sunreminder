// Consent is offered once, without requesting GPS or sending data on page load.
export const SHARING_CHOICE_KEY='sunreminder.sharing-choice.v1';
export function mountSharing(sharing,{storage=localStorage,getUser=()=>null,canChange=()=>true,onBeforeChange=()=>{},onAfterChange=()=>{},request=(...args)=>fetch(...args)}={}){
  const $=id=>document.getElementById(id),dialog=$('sharing-dialog');
  let location=null,requestId=0,checking=false,locating=false,decided=false,manual=false;
  try{decided=!!storage.getItem(SHARING_CHOICE_KEY);}catch{decided=true;}
  // Respect older consent (including stopped sharing), rather than expanding it silently.
  const prior=sharing.state;
  if(prior.enabled||prior.participantId||prior.profileConfigured||prior.usageConfigured||prior.pendingDelete)remember('existing');
  function remember(choice){
    decided=true;
    try{storage.setItem(SHARING_CHOICE_KEY,choice);}catch{$('sharing-choice-status').textContent='Chưa ghi nhớ được lựa chọn trên thiết bị. App có thể hỏi lại lần mở sau; chưa bật chia sẻ nếu bạn chưa đồng ý.';}
  }
  function message(text){$('sharing-feedback').textContent=text;}
  function preview(){
    const p=location;$('location-preview').hidden=!p;
    $('location-preview').textContent=p?'Vĩ độ '+p.latitude.toFixed(5)+' · Kinh độ '+p.longitude.toFixed(5)+' · Sai số khoảng '+Math.round(p.accuracy)+' m · '+new Date(p.capturedAt).toLocaleString('vi-VN'):'';
  }
  function render(){
    const s=sharing.state,unavailable=!canChange()||sharing.blocked||s.pendingDelete;
    $('sharing-options').disabled=!!unavailable||checking;
    $('share-save').disabled=!!unavailable||checking||locating;
    $('share-save').textContent=checking?'Đang kiểm tra…':s.enabled?'Lưu & gửi lựa chọn':'Đồng ý chia sẻ';
    $('share-manage').disabled=!!unavailable;
    $('share-stop').hidden=!s.enabled;$('share-stop').disabled=!canChange();
    $('share-delete').disabled=!canChange()||!s.participantId||s.pendingDelete;
    $('get-location').hidden=!$('location-consent').checked;
    $('get-location').disabled=locating||checking;
    $('sharing-status').textContent=sharing.message+(s.lastSync?' Lần gửi gần nhất: '+new Date(s.lastSync).toLocaleString('vi-VN')+'.':'');
    $('sharing-summary').textContent=s.enabled?(s.usageEnabled?'Đang chia sẻ thống kê và thời gian sử dụng.':'Đang giữ lựa chọn cũ: chỉ chia sẻ thống kê. Mở Đổi lựa chọn chia sẻ nếu muốn thêm thời gian.'):'Bạn đang dùng app riêng tư. Chia sẻ là tùy chọn.';
  }
  function open(isManual=false){
    if(!canChange()||sharing.blocked||sharing.state.pendingDelete||document.hidden||document.querySelector('dialog[open]'))return;
    manual=isManual;requestId++;checking=false;locating=false;location=sharing.state.profile?.location||null;
    $('device-name').value=sharing.state.profile?.deviceName||'';$('location-consent').checked=!!location;
    const displayName=getUser()?.displayName;
    $('device-help').textContent=displayName?'Khi đồng ý, tên tài khoản “'+displayName+'” cũng được gửi cùng thống kê.':'Để trống tên thiết bị nếu bạn muốn. Không cần đăng nhập để chia sẻ.';
    $('sharing-later').textContent=sharing.state.enabled?'Hủy thay đổi':'Để sau';
    $('sharing-dialog-title').textContent=isManual?'Lựa chọn chia sẻ của bạn':'Bạn có muốn chia sẻ cùng nhóm?';
    message('');preview();render();dialog.showModal();$('sharing-dialog-title').focus();
  }
  function maybeOffer(){render();if(!decided)open();}
  function close(){
    requestId++;checking=false;locating=false;
    if(dialog.open)dialog.close();
    (manual?$('share-manage'):$('primary')).focus();render();
  }
  function defer(){remember('later');close();}
  function getLocation(){
    if(!canChange()||!dialog.open||checking)return;
    if(!window.isSecureContext||!navigator.geolocation){$('location-consent').checked=false;location=null;preview();message('Thiết bị chưa hỗ trợ vị trí. Bạn vẫn có thể đồng ý chia sẻ thống kê và thời gian.');render();return;}
    const id=++requestId;locating=true;message('Đang xin quyền vị trí…');render();
    navigator.geolocation.getCurrentPosition(position=>{
      if(id!==requestId||!dialog.open||!canChange())return;
      locating=false;location={latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,capturedAt:new Date(position.timestamp).toISOString()};
      preview();message('Đã lấy vị trí để xem trước. Chỉ gửi sau khi bạn đồng ý bên dưới.');render();
    },error=>{
      if(id!==requestId||!dialog.open||!canChange())return;
      locating=false;location=null;$('location-consent').checked=false;preview();
      message(error.code===1?'Bạn chưa cho phép vị trí. Vẫn có thể đồng ý chia sẻ thống kê và thời gian.':'Chưa lấy được vị trí. Bạn có thể thử lại hoặc đồng ý chia sẻ không kèm vị trí.');render();
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }
  $('location-consent').addEventListener('change',()=>{if($('location-consent').checked)getLocation();else{requestId++;locating=false;location=null;preview();message('Không kèm vị trí. Bấm nút đồng ý hoặc lưu bên dưới để áp dụng.');render();}});
  $('get-location').addEventListener('click',getLocation);
  $('share-manage').addEventListener('click',()=>open(true));
  $('sharing-later').addEventListener('click',defer);$('sharing-close').addEventListener('click',defer);
  dialog.addEventListener('cancel',event=>{event.preventDefault();defer();});
  $('share-stop').addEventListener('click',()=>{if(!canChange())return;remember('stopped');onBeforeChange();sharing.stop();onAfterChange();render();});
  $('sharing-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!dialog.open||!canChange()||checking||locating||sharing.blocked||sharing.state.pendingDelete)return;
    const id=++requestId;checking=true;render();
    try{
      if(!sharing.state.enabled){const response=await request('/api/config',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('Chưa kết nối được máy chủ. Hãy thử lại khi có mạng, hoặc chọn Để sau để dùng app.');const config=await response.json();if(!config.enabled||config.consentVersion!=='group4-stats-v1')throw Error('Máy chủ chưa sẵn sàng. Bạn vẫn dùng đồng hồ bình thường.');}
      if(id!==requestId||!dialog.open||!canChange())return;
      const name=$('device-name').value.trim(),displayName=getUser()?.displayName||null,selectedLocation=$('location-consent').checked?location:null;
      if($('location-consent').checked&&!selectedLocation)throw Error('Chọn lại vị trí hoặc bỏ chọn vị trí trước khi lưu.');
      const profile=name||displayName||selectedLocation?{deviceName:name||'Thiết bị web',displayName,location:selectedLocation,consentedAt:new Date().toISOString()}:null;
      onBeforeChange();const saved=sharing.enableCombined(profile);onAfterChange();
      if(saved){remember('accepted');close();}else message('Chưa lưu được lựa chọn; chưa bật chia sẻ. Bạn có thể thử lại hoặc chọn Để sau.');
    }catch(error){if(id===requestId)message(error.message);}finally{if(id===requestId){checking=false;render();}}
  });
  // Wait for the active tab and for other dialogs to close instead of stacking prompts.
  document.addEventListener('visibilitychange',maybeOffer);
  document.addEventListener('close',()=>queueMicrotask(maybeOffer),true);
  render();
  return{render,maybeOffer,reset(){remember('withdrawn');if(dialog.open)close();else{requestId++;checking=false;locating=false;render();}}};
}
