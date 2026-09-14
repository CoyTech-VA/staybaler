import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
// Exercise the actual route without starting Next.js or contacting a provider.
let source=fs.readFileSync(new URL('../app/api/availability/route.ts',import.meta.url),'utf8');
for(const [alias,path] of Object.entries({'@/data/resort':'../data/resort.ts','@/lib/availability':'../lib/availability.ts','@/lib/room-booking-links':'../lib/room-booking-links.ts'}))source=source.replaceAll(alias,new URL(path,import.meta.url).href);
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const payload={room:'Ocean Deluxe',check_in:'2099-10-20',check_out:'2099-10-22',guests:2};
const request=(body:unknown=payload)=>new Request('https://staybaler.test/api/availability',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://staybaler.test'},body:JSON.stringify(body)});
test('availability proxy forwards exact request and private header; sanitizes result',async()=>{
 const originalFetch=globalThis.fetch;const saved={...process.env};
 try{
 process.env.N8N_AVAILABILITY_WEBHOOK_URL='https://n8n.example/webhook/availability';process.env.N8N_AVAILABILITY_WEBHOOK_SECRET='test-secret';process.env.GHL_BOOKING_ALLOWED_HOSTS='book.example';
 globalThis.fetch=async(input,init)=>{assert.equal(String(input),process.env.N8N_AVAILABILITY_WEBHOOK_URL);assert.deepEqual(JSON.parse(String(init?.body)),payload);assert.equal(new Headers(init?.headers).get('X-Webhook-Secret'),'test-secret');return Response.json({available:true,room:payload.room,booking_url:'https://book.example/ocean',privateGuestName:'must not leak'});};
 const response=await POST(request());assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.deepEqual(await response.json(),{available:true,room:payload.room,booking_url:'https://book.example/ocean'});
 globalThis.fetch=async()=>Response.json({available:false,room:payload.room});assert.equal((await (await POST(request())).json()).available,false);
 globalThis.fetch=async()=>Response.json({available:true,room:payload.room,booking_url:'https://evil.example/'});assert.equal((await (await POST(request())).json()).booking_url,undefined);
 }finally{globalThis.fetch=originalFetch;for(const key of ['N8N_AVAILABILITY_WEBHOOK_URL','N8N_AVAILABILITY_WEBHOOK_SECRET','GHL_BOOKING_ALLOWED_HOSTS']){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
});
test('invalid input never reaches n8n; upstream failures never mean unavailable',async()=>{
 const originalFetch=globalThis.fetch,originalError=console.error,saved=process.env.N8N_AVAILABILITY_WEBHOOK_URL;console.error=()=>{};
 try{
 process.env.N8N_AVAILABILITY_WEBHOOK_URL='https://n8n.example/webhook/availability';let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('unauthorized',{status:401});};
 assert.equal((await POST(request({...payload,guests:99}))).status,400);assert.equal(calls,0);
 assert.equal((await POST(request({...payload,room:'Not a room'}))).status,400);assert.equal(calls,0);
 assert.equal((await POST(request())).status,502);
 globalThis.fetch=async()=>new Response('not-json');assert.equal((await POST(request())).status,502);
 globalThis.fetch=async()=>{throw new DOMException('Timeout','TimeoutError');};assert.equal((await POST(request())).status,502);
 delete process.env.N8N_AVAILABILITY_WEBHOOK_URL;assert.equal((await POST(request())).status,503);
 }finally{globalThis.fetch=originalFetch;console.error=originalError;if(saved===undefined)delete process.env.N8N_AVAILABILITY_WEBHOOK_URL;else process.env.N8N_AVAILABILITY_WEBHOOK_URL=saved;}
});
