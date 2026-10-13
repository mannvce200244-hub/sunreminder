export function mountRecovery(account,{onNotice=()=>{}}={}){
 const $=id=>document.getElementById(id),dialog=$('recovery-dialog');
 let busy=false,kind='reset',generation=0,profileGeneration=0,challenge=null,legacyToken=null;
 const message=text=>$('recovery-status').textContent=text;
 function clearSecrets(){challenge=null;legacyToken=null;$('recovery-code').value='';$('recovery-new-password').value='';$('recovery-confirm-password').value='';}
 function open(){if($('account-dialog').open)$('account-dialog').close();if(!dialog.open)dialog.showModal();}
 function mode(next,stage='code'){
  kind=next;$('recovery-title').textContent=next==='verify'?'Nhập mã xác minh email':'Lấy lại mật khẩu';
  $('recovery-request-form').hidden=next==='verify'||stage==='code';$('recovery-reset-form').hidden=stage!=='code';
  $('recovery-password-row').hidden=next==='verify';$('recovery-new-password').required=next!=='verify';$('recovery-confirm-password').required=next!=='verify';$('recovery-confirm-row').hidden=next==='verify';
  $('recovery-code-row').hidden=!!legacyToken;$('recovery-code').required=!legacyToken;
  $('recovery-apply').textContent=next==='verify'?'Xác minh & vào app':'Đặt mật khẩu mới';
  $('recovery-retry').hidden=!!legacyToken||stage!=='code';
 }
 function readLink(){
  const match=(window.location.hash||'').match(/^#(verify-email|reset-password)=([a-f0-9]{64})$/);if(!match)return;
  generation++;clearSecrets();legacyToken=match[2];mode(match[1]==='verify-email'?'verify':'reset');
  window.history.replaceState(null,'',window.location.pathname+window.location.search+'#focus');open();message('Xác nhận để hoàn tất. Liên kết cũ vẫn dùng được trong thời hạn 15 phút.');
 }
 async function refresh(){
  const turn=++profileGeneration;$('recovery-current-password').value='';$('recovery-email-status').textContent='';
  if(!account.getUser()){generation++;clearSecrets();return;}
  try{const result=await account.request('recovery/status',{},true);if(turn!==profileGeneration)return;
   $('recovery-email-status').textContent=(result.email?'Đã xác minh: '+result.email+'. Bạn có thể dùng email này để đăng nhập.':'Thêm email để đăng nhập bằng email và lấy lại mật khẩu khi cần.')+(result.enabled?'':' Group 4 chưa bật gửi thư.');
   if(result.email)$('recovery-email').value=result.email;
  }catch(error){if(turn===profileGeneration)$('recovery-email-status').textContent=error.message;}
 }
 $('account-forgot').addEventListener('click',()=>{generation++;clearSecrets();mode('reset','request');$('recovery-username').value=$('account-username').value;message('Nhập tên đăng nhập hoặc email đã xác minh để nhận mã 6 số.');open();});
 $('account-dialog').addEventListener('close',()=>{generation++;$('recovery-current-password').value='';});
 $('recovery-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{generation++;clearSecrets();});
 $('recovery-retry').addEventListener('click',()=>{if(busy)return;generation++;clearSecrets();if(kind==='reset'){mode('reset','request');message('Yêu cầu mã mới rồi kiểm tra thư mới nhất.');}else{dialog.close();$('account-dialog').showModal();$('recovery-email-status').textContent='Nhập lại mật khẩu và bấm Gửi mã xác minh để nhận mã mới.';}});
 $('recovery-email-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;$('recovery-email-send').disabled=true;const turn=generation;
  try{const result=await account.request('recovery/email',{email:$('recovery-email').value.trim(),password:$('recovery-current-password').value,codeFormat:'otp6'},true);if(turn!==generation)return;
   clearSecrets();challenge=result.challenge;mode('verify');open();message(result.message);$('recovery-code').focus();
  }catch(error){if(turn===generation)$('recovery-email-status').textContent=error.message;}
  finally{busy=false;$('recovery-email-send').disabled=false;$('recovery-current-password').value='';}
 });
 $('recovery-request-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;const turn=generation;$('recovery-send').disabled=true;
  try{const result=await account.request('recovery/request',{identifier:$('recovery-username').value.trim(),codeFormat:'otp6'});if(turn!==generation)return;
   clearSecrets();challenge=result.challenge;mode('reset');message(result.message);$('recovery-code').focus();
  }catch(error){if(turn===generation)message(error.message);}finally{busy=false;$('recovery-send').disabled=false;}
 });
 $('recovery-reset-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  if(!legacyToken&&(!challenge||!/^\d{6}$/.test($('recovery-code').value.trim()))){message('Nhập đúng mã gồm 6 số trong email.');return;}
  if(kind==='reset'&&$('recovery-new-password').value!==$('recovery-confirm-password').value){message('Hai mật khẩu mới chưa khớp.');return;}
  busy=true;const turn=generation,currentKind=kind;$('recovery-apply').disabled=true;
  try{const result=await account.request('recovery/'+(currentKind==='verify'?'verify':'reset'),{...(legacyToken?{token:legacyToken}:{challenge,code:$('recovery-code').value.trim()}),...(currentKind==='reset'?{password:$('recovery-new-password').value}:{})});if(turn!==generation)return;
   dialog.close();clearSecrets();onNotice(result.message);
   if(currentKind==='reset'){account.forget();account.openLogin?.();}else void refresh();
  }catch(error){if(turn===generation)message(error.message);}finally{busy=false;$('recovery-apply').disabled=false;}
 });
 window.addEventListener('hashchange',readLink);readLink();return{refresh};
}
