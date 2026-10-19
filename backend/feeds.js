import WebSocket from 'ws';
import {shipNameKey, getIMO} from './core.js';
export function runFeeds(watch,env=process.env,dependencies={}) {
  const Socket=dependencies.WebSocket??WebSocket,request=dependencies.fetch??fetch;
  const schedule=dependencies.setTimeout??setTimeout,cancel=dependencies.clearTimeout??clearTimeout,now=dependencies.now??Date.now;
  const status={openwaters:{state:'starting',last_message_at:null,last_poll_at:null,error:null,subscribed:0},aisstream:{state:env.AISSTREAM_API_KEY?'connecting':'disabled',last_message_at:null,error:null}};
  let ow=null,ais=null,stopped=false,owRetry=null,aisRetry=null,pollTimer=null,healthTimer=null,known='';
  const headers={accept:'application/json',...(env.OPENWATERS_API_KEY?{authorization:'Bearer '+env.OPENWATERS_API_KEY}:{})};
  async function get(url) {
    const res=await request(url,{headers,signal:AbortSignal.timeout(15000)});
    if(!res.ok){const e=new Error('HTTP '+res.status);e.retryAfter=Number(res.headers.get('retry-after'))||60;throw e;}
    return res.json();
  }
  const pause=ms=>new Promise(resolve=>schedule(resolve,ms));
  function watchSocket(socket,feed){
    feed.connected_at=new Date(now()).toISOString();socket.lastTraffic=now();socket.pingPending=false;
    socket.on('pong',()=>{socket.lastTraffic=now();socket.pingPending=false;});
    socket.on('message',()=>{socket.lastTraffic=now();socket.pingPending=false;});
  }
  function checkConnections(){
    if(stopped)return;
    for(const [socket,feed] of [[ow,status.openwaters],[ais,status.aisstream]]){
      if(socket?.readyState!==Socket.OPEN)continue;
      const last=Math.max(Date.parse(feed.last_message_at??feed.connected_at),Date.parse(feed.connected_at));
      if(socket.pingPending&&now()-socket.lastTraffic>90000 || now()-last>5*60000){
        feed.state='reconnecting';feed.error='No recent stream messages; reconnecting';socket.terminate();
      }else {socket.pingPending=true;socket.ping();}
    }
    healthTimer=schedule(checkConnections,45000);
  }
  function subscribeOW(limit=ow?.limit??(env.OPENWATERS_API_KEY?50:10)) {
    if(ow?.readyState!==Socket.OPEN)return;
    const ids=[...watch.byMMSI.keys()].slice(0,limit);
    status.openwaters.subscribed=ids.length;
    if(ids.length)ow.send(JSON.stringify({type:'subscribe',mmsi:ids.map(Number),snapshot:true}));
  }
  function connectOW(){
    if(stopped)return;status.openwaters.state='connecting';
    ow=new Socket('wss://ais.openwaters.io/v1/stream'+(env.OPENWATERS_API_KEY?'?key='+encodeURIComponent(env.OPENWATERS_API_KEY):''),{handshakeTimeout:15000});
    ow.on('open',()=>watchSocket(ow,status.openwaters));
    ow.on('message',raw=>{try{const e=JSON.parse(raw.toString());status.openwaters.last_message_at=new Date().toISOString();
      if(e.type==='welcome'){ow.limit=e.limits?.mmsis??50;status.openwaters.state='connected';status.openwaters.error=null;subscribeOW();}
      else if(e.type==='error'){status.openwaters.state='error';status.openwaters.error='Subscription rejected by provider';}
      else if(e.type==='event'){status.openwaters.state='receiving';watch.ingestStream(e,'Open Waters');}
    }catch{status.openwaters.error='Invalid provider message';}});
    ow.on('error',()=>{status.openwaters.state='offline';status.openwaters.error='Connection unavailable';});
    ow.on('close',()=>{status.openwaters.state='offline';if(!stopped)owRetry=schedule(connectOW,60000);});
  }
  function subscribeAIS(){if(ais?.readyState!==Socket.OPEN)return;
    const complete=watch.byMMSI.size===watch.rows.size;
    ais.send(JSON.stringify({APIKey:env.AISSTREAM_API_KEY,BoundingBoxes:[[[-90,-180],[90,180]]],...(complete?{FiltersShipMMSI:[...watch.byMMSI.keys()]}:{}),FilterMessageTypes:['PositionReport','StandardClassBPositionReport','ExtendedClassBPositionReport','ShipStaticData','StaticDataReport','LongRangeAisBroadcastMessage']}));
  }
  function connectAIS(){if(stopped||!env.AISSTREAM_API_KEY)return;status.aisstream.state='connecting';
    ais=new Socket('wss://stream.aisstream.io/v0/stream',{perMessageDeflate:true,handshakeTimeout:15000});
    ais.on('open',()=>{watchSocket(ais,status.aisstream);status.aisstream.state='subscribing';subscribeAIS();});
    ais.on('message',raw=>{try{const e=JSON.parse(raw.toString());status.aisstream.last_message_at=new Date().toISOString();
      if(e.error){status.aisstream.state='error';status.aisstream.error='Subscription rejected by provider';return;}
      status.aisstream.state='receiving';status.aisstream.error=null;watch.ingestStream(e,'AISStream');
      const ids=[...watch.byMMSI.keys()].sort().join(',');if(ids!==known){known=ids;subscribeOW();if(watch.byMMSI.size===watch.rows.size)subscribeAIS();}
    }catch{status.aisstream.error='Invalid provider message';}});
    ais.on('error',()=>{status.aisstream.state='offline';status.aisstream.error='Connection unavailable';});
    ais.on('close',()=>{status.aisstream.state='offline';if(!stopped)aisRetry=schedule(connectAIS,60000);});
  }
  async function poll(){
    if(stopped)return;let failed=false;
    try {
      // Name search only discovers candidates. IMO from particulars must match the PDF.
      for(const row of watch.rows.values()) {
        if(stopped)return;
        if(row.identity) {
          const f=await get('https://ais.openwaters.io/v1/vessels/'+row.identity.mmsi);
          watch.ingestFeature(f,true);
        } else {
          let found=await get('https://ais.openwaters.io/v1/vessels?q='+encodeURIComponent(row.name));
          if(!found.features?.length&&shipNameKey(row.name)!==row.name){await pause(1100);found=await get('https://ais.openwaters.io/v1/vessels?q='+encodeURIComponent(shipNameKey(row.name)));}
          for(const f of found.features??[]) {
            if(shipNameKey(f.properties?.name)!==shipNameKey(row.name))continue;
            const mmsi=f.properties?.mmsi??f.id;if(!mmsi)continue;
            const detail=await get('https://ais.openwaters.io/v1/vessels/'+mmsi);
            if(getIMO(detail.properties??{})===row.imo){watch.ingestFeature(detail);break;}
            await pause(1100);
          }
        }
        await pause(1100); // Keep below the provider's per-IP limit.
      }
      status.openwaters.last_poll_at=new Date().toISOString();status.openwaters.error=null;
      if(status.openwaters.state==='starting')status.openwaters.state='polling';
      subscribeOW();
    } catch(e) {failed=true;status.openwaters.error='Snapshot '+e.message;}
    finally {if(!stopped)pollTimer=schedule(poll,failed?120000:5*60000);}
  }
  connectOW();connectAIS();poll();healthTimer=schedule(checkConnections,45000);
  return {status,stop(){stopped=true;for(const t of [owRetry,aisRetry,pollTimer,healthTimer])cancel(t);ow?.close();ais?.close();}};
}
