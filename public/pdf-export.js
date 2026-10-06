const ascii=v=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[–—]/g,'-').replace(/°/g,' deg').replace(/[^\x20-\x7e\n]/g,'?');
const literal=v=>ascii(v).replace(/([\\()])/g,'\\$1');
export function etaLabel(value){
 if(!value)return 'Not reported';
 if(typeof value==='object'){
  const read=(...keys)=>keys.map(k=>value[k]).find(v=>v!==undefined&&v!==null);
  const month=Number(read('Month','month')),day=Number(read('Day','day')),hour=Number(read('Hour','hour')),minute=Number(read('Minute','minute'));
  if(![month,day,hour,minute].every(Number.isInteger)||month<1||month>12||day<1||day>new Date(Date.UTC(2024,month,0)).getUTCDate()||hour<0||hour>23||minute<0||minute>59)return 'Not reported';
  return String(day).padStart(2,'0')+'/'+String(month).padStart(2,'0')+' '+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+' UTC (AIS; year not supplied)';
 }
 if(typeof value==='string'&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value)))return new Date(value).toISOString().replace('T',' ').slice(0,16)+' UTC (reported)';
 return 'Not reported';
}
function wrap(value,width){
 const limit=Math.max(8,Math.floor((width-14)/4.35)),lines=[];
 for(const paragraph of ascii(value).split('\n')){
  let line='';for(const word of paragraph.split(/\s+/)){if(line&&line.length+word.length+1>limit){lines.push(line);line='';}if(word.length>limit){if(line){lines.push(line);line='';}for(let i=0;i<word.length;i+=limit)lines.push(word.slice(i,i+limit));}else line+=(line?' ':'')+word;}lines.push(line);
 }return lines;
}
export function createFleetPDF(records,{generatedAt=new Date().toISOString(),snapshotAt=null,offline=false}={}){
 const widths=[139,205,295,139],left=32,bottom=51,commands=[],pages=[];
 let y=0,ops=[];
 const text=(value,x,y,size=9,bold=false)=>ops.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf 1 0 0 1 '+x+' '+y+' Tm ('+literal(value)+') Tj ET');
 function start(){
  ops=[];text('Fleet Monitor | Managing associate brief',left,562,16,true);
  text('Generated: '+generatedAt.replace('T',' ').slice(0,19)+' UTC | '+records.length+' vessels',left,543,9);
  text('AIS snapshot: '+(snapshotAt??'unavailable')+(offline?' | Refresh failed: last available data':''),left,528,8);
  text('Last known positions. Destination and ETA are declarations; arrival is not confirmed.',left,513,8);
  y=492;ops.push('0.94 g '+left+' '+(y-25)+' 778 25 re f 0 g');
  let x=left;['Vessel / IMO','Last known location','Destination jurisdiction / port / court','Expected arrival (AIS)'].forEach((v,i)=>{text(v,x+7,y-16,9,true);x+=widths[i];});y-=25;
 }
 function finish(){text('Preliminary court references require local confirmation. All times UTC.',left,31,8);pages.push(ops);}
 start();
 for(const record of records){
  const cells=record.map((v,i)=>wrap(v,widths[i])),height=Math.max(...cells.map(c=>c.length))*12+14;
  if(y-height<bottom){finish();start();}
  let x=left;cells.forEach((lines,i)=>{lines.forEach((line,j)=>text(line,x+7,y-15-j*12,9,i===0&&j===0));x+=widths[i];});
  ops.push('0.8 G '+left+' '+(y-height)+' m 810 '+(y-height)+' l S 0 G');y-=height;
 }finish();
 pages.forEach((p,i)=>p.push('BT /F1 8 Tf 1 0 0 1 750 31 Tm (Page '+(i+1)+' / '+pages.length+') Tj ET'));
 const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'],kids=[];
 pages.forEach(p=>{const pageId=objects.length,streamId=pageId+1;kids.push(pageId+' 0 R');const stream=p.join('\n');objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+streamId+' 0 R >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');});
 objects[2]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';
 let pdf='%PDF-1.4\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=i+' 0 obj\n'+objects[i]+'\nendobj\n';}
 const xref=pdf.length;pdf+='xref\n0 '+objects.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 return new Blob([pdf],{type:'application/pdf'});
}
