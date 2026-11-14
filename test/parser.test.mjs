import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChat,computeStats,decodeImport} from '../lib/parser.mjs';

const chat=`[13/11/2026, 10:00:00] Alex: Hello there 🙂
This is the next line.
[13/11/2026, 10:02:00] Sam: How are you?
[13/11/2026, 10:03:00] Alex: I am good.
[13/11/2026, 10:07:00] Sam: Great news 🙂
[14/11/2026, 10:00:00] Alex: Ready for lunch?`;

test('WhatsApp iOS multiline messages retain sender and valid dates',()=>{
 const parsed=parseChat(chat,'_chat.txt');assert.equal(parsed.messages.length,5);assert.deepEqual(parsed.participants,['Alex','Sam']);assert.match(parsed.messages[0].text,/\nThis is/);assert.equal(parsed.messages[0].timestamp,'2026-11-13T10:00:00.000Z');
 const stats=computeStats(parsed.messages);assert.equal(stats.messageCount,5);assert.equal(stats.participants[0].percentage,60);assert.equal(stats.participants[0].initiations,2);assert.equal(stats.participants[1].medianReplyMinutes,3);assert.equal(stats.topEmoji[0].count,2);assert.equal(stats.activeDays,2);assert.equal(stats.longestStreakDays,2);assert.equal(stats.longestSilenceDays,0);assert.equal(stats.busiestDay.date,'2026-11-13');assert.equal(stats.busiestDay.count,4);assert.equal(stats.busiestHour,10);assert.equal(stats.nightShare,0);assert.deepEqual(stats.participants[0].topWords,['good','hello','line']);
});
test('silence is the empty days between active days',()=>{
 const stats=computeStats([{sender:'A',text:'hello there',timestamp:'2026-01-01T22:00:00.000Z'},{sender:'B',text:'hello there',timestamp:'2026-01-01T23:00:00.000Z'},{sender:'A',text:'back again',timestamp:'2026-01-05T10:00:00.000Z'},{sender:'B',text:'back again',timestamp:'2026-01-06T10:00:00.000Z'},{sender:'A',text:'still here',timestamp:'2026-01-06T11:00:00.000Z'}]);
 assert.equal(stats.longestSilenceDays,3);assert.equal(stats.longestStreakDays,2);assert.equal(stats.nightShare,0.4);assert.equal(stats.busiestHour,10);
});
test('Android exports support AM/PM and omit timestamped system lines',()=>{
 const android=chat.replace(/\[(.*?), (.*?)\]/g,'$1, $2 -').replace('10:00:00 - Alex','10:00 PM - Alex');
 const parsed=parseChat(android+'\n14/11/2026, 23:00 - Messages are encrypted','chat.txt');assert.equal(parsed.messages.length,5);assert.equal(parsed.messages[0].timestamp,'2026-11-13T22:00:00.000Z');assert.doesNotMatch(parsed.messages.at(-1).text,/encrypted/);
});
test('invalid calendar dates do not generate fake reply statistics',()=>{
 const result=parseChat(chat.replaceAll('13/11/2026','31/02/2026').replaceAll('14/11/2026','31/02/2026'),'chat.txt');assert.ok(result.messages.every(m=>m.timestamp===null));assert.ok(computeStats(result.messages).participants.every(p=>p.medianReplyMinutes===null&&p.initiations===0));
});
test('US month/day date order applies consistently to ambiguous dates later in the export',()=>{
 const dates=['12/31/2025','01/02/2026','01/02/2026','02/03/2026','02/03/2026'];
 const input=dates.map((date,i)=>`[${date}, 10:0${i}:00] ${i%2?'Alex':'Sam'}: Hello again`).join('\n');
 const parsed=parseChat(input,'chat.txt');assert.equal(parsed.messages[0].timestamp,'2025-12-31T10:00:00.000Z');assert.equal(parsed.messages[1].timestamp,'2026-01-02T10:01:00.000Z');assert.equal(parsed.messages[3].timestamp,'2026-02-03T10:03:00.000Z');
 assert.throws(()=>parseChat(input.replace('02/03/2026','13/03/2026'),'chat.txt'),/mixes day\/month and month\/day/);
});
test('ambiguous exports default to day/month and year-first dates remain year-first',()=>{
 const ambiguous=parseChat(chat.replaceAll('13/11/2026','01/02/2026').replaceAll('14/11/2026','02/02/2026'),'chat.txt');assert.equal(ambiguous.messages[0].timestamp,'2026-02-01T10:00:00.000Z');
 const yearFirst=parseChat(chat.replaceAll('13/11/2026','2026-11-13').replaceAll('14/11/2026','2026-11-14'),'chat.txt');assert.equal(yearFirst.messages[0].timestamp,'2026-11-13T10:00:00.000Z');
});
test('question statistics count messages rather than repeated punctuation',()=>{
 const stats=computeStats([{sender:'A',text:'Really??? How？',timestamp:null},{sender:'A',text:'Okay',timestamp:null},{sender:'A',text:'What?',timestamp:null}]);assert.equal(stats.participants[0].questions,2);
});
test('direct text imports cannot bypass the 10 MB upload limit',async()=>{
 await assert.rejects(()=>decodeImport({filename:'chat.txt',text:'x'.repeat(10*1024*1024+1)}),/10 MB/);
});
test('empty, unsupported and short conversations are rejected',()=>{
 assert.throws(()=>parseChat('','chat.txt'),/empty/);assert.throws(()=>parseChat('no sender format','chat.txt'),/two people/);assert.throws(()=>parseChat(chat.split('\n').slice(0,3).join('\n'),'chat.txt'),/five messages/);
});
test('JSON messages without timestamps retain unknown reply gaps',()=>{
 const parsed=parseChat(JSON.stringify({messages:Array.from({length:5},(_,i)=>({sender:i%2?'Alex':'Sam',text:'test message'}))}),'chat.json');assert.ok(computeStats(parsed.messages).participants.every(p=>p.medianReplyMinutes===null));
});
test('ZIP imports select chat text and reject unsafe expansion size',async()=>{
 const {zipSync,strToU8}=await import('fflate');
 const bytes=zipSync({'_chat.txt':strToU8(chat),'photo.jpg':new Uint8Array([1,2])});const text=await decodeImport({filename:'chat.zip',base64:Buffer.from(bytes).toString('base64')});assert.equal(parseChat(text,'chat.zip').messages.length,5);
 const bomb=zipSync({'large.txt':new Uint8Array(21*1024*1024)});await assert.rejects(()=>decodeImport({filename:'chat.zip',base64:Buffer.from(bomb).toString('base64')}),/20 MB/);
});
