import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {etaLabel,createFleetPDF} from '../public/pdf-export.js';
import {briefRecords} from '../public/brief-records.js';
import {createResolver} from '../public/destinations.js';
test('AIS month/day ETA is retained without inventing a year',()=>{
 assert.equal(etaLabel('10-25 15:30'),'25/10 15:30 UTC (AIS; year not supplied)');
 for(const bad of ['00-25 15:30','10-32 15:30','10-25 24:30','10-25 15:60'])assert.equal(etaLabel(bad),'Not reported');
 assert.match(etaLabel({Month:10,Day:25,Hour:15,Minute:30}),/year not supplied/);
});
test('PDF references remain labelled and never overwrite AIS declarations or positions',async()=>{
 const dir=JSON.parse(fs.readFileSync(new URL('../public/data/ports.json',import.meta.url))),legal=JSON.parse(fs.readFileSync(new URL('../public/data/courts.json',import.meta.url)));
 const row={imo:'9122930',name:'GLOVIS CORONA',identity:{mmsi:'440161000'},position:{lat:3,lon:119,at:'2026-10-18T01:00:00Z'},static:{destination:'KRUSN',at:'2026-10-18T01:00:00Z',eta_reported:'10-25 15:30'}};
 const before=JSON.stringify(row),data={vessels:[{imo:row.imo,vesselfinder:{source:'VesselFinder',mmsi:'440161000',access_status:'available',checked_at:'2026-10-19T01:00:00Z',country:'Singapore',port:'Singapore',destination_reported:'Singapore, Singapore',eta_reported:'Oct 26, 01:00'}}]};
 const records=briefRecords([row],data,createResolver(dir,legal));
 assert.match(records[0][2],/Ulsan/);assert.match(records[0][2],/Singapore/);assert.match(records[0][2],/VesselFinder reference/);assert.match(records[0][3],/year not supplied/);assert.equal(JSON.stringify(row),before);
 const pdf=await createFleetPDF(records).text();assert.ok(pdf.startsWith('%PDF-1.4'));assert.ok(pdf.endsWith('%%EOF'));assert.match(pdf,/VesselFinder/);
 data.vessels[0].vesselfinder.mmsi='441000000';assert.doesNotMatch(briefRecords([row],data,createResolver(dir,legal))[0][2],/Singapore/);
});
