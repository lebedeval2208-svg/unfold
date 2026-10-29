import { packs, styles, categories } from './packs.js';
export const defaults={pack:'heist',mode:'classic',timer:25,nudges:true,styles:false,attribution:false,awards:true,playing:true};
export const uid=()=>crypto.randomUUID();
export const size=s=>[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(s)].length;
export const words=s=>[...new Set((s.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)||[]).filter(w=>size(w)<=24))];
export const assignedStory=(p,s,n)=>(p-s%n+n)%n;
const shuffled=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
export function nickname(s){s=String(s||'').trim();if(size(s)<2||size(s)>20)throw Error('Choose a nickname with 2–20 characters.');return s;}
export function newRoom(code,name,token,now=Date.now(),local=false){const id=uid();return {code,host:id,members:[{id,name:nickname(name),avatar:'✳',token,role:'player',ready:false,joined:now,seen:now}],settings:{...defaults,timer:local?0:25},phase:'LOBBY',revision:0,created:now,active:now,expires:now+86400000,round:null,history:[],recent:[],requests:[],local};}
export function join(room,name,token,avatar,now){name=nickname(name);if(room.members.some(m=>m.name.normalize('NFKC').toLocaleLowerCase()===name.normalize('NFKC').toLocaleLowerCase()))throw Error('That nickname is taken. Add a distinguishing detail.');const active=room.phase!=='LOBBY';if(!active&&room.members.filter(m=>m.role==='player').length>=8)throw Error('This room is full (8 players).');const m={id:uid(),name,token,avatar:['✳','◆','●','✦','◎','❋','▲','■'].includes(avatar)?avatar:'✳',role:active?'viewer':'player',ready:false,joined:now,seen:now};room.members.push(m);return m;}
const packOf=r=>packs.find(p=>p.id===r.settings.pack);
const eligible=r=>r.stories.filter(s=>!s.hidden);
function gameFill(r,j,b,now){if(r.stories[j].lines[b])return;const opts=packOf(r).beats[b].fallbacks;r.stories[j].lines[b]={text:opts[(j+b)%opts.length],source:'game_fill',clue:null,slot:(j+b)%r.slots.length,time:now};}
function nextAfterWriting(room,now){room.phase='HANDOFF';room.round.transition=now+1200;room.round.deadline=null;room.round.paused=false;room.round.localReady=false;}
function startBeat(room,now){const r=room.round;room.phase='WRITING';r.localTurn=0;r.localReady=!room.local;r.deadline=!room.local&&r.settings.timer?now+r.settings.timer*1000:null;}
function finishAwards(room){room.phase='RESULTS';room.round.deadline=null;room.round.auto=null;}
export function reconcile(room,now=Date.now()){
 if(now>=room.expires)throw Error('This room expired. Create a new room.');
 const connected=room.members.filter(m=>m.role!=='viewer'&&now-m.seen<30000);
 const host=room.members.find(m=>m.id===room.host);
 if(!room.local&&host&&now-host.seen>=30000&&connected.length)room.host=connected.sort((a,b)=>a.joined-b.joined)[0].id;
 const r=room.round;if(!r)return;
 if(!room.local&&room.phase==='WRITING'&&!r.paused&&!connected.length){r.remaining=r.deadline?Math.max(0,r.deadline-now):null;r.deadline=null;r.paused=true;r.autoPaused=true;}
 if(room.phase==='ROUND_INTRO'&&now>=r.transition)startBeat(room,now);
 if(room.phase==='HANDOFF'&&now>=r.transition){r.beat++;if(r.beat===packOf(r).beats.length){room.phase='REVEAL_READY';r.beat--;}else startBeat(room,now);}
 if(room.phase==='WRITING'&&!r.paused&&r.deadline&&now>=r.deadline){
  if(room.local){gameFill(r,assignedStory(r.localTurn,r.beat,r.slots.length),r.beat,now);r.localTurn++;r.localReady=false;r.deadline=null;if(r.localTurn>=r.slots.length)nextAfterWriting(room,now);}
  else {r.stories.forEach((s,j)=>gameFill(r,j,r.beat,now));nextAfterWriting(room,now);}
 }
 if(room.phase==='AWARDS'&&r.deadline&&now>=r.deadline)finishAwards(room);
 if(room.phase==='REVEAL'&&r.auto&&now>=r.auto.next){advanceReveal(room,now);if(room.phase==='REVEAL')r.auto.next=now+r.auto.pace*1000;}
}
function advanceReveal(room,now=Date.now()){const r=room.round;const order=r.order.filter(j=>!r.stories[j].hidden);if(!order.length){finishAwards(room);return;}const index=order.indexOf(r.currentStory);if(r.boundary[r.currentStory]<packOf(r).beats.length){r.boundary[r.currentStory]++;return;}if(index<order.length-1){r.currentStory=order[index+1];return;}room.phase=r.settings.awards?'AWARDS':'RESULTS';r.auto=null;r.deadline=room.phase==='AWARDS'&&r.settings.timer?now+45000:null;}
function requireHost(room,id){if(room.host!==id)throw Error('Only the host can do that.');}
function requirePhase(room,...phases){if(!phases.includes(room.phase))throw Error('The round has moved on. Your place is saved.');}
export function command(room,id,a,now=Date.now()){
 const m=room.members.find(m=>m.id===id);if(!m)throw Error('Please rejoin this room.');
 if(a.requestId&&room.requests.includes(id+':'+a.requestId))return;
 reconcile(room,now);m.seen=now;room.active=now;room.expires=now+(room.ttl||86400000);
 const r=room.round;
 const hostActions=['settings','start','pause','extra','finishBeat','reveal','beginReveal','hide','end','another','transfer','away','auto'];
 if(hostActions.includes(a.type))requireHost(room,id);
 switch(a.type){
 case 'participate':requirePhase(room,'LOBBY');if(room.members.filter(x=>x.role==='player').length>=8)throw Error('All 8 player places are taken.');m.role='player';m.ready=false;break;
 case 'ready': requirePhase(room,'LOBBY');m.ready=!m.ready;break;
 case 'settings': {requirePhase(room,'LOBBY');const s=a.settings;if(packs.some(p=>p.id===s.pack))room.settings.pack=s.pack;if(['classic','leak'].includes(s.mode))room.settings.mode=s.mode;if([0,25,45,60,90].includes(s.timer))room.settings.timer=s.timer;for(const k of ['nudges','styles','attribution','awards','playing'])if(typeof s[k]==='boolean')room.settings[k]=s[k];m.role=room.settings.playing?'player':'facilitator';break;}
 case 'start': {
  requirePhase(room,'LOBBY');const slots=room.members.filter(x=>x.role==='player'&&(room.local||now-x.seen<30000));if(slots.length<4||slots.length>8)throw Error('Gather 4–8 connected players to start.');if(slots.some(x=>!x.ready))throw Error('Wait until everyone is ready.');
  const p=packs.find(p=>p.id===room.settings.pack);const cards=shuffled(styles);
  room.round={id:uid(),number:room.history.length+1,settings:{...room.settings},slots:slots.map(x=>({id:x.id,name:x.name,avatar:x.avatar})),beat:0,stories:slots.map((x,j)=>({id:uid(),j,hidden:false,lines:[]})),variants:p.beats.map(()=>Math.floor(Math.random()*3)),cards:Object.fromEntries(slots.map((x,i)=>[x.id,cards[i]])),transition:now+4000,deadline:null,paused:false,order:shuffled(slots.map((x,j)=>j)),boundary:slots.map(()=>0),currentStory:0,ballots:{},ballotDone:{},reactions:{},reactionAt:{},localTurn:0,localReady:false};room.round.currentStory=room.round.order[0];room.phase='ROUND_INTRO';room.recent.push(p.id);break;}
 case 'localReady': requirePhase(room,'WRITING');if(!room.local||r.slots[r.localTurn]?.id!==id)throw Error('Pass to the next player.');r.localReady=true;r.deadline=r.settings.timer?now+r.settings.timer*1000:null;break;
 case 'submit': {
  requirePhase(room,'WRITING');if(r.paused)throw Error('The round is paused. Your draft is saved.');if(a.round!==r.id||a.beat!==r.beat)throw Error('This beat has finished. Join the next one.');
  const slot=r.slots.findIndex(s=>s.id===id);if(slot<0||m.role!=='player')throw Error('Only participating players can write.');if(room.local&&(!r.localReady||slot!==r.localTurn))throw Error('Wait for your private turn.');const j=assignedStory(slot,r.beat,r.slots.length);if(r.stories[j].lines[r.beat])throw Error('Your line is already folded.');
  if(a.skip)gameFill(r,j,r.beat,now);else {const text=String(a.text||'').trim();if(!text)throw Error('A few words are plenty. Add something before folding.');if(size(text)>180)throw Error('Keep this line to 180 characters.');const clue=a.clue||null;if(clue&&(r.settings.mode!=='leak'||!words(text).includes(clue)))throw Error('Choose one of the words from your answer.');r.stories[j].lines[r.beat]={text,clue:r.beat<packOf(r).beats.length-1?clue:null,source:'human',slot,time:now};}
  if(room.local){r.localTurn++;r.localReady=false;r.deadline=null;}
  if(r.stories.every(s=>s.lines[r.beat]))nextAfterWriting(room,now);break;}
 case 'pause': requirePhase(room,'WRITING');if(r.paused){r.paused=false;r.deadline=r.remaining===null?null:now+r.remaining;r.autoPaused=false;}else{r.paused=true;r.remaining=r.deadline?Math.max(0,r.deadline-now):null;r.deadline=null;}break;
 case 'extra':requirePhase(room,'WRITING');if(r.paused&&r.remaining!==null)r.remaining+=15000;else if(r.deadline)r.deadline+=15000;break;
 case 'finishBeat':requirePhase(room,'WRITING');if(!a.confirm)throw Error('Confirm game fills for the unfinished lines.');r.stories.forEach((s,j)=>gameFill(r,j,r.beat,now));nextAfterWriting(room,now);break;
 case 'beginReveal':requirePhase(room,'REVEAL_READY');room.phase='REVEAL';break;
 case 'reveal':requirePhase(room,'REVEAL');if(a.cursor!==`${r.currentStory}:${r.boundary[r.currentStory]}`)throw Error('The reveal already moved forward.');advanceReveal(room,now);break;
 case 'back':requireHost(room,id);requirePhase(room,'REVEAL');{const order=r.order.filter(j=>!r.stories[j].hidden);const i=order.indexOf(r.currentStory);if(i>0)r.currentStory=order[i-1];r.auto=null;}break;
 case 'auto':requirePhase(room,'REVEAL');r.auto=a.pace?{pace:Math.max(4,Math.min(20,Number(a.pace))),next:now+Number(a.pace)*1000}:null;break;
 case 'hide':requirePhase(room,'REVEAL');if(!a.confirm)throw Error('Confirm hiding this story.');r.stories[r.currentStory].hidden=true;r.auto=null;{const order=r.order.filter(j=>!r.stories[j].hidden);if(!order.length)finishAwards(room);else r.currentStory=order.find(j=>r.boundary[j]<packOf(r).beats.length)??order[0];}break;
 case 'react':requirePhase(room,'REVEAL');if(m.role==='viewer')throw Error('Only players and the facilitator can react.');if(!['laugh','surprise','applause','boo'].includes(a.reaction))throw Error('Unknown reaction.');if(now-(r.reactionAt[id]||0)<1000)throw Error('Give that reaction a moment.');r.reactionAt[id]=now;{const key=r.currentStory+':'+a.reaction;r.reactions[key]=(r.reactions[key]||0)+1;}break;
 case 'vote':requirePhase(room,'AWARDS');if(!r.slots.some(s=>s.id===id))throw Error('Viewers do not vote.');if(!categories.includes(a.category)||!(a.story===null||eligible(r).some(s=>s.j===a.story)))throw Error('Choose an available story.');r.ballots[id]={...r.ballots[id],[a.category]:a.story};r.ballotDone[id]=false;break;
 case 'ballotDone':requirePhase(room,'AWARDS');if(!r.slots.some(s=>s.id===id))throw Error('Viewers do not vote.');r.ballotDone[id]=true;if(r.slots.every(s=>r.ballotDone[s.id]))finishAwards(room);break;
 case 'finishAwards':requireHost(room,id);requirePhase(room,'AWARDS');finishAwards(room);break;
 case 'end':if(!a.confirm)throw Error('Confirm ending this round.');if(r){r.stories.forEach(s=>{if(s.lines.filter(Boolean).length!==packOf(r).beats.length)s.hidden=true;});r.stories.forEach(s=>r.boundary[s.j]=s.hidden?0:packOf(r).beats.length);finishAwards(room);}break;
 case 'another':requirePhase(room,'RESULTS');room.history.push(structuredClone(r));room.round=null;room.phase='LOBBY';room.members.forEach(m=>m.ready=false);room.settings.pack=shuffled(packs.filter(p=>p.id!==r.settings.pack))[0].id;break;
 case 'transfer':{const target=room.members.find(m=>m.id===a.member&&m.role!=='viewer'&&now-m.seen<30000);if(!target)throw Error('Choose a connected participant.');room.host=target.id;break;}
 case 'away':{const target=room.members.find(m=>m.id===a.member&&m.id!==id);if(!target)throw Error('Choose another player.');target.away=true;target.seen=0;break;}
 default:throw Error('Unknown action.');
 }
 if(a.requestId){room.requests.push(id+':'+a.requestId);room.requests=room.requests.slice(-500);}
}
function publicStories(r,full=false){return r.order.filter(j=>!r.stories[j].hidden).map(j=>({j,id:r.stories[j].id,lines:r.stories[j].lines.slice(0,full?undefined:r.boundary[j]).filter(Boolean).map((l,b)=>({text:l.text,source:l.source,author:r.settings.attribution&&l.source==='human'?r.slots[l.slot].name:null,label:packOf(r).beats[b].label}))}));}
export function results(r){const stories=publicStories(r,true);return {id:r.id,number:r.number,pack:packOf(r).name,stories,awards:categories.map(category=>{const counts={};Object.values(r.ballots).forEach(ballot=>{const j=ballot[category];if(j!==undefined&&j!==null&&stories.some(s=>s.j===j))counts[j]=(counts[j]||0)+1;});const max=Math.max(0,...Object.values(counts));return {category,winners:max?Object.keys(counts).filter(j=>counts[j]===max).map(Number):[],counts};})};}
export function view(room,id,now=Date.now()){
 const m=room.members.find(m=>m.id===id),r=room.round;
 const v={code:room.code,phase:room.phase,revision:room.revision,serverNow:now,host:room.host,me:m?{id:m.id,role:m.role,name:m.name}:null,settings:room.settings,members:room.members.map(x=>({id:x.id,name:x.name,avatar:x.avatar,role:x.role,ready:x.ready,connected:room.local||now-x.seen<30000,away:!!x.away})),history:room.history.map(results),recent:room.recent,local:room.local};
 if(!r)return v;
 const slot=r.slots.findIndex(s=>s.id===id),j=slot<0?-1:assignedStory(slot,r.beat,r.slots.length),beat=packOf(r).beats[r.beat];
 v.round={id:r.id,number:r.number,settings:r.settings,pack:packOf(r).name,beat:r.beat,total:packOf(r).beats.length,prompt:beat.variants[r.variants[r.beat]],deadline:r.deadline,paused:r.paused,transition:r.transition,folded:r.stories.filter(s=>s.lines[r.beat]).length,count:r.slots.length,slot,story:j,submitted:j>=0&&!!r.stories[j].lines[r.beat],clue:room.phase==='WRITING'&&j>=0&&r.beat>0&&r.settings.mode==='leak'?r.stories[j].lines[r.beat-1]?.clue:null,card:r.settings.styles&&slot>=0?r.cards[id]:null,localTurn:r.localTurn,localReady:r.localReady,turnName:r.slots[r.localTurn]?.name,turnId:r.slots[r.localTurn]?.id,stories:['REVEAL','AWARDS','RESULTS'].includes(room.phase)?publicStories(r):[],currentStory:r.currentStory,cursor:`${r.currentStory}:${r.boundary[r.currentStory]}`,auto:r.auto,ballot:slot>=0?r.ballots[id]||{}:null,ballotDone:slot>=0?!!r.ballotDone[id]:null,reactions:r.reactions,voted:Object.values(r.ballotDone).filter(Boolean).length,results:room.phase==='RESULTS'?results(r):null};
 return v;
}
