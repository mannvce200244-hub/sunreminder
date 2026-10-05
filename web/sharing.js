import { CONSENT_VERSION, dailyStats } from './analytics.js';
export const SHARE_KEY='sunreminder.sharing.v1';
const empty=()=>({enabled:false,pendingDelete:false,participantId:null,token:null,revision:0,lastSync:null});
const randomHex=length=>Array.from(crypto.getRandomValues(new Uint8Array(length)),b=>b.toString(16).padStart(2,'0')).join('');
export class SharingClient {
  constructor({storage,getData,request=(...args)=>fetch(...args),onChange=()=>{},canSend=()=>true}){
    Object.assign(this,{storage,getData,request,onChange,canSend});this.state=empty();this.busy=false;this.dirty=true;this.message='Chưa chia sẻ thống kê.';
    try{const raw=storage.getItem(SHARE_KEY);if(raw){const s=JSON.parse(raw);if(typeof s.enabled!=='boolean'||typeof s.pendingDelete!=='boolean'||!Number.isSafeInteger(s.revision)||s.revision<0||(s.participantId!==null&&!/^p_[a-f0-9]{32}$/.test(s.participantId))||(s.token!==null&&!/^[a-f0-9]{64}$/.test(s.token))||((s.enabled||s.pendingDelete)&&(!s.token||!s.participantId)))throw Error();this.state=s;}}
    catch{this.blocked=true;this.message='Không đọc được tùy chọn chia sẻ. Chưa gửi dữ liệu; hãy kiểm tra bộ nhớ trình duyệt.';}
  }
  save(next){try{this.storage.setItem(SHARE_KEY,JSON.stringify(next));this.state=next;return true;}catch{this.message='Không lưu được lựa chọn chia sẻ. Chưa bật gửi tự động.';this.onChange(this);return false;}}
  enable(){if(this.blocked||this.state.pendingDelete)return false;const s={...this.state,enabled:true};if(!s.participantId){s.participantId='p_'+randomHex(16);s.token=randomHex(32);s.revision=0;}if(!this.save(s))return false;this.dirty=true;this.message='Đã đồng ý. Đang chờ gửi thống kê…';this.onChange(this);void this.flush();return true;}
  stop(){// Stop in memory even if storage fails; never send after a failed preference write.
    this.state={...this.state,enabled:false};const saved=this.save(this.state);this.controller?.abort();this.message=saved?'Đã ngừng gửi mới. Thống kê đã gửi vẫn ở Group 4; bạn có thể xóa bên dưới.':'Đã ngừng gửi trong phiên này nhưng chưa lưu được lựa chọn. Hãy thử lại trước khi đóng app.';this.onChange(this);
  }
  withdraw(){if(!this.state.participantId)return;const s={...this.state,enabled:false,pendingDelete:true};if(!this.save(s))return;this.controller?.abort();this.message='Đã ngừng gửi. Đang chờ máy chủ xác nhận xóa…';this.onChange(this);void this.flush();}
  changed(){this.dirty=true;void this.flush();}
  async flush(force=false){
    if(this.busy||this.blocked||!this.canSend()||(!this.state.pendingDelete&&(!this.state.enabled||(!this.dirty&&!force))))return;
    this.busy=true;this.controller=new AbortController();const timeout=setTimeout(()=>this.controller?.abort(),10000);
    const removing=this.state.pendingDelete;let sent=false;
    try{
      let payload={participantId:this.state.participantId};
      if(!removing){const next={...this.state,revision:this.state.revision+1};if(!this.save(next))return;payload={...payload,revision:next.revision,source:'web',consentVersion:CONSENT_VERSION,days:dailyStats(this.getData())};this.dirty=false;}
      this.message=removing?'Đang xóa thống kê đã gửi…':'Đang gửi thống kê…';this.onChange(this);
      const response=await this.request(removing?'/api/withdraw':'/api/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.state.token}`},body:JSON.stringify(payload),signal:this.controller.signal,redirect:'error'});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Chưa gửi được thống kê.');
      if(removing){if(!this.save(empty())){this.message='Máy chủ đã xóa; chưa lưu được trạng thái trên thiết bị. Hãy thử lại.';return;}this.message='Đã xóa thống kê trên máy chủ và ngừng chia sẻ. Lịch sử trên máy vẫn được giữ.';}
      else {const next={...this.state,lastSync:result.syncedAt||new Date().toISOString(),revision:Math.max(this.state.revision,result.revision||0)};if(!this.save(next))return;this.message=next.pendingDelete?'Đang chờ xóa thống kê đã gửi…':next.enabled?'Đã gửi thống kê cho Group 4.':'Đã ngừng gửi mới.';}
      sent=true;
    }catch(e){this.dirty=true;this.message=this.state.pendingDelete?'Chưa xóa được trên máy chủ. App đã ngừng chia sẻ và sẽ thử xóa lại khi có mạng.':this.state.enabled?`Chưa gửi được; dữ liệu vẫn trên máy. ${e.name==='AbortError'?'Sẽ thử lại.':e.message}`:'Đã ngừng gửi mới.';}
    finally{clearTimeout(timeout);this.busy=false;this.controller=null;this.onChange(this);if(sent&&(this.state.pendingDelete||(this.state.enabled&&this.dirty)))queueMicrotask(()=>void this.flush());}
  }
}
