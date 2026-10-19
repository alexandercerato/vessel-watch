import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
const root=path.resolve('public'),files={};
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'data/'+name+'.json'),'utf8'));
const legal=read('courts'),seed=read('supplemental'),directory=read('ports');
const codes=new Set([...Object.keys(legal.ports),...Object.values(legal.aliases??{}),...Object.values(legal.code_hints??{}).map(v=>v.code)]);
const names=new Set(seed.vessels.map(v=>v.vesselfinder?.port?.toUpperCase()).filter(Boolean));
const fallbackDirectory={countries:directory.countries,ports:Object.fromEntries(Object.entries(directory.ports).filter(([code,name])=>codes.has(code)||names.has(name.toUpperCase())))};
for(const name of ['fleet','zones','courts','supplemental'])files['/data/'+name+'.json']=gzipSync(fs.readFileSync(path.join(root,'data/'+name+'.json'))).toString('base64');
files['/data/ports.json']=gzipSync(Buffer.from(JSON.stringify(fallbackDirectory))).toString('base64');
const strip=s=>s.replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const module=name=>strip(fs.readFileSync(name,'utf8'));
const server=fs.readFileSync('backend/server.js','utf8');
const body=server.slice(server.indexOf('const store='),server.indexOf('const types='));
const routes=server.slice(server.indexOf('const types='),server.indexOf('server.listen('));
const redirect=routes.slice(0,routes.indexOf('  let rel;'))+"  res.writeHead(302,{Location:'https://alexandercerato.github.io/vessel-watch'+url.pathname+url.search});res.end();\n});\n";
// The API keeps only operational data. Frontend requests redirect to current Pages,
// so assets, source references and news cannot drift behind the published site.
const result=`import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import WebSocket from 'ws@8.18.3';
const STATIC_FILES=${JSON.stringify(files)};
const readData=name=>JSON.parse(gunzipSync(Buffer.from(STATIC_FILES['/data/'+name+'.json'],'base64')).toString('utf8'));
const fleet=readData('fleet'),zones=readData('zones').zones,seed=readData('supplemental'),legal=readData('courts');
let directory=readData('ports');
try{const response=await fetch('https://alexandercerato.github.io/vessel-watch/data/ports.json',{signal:AbortSignal.timeout(5000)});if(response.ok){const complete=await response.json();if(complete.ports&&complete.countries)directory=complete;}}catch{}
${module('backend/core.js')}
${module('backend/storage.js')}
${module('backend/feeds.js')}
${module('public/destinations.js')}
${module('public/reference-data.js')}
${module('backend/reference-pages.js')}
${body}
${redirect}
server.listen(Number(process.env.PORT??8787),'0.0.0.0');
process.on('SIGTERM',()=>{clearTimeout(timer);feeds.stop();store.save(watch);server.close();});
`;
fs.writeFileSync('railway-function.ts',result);
console.log('Railway API function prepared ('+Buffer.byteLength(result)+' bytes)');
