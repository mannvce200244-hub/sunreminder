import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mountSharing,SHARING_CHOICE_KEY} from '../profile-ui.js';
function fixture(t,{state={},request,store=new Map(),saveSucceeds=true,storageFails=false}={}){
 const old={document:globalThis.document,window:globalThis.window,navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator')};
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',checked:false,disabled:false,open:false,hidden:false,textContent:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},focus(){},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
 let success,denied,requests=0,saved=[],owner=true;const events={};
 globalThis.document={hidden:false,getElementById:node,querySelector:()=>[...nodes.values()].find(n=>n.open)||null,addEventListener:(name,fn)=>events[name]=fn};
 globalThis.window={isSecureContext:true};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{geolocation:{getCurrentPosition(ok,no){requests++;success=ok;denied=no;}}}});
 t.after(()=>{globalThis.document=old.document;globalThis.window=old.window;Object.defineProperty(globalThis,'navigator',old.navigator);});
 const sharing={state:{enabled:false,profile:null,...state},message:'',stop(){this.state.enabled=false;},enableCombined:p=>{if(!saveSucceeds)return false;saved.push(p);sharing.state.enabled=true;sharing.state.usageEnabled=true;sharing.state.profile=p;return true;}};
 const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>{if(storageFails)throw Error('Quota');store.set(k,v);}};
 const ui=mountSharing(sharing,{storage,canChange:()=>owner,getUser:()=>null,request:request|| (async()=>new Response(JSON.stringify({enabled:true,consentVersion:'group4-stats-v1'})))});
 return{node,sharing,ui,saved,store,events,owner:value=>owner=value,requests:()=>requests,position:()=>success({coords:{latitude:10,longitude:106,accuracy:25},timestamp:Date.now()}),deny:()=>denied({code:1}),submit:()=>node('sharing-form').handlers.submit({preventDefault(){}}),open:()=>ui.maybeOffer(),manage:()=>node('share-manage').handlers.click(),defer:()=>node('sharing-later').handlers.click()};
}
test('first visit offers one choice without GPS or uploads; accept saves optional GPS once',async t=>{
 const f=fixture(t);f.open();assert.equal(f.node('sharing-dialog').open,true);assert.equal(f.requests(),0);assert.equal(f.saved.length,0);assert.equal(f.node('location-consent').checked,false);
 f.node('device-name').value='Laptop';f.node('location-consent').checked=true;f.node('location-consent').handlers.change();assert.equal(f.requests(),1);assert.equal(f.node('share-save').disabled,true);f.position();assert.equal(f.saved.length,0);await f.submit();
 assert.equal(f.saved.length,1);assert.equal(f.saved[0].location.longitude,106);assert.equal(f.saved[0].deviceName,'Laptop');assert.equal(f.store.get(SHARING_CHOICE_KEY),'accepted');assert.equal(f.node('sharing-dialog').open,false);
});
test('defer is remembered and can be changed later without automatically enabling anything',async t=>{
 const f=fixture(t);f.open();f.defer();f.open();assert.equal(f.node('sharing-dialog').open,false);assert.equal(f.store.get(SHARING_CHOICE_KEY),'later');assert.equal(f.saved.length,0);assert.equal(f.requests(),0);f.manage();assert.equal(f.node('sharing-dialog').open,true);await f.submit();assert.equal(f.saved.length,1);assert.equal(f.saved[0],null);
});
test('reload after defer does not prompt; Escape also dismisses without consent',t=>{
 const f=fixture(t,{store:new Map([[SHARING_CHOICE_KEY,'later']])});f.open();assert.equal(f.node('sharing-dialog').open,false);f.manage();f.node('sharing-dialog').handlers.cancel({preventDefault(){}});assert.equal(f.saved.length,0);assert.equal(f.node('sharing-dialog').open,false);
});
test('denied GPS still allows acceptance; removing previously sent GPS uses the same save',async t=>{
 const f=fixture(t);f.open();f.node('device-name').value='Laptop';f.node('location-consent').checked=true;f.node('location-consent').handlers.change();f.deny();assert.equal(f.node('location-consent').checked,false);await f.submit();assert.equal(f.saved[0].location,null);
 f.manage();f.node('location-consent').checked=true;f.node('location-consent').handlers.change();f.position();await f.submit();assert.equal(f.saved[1].location.latitude,10);
 f.manage();f.node('location-consent').checked=false;f.node('location-consent').handlers.change();await f.submit();assert.equal(f.saved[2].location,null);
});
test('existing consent is not expanded; cancelling edits preserves saved profile and usage choice',t=>{
 const f=fixture(t,{state:{enabled:true,usageEnabled:false,profile:{deviceName:'Old',location:null}}});f.open();assert.equal(f.node('sharing-dialog').open,false);assert.equal(f.sharing.state.usageEnabled,false);assert.match(f.node('sharing-summary').textContent,/lựa chọn cũ/);f.manage();f.node('device-name').value='Unsaved';f.defer();assert.equal(f.sharing.state.profile.deviceName,'Old');assert.equal(f.sharing.state.enabled,true);assert.equal(f.saved.length,0);f.node('share-stop').handlers.click();assert.equal(f.sharing.state.enabled,false);f.open();assert.equal(f.node('sharing-dialog').open,false);
});
test('defer cancels late GPS and pending server validation',async t=>{
 let release;const f=fixture(t,{request:()=>new Promise(r=>release=r)});f.open();f.node('location-consent').checked=true;f.node('location-consent').handlers.change();f.defer();f.position();assert.equal(f.saved.length,0);
 f.manage();assert.equal(f.node('location-consent').checked,false);const pending=f.submit();f.defer();release(new Response(JSON.stringify({enabled:true,consentVersion:'group4-stats-v1'})));await pending;assert.equal(f.saved.length,0);assert.equal(f.sharing.state.enabled,false);
});
test('offline acceptance stays visible with retry and a working defer button',async t=>{
 const f=fixture(t,{request:async()=>{throw Error('Offline');}});f.open();await f.submit();assert.equal(f.saved.length,0);assert.equal(f.node('sharing-dialog').open,true);assert.equal(f.node('share-save').disabled,false);assert.match(f.node('sharing-feedback').textContent,/Offline/);f.defer();assert.equal(f.node('sharing-dialog').open,false);
});
test('failed preference write never records acceptance; defer works even when marker storage is full',async t=>{
 const f=fixture(t,{saveSucceeds:false,storageFails:true});f.open();await f.submit();assert.equal(f.saved.length,0);assert.equal(f.sharing.state.enabled,false);assert.equal(f.store.has(SHARING_CHOICE_KEY),false);f.defer();f.open();assert.equal(f.node('sharing-dialog').open,false);assert.match(f.node('sharing-choice-status').textContent,/Chưa ghi nhớ/);
});
test('offer waits for visible active window and an unobstructed screen',t=>{
 const f=fixture(t);f.owner(false);f.open();assert.equal(f.node('sharing-dialog').open,false);f.owner(true);document.hidden=true;f.open();assert.equal(f.node('sharing-dialog').open,false);document.hidden=false;f.node('other-dialog').open=true;f.open();assert.equal(f.node('sharing-dialog').open,false);f.node('other-dialog').open=false;f.open();assert.equal(f.node('sharing-dialog').open,true);
});
test('losing active ownership during approval cannot save or send consent',async t=>{
 let release;const f=fixture(t,{request:()=>new Promise(r=>release=r)});f.open();const pending=f.submit();f.owner(false);release(new Response(JSON.stringify({enabled:true,consentVersion:'group4-stats-v1'})));await pending;assert.equal(f.saved.length,0);assert.equal(f.sharing.state.enabled,false);
});
test('withdrawn or previously stopped users are not asked again automatically',t=>{
 const f=fixture(t,{state:{enabled:false,participantId:'existing'}});f.open();assert.equal(f.node('sharing-dialog').open,false);f.sharing.state.participantId=null;f.ui.reset();f.open();assert.equal(f.node('sharing-dialog').open,false);assert.equal(f.store.get(SHARING_CHOICE_KEY),'withdrawn');
});
