const canvas=document.getElementById('soviet-game-canvas');
const panel=document.getElementById('game-panel');
const scoreEl=document.getElementById('game-score');
const planEl=document.getElementById('game-plan');
const messageEl=document.getElementById('game-message');
const directiveEl=document.getElementById('game-directive');
const restartBtn=document.getElementById('game-restart');

if(canvas&&panel){
 const ctx=canvas.getContext('2d');
 const WORLD_H=380;
 let w=1200,h=WORLD_H,dpr=1,running=true,score=0,speed=310,last=performance.now(),spawn=1.3;
 let ship={x:105,y:0,vy:0,w:138,h:58};
 const obs=[];
 const types=[
  {kind:'form',label:'27-Б',directive:'Form 27-B was required in triplicate.'},
  {kind:'stamp',label:'APPROVED',directive:'Approval received after the deadline.'},
  {kind:'barrel',label:'0 L',directive:'Fuel allocation exists in the annual report.'},
  {kind:'crate',label:'SPARES',directive:'Spare parts are currently somewhere else.'},
  {kind:'queue',label:'QUEUE',directive:'Port productivity remains excellent on paper.'},
  {kind:'meeting',label:'COMMITTEE',directive:'A committee has been created to investigate the committee.'},
  {kind:'ice',label:'ICE',directive:'Weather has failed to respect the Plan.'}
 ];

 function logicalWidth(){
  const rect=canvas.getBoundingClientRect();
  return Math.max(760,Math.round(rect.width||canvas.parentElement?.clientWidth||1200));
 }
 function resize(){
  const rect=canvas.getBoundingClientRect();
  if(rect.width<50)return;
  w=logicalWidth();
  h=WORLD_H;
  dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(w*dpr);
  canvas.height=Math.round(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(ship.y===0||ship.y>ground()-ship.h)ship.y=ground()-ship.h;
 }
 function ground(){return h-62}
 function reset(){
  obs.length=0;score=0;speed=310;spawn=1.05;running=true;
  ship.y=ground()-ship.h;ship.vy=0;
  scoreEl.textContent='0';planEl.textContent='100%';
  messageEl.textContent='CLICK · TAP · SPACE TO JUMP';
  directiveEl.textContent='Deliver the cargo. Report success. In that order, preferably.';
  panel.classList.remove('game-over');last=performance.now();
 }
 function jump(){
  if(!running)return;
  if(ship.y>=ground()-ship.h-2)ship.vy=-600;
 }
 function spawnObstacle(){
  const t=types[Math.floor(Math.random()*types.length)];
  const size=28+Math.random()*8;
  obs.push({x:w+40,y:ground()-size,w:size,h:size,type:t,passed:false});
 }
 function star(cx,cy,r){
  ctx.beginPath();
  for(let i=0;i<10;i++){
   const a=-Math.PI/2+i*Math.PI/5,rr=i%2===0?r:r*.43;
   const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;
   i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }
  ctx.closePath();ctx.fill();
 }
 function drawSea(){
  ctx.fillStyle='#f3efe4';ctx.fillRect(0,0,w,h);
  const sky=ctx.createLinearGradient(0,0,0,ground());
  sky.addColorStop(0,'#f8f6ef');sky.addColorStop(1,'#eee9dd');
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,ground());

  ctx.fillStyle='#ece7dc';
  ctx.fillRect(0,ground(),w,h-ground());

  ctx.strokeStyle='#d2cdc1';ctx.lineWidth=1;
  for(let y=ground()+13;y<h;y+=13){
   ctx.beginPath();
   for(let x=0;x<=w+20;x+=22){
    const yy=y+Math.sin((x+y)*.042)*2.2;
    if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);
   }
   ctx.stroke();
  }

  ctx.strokeStyle='#171717';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(0,ground());ctx.lineTo(w,ground());ctx.stroke();

  ctx.fillStyle='#6d685e';ctx.font='11px IBM Plex Mono, monospace';
  ctx.fillText('CASPIAN SECTOR 7 · MINISTRY ROUTE',20,27);

  ctx.globalAlpha=.08;ctx.fillStyle='#111';
  ctx.font='bold 72px IBM Plex Sans, sans-serif';
  ctx.textAlign='right';ctx.fillText('ПЛАН',w-28,102);
  ctx.globalAlpha=1;ctx.textAlign='left';
 }
 function drawShip(){
  const x=ship.x,y=ship.y;
  ctx.save();ctx.translate(x,y);

  ctx.fillStyle='rgba(0,0,0,.10)';
  ctx.beginPath();ctx.ellipse(72,58,62,7,0,0,Math.PI*2);ctx.fill();

  ctx.fillStyle='#171717';
  ctx.beginPath();
  ctx.moveTo(4,35);ctx.lineTo(115,35);ctx.lineTo(137,42);ctx.lineTo(123,55);ctx.lineTo(25,55);ctx.lineTo(10,49);ctx.closePath();ctx.fill();

  ctx.fillStyle='#9f2020';
  ctx.beginPath();ctx.moveTo(12,40);ctx.lineTo(51,40);ctx.lineTo(46,51);ctx.lineTo(20,51);ctx.closePath();ctx.fill();

  ctx.fillStyle='#f3efe4';ctx.strokeStyle='#171717';ctx.lineWidth=1.5;
  ctx.fillRect(34,18,54,17);ctx.strokeRect(34,18,54,17);
  ctx.fillRect(49,8,30,10);ctx.strokeRect(49,8,30,10);

  ctx.fillStyle='#171717';
  ctx.fillRect(62,-1,6,9);ctx.fillRect(69,3,22,4);
  ctx.fillRect(42,22,7,5);ctx.fillRect(53,22,7,5);ctx.fillRect(64,22,7,5);

  ctx.strokeStyle='#171717';ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(89,35);ctx.lineTo(105,22);ctx.lineTo(124,22);ctx.stroke();

  ctx.fillStyle='#b32222';star(80,13,6);
  ctx.fillStyle='#f3efe4';ctx.font='bold 9px IBM Plex Mono, monospace';
  ctx.fillText('СССР',18,48);

  ctx.fillStyle='#171717';ctx.font='bold 8px IBM Plex Mono, monospace';
  ctx.fillText('МОРФЛОТ',93,47);

  ctx.restore();
 }
 function drawObstacle(o){
  const {x,y,w,h,type}=o;
  ctx.save();ctx.translate(x,y);
  ctx.strokeStyle='#171717';ctx.fillStyle='#faf9f5';ctx.lineWidth=1.25;

  if(type.kind==='ice'){
   ctx.fillStyle='#d9d7d0';
   ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(w*.42,2);ctx.lineTo(w*.63,h*.46);ctx.lineTo(w*.77,h*.25);ctx.lineTo(w,h);ctx.closePath();ctx.fill();ctx.stroke();
  }else if(type.kind==='barrel'){
   ctx.beginPath();ctx.ellipse(w/2,h/2,w*.34,h*.48,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.moveTo(w*.25,h*.3);ctx.lineTo(w*.75,h*.3);ctx.moveTo(w*.25,h*.7);ctx.lineTo(w*.75,h*.7);ctx.stroke();
   ctx.font='bold 7px IBM Plex Mono, monospace';ctx.fillStyle='#171717';ctx.textAlign='center';ctx.fillText(type.label,w/2,h/2+2);
  }else if(type.kind==='stamp'){
   ctx.translate(w/2,h/2);ctx.rotate(-.14);
   ctx.strokeStyle='#9f2020';ctx.lineWidth=1.5;ctx.strokeRect(-w*.45,-h*.29,w*.9,h*.58);
   ctx.font='bold 6px IBM Plex Mono, monospace';ctx.fillStyle='#9f2020';ctx.textAlign='center';ctx.fillText(type.label,0,2);
  }else if(type.kind==='form'){
   ctx.fillRect(2,0,w-4,h);ctx.strokeRect(2,0,w-4,h);
   ctx.fillStyle='#777';for(let i=8;i<h-7;i+=5)ctx.fillRect(6,i,w-12,1);
   ctx.font='bold 7px IBM Plex Mono, monospace';ctx.fillStyle='#9f2020';ctx.textAlign='center';ctx.fillText(type.label,w/2,h-3);
  }else if(type.kind==='queue'){
   ctx.fillStyle='#171717';
   for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(7+i*9,8,3,0,Math.PI*2);ctx.fill();ctx.fillRect(5+i*9,12,4,11)}
   ctx.strokeStyle='#777';ctx.beginPath();ctx.moveTo(3,h-3);ctx.lineTo(w-3,h-3);ctx.stroke();
  }else if(type.kind==='meeting'){
   ctx.strokeRect(2,11,w-4,h-12);
   ctx.fillStyle='#171717';ctx.beginPath();ctx.arc(w/2,7,4,0,Math.PI*2);ctx.fill();
   ctx.font='bold 5.2px IBM Plex Mono, monospace';ctx.textAlign='center';ctx.fillText('COMMITTEE',w/2,h/2+6);
  }else{
   ctx.fillStyle='#ddd8cc';ctx.fillRect(1,4,w-2,h-4);ctx.strokeRect(1,4,w-2,h-4);
   ctx.strokeStyle='#777';ctx.beginPath();ctx.moveTo(4,7);ctx.lineTo(w-4,h-3);ctx.moveTo(w-4,7);ctx.lineTo(4,h-3);ctx.stroke();
   ctx.fillStyle='#171717';ctx.font='bold 6px IBM Plex Mono, monospace';ctx.textAlign='center';ctx.fillText(type.label,w/2,h/2+4);
  }
  ctx.restore();
 }
 function collide(a,b){
  return a.x+15<b.x+b.w-4&&a.x+a.w-12>b.x+4&&a.y+10<b.y+b.h&&a.y+a.h-6>b.y+3;
 }
 function gameOver(){
  running=false;panel.classList.add('game-over');
  messageEl.textContent='THE MINISTRY HAS BEEN INFORMED';
  directiveEl.textContent='Official explanation: temporary deviation from planned reality.';
  planEl.textContent='CLASSIFIED';
 }
 function tick(now){
  const dt=Math.min(.032,(now-last)/1000);last=now;
  if(running&&!panel.hidden){
   ship.vy+=1550*dt;ship.y+=ship.vy*dt;
   if(ship.y>ground()-ship.h){ship.y=ground()-ship.h;ship.vy=0}
   spawn-=dt;
   if(spawn<=0){spawnObstacle();spawn=Math.max(.72,1.35-score/1050)+Math.random()*.48}
   for(let i=obs.length-1;i>=0;i--){
    const o=obs[i];o.x-=speed*dt;
    if(!o.passed&&o.x+o.w<ship.x){
     o.passed=true;score+=10;scoreEl.textContent=String(score);
     planEl.textContent=(100+Math.min(899,Math.floor(score*.72)))+'%';
     directiveEl.textContent=o.type.directive;
     speed=Math.min(430,speed+3);
    }
    if(collide(ship,o))gameOver();
    if(o.x+o.w<-30)obs.splice(i,1);
   }
  }
  drawSea();obs.forEach(drawObstacle);drawShip();
  requestAnimationFrame(tick);
 }
 function ensureSized(){
  if(panel.hidden)return;
  resize();
 }

 canvas.addEventListener('pointerdown',()=>{canvas.focus({preventScroll:true});jump()});
 canvas.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();jump()}});
 window.addEventListener('keydown',e=>{
  if(!panel.hidden&&e.code==='Space'&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName)){
   e.preventDefault();jump();
  }
 });
 restartBtn.addEventListener('click',()=>{ensureSized();reset()});
 window.addEventListener('resize',ensureSized);

 const ro=new ResizeObserver(()=>ensureSized());
 ro.observe(canvas.parentElement);
 const mo=new MutationObserver(()=>{if(!panel.hidden){requestAnimationFrame(()=>{ensureSized();if(ship.y===0)reset()})}});
 mo.observe(panel,{attributes:true,attributeFilter:['hidden']});

 requestAnimationFrame(()=>{ensureSized();reset();requestAnimationFrame(tick)});
}
