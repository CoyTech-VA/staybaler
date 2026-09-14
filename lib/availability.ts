export type AvailabilityRequest = {room:string;check_in:string;check_out:string;guests:number};
export type AvailabilityResponse = {available:boolean;room:string;message?:string;booking_url?:string};
export type Trip = {checkin:string;checkout:string;guests:number};
export function todayInBaler(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function validDate(value:unknown):value is string {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T00:00:00Z');return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function validateAvailability(value:AvailabilityRequest,maxGuests:number,today=todayInBaler()):string|null {
 if(!value.room)return 'Please select a room.';
 if(!validDate(value.check_in))return 'Please choose a valid check-in date.';
 if(!validDate(value.check_out))return 'Please choose a valid check-out date.';
 if(value.check_in<today)return 'Please choose today or a future check-in date.';
 if(value.check_out<=value.check_in)return 'Check-out must be after check-in.';
 if(!Number.isInteger(value.guests)||value.guests<1||value.guests>maxGuests)return `Please select between 1 and ${maxGuests} guests for this room.`;
 return null;
}
export function safeBookingUrl(value:unknown,allowedHosts:string[]=[]):string|undefined {
 if(typeof value!=='string'||!value.trim())return undefined;
 try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)return undefined;
 if(allowedHosts.length&&!allowedHosts.includes(url.hostname.toLowerCase()))return undefined;
 return url.href;}catch{return undefined;}
}
export function parseAvailability(value:unknown,room:string):AvailabilityResponse {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid availability response');
 const data=value as Record<string,unknown>;
 if(typeof data.available!=='boolean'||data.room!==room)throw new Error('Invalid availability result or room mismatch');
 return {available:data.available,room,message:typeof data.message==='string'?data.message:undefined,booking_url:data.available?safeBookingUrl(data.booking_url):undefined};
}
export function tripQuery(trip:Trip){return new URLSearchParams({checkin:trip.checkin,checkout:trip.checkout,guests:String(trip.guests)}).toString();}
