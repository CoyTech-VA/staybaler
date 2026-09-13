import {NextResponse} from 'next/server';
export async function POST(request:Request) {
 const endpoint=process.env.N8N_CHAT_WEBHOOK_URL;
 if(!endpoint) return NextResponse.json({success:false,reply:'Assistant is not connected yet.'},{status:503});
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin) return NextResponse.json({success:false},{status:403});
 try {
 const bodyText=await request.text(); if(bodyText.length>10000) return NextResponse.json({success:false},{status:413});
 const body=JSON.parse(bodyText);
 if(typeof body.message!=='string'||!body.message.trim()||body.message.length>2000||typeof body.sessionId!=='string'||body.sessionId.length>100||typeof body.context?.page!=='string') return NextResponse.json({success:false},{status:400});
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(process.env.N8N_WEBHOOK_SECRET?{'X-Webhook-Secret':process.env.N8N_WEBHOOK_SECRET}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(18000)});
 if(!response.ok) throw new Error('Upstream unavailable');
 return NextResponse.json(await response.json());
 } catch {return NextResponse.json({success:false},{status:502});}
}
