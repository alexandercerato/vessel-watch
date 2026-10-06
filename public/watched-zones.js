export function watchedZoneAt(lat,lon,zones){
 if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
 const rad=d=>d*Math.PI/180;
 const distance=z=>{const a=Math.sin(rad(z.lat-lat)/2)**2+Math.cos(rad(lat))*Math.cos(rad(z.lat))*Math.sin(rad(z.lon-lon)/2)**2;return 3440.065*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));};
 return zones.map(z=>({z,d:distance(z)})).filter(v=>v.d<=v.z.radius_nm).sort((a,b)=>a.d-b.d)[0]?.z??null;
}
