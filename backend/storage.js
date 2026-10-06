import fs from 'node:fs';
import path from 'node:path';
export class Store {
  constructor(dir) { this.file=path.join(dir,'watch-state.json');fs.mkdirSync(dir,{recursive:true});this.error=null;this.last_saved_at=null; }
  load(){for(const f of [this.file,this.file+'.bak']){try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){if(e.code!=='ENOENT')this.error='Archive recovery required';}}return {};}
  save(watch){if(!watch.dirty)return;try{const fd=fs.openSync(this.file+'.tmp','w',0o600);try{fs.writeFileSync(fd,JSON.stringify(watch.serialize()));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}if(fs.existsSync(this.file))fs.copyFileSync(this.file,this.file+'.bak');fs.renameSync(this.file+'.tmp',this.file);watch.dirty=false;this.last_saved_at=new Date().toISOString();this.error=null;}catch{this.error='Archive could not be saved';}}
}
