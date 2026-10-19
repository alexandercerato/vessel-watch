import {referenceFor,courtReferenceLabel} from './reference-data.js?v=20261019-2';
import {etaLabel} from './pdf-export.js?v=20261019-2';
const utc=at=>at&&Number.isFinite(Date.parse(at))?new Date(at).toISOString().replace('T',' ').slice(0,16)+' UTC':'Time unavailable';
const coords=p=>Math.abs(p.lat).toFixed(4)+' deg '+(p.lat<0?'S':'N')+' / '+Math.abs(p.lon).toFixed(4)+' deg '+(p.lon<0?'W':'E');
export function briefRecords(rows,data,resolve){
 return [...rows].sort((a,b)=>a.name.localeCompare(b.name)).map(r=>{
  const d=resolve(r.static?.destination),p=r.position,s=referenceFor(data,r),jurisdiction=[],arrival=[];
  let location=p?[(p.zone?p.zone.name+' - '+(p.zone.country==='Italia'?'Italy':p.zone.country):p.near??'Port not identified'),coords(p),'Fix: '+utc(p.at)].join('\n'):'AIS position unavailable';
  if(!p&&s?.area)location+='\n'+s.source+' area reference: '+s.area+'\nConsulted: '+utc(s.checked_at)+'\nSignal age then: '+(s.position_age_reported??'not reported');
  if(r.static?.destination){jurisdiction.push((d.country??'Country not identified')+' | '+(d.port??'Port not identified'),courtReferenceLabel(d.court),'AIS declaration');arrival.push('AIS ETA: '+etaLabel(r.static.eta_reported),'Static data: '+utc(r.static.at));}
  if(s?.destination_reported){const same=d.port&&s.port&&d.port.toUpperCase()===s.port.toUpperCase();if(!same)jurisdiction.push((s.country??'Country not identified')+' | '+(s.port??'Port not identified'),courtReferenceLabel(s.court_reference));jurisdiction.push(s.source+' '+(s.voyage_status==='reported_arrival'?'reported port':'reference')+' | '+utc(s.checked_at));
   arrival.push(s.source+': '+(s.arrival_reported?'reported arrival '+s.arrival_reported:s.eta_reported??'ETA unavailable'),'Year/timezone only as stated');}
  return [r.name+'\nIMO '+r.imo,location,jurisdiction.join('\n')||'Destination unavailable',arrival.join('\n')||'Not reported'];
 });
}
