(()=>{
function openStore(){return new Promise((resolve,reject)=>{const req=indexedDB.open('sunreminder-notifications',1);req.onupgradeneeded=()=>req.result.createObjectStore('state');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function updateNoticeState(change){const db=await openStore();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite'),store=tx.objectStore('state');let result;const req=store.get('context');req.onsuccess=()=>{const state=req.result||{phaseId:null,enabled:false,seen:[]};result=change(state);store.put(state,'context');};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
function claimNotice(notice,remote,update=updateNoticeState,now=Date.now()){
 if(!notice||!/^[-a-zA-Z0-9]{16,64}$/.test(notice.id)||!['due','complete'].includes(notice.kind))return Promise.resolve(false);
 if(remote&&(!Number.isFinite(notice.deadline)||now>notice.deadline+300000))return Promise.resolve(false);
 return update(state=>{if(remote&&(!state.enabled||state.phaseId!==notice.id))return false;const key=notice.id+':'+notice.kind;if(state.seen.includes(key))return false;state.seen.push(key);state.seen=state.seen.slice(-100);return true;});
}

globalThis.SunNotificationStore={claimNotice,updateNoticeState};

})();
