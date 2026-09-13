'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {resort} from '@/data/resort';
import {MessageCircle,Send,X,Sparkles} from 'lucide-react';
import {sendChat,CHAT_ERROR,type PropertyContext,type ChatResponse} from '@/lib/chat-api';
const ChatContext=createContext<(property?:PropertyContext)=>void>(()=>{});
export const useChat=()=>useContext(ChatContext);
export function ChatProvider({children}:{children:React.ReactNode}) {
 const [open,setOpen]=useState(false),[property,setProperty]=useState<PropertyContext|null>(null),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [messages,setMessages]=useState<{role:string;text:string;recommendations?:ChatResponse['recommendations']}[]>([{role:'assistant',text:"Hi! 👋 I'm your StayBaler Assistant. Welcome to StayBaler Beach Resort. Ask me about our rooms, amenities, and activities."}]);
 const pathname=usePathname(),session=useRef(''),field=useRef<HTMLInputElement>(null),bottom=useRef<HTMLDivElement>(null);
 useEffect(()=>{try{session.current=localStorage.getItem('staybaler-session')||crypto.randomUUID();localStorage.setItem('staybaler-session',session.current);}catch{session.current=crypto.randomUUID();}},[]);
 useEffect(()=>{if(open)field.current?.focus();},[open]);
 useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest'});},[messages,busy]);
 async function submit(text:string,context=property){if(!text.trim()||busy)return;setBusy(true);setError('');setInput('');setMessages(m=>[...m,{role:'user',text}]);try{const data=await sendChat({message:text,sessionId:session.current,context:{page:pathname,property:context,resort}});setMessages(m=>[...m,{role:'assistant',text:data.reply,recommendations:data.recommendations}]);}catch{setError(CHAT_ERROR);}finally{setBusy(false);}}
 function launch(p?:PropertyContext){setProperty(p??null);setOpen(true);if(p)setInput('Tell me about this room.');}
 return <ChatContext.Provider value={launch}>{children}{open&&<section className="chat-panel" aria-label="StayBaler assistant" onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}><header><div><Sparkles size={20}/><strong> Your Baler companion</strong><small>External AI assistant</small></div><button aria-label="Close assistant" onClick={()=>setOpen(false)}><X/></button></header>{property&&<div className="chat-context">Asking about {property.name} <button onClick={()=>setProperty(null)}>Clear</button></div>}<div className="chat-body" aria-live="polite">{messages.map((m,i)=><div key={i} className={`bubble ${m.role}`}><p>{m.text}</p>{m.recommendations?.map(r=><Link key={r.slug} href={`/rooms/${encodeURIComponent(r.slug)}`}>{r.name} →</Link>)}</div>)}{messages.length===1&&<div className="quick-replies">{['Room for 4 people','Ocean-view rooms','What activities do you offer?','Is pool access included?','Dinner for two'].map(t=><button disabled={busy} key={t} onClick={()=>submit(t)}>{t}</button>)}</div>}{busy&&<p>Finding your next escape…</p>}{error&&<p role="alert" className="error">{error}</p>}<div ref={bottom}/></div><form onSubmit={e=>{e.preventDefault();submit(input);}}><input ref={field} aria-label="Your message" placeholder="Tell us about your ideal stay…" value={input} maxLength={2000} onChange={e=>setInput(e.target.value)}/><button className="button" disabled={busy||!input.trim()} aria-label="Send message"><Send size={18}/></button></form><small className="chat-note">Fictional resort demo. No live reservations.</small></section>}<button className="chat-launch" onClick={()=>open?setOpen(false):launch()} aria-expanded={open}><MessageCircle size={21}/> Ask StayBaler AI</button></ChatContext.Provider>;
}
export function AskButton({property,label='Ask AI',className='button secondary'}:{property?:PropertyContext;label?:string;className?:string}){const open=useChat();return <button className={className} onClick={()=>open(property)}><Sparkles size={16}/>{label}</button>;}
