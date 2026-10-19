export function feedStatusText(feeds={},now=Date.now()) {
 const names={openwaters:'Open Waters',aisstream:'AISStream'};
 return Object.entries(feeds).map(([key,feed])=>{
  const seconds=feed.last_message_at?Math.max(0,Math.floor((now-Date.parse(feed.last_message_at))/1000)):null;
  const state=feed.state==='receiving'&&seconds>300?'No recent stream messages':feed.state??'Unavailable';
  const checked=feed.last_message_at?'last message '+feed.last_message_at.replace('T',' ').replace('Z',' UTC'):'no stream message received';
  return (names[key]??key)+': '+state+' · '+checked+(feed.error?' · '+feed.error:'');
 }).join(' | ');
}
