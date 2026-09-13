export type PropertyContext={id:string;name:string;slug:string};
export type ChatRequest={message:string;sessionId:string;context:{page:string;property:PropertyContext|null;resort?:{id:string;name:string;location:string}}};
export type ChatResponse={success:boolean;reply:string;recommendations:{id?:string;name:string;slug:string}[]};
export const CHAT_ERROR='Sorry, our StayBaler Assistant is temporarily unavailable. Please try again shortly.';
export async function sendChat(payload:ChatRequest):Promise<ChatResponse> {
 const res=await fetch(process.env.NEXT_PUBLIC_CHAT_API_URL||'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
 if(!res.ok) throw new Error(CHAT_ERROR);
 const data=await res.json();
 if(data.success!==true||typeof data.reply!=='string') throw new Error(CHAT_ERROR);
 return {...data,recommendations:Array.isArray(data.recommendations)?data.recommendations.filter((r:Record<string,unknown>)=>typeof r.name==='string'&&typeof r.slug==='string'):[]};
}
