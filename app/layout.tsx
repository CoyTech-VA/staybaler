import type {Metadata} from 'next';
import './globals.css';
import {Header,Footer} from '@/components/shell';
import {ChatProvider} from '@/components/chat';
export const metadata:Metadata={title:{default:'StayBaler Beach Resort — Rooms, relaxation & adventure',template:'%s | StayBaler'},description:'Explore rooms, suites, and activities at StayBaler Beach Resort, a fictional seaside resort in Baler, Aurora.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><ChatProvider><Header/><main id="main">{children}</main><Footer/></ChatProvider></body></html>;}
