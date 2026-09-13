export interface Hotel { id:string; name:string; slug:string; description:string; location:string; area:string; propertyType:string; price:number; rating:number; reviewCount:number; beachfront:boolean; distanceToBeach:string; amenities:string[]; images:string[]; featured:boolean; maxGuests:number; categories:string[]; trips:string[] }
export interface Filters { query?:string; category?:string; trip?:string; maxPrice?:number; minRating?:number; type?:string; amenities?:string[]; guests?:number; sort?:string }
export function filterHotels(hotels:Hotel[], f:Filters):Hotel[] {
 const result=hotels.filter(h=>(!f.query || `${h.name} ${h.location} ${h.area}`.toLowerCase().includes(f.query.toLowerCase())) && (!f.category || h.categories.includes(f.category)) && (!f.trip || h.trips.includes(f.trip)) && h.price <= (f.maxPrice ?? Infinity) && h.rating >= (f.minRating ?? 0) && (!f.type || h.propertyType===f.type) && (f.amenities??[]).every(a=>h.amenities.includes(a)) && h.maxGuests >= (f.guests??1));
 return result.sort((a,b)=>f.sort==='price-asc'?a.price-b.price:f.sort==='price-desc'?b.price-a.price:f.sort==='rating'?b.rating-a.rating:Number(b.featured)-Number(a.featured));
}
export const money=(value:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(value);
