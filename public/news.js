
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',year:'2-digit'}).format(new Date(v));
async function loadNews(){
 try{
 const r=await fetch('data/news.json',{cache:'no-store'});if(!r.ok)throw new Error();
 const d=await r.json();if(!Array.isArray(d.items))throw new Error();
 document.querySelector('#news-updated').textContent='Ultimo controllo: '+new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',dateStyle:'short',timeStyle:'short'}).format(new Date(d.checked_at))+' · Ora italiana';
 const items=d.items.filter(n=>{try{return new URL(n.url).protocol==='https:'&&n.title&&n.published_at;}catch{return false;}}).sort((a,b)=>b.published_at.localeCompare(a.published_at));
 document.querySelector('#news-list').innerHTML=items.length?items.map(n=>'<article class="news-item"><div class="news-meta">'+esc(date(n.published_at))+' · '+esc(n.source)+' · '+esc(n.scope==='vessel'?'Nave monitorata':'Hyundai Glovis · contesto della flotta')+'</div><h3><a href="'+esc(n.url)+'" target="_blank" rel="noopener noreferrer">'+esc(n.title)+'</a></h3><p>'+esc(n.summary)+'</p>'+(n.vessel_names?.length?'<p class="news-meta">'+esc(n.vessel_names.join(' · '))+'</p>':'')+'</article>').join(''):'<p class="muted">Nessuna notizia verificata disponibile.</p>';
 }catch{document.querySelector('#news-updated').textContent='Notizie non raggiungibili. Riprova con Aggiorna.';}
}
document.querySelector('#refresh').addEventListener('click',loadNews);
loadNews();
