const canvas=document.getElementById('soviet-game-canvas');
const panel=document.getElementById('game-panel');
const scoreEl=document.getElementById('game-score');
const planEl=document.getElementById('game-plan');
const messageEl=document.getElementById('game-message');
const directiveEl=document.getElementById('game-directive');
const restartBtn=document.getElementById('game-restart');

if(canvas&&panel){
 const ctx=canvas.getContext('2d');
 const WORLD_W=1500;
 const WORLD_H=470;
 const MOBILE_W=720;
 const MOBILE_H=420;
 let mobileMode=false;
 let w=WORLD_W,h=WORLD_H,dpr=1,running=true,score=0,speed=310,last=performance.now(),spawn=1.3;
 let ship={x:105,y:0,vy:0,w:138,h:58};
 const obs=[];
 const types=[
  {kind:'nuke',label:'NUKE',directive:'Strategic deterrence has entered the shipping lane.'},
  {kind:'reagan',label:'REAGAN',directive:'A televised anti-Soviet speech has delayed the convoy.'},
  {kind:'apache',label:'APACHE',directive:'An Apache has appeared in a completely reasonable maritime simulation.'},
  {kind:'cowboy',label:'COWBOY',directive:'Unscheduled capitalist individualism ahead.'},
  {kind:'carrier',label:'CARRIER',directive:'The American fleet has arrived to defend freedom.'}
 ];

 function resize(){
  dpr=Math.min(window.devicePixelRatio||1,2);
  mobileMode=window.matchMedia('(max-width:650px)').matches;
  w=mobileMode?MOBILE_W:WORLD_W;
  h=mobileMode?MOBILE_H:WORLD_H;
  ship.x=mobileMode?64:105;
  canvas.width=Math.round(w*dpr);
  canvas.height=Math.round(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(ship.y===0||ship.y>ground()-ship.h)ship.y=ground()-ship.h;
 }
 function ground(){return h-62}
 function reset(){
  obs.length=0;score=0;speed=mobileMode?225:310;spawn=1.05;running=true;
  ship.y=ground()-ship.h;ship.vy=0;
  scoreEl.textContent='0';planEl.textContent='100%';
  messageEl.textContent='CLICK · TAP · SPACE TO JUMP';
  directiveEl.textContent='Deliver the cargo. Report success. In that order, preferably.';
  panel.classList.remove('game-over');last=performance.now();
 }
 function jump(){
  if(!running)return;
  if(ship.y>=ground()-ship.h-2)ship.vy=mobileMode?-600:-665;
 }
 function spawnObstacle(){
  const t=types[Math.floor(Math.random()*types.length)];
  let ow=34,oh=34;
  if(t.kind==='carrier'){ow=62;oh=28}
  if(t.kind==='apache'){ow=48;oh=26}
  if(t.kind==='reagan'){ow=30;oh=40}
  if(t.kind==='cowboy'){ow=28;oh=38}
  if(t.kind==='nuke'){ow=30;oh=42}
  obs.push({x:w+40,y:ground()-oh,w:ow,h:oh,type:t,passed:false});
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

  if(type.kind==='nuke'){
   ctx.fillStyle='#171717';
   ctx.beginPath();
   ctx.moveTo(w*.5,0);ctx.lineTo(w*.84,h*.2);ctx.lineTo(w*.9,h*.7);ctx.lineTo(w*.5,h);ctx.lineTo(w*.1,h*.7);ctx.lineTo(w*.16,h*.2);ctx.closePath();ctx.fill();
   ctx.fillStyle='#f3efe4';ctx.beginPath();ctx.arc(w*.5,h*.43,4.2,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#f3efe4';ctx.lineWidth=1.1;
   for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(w*.5+Math.cos(a)*6,h*.43+Math.sin(a)*6);ctx.lineTo(w*.5+Math.cos(a)*10,h*.43+Math.sin(a)*10);ctx.stroke()}
  }else if(type.kind==='reagan'){
   ctx.fillStyle='#171717';
   ctx.beginPath();ctx.arc(w/2,10,7,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#9f2020';
   ctx.beginPath();ctx.moveTo(w/2-7,8);ctx.quadraticCurveTo(w/2+1,0,w/2+8,6);ctx.quadraticCurveTo(w/2+2,3,w/2-7,8);ctx.fill();
   ctx.fillStyle='#171717';
   ctx.beginPath();ctx.moveTo(w/2-9,19);ctx.lineTo(w/2+9,19);ctx.lineTo(w/2+11,h);ctx.lineTo(w/2-11,h);ctx.closePath();ctx.fill();
   ctx.fillStyle='#f3efe4';
   ctx.beginPath();ctx.moveTo(w/2,20);ctx.lineTo(w/2+3,28);ctx.lineTo(w/2,35);ctx.lineTo(w/2-3,28);ctx.closePath();ctx.fill();
  }else if(type.kind==='apache'){
   ctx.fillStyle='#171717';
   ctx.beginPath();ctx.moveTo(8,12);ctx.lineTo(17,7);ctx.lineTo(31,7);ctx.lineTo(39,12);ctx.lineTo(37,18);ctx.lineTo(12,18);ctx.closePath();ctx.fill();
   ctx.fillRect(w-12,12,11,3);
   ctx.strokeStyle='#171717';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(2,6);ctx.lineTo(w-5,6);ctx.stroke();
   ctx.beginPath();ctx.moveTo(w*.5,6);ctx.lineTo(w*.5,11);ctx.stroke();
   ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(12,22);ctx.lineTo(20,22);ctx.moveTo(30,22);ctx.lineTo(38,22);ctx.stroke();
  }else if(type.kind==='cowboy'){
   ctx.fillStyle='#171717';
   ctx.fillRect(4,5,w-8,3);ctx.fillRect(8,1,w-16,6);
   ctx.beginPath();ctx.arc(w/2,13,5,0,Math.PI*2);ctx.fill();
   ctx.fillRect(w/2-3,19,6,10);
   ctx.strokeStyle='#171717';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(w/2-8,23);ctx.lineTo(w/2+8,23);ctx.moveTo(w/2,29);ctx.lineTo(w/2-6,h);ctx.moveTo(w/2,29);ctx.lineTo(w/2+6,h);ctx.stroke();
  }else if(type.kind==='carrier'){
   ctx.fillStyle='#171717';
   ctx.beginPath();ctx.moveTo(0,h-7);ctx.lineTo(w-10,h-7);ctx.lineTo(w,h-1);ctx.lineTo(7,h-1);ctx.closePath();ctx.fill();
   ctx.fillRect(5,7,w-14,9);
   ctx.fillStyle='#9f2020';ctx.fillRect(w-22,1,9,8);
   ctx.strokeStyle='#171717';ctx.lineWidth=1.2;
   ctx.beginPath();ctx.moveTo(w-18,1);ctx.lineTo(w-18,-4);ctx.moveTo(w-22,-2);ctx.lineTo(w-14,-2);ctx.stroke();
   ctx.fillStyle='#f3efe4';ctx.fillRect(14,10,11,2);ctx.fillRect(31,10,11,2);
  }

  ctx.restore();
 }
 function collide(a,b){
  const ax1=a.x+18,ay1=a.y+12,ax2=a.x+a.w-14,ay2=a.y+a.h-8;
  const bx1=b.x+3,by1=b.y+3,bx2=b.x+b.w-3,by2=b.y+b.h-2;
  return ax1<bx2&&ax2>bx1&&ay1<by2&&ay2>by1;
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
   ship.vy+=(mobileMode?1380:1550)*dt;ship.y+=ship.vy*dt;
   if(ship.y>ground()-ship.h){ship.y=ground()-ship.h;ship.vy=0}
   spawn-=dt;
   if(spawn<=0){spawnObstacle();spawn=Math.max(.72,1.35-score/1050)+Math.random()*.48}
   for(let i=obs.length-1;i>=0;i--){
    const o=obs[i];o.x-=speed*dt;
    if(!o.passed&&o.x+o.w<ship.x){
     o.passed=true;score+=10;scoreEl.textContent=String(score);
     planEl.textContent=(100+Math.min(899,Math.floor(score*.72)))+'%';
     directiveEl.textContent=o.type.directive;
     speed=Math.min(mobileMode?320:430,speed+3);
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
