// Interpret the declared destination only. Never infer arrival from position or flag.
export const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[_\s]+/g,' ').trim();
export function createResolver(directory,legal){
 const ports=directory.ports,countries=new Set(directory.countries),names=new Map();
 const add=(name,code)=>{const key=normalize(name);if(!names.has(key))names.set(key,new Set());names.get(key).add(code);};
 for(const [code,name] of Object.entries(ports))add(name,code);
 for(const [name,code] of Object.entries(legal.aliases??{}))add(name,code);
 const display=new Intl.DisplayNames(['it'],{type:'region'}),cache=new Map();
 return raw=>{
  if(cache.has(raw))return cache.get(raw);
  const original=normalize(raw),leg=original.split(/(?:-+>|→|>)/).at(-1).trim();
  let token=leg.replace(/\s+/g,''),code=null,note='',countryCode=null,inferred=false;
  if(ports[token]){code=token;note='Codice UN/LOCODE';}
  else if(legal.code_hints?.[token]){code=legal.code_hints[token].code;note=legal.code_hints[token].note;inferred=true;}
  else if(names.get(leg)?.size===1){code=[...names.get(leg)][0];note='Nome del porto riconosciuto';}
  else {
   // A parenthetical annotation is ignored only when it is not itself another port code.
   const m=leg.match(/^([A-Z]{2}\s*[A-Z0-9]{3})\s*\(([^)]*)\)$/);
   if(m&&!ports[m[2].replace(/\s/g,'')]&&ports[m[1].replace(/\s/g,'')]){code=m[1].replace(/\s/g,'');note='Codice con annotazione AIS';}
  }
  if(!code&&/^[A-Z]{2}[A-Z0-9]{3}$/.test(token)&&countries.has(token.slice(0,2)))countryCode=token.slice(0,2);
  if(code)countryCode=code.slice(0,2);
  const court=code?(legal.ports[code]??legal.countries[countryCode]??null):null;
  const result={raw:raw??'',code,countryCode,country:countryCode?display.of(countryCode):null,port:code?ports[code]:null,match:code?(inferred?'inferred':'identified'):countryCode?'country_only':original?'unresolved':'missing',note:original!==leg&&code?'Ultimo porto della rotta dichiarata · '+note:note,court};
  cache.set(raw,result);return result;
 };
}
