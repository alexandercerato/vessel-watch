import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=name=>JSON.parse(fs.readFileSync(new URL('../public/data/'+name+'.json',import.meta.url)));
const fleet=read('fleet'),ids=new Set(fleet.vessels.map(v=>v.imo));
test('public references cover the watchlist once, keep source identity and consultation dates, and invent no coordinates',()=>{
 const d=read('supplemental');assert.equal(d.schema_version,1);assert.equal(d.vessels.length,44);assert.equal(new Set(d.vessels.map(v=>v.imo)).size,44);
 for(const v of d.vessels){assert.ok(ids.has(v.imo));for(const s of [v.vesselfinder,v.marinetraffic]){assert.equal(new URL(s.url).protocol,'https:');assert.ok(Number.isFinite(Date.parse(s.checked_at)));}const s=v.vesselfinder;assert.equal(s.reported_imo,v.imo);assert.match(s.mmsi,/^\d{9}$/);assert.equal(s.coordinates,null);assert.equal(s.signal_at,null);if(s.court_reference?.status==='reference'){assert.ok(s.court_reference.name);assert.ok(s.court_reference.sources.length);}}
});
test('news is dated, deduplicated, scoped to monitored ships or the wider company, and limited to 12 months',()=>{
 const d=read('news'),required=['id','title','published_at','source','url','scope','vessel_names','vessel_imos','summary'];
 assert.ok(/^\d{4}-\d\d-\d\dT.*Z$/.test(d.checked_at));assert.ok(d.items.length<=30);assert.equal(new Set(d.items.map(n=>n.id)).size,d.items.length);assert.equal(new Set(d.items.map(n=>n.url)).size,d.items.length);
 const cutoff=new Date(d.checked_at);cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);
 for(const [i,n] of d.items.entries()){for(const k of required)assert.ok(k in n);assert.equal(new URL(n.url).protocol,'https:');assert.ok(['vessel','company'].includes(n.scope));assert.ok(Date.parse(n.published_at)>=cutoff.getTime()-86400000);if(i)assert.ok(d.items[i-1].published_at>=n.published_at);if(n.scope==='vessel'){assert.ok(n.vessel_imos.length);for(const imo of n.vessel_imos)assert.ok(ids.has(imo));}else{assert.equal(n.vessel_imos.length,0);assert.equal(n.vessel_names.length,0);}}
});
