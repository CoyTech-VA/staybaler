'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {CheckCircle2,CalendarDays,LoaderCircle,X,Info} from 'lucide-react';
import {resort,type Room} from '@/data/resort';
import {money} from '@/lib/hotels';
import {checkAvailability} from '@/lib/availability-api';
import {safeBookingUrl,todayInBaler,tripQuery,validateAvailability,validDate,type AvailabilityRequest,type AvailabilityResponse,type Trip} from '@/lib/availability';
import {roomBookingLinks} from '@/lib/room-booking-links';
type Outcome={kind:'result';data:AvailabilityResponse;request:AvailabilityRequest}|{kind:'error';request:AvailabilityRequest};
export function RoomBooking({room:r,initial}:{room:Room;initial?:Trip}){
 const [checkin,setCheckin]=useState(initial?.checkin||''),[checkout,setCheckout]=useState(initial?.checkout||''),[guests,setGuests]=useState(initial?.guests||1);
 const [busy,setBusy]=useState(false),[validation,setValidation]=useState(''),[outcome,setOutcome]=useState<Outcome|null>(null);
 const inFlight=useRef(false),controller=useRef<AbortController|null>(null),dialog=useRef<HTMLDialogElement>(null),submitButton=useRef<HTMLButtonElement>(null);
 const router=useRouter();
 useEffect(()=>()=>controller.current?.abort(),[]);
 useEffect(()=>{if(!outcome)return;const element=dialog.current;if(!element)return;element.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{element.close();document.body.style.overflow=previous;submitButton.current?.focus();};},[outcome]);
 const payload:AvailabilityRequest={room:r.name,check_in:checkin,check_out:checkout,guests};
 async function submit(request:AvailabilityRequest){
 if(inFlight.current)return;
 const issue=validateAvailability(request,r.guests);setValidation(issue||'');if(issue)return;
 inFlight.current=true;setBusy(true);setOutcome(null);controller.current=new AbortController();
 try{const data=await checkAvailability(request,controller.current.signal);setOutcome({kind:'result',data,request});}
 catch{if(!controller.current.signal.aborted)setOutcome({kind:'error',request});}
 finally{inFlight.current=false;setBusy(false);}
 }
 const result=outcome?.kind==='result'?outcome.data:null;
 const available=result?.available===true;
 const bookingUrl=available?(safeBookingUrl(result.booking_url)||safeBookingUrl(roomBookingLinks[r.slug])):undefined;
 const heading=outcome?.kind==='error'?'Unable to Check Availability':available?'Room is Available':'Room Not Available';
 return <aside className="booking"><p><strong>{money(r.price)}</strong> / night</p><small>Sample room rate · {resort.name}</small>
 <form noValidate aria-busy={busy} onSubmit={e=>{e.preventDefault();void submit(payload);}}>
 <label>Selected room<input value={r.name} readOnly aria-label="Selected room"/></label>
 <fieldset disabled={busy} className="availability-fields">
 <label>Check-in<input required type="date" min={todayInBaler()} value={checkin} onChange={e=>{setCheckin(e.target.value);setValidation('');}}/></label>
 <label>Check-out<input required type="date" min={validDate(checkin)?new Date(new Date(checkin+'T00:00:00Z').getTime()+86400000).toISOString().slice(0,10):todayInBaler()} value={checkout} onChange={e=>{setCheckout(e.target.value);setValidation('');}}/></label>
 <label>Guests<select value={guests} onChange={e=>{setGuests(Number(e.target.value));setValidation('');}}>{Array.from({length:Math.max(r.guests,guests<=6?guests:0)},(_,i)=><option key={i+1} value={i+1} disabled={i+1>r.guests}>{i+1}{i+1>r.guests?' — exceeds room capacity':''}</option>)}</select></label>
 </fieldset>
 {validation&&<p className="error" role="alert">{validation}</p>}
 <button ref={submitButton} className="button" disabled={busy}>{busy&&<LoaderCircle size={17} className="availability-spinner"/>}{busy?'Checking Availability...':'Check Availability'}</button>
 <span className="availability-status" role="status">{busy?'Checking your selected room and dates.':''}</span>
 </form><small>Check availability, then continue to our booking partner. A check does not reserve a room.</small>
 {outcome&&<dialog ref={dialog} className="availability-dialog" aria-labelledby="availability-heading" aria-describedby="availability-description" onCancel={()=>setOutcome(null)} onClose={()=>setOutcome(null)} onClick={e=>{if(e.target===e.currentTarget){const box=e.currentTarget.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)setOutcome(null);}}}>
 <button className="availability-close" aria-label="Close availability result" onClick={()=>setOutcome(null)}><X size={22}/></button>
 <div className={`availability-symbol ${available?'available':''}`}>{available?<CheckCircle2 size={30}/>:<Info size={30}/>}</div>
 <h2 id="availability-heading">{heading}</h2>
 <p id="availability-description">{outcome.kind==='error'?"We're having trouble checking room availability right now. Please try again.":available?`Great news! ${r.name} is available for your chosen dates.`:`Unfortunately, ${r.name} is not available for your selected dates. Please choose another room.`}</p>
 <div className="availability-trip"><CalendarDays size={18}/><span>{outcome.request.check_in} → {outcome.request.check_out}<small>{outcome.request.guests} guest{outcome.request.guests===1?'':'s'} · {r.name}</small></span></div>
 {outcome.kind==='error'?<button className="button" onClick={()=>void submit(outcome.request)}>Try Again</button>:available?bookingUrl?<><a className="button" href={bookingUrl}>Book Now</a><small>Continue to our booking partner to confirm your dates, price, and reservation.</small></>:<><p className="availability-link-error">The room is available, but the booking link is currently unavailable. Please try again.</p><button className="button" onClick={()=>void submit(outcome.request)}>Try Again</button></>:<button className="button" onClick={()=>{const query=tripQuery({checkin:outcome.request.check_in,checkout:outcome.request.check_out,guests:outcome.request.guests});setOutcome(null);router.push('/rooms?'+query+'#room-selection');}}>Choose Another Room</button>}
 </dialog>}
 </aside>;
}
