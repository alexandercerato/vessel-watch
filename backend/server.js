import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Watch} from './core.js';
import {Store} from './storage.js';
import {runFeeds} from './feeds.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const fleet=JSON.parse(fs.readFileSync(path.join(root,'data/fleet.json'),'utf8'));
const zones=JSON.parse(fs.readFileSync(path.join(root,'data/zones.json'),'utf8')).zones;
const store=new Store(process.env.DATA_DIR??'./data');
const watch=new Watch(fleet,zones,store.load());
const feeds=process.env.DISABLE_FEEDS==='1'?{status:{},stop(){}}:runFeeds(watch);
let timer;
function maintain(){watch.tick();store.save(watch);timer=setTimeout(maintain,10000);}maintain();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  const origin=req.headers.origin,allowed=process.env.ALLOWED_ORIGIN??'https://alexandercerato.github.io';
  if(origin===allowed)res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  function json(data,code=200){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
  if(url.pathname==='/api/health')return json({ok:true,feeds:feeds.status,archive:{error:store.error,last_saved_at:store.last_saved_at,persistent_volume:Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH)},identified:watch.byMMSI.size});
  if(url.pathname.startsWith('/api/')) {
    if(process.env.WATCH_READ_TOKEN && req.headers.authorization!=='Bearer '+process.env.WATCH_READ_TOKEN)return json({error:'Authentication required'},401);
    if(url.pathname==='/api/watch')return json({...watch.snapshot(feeds.status),archive:{error:store.error,last_saved_at:store.last_saved_at}});
    const match=url.pathname.match(/^\/api\/vessels\/(\d{7})\/history$/);
    if(match){const row=watch.rows.get(match[1]);return row?json({imo:row.imo,history:row.history.slice(-2000).reverse(),events:watch.events.filter(e=>e.imo===row.imo).slice(-300).reverse()}):json({error:'Vessel not found'},404);}
    return json({error:'Not found'},404);
  }
  let rel;try{rel=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));}catch{return json({error:'Invalid path'},400);}
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep))return json({error:'Not found'},404);
  try{const content=fs.readFileSync(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-cache'});res.end(content);}catch{json({error:'Not found'},404);}
});
server.listen(Number(process.env.PORT??8787),'0.0.0.0',()=>console.log('Vessel Watch running'));
function stop(){clearTimeout(timer);feeds.stop();store.save(watch);server.close(()=>process.exit(0));}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
