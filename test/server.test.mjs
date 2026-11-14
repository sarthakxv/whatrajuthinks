import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../lib/api.ts';
import {createStore} from '../lib/store.mjs';

const text=Array.from({length:6},(_,i)=>`[13/11/2026, 10:0${i}:00] ${i%2?'Sam':'Alex'}: ${i%2?'Are you coming?':'See you soon 🙂'}`).join('\n');

test('local API isolates sessions, handles name cleanup and preserves reports after deleting chat',async(t)=>{
 const store=createStore(':memory:');const handle=createApi({store});t.after(()=>store.close());
 const base='http://localhost:4173';
 const request=async(path,method='GET',payload,cookie)=>{const res=await handle(new Request(base+path,{method,headers:{...(payload?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{})},...(payload?{body:JSON.stringify(payload)}:{})}));return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};};
 const a=await request('/api/session'),b=await request('/api/session');assert.equal(a.data.mode,'local');assert.notEqual(a.cookie,b.cookie);
 const uploaded=await request('/api/import','POST',{filename:'chat.txt',text,context:'Friends',platform:'WhatsApp'},a.cookie);assert.equal(uploaded.status,201);const id=uploaded.data.conversation.id;
 assert.equal((await request(`/api/conversations/${id}`,'GET',null,b.cookie)).status,404);
 assert.equal((await request('/api/reports','POST',{conversationId:id,person:'Alex',mode:'local'},b.cookie)).status,404);
 const patched=await request(`/api/conversations/${id}`,'PATCH',{aliases:{Alex:'Alexandra'},person:'Alexandra',title:'Old friends'},a.cookie);assert.equal(patched.data.conversation.stats.participants[0].name,'Alexandra');assert.equal(patched.data.conversation.person,'Alexandra');
 assert.equal((await request(`/api/conversations/${id}`,'PATCH',{aliases:{Alexandra:'Sam'}},a.cookie)).status,400);
 const generated=await request('/api/reports','POST',{conversationId:id,person:'Alexandra',language:'English',tone:'Balanced',contextNotes:'',mode:'local'},a.cookie);assert.equal(generated.status,201);assert.equal(generated.data.report.mode,'local');assert.equal(generated.data.report.messageCount,6);const reportId=generated.data.report.id;
 assert.equal((await request(`/api/reports/${reportId}`,'GET',null,b.cookie)).status,404);
 assert.equal((await request('/api/reports','GET',null,a.cookie)).data.reports[0].sections,undefined);
 assert.equal((await request(`/api/reports/${reportId}`,'DELETE',null,b.cookie)).status,404);
 assert.equal((await request(`/api/conversations/${id}`,'DELETE',null,a.cookie)).status,200);
 const preserved=await request(`/api/reports/${reportId}`,'GET',null,a.cookie);assert.equal(preserved.status,200);assert.equal(preserved.data.report.sourceAvailable,false);
 assert.equal((await request('/api/reports','POST',{conversationId:id,person:'Alexandra',mode:'local'},a.cookie)).status,404);
 const signedOut=await handle(new Request(base+'/api/account',{method:'POST',headers:{cookie:a.cookie}}));assert.equal(signedOut.status,200);assert.match(signedOut.headers.get('set-cookie')??'',/Max-Age=0/);assert.equal((await request('/api/reports','GET',null,a.cookie)).data.reports.length,1);
 assert.equal((await request('/api/account','DELETE',null,a.cookie)).status,200);assert.equal((await request('/api/reports','GET',null,a.cookie)).data.reports.length,0);
 const cross=await handle(new Request(base+'/api/import',{method:'POST',headers:{origin:'http://evil.example','Content-Type':'application/json'},body:'{}'}));assert.equal(cross.status,403);
 const foreignHost=await handle(new Request('http://outside.example/api/session'));assert.equal(foreignHost.status,403);
 const tooLarge=await handle(new Request(base+'/api/import',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':String(16*1024*1024)},body:'{}'}));assert.equal(tooLarge.status,413);
 const invalid=await handle(new Request(base+'/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:'[]'}));assert.equal(invalid.status,400);
});

test('retention removes raw messages while keeping existing report snapshots',()=>{
 const store=createStore(':memory:');const session=store.newSession();const metadata={id:'chat',participants:['A','B'],title:'Test'};store.addConversation(session,metadata,[{sender:'A',text:'a'}]);store.addReport(session,{id:'report',sections:[{title:'Test',body:'Summary'}]},['chat']);store.purge('2100-01-01T00:00:00.000Z');assert.equal(store.conversation(session,'chat').messages,null);assert.ok(store.report(session,'report'));assert.equal(store.conversations(session)[0].available,false);store.close();
});
