import {parseAvailability,type AvailabilityRequest,type AvailabilityResponse} from './availability';
export async function checkAvailability(payload:AvailabilityRequest,signal?:AbortSignal):Promise<AvailabilityResponse>{
 const endpoint=process.env.NEXT_PUBLIC_N8N_AVAILABILITY_WEBHOOK_URL||'/api/availability';
 const timeout=AbortSignal.timeout(25000);
 try {
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store',signal:signal?AbortSignal.any([signal,timeout]):timeout});
 if(!response.ok)throw new Error(`Availability HTTP ${response.status}`);
 return parseAvailability(await response.json(),payload.room);
 }catch(error){if(process.env.NODE_ENV==='development')console.warn('Availability check failed:',error instanceof Error?error.name:'Unknown error');throw error;}
}
