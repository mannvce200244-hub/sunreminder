// One form saves consent, usage and optional profile together. GPS stays an explicit action.
export function mountSharing(sharing,{getUser=()=>null,canChange=()=>true,onBeforeChange=()=>{},onAfterChange=()=>{},request=(...args)=>fetch(...args)}={}){
  const $=id=>document.getElementById(id);
  let location=sharing.state.profile?.location||null,requestId=0,checking=false,locating=false,hadIdentity=!!sharing.state.participantId;
  $('share-consent').checked=sharing.state.enabled;
  $('device-name').value=sharing.state.profile?.deviceName||'';
  $('location-consent').checked=!!location;
  function message(text){$('sharing-feedback').textContent=text;}
  function preview(){const p=location;$('location-preview').textContent=p?'Vĩ độ '+p.latitude.toFixed(5)+' · Kinh độ '+p.longitude.toFixed(5)+' · Sai số khoảng '+Math.round(p.accuracy)+' m · '+new Date(p.capturedAt).toLocaleString('vi-VN'):'Không gửi vị trí. Bạn vẫn chia sẻ được thống kê và thời gian.';}
  function render(){
    const s=sharing.state;
    if(hadIdentity&&!s.participantId){$('share-consent').checked=false;$('device-name').value='';$('location-consent').checked=false;location=null;requestId++;locating=false;preview();}
    hadIdentity=!!s.participantId;
    const unavailable=sharing.blocked||s.pendingDelete;
    $('share-consent').disabled=!!unavailable;
    $('sharing-options').disabled=!!unavailable||!$('share-consent').checked||checking;
    $('share-save').disabled=!!unavailable||!$('share-consent').checked||checking||locating;
    $('share-save').textContent=checking?'Đang kiểm tra…':s.enabled?'Lưu & gửi lựa chọn':'Bật chia sẻ';
    $('share-delete').disabled=!s.participantId||s.pendingDelete;
    $('get-location').hidden=!$('location-consent').checked;
    $('get-location').disabled=locating||checking;
    $('sharing-status').textContent=sharing.message+(s.lastSync?' Lần gửi gần nhất: '+new Date(s.lastSync).toLocaleString('vi-VN')+'.':'');
    $('sharing-summary').textContent=s.enabled?(s.usageEnabled?'Đang chia sẻ thống kê và thời gian sử dụng.':'Đang giữ lựa chọn cũ: chỉ chia sẻ thống kê. Bấm Lưu & gửi để thêm thời gian sử dụng.'):'Bạn đang dùng app riêng tư. Chia sẻ là tùy chọn.';
  }
  function getLocation(){
    if(!canChange()||!$('share-consent').checked)return;
    if(!window.isSecureContext||!navigator.geolocation){$('location-consent').checked=false;location=null;preview();message('Thiết bị chưa hỗ trợ vị trí. Bạn vẫn có thể lưu thống kê và thời gian.');render();return;}
    const id=++requestId;locating=true;message('Đang xin quyền vị trí…');render();
    navigator.geolocation.getCurrentPosition(position=>{if(id!==requestId)return;locating=false;location={latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,capturedAt:new Date(position.timestamp).toISOString()};preview();message('Đã lấy vị trí để xem trước. Bấm nút lưu chung bên dưới để gửi.');render();},error=>{if(id!==requestId)return;locating=false;location=null;$('location-consent').checked=false;preview();message(error.code===1?'Bạn chưa cho phép vị trí. Vẫn có thể lưu thống kê và thời gian.':'Chưa lấy được vị trí. Bạn có thể thử lại hoặc lưu không kèm vị trí.');render();},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }
  $('location-consent').addEventListener('change',()=>{if($('location-consent').checked)getLocation();else{requestId++;locating=false;location=null;preview();message('Đã bỏ vị trí khỏi lựa chọn. Bấm Lưu & gửi để xóa vị trí đã gửi trên dashboard.');render();}});
  $('get-location').addEventListener('click',getLocation);
  $('share-consent').addEventListener('change',()=>{if(!canChange())return;requestId++;locating=false;checking=false;if(!$('share-consent').checked){onBeforeChange();sharing.stop();onAfterChange();message('Đã ngừng gửi mới. Dữ liệu đã gửi vẫn giữ; bạn có thể xóa trong Quản lý dữ liệu đã gửi.');}else message('Thống kê và thời gian chỉ bắt đầu chia sẻ sau khi bạn bấm Bật chia sẻ.');render();});
  $('sharing-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!canChange()||!$('share-consent').checked||checking||locating||sharing.blocked||sharing.state.pendingDelete)return;
    const id=++requestId;checking=true;render();
    try{
      if(!sharing.state.enabled){const response=await request('/api/config',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('Chưa kết nối được máy chủ. Hãy thử lại khi có mạng.');const config=await response.json();if(!config.enabled||config.consentVersion!=='group4-stats-v1')throw Error('Máy chủ chưa sẵn sàng. Bạn vẫn dùng đồng hồ bình thường.');}
      if(id!==requestId||!$('share-consent').checked||!canChange())return;
      const name=$('device-name').value.trim(),displayName=getUser()?.displayName||null,selectedLocation=$('location-consent').checked?location:null;
      if($('location-consent').checked&&!selectedLocation)throw Error('Chọn lại vị trí hoặc bỏ chọn vị trí trước khi lưu.');
      const profile=name||displayName||selectedLocation?{deviceName:name||'Thiết bị web',displayName,location:selectedLocation,consentedAt:new Date().toISOString()}:null;
      onBeforeChange();const saved=sharing.enableCombined(profile);onAfterChange();
      message(saved?'Đã lưu lựa chọn chung. Xem trạng thái gửi bên dưới.':'Chưa lưu được lựa chọn; chưa áp dụng thay đổi.');
    }catch(error){if(id===requestId)message(error.message);}finally{if(id===requestId){checking=false;render();}}
  });
  preview();render();
  return{render,reset(){requestId++;checking=false;locating=false;$('share-consent').checked=false;render();}};
}
