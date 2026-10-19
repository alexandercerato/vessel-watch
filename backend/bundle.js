import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
const root=path.resolve('public');
const files={};
function collect(dir){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name);if(fs.statSync(p).isDirectory())collect(p);else files['/'+path.relative(root,p).replaceAll('\\','/')]=gzipSync(fs.readFileSync(p)).toString('base64');}}
collect(root);
const strip=s=>s.replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const core=strip(fs.readFileSync('backend/core.js','utf8'));
const storage=strip(fs.readFileSync('backend/storage.js','utf8'));
const feeds=strip(fs.readFileSync('backend/feeds.js','utf8'));
const destinations=strip(fs.readFileSync('public/destinations.js','utf8'));
const referenceData=strip(fs.readFileSync('public/reference-data.js','utf8'));
const referencePages=strip(fs.readFileSync('backend/reference-pages.js','utf8'));
const server=fs.readFileSync('backend/server.js','utf8');
const body=server.slice(server.indexOf('const store='),server.indexOf('const types='));
const routes=server.slice(server.indexOf('const types='),server.indexOf('server.listen(')).replace("const rel=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));", "const rel=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));");
// Use one in-memory static file collection; archive lives on the attached volume.
const patchedRoutes=routes.replace("const content=fs.readFileSync(file);", "const encoded=STATIC_FILES['/'+rel];if(encoded===undefined)throw new Error('Not found');const content=gunzipSync(Buffer.from(encoded,'base64'));");
const result=`import http from 'node:http';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {gunzipSync} from 'node:zlib';\nimport WebSocket from 'ws@8.18.3';\nconst STATIC_FILES=${JSON.stringify(files)};\nconst root='/public';\nconst readData=name=>JSON.parse(gunzipSync(Buffer.from(STATIC_FILES['/data/'+name+'.json'],'base64')).toString('utf8'));\nconst fleet=readData('fleet'),zones=readData('zones').zones,seed=readData('supplemental'),directory=readData('ports'),legal=readData('courts');\n${core}\n${storage}\n${feeds}\n${destinations}\n${referenceData}\n${referencePages}\n${body}\n${patchedRoutes}\nserver.listen(Number(process.env.PORT??8787),'0.0.0.0');\nprocess.on('SIGTERM',()=>{clearTimeout(timer);feeds.stop();store.save(watch);server.close();});\n`;
fs.writeFileSync('railway-function.ts',result);
console.log('Railway function prepared ('+Buffer.byteLength(result)+' bytes)');
