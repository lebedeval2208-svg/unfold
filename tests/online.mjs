import assert from 'node:assert/strict';
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:5173';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function api(data,fail=false){const res=await fetch(base+'/api/room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await res.json();if(fail){assert(!res.ok);return j;}assert(res.ok,JSON.stringify(j));return j;}
const first=await api({type:'create',name:'Test Host'});const code=first.state.code;const people=[first];for(let i=1;i<4;i++)people.push(await api({type:'join',code,name:'Test Player '+i}));
assert.equal(new Set(people.map(x=>x.token)).size,4);
const request=(i,type,rest={})=>api({code,token:people[i].token,type,...rest,requestId:rest.requestId||crypto.randomUUID()});
await request(0,'settings',{settings:{timer:0,mode:'leak',styles:true}});
await Promise.all(people.map((_,i)=>request(i,'ready')));
await api({code,token:people[1].token,type:'start'},true);
await request(0,'start');await wait(4200);
for(let beat=0;beat<6;beat++){
 const states=await Promise.all(people.map((_,i)=>request(i,'state')));const round=states[0].state.round;assert(states.every(x=>x.state.phase==='WRITING'));assert.equal(round.beat,beat);
 const id=crypto.randomUUID();await Promise.all([request(0,'submit',{round:round.id,beat,text:`Secret alpha ${beat} їжачок 👋`,clue:beat<5?'їжачок':null,requestId:id}),request(0,'submit',{round:round.id,beat,text:`Secret alpha ${beat} їжачок 👋`,clue:beat<5?'їжачок':null,requestId:id})]);
 const publicState=await api({code,type:'state'});assert(!JSON.stringify(publicState).includes('Secret alpha'));assert(!JSON.stringify(publicState).includes('Sound completely calm'));assert.equal(publicState.state.round.folded,1);
 const other=await request(1,'state');assert(!JSON.stringify(other).includes(`Secret alpha ${beat}`));
 await Promise.all([1,2,3].map(i=>request(i,'submit',{round:round.id,beat,text:`Player ${i} line ${beat}`,clue:null})));
 await wait(1300);
}
let state=(await request(0,'state')).state;assert.equal(state.phase,'REVEAL_READY');await api({code,token:people[1].token,type:'beginReveal'},true);await request(0,'beginReveal');state=(await request(0,'state')).state;
const rid=crypto.randomUUID();await Promise.all([request(0,'reveal',{cursor:state.round.cursor,requestId:rid}),request(0,'reveal',{cursor:state.round.cursor,requestId:rid})]);state=(await request(0,'state')).state;assert.equal(state.round.stories.reduce((n,s)=>n+s.lines.length,0),1);
while(state.phase==='REVEAL'){state=(await request(0,'reveal',{cursor:state.round.cursor})).state;}
assert.equal(state.phase,'AWARDS');
for(let i=0;i<4;i++){await request(i,'vote',{category:'Best plot twist',story:i%2});await request(i,'ballotDone');}
state=(await request(0,'state')).state;assert.equal(state.phase,'RESULTS');assert.equal(state.round.results.stories.length,4);assert.deepEqual(state.round.results.awards[0].winners,[0,1]);assert(state.round.results.stories.every(s=>s.lines.length===6));
console.log('PASS: 4 independent HTTP player sessions; D1 persistence; concurrent CAS submissions; retries; private responses; six beats; synchronized reveal; tied votes. Room '+code);
