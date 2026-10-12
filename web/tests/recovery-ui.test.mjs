import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../recovery-ui.js',import.meta.url),'utf8').replace('export function','function');
function fixture(hash=''){
 const nodes=new Map(),requests=[],history=[],handlers={};let forget=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',open:false,handlers:{},addEventListener(n,fn){this.handlers[n]=fn;},showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();}});return nodes.get(id);};
 const context=vm.createContext({document:{getElementById:node},window:{location:{hash,pathname:'/',search:''},history:{replaceState:(...a)=>history.push(a)},addEventListener:(n,fn)=>handlers[n]=fn},account:{getUser:()=>null,request:async(...a)=>{requests.push(a);return{message:'Đã xử lý'};},forget:()=>forget++}});
 vm.runInContext(source+'; mountRecovery(account);',context);
 return{node,requests,history,forgot:()=>forget,submit:async id=>node(id).handlers.submit({preventDefault(){}})};
}
test('verification link is removed from URL, requires a click, and clears secrets on close',async()=>{
 const f=fixture('#verify-email='+'a'.repeat(64));assert.equal(f.requests.length,0);assert.equal(f.node('recovery-dialog').open,true);assert.equal(f.history[0][2],'/#focus');assert.equal(f.node('recovery-new-password').required,false);await f.submit('recovery-reset-form');assert.equal(f.requests[0][0],'recovery/verify');assert.equal(f.node('recovery-code').value,'');f.node('recovery-new-password').value='secret';f.node('recovery-dialog').close();assert.equal(f.node('recovery-new-password').value,'');
});
test('reset rejects mismatched passwords then submits the code and clears account session',async()=>{
 const f=fixture('#reset-password='+'b'.repeat(64));f.node('recovery-new-password').value='new-password-one';f.node('recovery-confirm-password').value='new-password-two';await f.submit('recovery-reset-form');assert.equal(f.requests.length,0);assert.match(f.node('recovery-status').textContent,/chưa khớp/);f.node('recovery-confirm-password').value='new-password-one';await f.submit('recovery-reset-form');assert.equal(f.requests[0][0],'recovery/reset');assert.equal(f.forgot(),1);assert.equal(f.node('recovery-confirm-password').value,'');
});
