const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function identityStatus(reference,row){
 if(!reference?.mmsi)return 'Unavailable';
 if(!row?.identity?.mmsi)return 'IMO/MMSI shown by source; backend identity pending';
 return row.identity.mmsi===reference.mmsi?'Matches backend IMO/MMSI':'MMSI conflict - do not merge';
}
export function renderSupplemental(data,rows=[]){
 const root=document.querySelector('#public-references');if(!root)return;
 if(!data){root.innerHTML='<p class="muted">Public source references unavailable. AIS tracking continues independently.</p>';return;}
 const checked=esc(data.checked_at.replace('T',' ').replace('Z',' UTC'));
 root.innerHTML='<p class="muted">Consulted '+checked+' · VesselFinder: '+data.coverage.vesselfinder_accessible+'/'+data.coverage.fleet+' accessible · MarineTraffic: '+data.coverage.marinetraffic_accessible+'/'+data.coverage.fleet+' accessible.</p><p class="destination-note">Separate public-page references, potentially cached. Relative signal ages are quoted as displayed at consultation and are not live ages. Absolute signal timestamps are unavailable; no reference changes AIS coordinates, freshness or the main declared destination. ETA year and timezone are unverified unless stated. Arrival reports may concern a completed voyage.</p><div class="table-wrap"><table class="fleet-table reference-table"><thead><tr><th>Vessel / identity</th><th>Area reported</th><th>Reference port / country</th><th>ETA / arrival reported</th><th>Court on arrival</th><th>Source / consultation</th></tr></thead><tbody>'+data.vessels.map(v=>{
 const s=v.vesselfinder,r=rows.find(r=>r.imo===v.imo),court=s.court_reference;
 const identity=identityStatus(s,r),conflict=identity.startsWith('MMSI conflict');
 const destination=s.voyage_status==='reported_arrival'?'Reported arrival port':'Declared destination reference';
 const courtHtml=court?esc(court.name)+'<span class="sub">'+esc(court.status==='reference'?'Existing court reference':'Preliminary - confirm locally')+' · checked '+esc(court.checked_at)+'</span>'+(court.sources?.[0]?'<a class="sub" href="'+esc(court.sources[0].url)+'" target="_blank" rel="noopener noreferrer">Court source</a>':''):'Jurisdiction not verified';
 return '<tr><td><b>'+esc(v.name)+'</b><span class="sub">IMO '+esc(v.imo)+' · MMSI '+esc(s.mmsi??'unavailable')+'</span><span class="sub">'+esc(identity)+'</span></td><td>'+esc(s.area??'Unavailable')+'<span class="sub">Source age: '+esc(s.position_age_reported??'not reported')+'</span><span class="sub">Absolute signal time: unavailable</span></td><td>'+esc(s.country??'Country not identified')+'<span class="sub">'+esc(s.port??'Port not identified')+'</span><span class="sub">'+esc(destination)+(conflict?' · identity conflict':'')+'</span></td><td>'+esc(s.eta_reported?'ETA: '+s.eta_reported:s.arrival_reported?'Arrival: '+s.arrival_reported:'Not reported')+'<span class="sub">Source wording; time not independently verified</span></td><td>'+courtHtml+'</td><td><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">VesselFinder</a> · '+esc(s.access_status)+'<span class="sub">'+esc(s.checked_at.replace('T',' ').replace('Z',' UTC'))+'</span><span class="sub">Retrieval crawl metadata: '+esc(s.retrieval_crawl_note??'unavailable')+' at consultation</span><a class="sub" href="'+esc(v.marinetraffic.url)+'" target="_blank" rel="noopener noreferrer">MarineTraffic · '+esc(v.marinetraffic.access_status)+'</a></td></tr>';
 }).join('')+'</tbody></table></div>';
}
