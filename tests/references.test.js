import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parsePublicVesselPage,referenceFromPage,ReferenceMonitor} from '../backend/reference-pages.js';
import {mergeReferenceDatasets,referenceFor,courtReferenceLabel} from '../public/reference-data.js';
const directory=JSON.parse(fs.readFileSync(new URL('../public/data/ports.json',import.meta.url)));
const legal=JSON.parse(fs.readFileSync(new URL('../public/data/courts.json',import.meta.url)));
const ship={imo:'9122930',name:'GLOVIS CORONA'};
const page='The current position of GLOVIS CORONA is at East Asia reported 6 hours ago by AIS. The vessel is en route to the port of Singapore, Singapore, sailing at a speed of 15.6 knots and expected to arrive there on Oct 25, 15:30. The vessel GLOVIS CORONA (IMO 9122930, MMSI 440161000) is a Vehicles Carrier.';
test('public relative age stays unverified and never becomes a signal timestamp',()=>{
 const p=parsePublicVesselPage(page,ship.imo);assert.equal(p.position_age_reported,'6 hours ago');assert.equal(p.signal_at,null);assert.equal(p.coordinates,null);assert.equal(p.eta_reported,'Oct 25, 15:30');
 const ref=referenceFromPage(page,ship,null,directory,legal,'2026-10-19T05:00:00Z');assert.equal(ref.country,'Singapore');assert.equal(ref.port,'Singapore');assert.match(ref.court_reference.name,/High Court/);
 assert.throws(()=>parsePublicVesselPage(page,'9122942'));assert.throws(()=>parsePublicVesselPage('<h1>GLOVIS CORONA</h1><p>Verify you are human</p>',ship.imo));
});
test('HTML spacing is trimmed and a previously disputed MMSI stays flagged',()=>{
 const previous={mmsi:'440161000',mmsi_verification_status:'conflict',identity_check:'Conflict under review'};
 const p=referenceFromPage(page.replace('Singapore, Singapore, sailing','Singapore, Singapore <span></span>, sailing'),ship,previous,directory,legal,'2026-10-19T05:00:00Z');
 assert.equal(p.destination_reported,'Singapore, Singapore');assert.equal(p.mmsi_verification_status,'conflict');assert.equal(p.identity_check,'Conflict under review');
});
test('an arrival reference is distinct from an ETA and a changed port clears the previous court',()=>{
 const arrived=page.replace(/The vessel is en route.*?The vessel GLOVIS/,'The vessel arrived at the port of Mystery, Example on Oct 19, 02:57 UTC. The vessel GLOVIS');
 const p=referenceFromPage(arrived,ship,{destination_reported:'Singapore, Singapore',court_reference:{name:'Singapore court',status:'reference'}},directory,legal,'2026-10-19T05:00:00Z');
 assert.equal(p.voyage_status,'reported_arrival');assert.equal(p.arrival_reported,'Oct 19, 02:57 UTC');assert.equal(p.eta_reported,null);assert.equal(p.court_reference.status,'unverified');assert.equal(courtReferenceLabel(p.court_reference),'Jurisdiction not verified');
});
test('newer public and backend attempts are reconciled without replacing newer valid data',()=>{
 const v={...ship,vesselfinder:{source:'VesselFinder',access_status:'available',mmsi:'440161000',checked_at:'2026-10-19T05:00:00Z',port:'Singapore'}};
 const a={checked_at:'2026-10-19T05:00:00Z',vessels:[v]};
 const b={checked_at:'2026-10-19T06:00:00Z',vessels:[{...ship,vesselfinder:{...v.vesselfinder,checked_at:'2026-10-18T05:00:00Z',port:'Old port',last_attempt_at:'2026-10-19T06:00:00Z',last_attempt_status:'unavailable'}}]};
 const merged=mergeReferenceDatasets(a,b);assert.equal(merged.vessels[0].vesselfinder.port,'Singapore');assert.equal(merged.vessels[0].vesselfinder.last_attempt_status,'unavailable');
 assert.equal(referenceFor(merged,{imo:ship.imo,identity:{mmsi:'441000000'}}),null);assert.equal(referenceFor(merged,{imo:ship.imo,identity:null}).port,'Singapore');
});
test('a newer page consultation does not clear a known disputed MMSI',()=>{
 const old={...ship,vesselfinder:{access_status:'available',mmsi:'440161000',checked_at:'2026-10-18T01:00:00Z',mmsi_verification_status:'conflict',identity_check:'Unresolved conflict'}};
 const latest={...ship,vesselfinder:{access_status:'available',mmsi:'440161000',checked_at:'2026-10-19T01:00:00Z'}};
 const result=mergeReferenceDatasets({vessels:[old]},{vessels:[latest]});
 assert.equal(result.vessels[0].vesselfinder.mmsi_verification_status,'conflict');assert.equal(referenceFor(result,{imo:ship.imo}),null);
});
test('a blocked source preserves valid data, timestamp and court across a refresh and restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vw-ref-'));
 try{
  const ref=referenceFromPage(page,ship,null,directory,legal,'2026-10-18T05:00:00Z');
  const seed={schema_version:1,checked_at:ref.checked_at,coverage:{fleet:1},vessels:[{...ship,vesselfinder:ref,marinetraffic:{source:'MarineTraffic',access_status:'unavailable',checked_at:ref.checked_at}}]};
  const options={fleet:{vessels:[ship]},seed,directory,legal,dataDir:dir,clock:()=> '2026-10-19T06:00:00Z',fetchPage:async()=>({ok:false,status:403})};
  const monitor=new ReferenceMonitor(options);const first=monitor.refresh();assert.equal(monitor.refresh(),first);await first;
  const latest=monitor.snapshot();assert.equal(latest.job.completed,2);assert.equal(latest.data.coverage.vesselfinder_accessible,0);assert.equal(latest.data.vessels[0].vesselfinder.checked_at,ref.checked_at);assert.equal(latest.data.vessels[0].vesselfinder.last_attempt_note,'HTTP 403');assert.deepEqual(latest.data.vessels[0].vesselfinder.court_reference,ref.court_reference);
  assert.equal(new ReferenceMonitor(options).snapshot().data.vessels[0].vesselfinder.checked_at,ref.checked_at);
 }finally{fs.rmSync(dir,{recursive:true});}
});
test('completed refresh replaces stale summary-note dates with the consultation time',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vw-note-'));
 try{
  const seed={schema_version:1,checked_at:'2026-10-19T01:33:46Z',notes:['stale'],coverage:{},vessels:[{...ship,vesselfinder:{},marinetraffic:{}}]};
  const monitor=new ReferenceMonitor({fleet:{vessels:[ship]},seed,directory,legal,dataDir:dir,clock:()=> '2026-10-22T01:37:39.641Z',
   fetchPage:async url=>url.includes('supplemental.json')?{ok:false,status:404}:url.includes('vesselfinder')?{ok:true,text:async()=>page}:{ok:false,status:403}});
  await monitor.refresh();
  const notes=monitor.snapshot().data.notes;
  assert.match(notes[0],/^2026-10-22T01:37:39Z:/);assert.match(notes[1],/accessible for 0 of 1 vessels/);
 }finally{fs.rmSync(dir,{recursive:true});}
});
