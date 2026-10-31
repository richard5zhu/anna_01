import { geoDistance } from 'd3-geo';

const EARTH = 20037508.342789244;
const LIMIT_LAT = 85.0511287798066;

export function buildTileUrl(layer, z, x, y) {
  if (layer.type === 'xyz') return layer.url.replaceAll('{z}', z).replaceAll('{x}', x).replaceAll('{y}', y);
  const url = new URL(layer.url);
  const params = {service:'WMS',request:'GetMap',version:layer.version,layers:layer.layers,styles:'',format:'image/png',transparent:'true',width:'256',height:'256',bbox:[-EARTH+2*EARTH*x/2**z,EARTH-2*EARTH*(y+1)/2**z,-EARTH+2*EARTH*(x+1)/2**z,EARTH-2*EARTH*y/2**z].join(',')};
  params[layer.version === '1.3.0' ? 'crs' : 'srs'] = 'EPSG:3857';
  const keys = new Set([...Object.keys(params), 'srs', 'crs']);
  for (const key of [...url.searchParams.keys()]) if (keys.has(key.toLowerCase())) url.searchParams.delete(key);
  for (const [key,value] of Object.entries(params)) url.searchParams.set(key.toUpperCase(),value);
  return url.href;
}
function tilePosition(lon, lat, z) {
  const n=2**z, clamped=Math.max(-LIMIT_LAT,Math.min(LIMIT_LAT,lat)), rad=clamped*Math.PI/180;
  return [Math.floor(((lon+180)/360*n % n+n)%n), Math.max(0,Math.min(n-1,Math.floor((1-Math.asinh(Math.tan(rad))/Math.PI)/2*n)))];
}
function lngLat(x,y,z) { const n=2**z; return [x/n*360-180, Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI]; }
function visibleTiles(projection, rect, z) {
  const n=2**z, tiles=new Map();
  if(z<=2) {for(let y=0;y<n;y++)for(let x=0;x<n;x++)tiles.set(`${x}/${y}`,[x,y]); return [...tiles.values()];}
  for(let py=0;py<=rect.height+64;py+=64) for(let px=0;px<=rect.width+64;px+=64) {
    const point=projection.invert([Math.min(px,rect.width),Math.min(py,rect.height)]);
    if(!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1]))continue;
    const projected=projection(point);
    if(!projected || Math.hypot(projected[0]-Math.min(px,rect.width),projected[1]-Math.min(py,rect.height))>1)continue;
    const [x,y]=tilePosition(point[0],point[1],z);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=(x+dx+n)%n,yy=y+dy;if(yy>=0&&yy<n)tiles.set(`${xx}/${yy}`,[xx,yy]);}
  }
  return [...tiles.values()];
}
function triangle(ctx, image, a, b, c) {
  const det=a.u*(b.v-c.v)+b.u*(c.v-a.v)+c.u*(a.v-b.v);
  if(!det)return;
  const xx=(a.x*(b.v-c.v)+b.x*(c.v-a.v)+c.x*(a.v-b.v))/det;
  const xy=(a.x*(c.u-b.u)+b.x*(a.u-c.u)+c.x*(b.u-a.u))/det;
  const x0=(a.x*(b.u*c.v-c.u*b.v)+b.x*(c.u*a.v-a.u*c.v)+c.x*(a.u*b.v-b.u*a.v))/det;
  const yx=(a.y*(b.v-c.v)+b.y*(c.v-a.v)+c.y*(a.v-b.v))/det;
  const yy=(a.y*(c.u-b.u)+b.y*(a.u-c.u)+c.y*(b.u-a.u))/det;
  const y0=(a.y*(b.u*c.v-c.u*b.v)+b.y*(c.u*a.v-a.u*c.v)+c.y*(a.u*b.v-b.u*a.v))/det;
  // Slightly overlap neighbouring triangles to avoid canvas antialiasing seams.
  const cx=(a.x+b.x+c.x)/3, cy=(a.y+b.y+c.y)/3;
  const expand=p=>{const dx=p.x-cx,dy=p.y-cy,d=Math.hypot(dx,dy)||1;return [p.x+dx/d*.6,p.y+dy/d*.6]};
  const pa=expand(a),pb=expand(b),pc=expand(c);
  ctx.save();ctx.beginPath();ctx.moveTo(...pa);ctx.lineTo(...pb);ctx.lineTo(...pc);ctx.closePath();ctx.clip();ctx.transform(xx,yx,xy,yy,x0,y0);ctx.drawImage(image,0,0,256,256);ctx.restore();
}
export function createLayerRenderer(onUpdate, onStatus) {
  let active=null, cache=new Map(), generation=0, scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;onUpdate()})}
  function setLayer(layer){active=layer;cache=new Map();generation++;onStatus('');schedule()}
  function getTile(z,x,y){
    const key=`${z}/${x}/${y}`;if(cache.has(key))return cache.get(key);
    const entry={state:'loading',image:new Image()}, current=generation;
    entry.image.crossOrigin='anonymous';
    entry.image.onload=()=>{entry.state='loaded';if(current===generation)schedule()};
    entry.image.onerror=()=>{entry.state='error';if(current===generation)schedule()};
    entry.image.src=buildTileUrl(active,z,x,y);cache.set(key,entry);
    if(cache.size>400)cache.delete(cache.keys().next().value);
    return entry;
  }
  function draw(ctx,projection,rect,center,zoom){
    if(!active)return;
    const z=Math.min(10,zoom+1), tiles=visibleTiles(projection,rect,z), divisions=8;let errors=0,loading=0;
    for(const [x,y] of tiles){
      const entry=getTile(z,x,y);if(entry.state==='error'){errors++;continue}if(entry.state!=='loaded'){loading++;continue}
      const points=[];
      for(let j=0;j<=divisions;j++){const row=[];for(let i=0;i<=divisions;i++){
        const coordinates=lngLat(x+i/divisions,y+j/divisions,z),p=projection(coordinates);
        row.push({x:p[0],y:p[1],u:256*i/divisions,v:256*j/divisions,visible:geoDistance(center,coordinates)<Math.PI/2});
      }points.push(row)}
      for(let j=0;j<divisions;j++)for(let i=0;i<divisions;i++){
        const a=points[j][i],b=points[j][i+1],c=points[j+1][i],d=points[j+1][i+1];
        if(a.visible&&b.visible&&c.visible)triangle(ctx,entry.image,a,b,c);
        if(b.visible&&c.visible&&d.visible)triangle(ctx,entry.image,b,d,c);
      }
    }
    onStatus(errors ? `部分图层瓦片加载失败，请检查地址、服务及 CORS。` : loading ? '图层加载中…' : '图层已加载');
  }
  return {setLayer,draw};
}
