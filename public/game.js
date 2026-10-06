const canvas=document.getElementById('soviet-game-canvas');
const panel=document.getElementById('game-panel');
const scoreEl=document.getElementById('game-score');
const planEl=document.getElementById('game-plan');
const messageEl=document.getElementById('game-message');
const directiveEl=document.getElementById('game-directive');
const restartBtn=document.getElementById('game-restart');

if(canvas&&panel){
 const ctx=canvas.getContext('2d');
 let dpr=1,w=0,h=0,running=true,score=0,speed=235,last=performance.now(),spawn=1.15;
 let ship={x:70,y:0,vy:0,w:98,h:42};
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

 function resize(){
  const rect=canvas.getBoundingClientRect();
  dpr=Math.min(window.devicePixelRatio||1,2);
  w=Math.max(320,rect.width);h=Math.max(240,rect.height);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
 }
 function ground(){return h-54}
 function reset(){
  obs.length=0;score=0;speed=235;spawn=1.05;running=true;ship.y=ground()-ship.h;ship.vy=0;
  scoreEl.textContent='0';planEl.textContent='100%';messageEl.textContent='CLICK · TAP · SPACE TO JUMP';
  directiveEl.textContent='Deliver the cargo. Report success. In that order, preferably.';
  panel.classList.remove('game-over');last=performance.now();
 }
 function jump(){
  if(!running)return;
  if(ship.y>=ground()-ship.h-1)ship.vy=-510;
 }
 function spawnObstacle(){
  const t=types[Math.floor(Math.random()*types.length)];
  const size=22+Math.random()*8;
  obs.push({x:w+30,y:ground()-size,w:size,h:size,type:t,passed:false});
 }
 function star(cx,cy,r){
  ctx.beginPath();
  for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2===0?r:r*.43;const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
  ctx.closePath();ctx.fill();
 }
 function drawSea(){
  ctx.fillStyle='#f4f1e8';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#c9c5bb';ctx.lineWidth=1;
  for(let y=ground()+12;y<h;y+=12){ctx.beginPath();for(let x=0;x<=w;x+=18){ctx.lineTo(x,y+Math.sin((x+y)*.05)*2)}ctx.stroke()}
  ctx.strokeStyle='#111';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,ground());ctx.lineTo(w,ground());ctx.stroke();
  ctx.fillStyle='#6e6a61';ctx.font='11px IBM Plex Mono, monospace';ctx.fillText('CASPIAN SECTOR 7',18,24);
 }
 function drawShip(){
  const x=ship.x,y=ship.y;
  ctx.save();
  ctx.translate(x,y);
  ctx.fillStyle='#151515';
  ctx.beginPath();ctx.moveTo(4,23);ctx.lineTo(88,23);ctx.lineTo(98,29);ctx.lineTo(89,40);ctx.lineTo(18,40);ctx.lineTo(8,34);ctx.closePath();ctx.fill();
  ctx.fillStyle='#f4f1e8';ctx.fillRect(27,10,44,13);ctx.strokeStyle='#151515';ctx.strokeRect(27,10,44,13);
  ctx.fillStyle='#151515';ctx.fillRect(49,1,5,9);ctx.fillRect(57,5,15,3);
  ctx.fillStyle='#b32222';ctx.fillRect(8,26,20,9);
  ctx.fillStyle='#f4f1e8';ctx.font='bold 8px IBM Plex Mono, monospace';ctx.fillText('СССР',10,33);
  ctx.fillStyle='#b32222';star(39,16,5);
  ctx.strokeStyle='#151515';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(72,23);ctx.lineTo(82,15);ctx.lineTo(92,15);ctx.stroke();
  ctx.restore();
 }
 function drawObstacle(o){
  const {x,y,w,h,type}=o;
  ctx.save();
  ctx.translate(x,y);
  ctx.strokeStyle='#171717';ctx.fillStyle='#fff';ctx.lineWidth=1.2;
  if(type.kind==='ice'){
   ctx.fillStyle='#d8d5cc';ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(w*.45,0);ctx.lineTo(w,h);ctx.closePath();ctx.fill();ctx.stroke();
  }else if(type.kind==='barrel'){
   ctx.beginPath();ctx.ellipse(w/2,h/2,w*.34,h*.48,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.font='bold 7px IBM Plex Mono, monospace';ctx.fillStyle='#171717';ctx.textAlign='center';ctx.fillText(type.label,w/2,h/2+2);
  }else if(type.kind==='stamp'){
   ctx.translate(w/2,h/2);ctx.rotate(-.16);ctx.strokeRect(-w*.44,-h*.3,w*.88,h*.6);
   ctx.font='bold 6px IBM Plex Mono, monospace';ctx.fillStyle='#171717';ctx.textAlign='center';ctx.fillText(type.label,0,2);
  }else if(type.kind==='form'){
   ctx.fillRect(2,0,w-4,h);ctx.strokeRect(2,0,w-4,h);ctx.fillStyle='#171717';
   for(let i=7;i<h-5;i+=5)ctx.fillRect(6,i,w-12,1);
   ctx.font='bold 7px IBM Plex Mono, monospace';ctx.fillStyle='#b32222';ctx.textAlign='center';ctx.fillText(type.label,w/2,h-4);
  }else if(type.kind==='queue'){
   ctx.fillStyle='#171717';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(7+i*8,7,3,0,Math.PI*2);ctx.fill();ctx.fillRect(5+i*8,11,4,10)}
  }else if(type.kind==='meeting'){
   ctx.strokeRect(1,8,w-2,h-9);ctx.fillStyle='#171717';ctx.font='bold 5.5px IBM Plex Mono, monospace';ctx.textAlign='center';ctx.fillText('COMMITTEE',w/2,h/2+4);
   ctx.beginPath();ctx.arc(w/2,5,4,0,Math.PI*2);ctx.fill();
  }else{
   ctx.fillStyle='#d8d5cc';ctx.fillRect(1,4,w-2,h-4);ctx.strokeRect(1,4,w-2,h-4);
   ctx.strokeStyle='#777';ctx.beginPath();ctx.moveTo(3,6);ctx.lineTo(w-3,h-2);ctx.moveTo(w-3,6);ctx.lineTo(3,h-2);ctx.stroke();
   ctx.fillStyle='#171717';ctx.font='bold 6px IBM Plex Mono, monospace';ctx.textAlign='center';ctx.fillText(type.label,w/2,h/2+3);
  }
  ctx.restore();
 }
 function collide(a,b){
  const padX=8,padY=5;
  return a.x+padX<b.x+b.w-3&&a.x+a.w-padX>b.x+3&&a.y+padY<b.y+b.h&&a.y+a.h-padY>b.y+2;
 }
 function gameOver(){
  running=false;panel.classList.add('game-over');messageEl.textContent='THE MINISTRY HAS BEEN INFORMED';
  directiveEl.textContent='Official explanation: temporary deviation from planned reality.';
  planEl.textContent='CLASSIFIED';
 }
 function tick(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;
  if(running&&!panel.hidden){
   ship.vy+=1350*dt;ship.y+=ship.vy*dt;
   if(ship.y>ground()-ship.h){ship.y=ground()-ship.h;ship.vy=0}
   spawn-=dt;if(spawn<=0){spawnObstacle();spawn=Math.max(.68,1.2-score/900)+Math.random()*.45}
   for(let i=obs.length-1;i>=0;i--){
    const o=obs[i];o.x-=speed*dt;
    if(!o.passed&&o.x+o.w<ship.x){o.passed=true;score+=10;scoreEl.textContent=String(score);planEl.textContent=(100+Math.min(899,Math.floor(score*.7)))+'%';directiveEl.textContent=o.type.directive;speed=Math.min(360,speed+2.5)}
    if(collide(ship,o)){gameOver()}
    if(o.x+o.w<-20)obs.splice(i,1);
   }
  }
  drawSea();obs.forEach(drawObstacle);drawShip();
  requestAnimationFrame(tick);
 }
 canvas.addEventListener('pointerdown',()=>{canvas.focus({preventScroll:true});jump()});
 canvas.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();jump()}});
 window.addEventListener('keydown',e=>{if(!panel.hidden&&e.code==='Space'&&document.activeElement?.tagName!=='INPUT'&&document.activeElement?.tagName!=='SELECT'){e.preventDefault();jump()}});
 restartBtn.addEventListener('click',reset);
 window.addEventListener('resize',resize);
 resize();reset();requestAnimationFrame(tick);
}
