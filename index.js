const stories = [
  { id:'aokigahara', title:'青木原树海', location:'日本 · 山梨县', lat:35.47, lon:138.61, type:'灵异传说', color:'#bda6ce', date:'传说流传至今', coordinates:'35.47° N, 138.61° E', description:'位于富士山脚下的茂密森林，因寂静的环境和流传已久的民间故事而蒙上一层神秘色彩。关于树海的传说，也成为日本怪谈文化的一部分。', en:'AOKIGAHARA, JAPAN' },
  { id:'bermuda', title:'百慕大三角', location:'北大西洋 · 百慕大海域', lat:26, lon:-71, type:'不明现象', color:'#8ebbbd', date:'20 世纪至今', coordinates:'26.00° N, 71.00° W', description:'这片北大西洋海域因船只和飞机失踪的故事闻名。许多事件已有自然原因的解释，但关于这片海域的神秘叙述仍在流传。', en:'BERMUDA TRIANGLE' },
  { id:'stonehenge', title:'巨石阵', location:'英国 · 威尔特郡', lat:51.18, lon:-1.83, type:'神秘地点', color:'#d0b77b', date:'约公元前 3000 年', coordinates:'51.18° N, 1.83° W', description:'矗立在英格兰平原上的史前巨石建筑，其建造方式和用途引发了无数猜想。日出与巨石排列之间的联系，让这里更加引人入胜。', en:'STONEHENGE, ENGLAND' },
  { id:'loch', title:'尼斯湖水怪', location:'英国 · 苏格兰', lat:57.32, lon:-4.42, type:'不明现象', color:'#8ebbbd', date:'1933 年至今', coordinates:'57.32° N, 4.42° W', description:'苏格兰尼斯湖中神秘生物的目击故事，已经流传了近一个世纪。尽管始终缺少确凿证据，“尼斯湖水怪”依然令人好奇。', en:'LOCH NESS, SCOTLAND' },
  { id:'easter', title:'复活节岛石像', location:'智利 · 拉帕努伊岛', lat:-27.12, lon:-109.35, type:'神秘地点', color:'#d0b77b', date:'约公元 1200 年起', coordinates:'27.12° S, 109.35° W', description:'散布在太平洋孤岛上的摩艾石像，是拉帕努伊人留下的文化遗产。它们的雕刻与运输方式，至今仍吸引着研究者探索。', en:'RAPA NUI, CHILE' },
  { id:'chateau', title:'爱丁堡城堡', location:'英国 · 爱丁堡', lat:55.95, lon:-3.2, type:'灵异传说', color:'#bda6ce', date:'传说流传至今', coordinates:'55.95° N, 3.20° W', description:'这座古老城堡见证了漫长的苏格兰历史，也流传着地下通道和幽灵的故事。这些传说为古堡增添了神秘的气息。', en:'EDINBURGH, SCOTLAND' }
];
const canvas = document.querySelector('#globe');
const ctx = canvas.getContext('2d');
let land = null, filter = 'all', selected = stories[0], longitude = 115, latitude = 20, scale = 1, dragging = false, lastX = 0, lastY = 0, moved = false, target = null;
const rad = Math.PI / 180;
fetch('world.geojson').then(r => r.json()).then(data => { land = data; }).catch(() => {});
function project(lon, lat, radius, cx, cy) {
  const l = (lon - longitude) * rad, p = lat * rad, p0 = latitude * rad;
  const visibility = Math.sin(p0)*Math.sin(p)+Math.cos(p0)*Math.cos(p)*Math.cos(l);
  return {x:cx+radius*Math.cos(p)*Math.sin(l), y:cy-radius*(Math.cos(p0)*Math.sin(p)-Math.sin(p0)*Math.cos(p)*Math.cos(l)), visible:visibility>0};
}
function line(points, radius, cx, cy) {
  ctx.beginPath(); let drawing=false;
  for (const [lon,lat] of points) { const p=project(lon,lat,radius,cx,cy); if(p.visible){if(!drawing) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); drawing=true;} else drawing=false; }
  ctx.stroke();
}
function draw() {
  const rect=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
  if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,rect.width,rect.height);
  if(target && !dragging){let diff=((target.lon-longitude+540)%360)-180; longitude+=diff*.07; latitude+=(target.lat-latitude)*.07; if(Math.abs(diff)<.05&&Math.abs(target.lat-latitude)<.05) target=null;}
  else if(!dragging && !target) longitude+=.025;
  const cx=rect.width/2, cy=rect.height/2, radius=Math.min(rect.width*.36,rect.height*.405)*scale;
  const glow=ctx.createRadialGradient(cx,cy,radius*.7,cx,cy,radius*1.15);glow.addColorStop(0,'rgba(160,185,143,.12)');glow.addColorStop(1,'rgba(160,185,143,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,radius*1.15,0,Math.PI*2);ctx.fill();
  const ocean=ctx.createRadialGradient(cx-radius*.32,cy-radius*.4,0,cx,cy,radius*1.2); ocean.addColorStop(0,'#547365');ocean.addColorStop(.55,'#304f43');ocean.addColorStop(1,'#122922');ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fillStyle=ocean;ctx.fill();ctx.save();ctx.clip();
  ctx.strokeStyle='rgba(185,207,177,.12)';ctx.lineWidth=.6;
  for(let lat=-60;lat<=60;lat+=30){const pts=[];for(let lon=-180;lon<=180;lon+=3)pts.push([lon,lat]);line(pts,radius,cx,cy)}
  for(let lon=-180;lon<180;lon+=30){const pts=[];for(let lat=-90;lat<=90;lat+=3)pts.push([lon,lat]);line(pts,radius,cx,cy)}
  if(land){ctx.fillStyle='#9caa8a';ctx.strokeStyle='rgba(205,217,184,.25)';ctx.lineWidth=.45; for(const feature of land.features){const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;for(const polygon of polygons){for(const ring of polygon){ctx.beginPath();let started=false;for(const point of ring){const p=project(point[0],point[1],radius,cx,cy);if(p.visible){if(!started){ctx.moveTo(p.x,p.y);started=true}else ctx.lineTo(p.x,p.y)}}if(started){ctx.closePath();ctx.fill();ctx.stroke()}}}}}
  const shade=ctx.createRadialGradient(cx-radius*.35,cy-radius*.4,radius*.1,cx+radius*.15,cy+radius*.1,radius*1.15);shade.addColorStop(0,'rgba(255,255,225,.08)');shade.addColorStop(.7,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(2,12,10,.55)');ctx.fillStyle=shade;ctx.fillRect(cx-radius,cy-radius,radius*2,radius*2);ctx.restore();
  ctx.strokeStyle='rgba(194,213,174,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();
  for(const story of stories.filter(s=>filter==='all'||s.type===filter)){const p=project(story.lon,story.lat,radius,cx,cy);if(!p.visible)continue;ctx.beginPath();ctx.arc(p.x,p.y,story===selected?10:7,0,Math.PI*2);ctx.fillStyle=story.color+'33';ctx.fill();ctx.beginPath();ctx.arc(p.x,p.y,story===selected?4:3,0,Math.PI*2);ctx.fillStyle=story.color;ctx.fill();ctx.strokeStyle='#ecf0d8';ctx.lineWidth=1;ctx.stroke();if(story===selected){ctx.font='10px Noto Sans SC';ctx.fillStyle='#e8eddf';ctx.fillText(story.title,p.x+13,p.y-8)}}
  requestAnimationFrame(draw);
}
function render(){
 const visible=stories.filter(s=>filter==='all'||s.type===filter);
 document.querySelector('.map-coords').textContent=selected.coordinates;
 document.querySelector('#event-total').textContent=String(visible.length).padStart(2,'0')+' 个故事';
 document.querySelector('#event-list').innerHTML=visible.map((s,i)=>`<button class="event-card ${s===selected?'selected':''}" data-id="${s.id}"><div class="card-top"><span style="color:${s.color}">● &nbsp; ${s.type}</span><span class="mono">0${stories.indexOf(s)+1} / 06</span></div><h4>${s.title}</h4><div class="card-top"><p>${s.location}</p><span class="arrow">↗</span></div></button>`).join('');
 document.querySelector('#detail-content').innerHTML=`<div class="detail-image"><span class="image-caption">✳ &nbsp; ${selected.en}</span></div><span class="detail-tag">✳ &nbsp; ${selected.type}</span><h2 class="detail-title">${selected.title}</h2><div class="detail-location"><span>⌖</span>${selected.location}</div><p class="detail-desc">${selected.description}</p><div class="detail-meta"><div class="meta-row"><span>坐标</span><b class="mono">${selected.coordinates}</b></div><div class="meta-row"><span>时间</span><b>${selected.date}</b></div><div class="meta-row"><span>档案类型</span><b>${selected.type}</b></div></div><p class="detail-disclaimer">✳ &nbsp; 本地图收录传说与公开故事，内容仅供探索参考。</p>`;
}
function choose(story){selected=story;target={lon:story.lon,lat:Math.max(-50,Math.min(50,story.lat))};render();if(mapMode && localMap){localMap.flyTo([story.lat,story.lon]);refreshMapMarkers();}}
document.querySelectorAll('.layer').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('.layer').forEach(b=>b.classList.toggle('active',b===button));const visible=stories.filter(s=>filter==='all'||s.type===filter);if(!visible.includes(selected))choose(visible[0]);else render();if(mapMode)refreshMapMarkers();}));
document.querySelector('#event-list').addEventListener('click',e=>{const card=e.target.closest('[data-id]');if(card)choose(stories.find(s=>s.id===card.dataset.id));});
canvas.addEventListener('pointerdown',e=>{dragging=true;moved=false;lastX=e.clientX;lastY=e.clientY;target=null;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.abs(dx)+Math.abs(dy)>1)moved=true;longitude-=dx*.35;latitude=Math.max(-85,Math.min(85,latitude+dy*.35));lastX=e.clientX;lastY=e.clientY});
canvas.addEventListener('pointerup',e=>{dragging=false;if(moved)return;const rect=canvas.getBoundingClientRect(),radius=Math.min(rect.width*.36,rect.height*.405)*scale;const candidates=stories.filter(s=>filter==='all'||s.type===filter).map(s=>({s,p:project(s.lon,s.lat,radius,rect.width/2,rect.height/2)})).filter(x=>x.p.visible).sort((a,b)=>Math.hypot(a.p.x-(e.clientX-rect.left),a.p.y-(e.clientY-rect.top))-Math.hypot(b.p.x-(e.clientX-rect.left),b.p.y-(e.clientY-rect.top)));if(candidates.length&&Math.hypot(candidates[0].p.x-(e.clientX-rect.left),candidates[0].p.y-(e.clientY-rect.top))<15)choose(candidates[0].s)});
canvas.addEventListener('pointercancel',()=>{dragging=false});
canvas.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(.7,Math.min(1.35,scale+(e.deltaY<0?.08:-.08)))},{passive:false});
document.querySelector('#zoom-in').onclick=()=>{if(mapMode)localMap.zoomIn();else scale=Math.min(1.35,scale+.1)};document.querySelector('#zoom-out').onclick=()=>{if(mapMode)localMap.zoomOut();else scale=Math.max(.7,scale-.1)};document.querySelector('#reset').onclick=()=>{if(mapMode)localMap.flyTo([selected.lat,selected.lon],2);else{scale=1;target={lon:115,lat:20}}};
render();draw();

// A self-hosted, lightweight geographic layer. Labels are drawn locally so no font server is needed.
let localMap, places = [], mapMarkers = [], mapMode = false;
const mapArea = document.querySelector('.globe-area');
const labelsCanvas = document.querySelector('#place-labels');
function drawPlaceLabels() {
  if (!localMap || !mapMode || !localMap._loaded) return;
  const rect = labelsCanvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
  labelsCanvas.width = Math.round(rect.width * ratio); labelsCanvas.height = Math.round(rect.height * ratio);
  const c = labelsCanvas.getContext('2d'); c.setTransform(ratio, 0, 0, ratio, 0, 0);
  c.font = '11px sans-serif'; c.textBaseline = 'middle';
  const occupied = [], zoom = localMap.getZoom();
  for (const place of places) {
    if (place.minZoom > zoom + 1) continue;
    const point = localMap.latLngToContainerPoint([place.coordinates[1], place.coordinates[0]]);
    if (point.x < 0 || point.y < 0 || point.x > rect.width || point.y > rect.height) continue;
    const width = c.measureText(place.name).width, box = [point.x - 4, point.y - 10, point.x + width + 13, point.y + 10];
    if (occupied.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
    occupied.push(box); c.beginPath(); c.arc(point.x, point.y, 2, 0, Math.PI * 2); c.fillStyle = '#d6d8bd'; c.fill();
    c.lineWidth = 3; c.strokeStyle = '#263b32'; c.strokeText(place.name, point.x + 6, point.y); c.fillStyle = '#e1e5d3'; c.fillText(place.name, point.x + 6, point.y);
    if (occupied.length >= 150) break;
  }
  document.querySelector('#map-zoom').textContent = `缩放 ${zoom.toFixed(1)} / 10`;
}
function refreshMapMarkers() {
  if (!localMap) return;
  mapMarkers.forEach(marker => marker.remove()); mapMarkers = [];
  stories.filter(s => filter === 'all' || s.type === filter).forEach(story => {
    const icon = L.divIcon({className:'', html:`<button type="button" class="event-marker ${story === selected ? 'selected' : ''}" style="background:${story.color}" aria-label="${story.title}"></button>`, iconSize:[16,16], iconAnchor:[8,8]});
    const marker = L.marker([story.lat, story.lon], {icon}).addTo(localMap); marker.on('click', () => choose(story)); mapMarkers.push(marker);
  });
}
function initLocalMap() {
  localMap = L.map('local-map', {center:[selected.lat, selected.lon], zoom:2, minZoom:1, maxZoom:10, zoomControl:false, preferCanvas:true, worldCopyJump:true});
  localMap.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/">Natural Earth</a>');
  localMap.on('move zoom resize', drawPlaceLabels);
  fetch('data/land.geojson').then(response => { if (!response.ok) throw new Error('Land data unavailable'); return response.json(); }).then(data => {
    L.geoJSON(data, {style:{color:'#a9ba99', weight:0.5, fillColor:'#889c7e', fillOpacity:1}, interactive:false}).addTo(localMap);
    refreshMapMarkers(); drawPlaceLabels();
  }).catch(() => { document.querySelector('#map-zoom').textContent = '地图数据加载失败'; });
  fetch('data/places.json').then(response => { if (!response.ok) throw new Error('Place data unavailable'); return response.json(); }).then(data => { places = data; drawPlaceLabels(); }).catch(() => { document.querySelector('#map-zoom').textContent = '地名数据加载失败'; });
}
document.querySelector('#view-map').addEventListener('click', () => {
  mapMode = true; mapArea.classList.add('map-mode'); document.querySelector('#view-map').classList.add('active'); document.querySelector('#view-globe').classList.remove('active'); document.querySelector('#hint-text').textContent = '拖动地图移动';
  if (!localMap) initLocalMap(); else { localMap.invalidateSize(); localMap.setView([selected.lat,selected.lon]); refreshMapMarkers(); drawPlaceLabels(); }
});
document.querySelector('#view-globe').addEventListener('click', () => { mapMode = false; mapArea.classList.remove('map-mode'); document.querySelector('#view-globe').classList.add('active'); document.querySelector('#view-map').classList.remove('active'); document.querySelector('#hint-text').textContent = '拖动地球旋转'; });
