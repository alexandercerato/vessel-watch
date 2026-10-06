import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('public');
const files={};
function collect(dir){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name);if(fs.statSync(p).isDirectory())collect(p);else files['/'+path.relative(root,p).replaceAll('\\','/')]=fs.readFileSync(p,'utf8');}}
collect(root);
const strip=s=>s.replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const core=strip(fs.readFileSync('backend/core.js','utf8'));
const storage=strip(fs.readFileSync('backend/storage.js','utf8'));
const feeds=strip(fs.readFileSync('backend/feeds.js','utf8'));
const server=fs.readFileSync('backend/server.js','utf8');
const body=server.slice(server.indexOf('const store='),server.indexOf('const types='));
const routes=server.slice(server.indexOf('const types='),server.indexOf('server.listen(')).replace("const rel=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));", "const rel=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));");
// Use one in-memory static file collection; archive lives on the attached volume.
const patchedRoutes=routes.replace('const file=path.resolve(root,rel);','const file=path.resolve(root,rel);').replace("const content=fs.readFileSync(file);", "const content=STATIC_FILES['/'+rel];if(content===undefined)throw new Error('Not found');");
const result=`import http from 'node:http';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport WebSocket from 'ws@8.18.3';\nconst STATIC_FILES=${JSON.stringify(files)};\nconst root='/public';\nconst fleet=JSON.parse(STATIC_FILES['/data/fleet.json']);\nconst zones=JSON.parse(STATIC_FILES['/data/zones.json']).zones;\n${core}\n${storage}\n${feeds}\n${body}\n${patchedRoutes}\nserver.listen(Number(process.env.PORT??8787),'0.0.0.0');\nprocess.on('SIGTERM',()=>{clearTimeout(timer);feeds.stop();store.save(watch);server.close();});\n`;
fs.writeFileSync('railway-function.ts',result);
console.log('Railway function prepared ('+Buffer.byteLength(result)+' bytes)');
