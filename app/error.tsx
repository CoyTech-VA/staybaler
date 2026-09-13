'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="container section empty"><h1>We couldn’t load the stays.</h1><p>Please try again in a moment.</p><button className="button" onClick={reset}>Try again</button></div>;}
