export const POSITION_TYPES = new Set(['PositionReport','StandardClassBPositionReport','ExtendedClassBPositionReport','LongRangeAisBroadcastMessage']);
export function clean(value) { return String(value ?? '').replace(/@/g,'').trim(); }
export function numeric(value, min, max) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value); return Number.isFinite(n) && n >= min && n < max ? n : null;
}
export function timestamp(value) {
  if (!value) return null;
  const t=Date.parse(String(value).replace(' +0000 UTC','Z').replace(/^(\d{4}-\d{2}-\d{2}) /,'$1T'));
  return Number.isFinite(t) && t <= Date.now()+60000 ? new Date(t).toISOString() : null;
}
export function validIMO(value) {
  const s=String(value??'').replace(/^IMO\s*/i,'');
  return /^\d{7}$/.test(s) && [...s.slice(0,6)].reduce((a,c,i)=>a+Number(c)*(7-i),0)%10===Number(s[6]) ? s : null;
}
export function getIMO(p) {return validIMO(p.ImoNumber ?? p.IMO ?? p.imo ?? p.imo_number ?? p.particulars?.imo ?? p.particulars?.imo_number);}
export function distanceNm(a,b,c,d) {
  const r=Math.PI/180, q=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;
  return 6880.13*Math.asin(Math.min(1,Math.sqrt(q)));
}
export function zoneAt(lat,lon,zones) {return zones.filter(z=>distanceNm(lat,lon,z.lat,z.lon)<=z.radius_nm).sort((a,b)=>distanceNm(lat,lon,a.lat,a.lon)-distanceNm(lat,lon,b.lat,b.lon))[0]??null;}
export function freshness(position,now=Date.now()) {
  if (!position?.at) return 'unknown';
  const age=now-Date.parse(position.at);
  return age<=15*60000 ? 'recent' : age<=24*3600000 ? 'stale' : 'lost';
}
export function navigation(p) {
  if (!p) return 'unknown';
  if (p.nav_status===5) return 'moored'; if(p.nav_status===1) return 'at_anchor';
  if (p.nav_status===6) return 'aground';
  if(p.sog!==null && p.sog>=1) return 'underway';
  if(p.sog!==null && p.sog<1) return 'stationary'; return 'unknown';
}
export class Watch {
  constructor(fleet,zones,saved={}) {
    this.fleet=fleet;this.zones=zones;this.rows=new Map();this.byMMSI=new Map();this.pending=new Map();this.events=saved.events??[];this.dirty=false;
    this.started_at=new Date().toISOString();this.archive_started_at=saved.archive_started_at??this.started_at;
    for(const ship of fleet.vessels) {
      const old=saved.rows?.find(r=>r.imo===ship.imo)??{};
      const row={...old,...ship,identity:old.identity??null,static:old.static??{},position:old.position??null,history:old.history??[],last_freshness:old.last_freshness??'unknown'};
      this.rows.set(ship.imo,row);
      if(row.identity?.mmsi) this.byMMSI.set(row.identity.mmsi,ship.imo);
    }
  }
  event(row,type,at,extra={}) {
    this.events.push({id:crypto.randomUUID(),imo:row.imo,name:row.name,type,at,recorded_at:new Date().toISOString(),...extra});
    this.events=this.events.slice(-10000);this.dirty=true;
  }
  identify(mmsi,imo,source,at) {
    mmsi=String(mmsi??''); if(!/^[1-9]\d{8}$/.test(mmsi)||!validIMO(imo))return null;
    const existing=this.byMMSI.get(mmsi);
    if(existing && existing!==imo && this.rows.get(existing)?.identity?.at>at)return null;
    if(existing && existing!==imo) {
      const wrong=this.rows.get(existing);this.event(wrong,'identity_conflict',at,{mmsi,reported_imo:imo});
      this.byMMSI.delete(mmsi);wrong.identity=null;wrong.position=null;wrong.static={};wrong.last_freshness='unknown';this.dirty=true;
    }
    const row=this.rows.get(imo);if(!row)return null;
    if(row.identity?.mmsi!==mmsi && row.identity?.at>at)return null;
    if(row.identity?.mmsi!==mmsi) {
      if(row.identity){this.byMMSI.delete(row.identity.mmsi);row.position=null;row.static={};}
      row.identity={mmsi,verified_imo:imo,source,at};this.byMMSI.set(mmsi,imo);
      this.event(row,'identity_verified',at,{mmsi,source});
    }
    row.identity.at=row.identity.at>at?row.identity.at:at;this.dirty=true;
    return row;
  }
  applyStatic(row,body,at,source) {
    if(row.static.at && at<row.static.at)return;
    const fields={name:body.Name??body.ShipName??body.name,destination:body.Destination??body.destination,call_sign:body.CallSign??body.callsign??body.call_sign};
    for(const [k,v] of Object.entries(fields))if(v!==undefined)row.static[k]=clean(v)||null;
    if(body.MaximumStaticDraught!==undefined||body.draught!==undefined) row.static.draught=numeric(body.MaximumStaticDraught??body.draught,0.1,25.6);
    if(body.Eta??body.eta)row.static.eta_reported=body.Eta??body.eta;
    row.static.at=at;row.static.source=source;this.dirty=true;
  }
  applyPosition(row,p) {
    const at=timestamp(p.at),lat=numeric(p.lat,-90,90.000001),lon=numeric(p.lon,-180,180.000001);
    if(!at||lat===null||lon===null||(row.position&&at<=row.position.at))return false;
    const prev=row.position,zone=zoneAt(lat,lon,this.zones);
    if(prev && Date.parse(at)-Date.parse(prev.at)<6*3600000) {
      const hours=(Date.parse(at)-Date.parse(prev.at))/3600000,dist=distanceNm(prev.lat,prev.lon,lat,lon);
      if(dist>10 && dist/hours>60){this.event(row,'position_outlier',at,{position:p,previous_position_at:prev.at});return false;}
    }
    const next={...p,at,lat,lon,sog:numeric(p.sog,0,102.3),cog:numeric(p.cog,0,360),heading:numeric(p.heading,0,360),nav_status:numeric(p.nav_status,0,15),zone:zone?{id:zone.id,name:zone.name,country:zone.country}:null};
    row.position=next; const fresh=freshness(next);
    // Old snapshots never produce current arrival or departure alerts.
    if(fresh==='recent') {
      const continuous=prev && Date.parse(at)-Date.parse(prev.at)<=30*60000;
      if(prev?.zone?.id!==next.zone?.id) {
        if(continuous&&prev?.zone)this.event(row,'area_exit',at,{zone:prev.zone,position:next});
        if(next.zone)this.event(row,continuous?'area_enter':'area_observed',at,{zone:next.zone,position:next});
      }
      if(['stale','lost'].includes(row.last_freshness))this.event(row,'signal_resumed',at,{position:next});
    }
    row.last_freshness=fresh;
    const last=row.history.at(-1);
    if(!last||Date.parse(at)-Date.parse(last.at)>=5*60000||prev?.zone?.id!==next.zone?.id)row.history.push(next);
    row.history=row.history.filter(h=>Date.parse(h.at)>Date.now()-30*86400000).slice(-10000);
    this.dirty=true;return true;
  }
  ingestStream(event,provider) {
    const isOW=provider==='Open Waters',type=isOW?event.msg_type:event.MessageType;
    const body=isOW?(event.message??{}):(event.Message?.[type]??{}),meta=event.MetaData??{};
    const mmsi=String(isOW?event.mmsi:(meta.MMSI??meta.MMSI_String??body.UserID)??'');
    const at=timestamp(isOW?event.time:meta.time_utc);if(!at)return;
    const imo=getIMO(body);let row=imo?this.identify(mmsi,imo,provider,at):this.rows.get(this.byMMSI.get(mmsi));
    if(!row) {
      // A name can nominate a candidate, but never verifies its identity.
      const name=clean(isOW?(body.Name??body.ShipName):meta.ShipName).toUpperCase();
      if(POSITION_TYPES.has(type)&&this.fleet.vessels.some(s=>s.name===name))this.pending.set(mmsi,{event,provider,at});
      for(const [key,p] of this.pending)if(Date.now()-Date.parse(p.at)>30*60000)this.pending.delete(key);
      return;
    }
    if(!POSITION_TYPES.has(type)) {
      this.applyStatic(row,body,at,provider);
      const pending=this.pending.get(mmsi);if(pending){this.pending.delete(mmsi);this.ingestStream(pending.event,pending.provider);}
      return; // Static message coordinates are cached, not a fresh position fix.
    }
    this.applyPosition(row,{at,lat:isOW?(body.Latitude??event.lat):body.Latitude,lon:isOW?(body.Longitude??event.lon):body.Longitude,sog:body.Sog,cog:body.Cog,heading:body.TrueHeading,nav_status:body.NavigationalStatus,source:provider,source_feed:event.source??null,station:event.station??null,synthesized:Boolean(event.synthesized),mmsi});
  }
  ingestFeature(feature,verified=false) {
    const p=feature?.properties??{},at=timestamp(p.position_seen??p.seen);if(!at)return false;
    const mmsi=String(p.mmsi??feature.id??''),imo=getIMO(p);
    const row=imo?this.identify(mmsi,imo,'Open Waters particulars',at):(verified?this.rows.get(this.byMMSI.get(mmsi)):null);
    if(!row)return false;
    this.applyStatic(row,p,at,'Open Waters snapshot');
    const coords=feature.geometry?.coordinates;
    // A static-only cache update must not refresh the last position fix.
    if(feature.geometry?.type==='Point'&&coords?.length>=2 && (!p.msg_type||POSITION_TYPES.has(p.msg_type)||p.position_seen))this.applyPosition(row,{at,lon:coords[0],lat:coords[1],sog:p.sog,cog:p.cog,heading:p.heading,nav_status:p.nav_status,near:p.near??null,source:'Open Waters',source_feed:p.source??null,station:p.station??null,synthesized:true,mmsi});
    return true;
  }
  tick(now=Date.now()) {
    for(const row of this.rows.values()) {
      const next=freshness(row.position,now);
      if(next!==row.last_freshness){if(next==='stale'||next==='lost')this.event(row,'signal_'+next,new Date(now).toISOString(),{last_position_at:row.position?.at});row.last_freshness=next;this.dirty=true;}
    }
  }
  snapshot(feeds={},now=Date.now()) {
    this.tick(now);
    const vessels=[...this.rows.values()].map(({history,last_freshness,...row})=>({...row,freshness:freshness(row.position,now),navigation:navigation(row.position),history_count:history.length,age_seconds:row.position?Math.max(0,Math.floor((now-Date.parse(row.position.at))/1000)):null}));
    return {generated_at:new Date(now).toISOString(),started_at:this.started_at,archive_started_at:this.archive_started_at,company:this.fleet.company,report_date:this.fleet.report_date,feeds,summary:{total:vessels.length,identified:vessels.filter(r=>r.identity).length,recent:vessels.filter(r=>r.freshness==='recent').length,in_area:vessels.filter(r=>r.position?.zone&&r.freshness==='recent').length,stale:vessels.filter(r=>['stale','lost'].includes(r.freshness)).length},vessels,events:this.events.slice(-200).reverse(),zones:this.zones};
  }
  serialize(){return {archive_started_at:this.archive_started_at,rows:[...this.rows.values()],events:this.events};}
}
