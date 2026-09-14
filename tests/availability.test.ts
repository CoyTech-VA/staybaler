import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAvailability,parseAvailability,safeBookingUrl,tripQuery,validDate} from '../lib/availability.ts';
const request={room:'Ocean Deluxe',check_in:'2026-10-20',check_out:'2026-10-22',guests:2};
test('valid date search passes; empty, impossible, reversed and past dates fail',()=>{
 assert.equal(validateAvailability(request,2,'2026-10-01'),null);
 for(const change of [{room:''},{check_in:''},{check_out:''},{check_in:'2026-02-30'},{check_out:'2026-10-20'},{check_out:'2026-10-19'},{check_in:'2026-09-30'}])assert.ok(validateAvailability({...request,...change},2,'2026-10-01'));
 assert.equal(validDate('2028-02-29'),true);assert.equal(validDate('2027-02-29'),false);
});
test('capacity and integer guest count are enforced',()=>{for(const guests of [0,-1,1.5,3,NaN,Infinity])assert.ok(validateAvailability({...request,guests},2,'2026-10-01'));});
test('availability boolean controls UI rather than message text',()=>{
 assert.equal(parseAvailability({available:false,room:request.room,message:'Room available'},request.room).available,false);
 assert.equal(parseAvailability({available:true,room:request.room,message:'Not available'},request.room).available,true);
});
test('bad payloads and a mismatched room fail closed',()=>{for(const value of [null,[],{}, {available:'true',room:request.room},{available:true,room:'Family Suite'}])assert.throws(()=>parseAvailability(value,request.room));});
test('missing or unsafe booking links never become navigation targets',()=>{
 for(const booking_url of [undefined,'','javascript:alert(1)','http://booking.example/test','https://user:password@booking.example/test'])assert.equal(parseAvailability({available:true,room:request.room,booking_url},request.room).booking_url,undefined);
 assert.equal(safeBookingUrl('https://book.example/room',['book.example']),'https://book.example/room');
 assert.equal(safeBookingUrl('https://book.example.evil.test/',['book.example']),undefined);
 assert.equal(parseAvailability({available:false,room:request.room,booking_url:'https://book.example'},request.room).booking_url,undefined);
});
test('room switching retains dates and guest count',()=>{const params=new URLSearchParams(tripQuery({checkin:request.check_in,checkout:request.check_out,guests:2}));assert.equal(params.get('checkin'),request.check_in);assert.equal(params.get('checkout'),request.check_out);assert.equal(params.get('guests'),'2');});
