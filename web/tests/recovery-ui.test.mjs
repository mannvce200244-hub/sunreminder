import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../recovery-ui.js',import.meta.url),'utf8').replace('export function','function');
function fixture(hash='',signed=false){
 const nodes=new Map(),requests=[],history=[],handlers={};let forget=0;const notices=[];let responder=async()=>({message:'Đã xử lý',challenge:'c'.repeat(64),enabled:true,email:null});
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',open:false,handlers:{},addEventListener(n,fn){this.handlers[n]=fn;},focus(){},showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();}});return nodes.get(id);};
 const context=vm.createContext({document:{getElementById:node},window:{location:{hash,pathname:'/',search:''},history:{replaceState:(...a)=>history.push(a)},addEventListener:(n,fn)=>handlers[n]=fn},account:{getUser:()=>signed?{username:'member'}:null,request:async(...a)=>{requests.push(a);return responder(...a);},forget:()=>forget++},onNotice:text=>notices.push(text)});
 vm.runInContext(source+'; mountRecovery(account,{onNotice});',context);
 return{node,requests,history,notices,respondWith:fn=>responder=fn,forgot:()=>forget,submit:async id=>node(id).handlers.submit({preventDefault(){}})};
}
test('verification link is removed from URL, requires a click, and clears secrets on close',async()=>{
 const f=fixture('#verify-email='+'a'.repeat(64));assert.equal(f.requests.length,0);assert.equal(f.node('recovery-dialog').open,true);assert.equal(f.history[0][2],'/#focus');assert.equal(f.node('recovery-new-password').required,false);await f.submit('recovery-reset-form');assert.equal(f.requests[0][0],'recovery/verify');assert.equal(f.node('recovery-code').value,'');f.node('recovery-new-password').value='secret';f.node('recovery-dialog').close();assert.equal(f.node('recovery-new-password').value,'');
});
test('reset rejects mismatched passwords then submits the code and clears account session',async()=>{
 const f=fixture('#reset-password='+'b'.repeat(64));f.node('recovery-new-password').value='new-password-one';f.node('recovery-confirm-password').value='new-password-two';await f.submit('recovery-reset-form');assert.equal(f.requests.length,0);assert.match(f.node('recovery-status').textContent,/chưa khớp/);f.node('recovery-confirm-password').value='new-password-one';await f.submit('recovery-reset-form');assert.equal(f.requests[0][0],'recovery/reset');assert.equal(f.forgot(),1);assert.equal(f.node('recovery-confirm-password').value,'');
});

test('email binding shows a six-digit form and verification closes it automatically',async()=>{
 const f=fixture('',true);f.node('account-dialog').showModal();f.node('recovery-email').value='member@example.test';f.node('recovery-current-password').value='app-password';await f.submit('recovery-email-form');
 assert.equal(f.requests[0][1].codeFormat,'otp6');assert.equal(f.node('account-dialog').open,false);assert.equal(f.node('recovery-dialog').open,true);assert.equal(f.node('recovery-request-form').hidden,true);assert.equal(f.node('recovery-reset-form').hidden,false);
 f.node('recovery-code').value='012345';await f.submit('recovery-reset-form');assert.equal(f.requests[1][0],'recovery/verify');assert.equal(f.requests[1][1].code,'012345');assert.equal(f.requests[1][1].token,undefined);assert.equal(f.node('recovery-dialog').open,false);assert.deepEqual(f.notices,['Đã xử lý']);
});
test('forgot password asks for one identifier then code and new password',async()=>{
 const f=fixture();f.node('account-username').value='member@example.test';f.node('account-forgot').handlers.click();assert.equal(f.node('recovery-reset-form').hidden,true);assert.equal(f.node('recovery-request-form').hidden,false);
 await f.submit('recovery-request-form');assert.equal(f.requests[0][1].identifier,'member@example.test');assert.equal(f.node('recovery-request-form').hidden,true);assert.equal(f.node('recovery-reset-form').hidden,false);
 f.node('recovery-code').value='12345';await f.submit('recovery-reset-form');assert.equal(f.requests.length,1);assert.match(f.node('recovery-status').textContent,/6 số/);
 f.node('recovery-code').value='123456';f.node('recovery-new-password').value='new-password-123';f.node('recovery-confirm-password').value='new-password-123';await f.submit('recovery-reset-form');assert.equal(f.forgot(),1);assert.equal(f.node('recovery-dialog').open,false);
});
test('closing profile while sending cannot reopen a late verification dialog',async()=>{
 const f=fixture('',true);let finish;f.respondWith(()=>new Promise(resolve=>finish=resolve));f.node('account-dialog').showModal();f.node('recovery-email').value='member@example.test';f.node('recovery-current-password').value='app-password';const pending=f.submit('recovery-email-form');f.node('account-dialog').close();finish({message:'Sent',challenge:'a'.repeat(64)});await pending;assert.equal(f.node('recovery-dialog').open,false);assert.equal(f.node('recovery-current-password').value,'');
});
test('requesting another reset code returns to the request step without retaining secrets',async()=>{
 const f=fixture();f.node('account-forgot').handlers.click();f.node('recovery-username').value='member';await f.submit('recovery-request-form');f.node('recovery-code').value='123456';f.node('recovery-new-password').value='secret-password';f.node('recovery-retry').handlers.click();assert.equal(f.node('recovery-reset-form').hidden,true);assert.equal(f.node('recovery-code').value,'');assert.equal(f.node('recovery-new-password').value,'');
});
