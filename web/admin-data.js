import {STORAGE_KEY,defaults,validateData,mergeData,dayKey} from './data.js';
import {TIMER_KEY,PUSH_KEY,BackgroundReminders} from './background.js';
export function downloadData(content,name,type='application/json'){
  const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export class AdminDataTools {
  constructor({session,storage=localStorage,locks=navigator.locks,download=downloadData,cancelTimer=()=>new BackgroundReminders({storage}).update({state:'Idle',phaseId:null},false)}){Object.assign(this,{session,storage,locks,download,cancelTimer});}
  async authorize(){const generation=this.session.generation;const response=await this.session.fetch('/api/admin/stats');if(!response.ok||!this.session.check()||generation!==this.session.generation)throw Error('Vui lòng đăng nhập quản trị lại trước khi dùng công cụ dữ liệu.');return generation;}
  current(){const raw=this.storage.getItem(STORAGE_KEY);return raw?validateData(JSON.parse(raw)):defaults();}
  async backup(){const generation=await this.authorize();const content=this.storage.getItem(STORAGE_KEY)||JSON.stringify(defaults(),null,2);if(generation!==this.session.generation||!this.session.check())throw Error('Phiên đã khóa.');this.download(content,'SunReminder-local-'+dayKey()+'.json');}
  async importData(incoming){
    const clean=validateData(incoming);const generation=await this.authorize();
    if(!this.locks)throw Error('Trình duyệt chưa hỗ trợ nhập an toàn. Hãy dùng Chrome, Edge hoặc Safari bản mới.');
    return this.locks.request('sunreminder-active-window',{ifAvailable:true},async lock=>{
      if(!lock)throw Error('Hãy đóng các cửa sổ app người dùng trên thiết bị này trước khi nhập.');
      if(generation!==this.session.generation||!this.session.check())throw Error('Phiên đã khóa. Vui lòng đăng nhập lại.');
      const current=this.current(),next=mergeData(current,clean);
      this.download(JSON.stringify(current,null,2),'SunReminder-before-import-'+dayKey()+'.json');
      // Preserve credentials and queue cancellation of the old timer after the app opens again.
      const pushRaw=this.storage.getItem(PUSH_KEY);
      if(pushRaw){const push=JSON.parse(pushRaw);if(!Number.isSafeInteger(push.revision)||push.revision<0)throw Error('Lựa chọn nhắc nền chưa hợp lệ. Chưa nhập dữ liệu.');if(push.token){push.revision++;push.pending={revision:push.revision,task:null};this.storage.setItem(PUSH_KEY,JSON.stringify(push));}}
      this.storage.removeItem(TIMER_KEY);
      this.storage.setItem(STORAGE_KEY,JSON.stringify(next));
      this.cancelTimer();
      return next;
    });
  }
}
export function mountAdminData(session){
  const $=id=>document.getElementById(id),tools=new AdminDataTools({session});let draft=null,busy=false,turn=0;
  const status=text=>$('admin-data-status').textContent=text;
  function reset(){turn++;draft=null;$('admin-import-file').value='';$('admin-import-preview').hidden=true;$('admin-import-confirm').disabled=false;status('');}
  $('admin-backup').addEventListener('click',async()=>{if(busy)return;busy=true;const action=turn;try{await tools.backup();if(action===turn)status('Đã tạo bản sao lịch sử và cài đặt trên thiết bị này.');}catch(error){if(action===turn)status(error.message);}finally{busy=false;}});
  $('admin-import-open').addEventListener('click',()=>{if(session.check())$('admin-import-file').click();});
  $('admin-import-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;const action=++turn;draft=null;$('admin-import-preview').hidden=true;try{if(file.size>20*1024*1024)throw Error('File vượt quá 20 MB.');await tools.authorize();const next=validateData(JSON.parse(await file.text()));if(action!==turn||!session.check())return;draft=next;$('admin-import-summary').textContent='File có '+next.Breaks.length+' lần nghỉ và '+next.OutdoorDays.length+' ngày ngoài trời. Nhập sẽ gộp lịch sử trên thiết bị này, áp dụng cài đặt trong file và đặt lại đồng hồ. Một bản sao hiện tại sẽ được tải xuống trước khi nhập.';$('admin-import-preview').hidden=false;$('admin-import-confirm').focus();status('File hợp lệ. Chưa thay đổi dữ liệu.');}catch(error){if(action===turn)status(error instanceof SyntaxError?'File JSON không hợp lệ. Chưa thay đổi dữ liệu.':error.message);}});
  $('admin-import-cancel').addEventListener('click',reset);
  $('admin-import-confirm').addEventListener('click',async()=>{if(busy||!draft)return;busy=true;const action=turn;$('admin-import-confirm').disabled=true;try{await tools.importData(draft);if(action!==turn)return;reset();status('Đã gộp lịch sử. Mở lại app người dùng để xem và đồng bộ theo lựa chọn chia sẻ đang có.');}catch(error){if(action===turn)status(error.message);}finally{busy=false;$('admin-import-confirm').disabled=false;}});
  return{reset};
}
