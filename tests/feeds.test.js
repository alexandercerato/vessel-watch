import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {runFeeds} from '../backend/feeds.js';
import {feedStatusText} from '../public/feed-status.js';
test('silent websocket is terminated and reconnected without changing vessel data',async()=>{
 const sockets=[],timers=new Map();let id=0,now=Date.now();
 class Socket extends EventEmitter{
  static OPEN=1;constructor(url){super();this.url=url;this.readyState=1;this.pings=0;sockets.push(this);}send(){}ping(){this.pings++;}terminate(){this.terminated=true;this.readyState=3;this.emit('close');}close(){this.readyState=3;this.emit('close');}
 }
 const rows=new Map(),watch={rows,byMMSI:new Map(),ingestStream(){throw new Error('No vessel data expected');}};
 const feeds=runFeeds(watch,{AISSTREAM_API_KEY:'test'},{WebSocket:Socket,now:()=>now,setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:t=>timers.delete(t)});
 sockets.forEach(s=>s.emit('open'));await Promise.resolve();
 const run=ms=>{const entry=[...timers].find(([,t])=>t.ms===ms);assert.ok(entry);timers.delete(entry[0]);entry[1].fn();};
 now+=45000;run(45000);assert.equal(sockets[1].pings,1);
 now+=91000;run(45000);assert.equal(sockets[1].terminated,true);assert.notEqual(feeds.status.aisstream.state,'receiving');
 run(60000);assert.equal(sockets.length,3);assert.equal(rows.size,0);feeds.stop();
});
test('UI never describes a ten-day-old feed message as receiving',()=>{
 const t=feedStatusText({aisstream:{state:'receiving',last_message_at:'2026-10-09T20:47:37Z'}},Date.parse('2026-10-19T06:00:00Z'));
 assert.match(t,/No recent stream messages/);assert.doesNotMatch(t,/: receiving/);
});
