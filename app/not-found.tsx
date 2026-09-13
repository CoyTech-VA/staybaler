import Link from 'next/link';
export default function NotFound(){return <div className="container section empty"><h1>This escape is off the map.</h1><p>The page or room could not be found.</p><Link className="button" href="/rooms">Explore rooms</Link></div>;}
