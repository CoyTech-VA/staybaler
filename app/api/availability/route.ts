import {rooms} from '@/data/resort';
import {parseAvailability,safeBookingUrl,validateAvailability,type AvailabilityRequest} from '@/lib/availability';
import {roomBookingLinks} from '@/lib/room-booking-links';
export const maxDuration=30;
const fail=(status:number)=>Response.json({error:'Unable to check availability. Please try again.'},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 const origin=request.headers.get('origin');
 // Next's internal request URL may use the bind address (0.0.0.0).
 // Compare the browser origin to the actual HTTP Host, not that bind address.
 if(origin){try{const url=new URL(origin);const host=request.headers.get('host')||new URL(request.url).host;if(!['https:','http:'].includes(url.protocol)||url.host!==host)return fail(403);}catch{return fail(403);}}
 if(!request.headers.get('content-type')?.includes('application/json'))return fail(415);
 let body:AvailabilityRequest;
 try{
 // Bound the body before parsing; no guest personal data is needed.
 const reader=request.body?.getReader();if(!reader)return fail(400);
 const chunks:Uint8Array[]=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>4096){await reader.cancel();return fail(413);}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 body=JSON.parse(new TextDecoder().decode(bytes));
 }catch{return fail(400);}
 if(!body||typeof body!=='object')return fail(400);
 const room=rooms.find(r=>r.name===body.room);
 if(!room||validateAvailability(body,room.guests))return fail(400);
 const endpoint=process.env.N8N_AVAILABILITY_WEBHOOK_URL;
 if(!endpoint||!safeBookingUrl(endpoint)){console.error('Availability webhook missing or invalid');return fail(503);}
 try{
 const payload:AvailabilityRequest={room:room.name,check_in:body.check_in,check_out:body.check_out,guests:body.guests};
 const upstream=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(process.env.N8N_AVAILABILITY_WEBHOOK_SECRET?{'X-Webhook-Secret':process.env.N8N_AVAILABILITY_WEBHOOK_SECRET}:{})},body:JSON.stringify(payload),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!upstream.ok){console.error('Availability upstream status:',upstream.status);return fail(502);}
 const result=parseAvailability(await upstream.json(),room.name);
 const allowed=(process.env.GHL_BOOKING_ALLOWED_HOSTS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 const bookingUrl=result.available?(safeBookingUrl(result.booking_url,allowed)||safeBookingUrl(roomBookingLinks[room.slug],allowed)):undefined;
 return Response.json({available:result.available,room:result.room,...(bookingUrl?{booking_url:bookingUrl}:{})},{headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('Availability upstream failure:',error instanceof Error?error.name:'Unknown');return fail(502);}
}
