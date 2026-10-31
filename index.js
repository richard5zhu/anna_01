import { createLayerRenderer } from './layers.js';
import { geoOrthographic, geoPath, geoGraticule10, geoDistance } from 'd3-geo';
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
const status = document.querySelector('#load-status');
let land, detailedLand, places = [], selected = stories[0], filter = 'all';
let lon = 115, lat = 20, zoom = 1, dragging = false, moved = false, lastX = 0, lastY = 0, animation = 0;
const graticule = geoGraticule10();
const layerRenderer = createLayerRenderer(() => draw(), message => { document.querySelector('#layer-message').textContent = message; document.querySelector('#layer-live').textContent = message.includes('失败') ? message : ''; });
const base = import.meta.env.BASE_URL;
Promise.all(['world.geojson','data/land.geojson','data/places.json'].map(path => fetch(base + path).then(r => {if(!r.ok) throw Error(path);return r.json()}))).then(data => { [land,detailedLand,places] = data; status.textContent = ''; draw(); }).catch(() => { status.textContent = '本地地图数据加载失败，请检查项目文件。'; });
function geometry() {
  const rect = canvas.getBoundingClientRect();
  const cx = rect.width * (rect.width <= 700 ? .5 : .56), cy = rect.height * .52;
  const radius = Math.min(rect.width * (rect.width <= 700 ? .43 : .30), rect.height * .40) * 2 ** (zoom - 1);
  const projection = geoOrthographic().translate([cx,cy]).scale(radius).rotate([-lon,-lat]).clipAngle(90);
  return {rect,cx,cy,radius,projection,path:geoPath(projection,ctx)};
}
function draw() {
  const {rect,cx,cy,radius,projection,path} = geometry(), dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width*dpr); canvas.height = Math.round(rect.height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,rect.width,rect.height);
  const ocean=ctx.createRadialGradient(cx-radius*.35,cy-radius*.35,0,cx,cy,radius*1.2);
  ocean.addColorStop(0,'#e8f6fc');ocean.addColorStop(.55,'#cce8f5');ocean.addColorStop(1,'#9ccddd');
  ctx.beginPath(); path({type:'Sphere'});ctx.fillStyle=ocean;ctx.fill();
  ctx.beginPath(); path(graticule);ctx.strokeStyle='rgba(197,221,193,.12)';ctx.lineWidth=.6;ctx.stroke();
  if(land){ctx.beginPath();path(zoom >= 4 && detailedLand ? detailedLand : land);ctx.fillStyle='#9aab8b';ctx.fill();ctx.strokeStyle='rgba(209,224,194,.25)';ctx.lineWidth=.5;ctx.stroke();}
  layerRenderer.draw(ctx,projection,rect,[lon,lat],zoom);
  ctx.beginPath();path({type:'Sphere'});ctx.strokeStyle='rgba(193,218,190,.45)';ctx.lineWidth=1;ctx.stroke();
  const occupied=[];ctx.font='11px sans-serif';ctx.textBaseline='middle';
  for(const place of document.querySelector('#place-toggle').checked ? places : []){
    if(place.minZoom>zoom+1 || geoDistance([lon,lat],place.coordinates)>Math.PI/2)continue;
    const p=projection(place.coordinates); if(!p || p[0]<0 || p[1]<0 || p[0]>rect.width || p[1]>rect.height)continue;
    const width=ctx.measureText(place.name).width, box=[p[0]-4,p[1]-9,p[0]+width+12,p[1]+9];
    if(occupied.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1]))continue;
    occupied.push(box);ctx.beginPath();ctx.arc(p[0],p[1],1.8,0,Math.PI*2);ctx.fillStyle='#e2e7d5';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#334b3d';ctx.strokeText(place.name,p[0]+5,p[1]);ctx.fillStyle='#edf1e2';ctx.fillText(place.name,p[0]+5,p[1]);if(occupied.length>=120)break;
  }
  for(const story of stories.filter(s=>filter==='all'||s.type===filter)){
    if(geoDistance([lon,lat],[story.lon,story.lat])>=Math.PI/2)continue;
    const p=projection([story.lon,story.lat]);if(!p)continue;
    ctx.beginPath();ctx.arc(p[0],p[1],story===selected?12:8,0,Math.PI*2);ctx.fillStyle=story.color+'44';ctx.fill();ctx.beginPath();ctx.arc(p[0],p[1],story===selected?5:4,0,Math.PI*2);ctx.fillStyle=story.color;ctx.fill();ctx.strokeStyle='#f2f2df';ctx.lineWidth=1;ctx.stroke();
    if(story===selected){ctx.font='12px sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#263c32';ctx.strokeText(story.title,p[0]+15,p[1]-10);ctx.fillStyle='#f1f3e8';ctx.fillText(story.title,p[0]+15,p[1]-10)}
  }
  document.querySelector('#zoom-label').textContent=String(zoom).padStart(2,'0')+' / 10';
}
function render(){
  const visible=stories.filter(s=>filter==='all'||s.type===filter);
  document.querySelector('#event-total').textContent=String(visible.length).padStart(2,'0');
  document.querySelector('#coordinates').textContent=selected.coordinates;
  document.querySelector('#event-list').innerHTML=visible.map(s=>`<button class="event-card ${s===selected?'selected':''}" data-id="${s.id}"><div class="line"><span class="category" style="color:${s.color}">● &nbsp; ${s.type}</span><span class="index">0${stories.indexOf(s)+1} / 06</span></div><h3>${s.title}</h3><div class="line"><p>${s.location}</p><span class="arrow">↗</span></div></button>`).join('');
  document.querySelector('#detail-content').innerHTML=`<span class="detail-tag">✳ &nbsp; ${selected.type}</span><h3 class="detail-title">${selected.title}</h3><div class="detail-location">⌖ &nbsp; ${selected.location}</div><p class="detail-desc">${selected.description}</p><div class="detail-meta"><div class="meta-row"><span>坐标</span><b>${selected.coordinates}</b></div><div class="meta-row"><span>时间</span><b>${selected.date}</b></div></div><p class="detail-note">本地图收录传说与公开故事，仅供探索参考。</p>`;
}
function flyTo(story){
  selected=story;render();cancelAnimationFrame(animation);
  const startLon=lon,startLat=lat,diff=((story.lon-lon+540)%360)-180,start=performance.now();
  function step(now){const t=Math.min((now-start)/700,1), ease=1-(1-t)**3;lon=startLon+diff*ease;lat=startLat+(story.lat-startLat)*ease;draw();if(t<1)animation=requestAnimationFrame(step)}
  animation=requestAnimationFrame(step);
}
document.querySelector('#event-list').addEventListener('click',e=>{const card=e.target.closest('[data-id]');if(card)flyTo(stories.find(s=>s.id===card.dataset.id))});
document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b===button));const visible=stories.filter(s=>filter==='all'||s.type===filter);if(!visible.includes(selected))flyTo(visible[0]);else{render();draw()}}));
canvas.addEventListener('pointerdown',e=>{dragging=true;moved=false;lastX=e.clientX;lastY=e.clientY;cancelAnimationFrame(animation);canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.abs(dx)+Math.abs(dy)>1)moved=true;const radius=geometry().radius;lon-=dx*180/(Math.PI*radius*Math.max(.2,Math.cos(lat*Math.PI/180)));lat=Math.max(-89,Math.min(89,lat+dy*180/(Math.PI*radius)));lastX=e.clientX;lastY=e.clientY;draw()});
canvas.addEventListener('pointerup',e=>{dragging=false;if(moved)return;const {rect,projection}=geometry();const hit=stories.filter(s=>(filter==='all'||s.type===filter)&&geoDistance([lon,lat],[s.lon,s.lat])<Math.PI/2).map(s=>({s,p:projection([s.lon,s.lat])})).filter(x=>x.p).sort((a,b)=>Math.hypot(a.p[0]-e.clientX+rect.left,a.p[1]-e.clientY+rect.top)-Math.hypot(b.p[0]-e.clientX+rect.left,b.p[1]-e.clientY+rect.top))[0];if(hit&&Math.hypot(hit.p[0]-e.clientX+rect.left,hit.p[1]-e.clientY+rect.top)<16)flyTo(hit.s)});
canvas.addEventListener('pointercancel',()=>{dragging=false});
function setZoom(n){zoom=Math.max(1,Math.min(10,n));draw()}
canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom+(e.deltaY<0?1:-1))},{passive:false});
document.querySelector('#zoom-in').onclick=()=>setZoom(zoom+1);document.querySelector('#zoom-out').onclick=()=>setZoom(zoom-1);document.querySelector('#reset').onclick=()=>{zoom=1;flyTo(selected)};
document.querySelector('#place-toggle').addEventListener('change',draw);
window.addEventListener('resize',draw);render();draw();

const layerDialog = document.querySelector('#layer-dialog');
const layerSelect = document.querySelector('#layer-select');
const layerForm = document.querySelector('#layer-form');
const typeInput = document.querySelector('#layer-type');
const layerListKey = 'unknown-atlas-layers-v1';
let customLayers = [];
try { const stored = JSON.parse(localStorage.getItem(layerListKey) || '[]'); if(Array.isArray(stored)) customLayers = stored.filter(l => l && typeof l.id === 'string' && typeof l.name === 'string' && typeof l.url === 'string' && ['xyz','wms'].includes(l.type)); } catch { /* Keep the built-in layer available if storage is unavailable. */ }
function saveLayers(){try {localStorage.setItem(layerListKey,JSON.stringify(customLayers));return true} catch {return false}}
function updateLayerOptions(selectedId='') {
  layerSelect.replaceChildren();
  const defaultOption=document.createElement('option');defaultOption.value='';defaultOption.textContent='本地地球底图';layerSelect.append(defaultOption);
  for(const layer of customLayers){const option=document.createElement('option');option.value=layer.id;option.textContent=`${layer.name} · ${layer.type.toUpperCase()}`;layerSelect.append(option)}
  layerSelect.value=selectedId;document.querySelector('#remove-layer').disabled=!layerSelect.value;
}
function activateLayer(){
  const layer=customLayers.find(item=>item.id===layerSelect.value) || null;
  document.querySelector('#remove-layer').disabled=!layer;
  document.querySelector('#layer-attribution').textContent=layer?.credit || '';
  layerRenderer.setLayer(layer);
  try { localStorage.setItem(layerListKey + '-active',layer?.id || ''); } catch { /* The current selection still works without storage. */ }
}
document.querySelector('#open-layers').addEventListener('click',()=>layerDialog.showModal());
document.querySelector('#close-layers').addEventListener('click',()=>layerDialog.close());
layerSelect.addEventListener('change',activateLayer);
document.querySelector('#remove-layer').addEventListener('click',()=>{customLayers=customLayers.filter(layer=>layer.id!==layerSelect.value);saveLayers();updateLayerOptions();activateLayer()});
typeInput.addEventListener('change',()=>{
  const wms=typeInput.value==='wms';document.querySelector('#wms-fields').hidden=!wms;document.querySelector('#wms-layers').required=wms;
  document.querySelector('#url-hint').textContent=wms?'输入 WMS 服务地址；可保留服务所需的查询参数。':'XYZ 地址需包含 {z}、{x}、{y}。';
  document.querySelector('#layer-url').placeholder=wms?'http://localhost:8080/geoserver/wms':'https://example.com/{z}/{x}/{y}.png';
});
layerForm.addEventListener('submit',event=>{
  event.preventDefault();const data=new FormData(layerForm),url=String(data.get('url')).trim(),type=String(data.get('type'));
  try {const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw Error();} catch {document.querySelector('#layer-message').textContent='请输入有效的 HTTP 或 HTTPS 服务地址。';return}
  if(type==='xyz' && !['{z}','{x}','{y}'].every(part=>url.includes(part))){document.querySelector('#layer-message').textContent='XYZ 地址必须包含 {z}、{x}、{y}。';return}
  const name=String(data.get('name')).trim(),layers=String(data.get('layers')||'').trim();
  if(!name || (type==='wms'&&!layers)){document.querySelector('#layer-message').textContent='请填写图层名称和 WMS 图层名称。';return}
  const layer={id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,name,type,url,layers,version:String(data.get('version')),credit:String(data.get('credit')).trim()};
  customLayers.push(layer);const saved=saveLayers();updateLayerOptions(layer.id);activateLayer();layerForm.reset();document.querySelector('#wms-fields').hidden=true;document.querySelector('#wms-layers').required=false;document.querySelector('#url-hint').textContent='XYZ 地址需包含 {z}、{x}、{y}。';document.querySelector('#layer-url').placeholder='https://example.com/{z}/{x}/{y}.png';
  if(!saved)document.querySelector('#layer-message').textContent='图层已添加，但浏览器未允许保存配置。';
});
let savedLayerId='';
try { savedLayerId=localStorage.getItem(layerListKey + '-active') || ''; } catch { /* Use the built-in layer. */ }
updateLayerOptions(customLayers.some(layer=>layer.id===savedLayerId) ? savedLayerId : '');
activateLayer();
