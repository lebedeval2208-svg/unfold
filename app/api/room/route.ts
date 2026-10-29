import { env } from 'cloudflare:workers';
import { newRoom, join, command, reconcile, view, uid } from '../../../lib/game.js';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 try{
  const b:any=await request.json();if(!b||typeof b!=='object')throw Error('Invalid request.');const db=(env as any).DB;if(!db)return json({error:'Online rooms are temporarily unavailable. One-device play and the demo still work.'},503);
  const now=Date.now();const token=b.token;
  if(b.type==='create'){
   await db.prepare('DELETE FROM rooms WHERE code IN (SELECT code FROM rooms WHERE expires < ? LIMIT 50)').bind(now).run();
   for(let attempt=0;attempt<8;attempt++){
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=crypto.getRandomValues(new Uint8Array(6));const code=Array.from(bytes,x=>alphabet[x%alphabet.length]).join('');const credential=uid()+uid();const room=newRoom(code,b.name,credential,now);(room as any).ttl=Math.max(3600000,Math.min(604800000,Number((env as any).ROOM_TTL_HOURS||24)*3600000));room.expires=now+(room as any).ttl;room.members[0].avatar=['✳','◆','●','✦','◎','❋','▲','■'].includes(b.avatar)?b.avatar:'✳';
    const inserted=await db.prepare('INSERT OR IGNORE INTO rooms (code,revision,expires,data) VALUES (?,0,?,?)').bind(code,room.expires,JSON.stringify(room)).run();if(inserted.meta.changes)return json({token:credential,state:view(room,room.host,now)});
   }throw Error('Please try creating your room again.');
  }
  const code=String(b.code||'').trim().toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))throw Error('Enter the six-character room code.');
  for(let attempt=0;attempt<12;attempt++){
   const row=await db.prepare('SELECT data,revision FROM rooms WHERE code=?').bind(code).first();if(!row)return json({error:'Room not found. Check the invite or ask your host.'},404);
   const room=JSON.parse(row.data);reconcile(room,now);let member=room.members.find((m:any)=>m.token===token);let newToken;
   if(b.type==='join'){newToken=uid()+uid();member=join(room,b.name,newToken,b.avatar,now);}
   else if(b.type==='state') {if(member){member.seen=now;member.away=false;room.active=now;room.expires=now+(room.ttl||86400000);}}
   else {if(!member)return json({error:'Your room session is missing. Rejoin with your original device.'},403);command(room,member.id,b,now);}
   room.revision=row.revision+1;
   const updated=await db.prepare('UPDATE rooms SET data=?,revision=?,expires=? WHERE code=? AND revision=?').bind(JSON.stringify(room),room.revision,room.expires,code,row.revision).run();
   if(updated.meta.changes)return json({...(newToken?{token:newToken}:{}),state:view(room,member?.id,now)});
  }return json({error:'The room is busy. Please try again.'},409);
 }catch(error){return json({error:error instanceof Error?error.message:'Unable to connect. Try again.'},400);}
}
