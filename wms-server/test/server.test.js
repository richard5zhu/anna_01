import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createWmsServer } from '../server.js';

let server, endpoint;
before(async()=>{server=createWmsServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));endpoint=`http://127.0.0.1:${server.address().port}/wms`;});
after(async()=>{await new Promise(resolve=>server.close(resolve));});
function mapUrl(version='1.3.0') {const url=new URL(endpoint);for(const [k,v] of Object.entries({SERVICE:'WMS',REQUEST:'GetMap',VERSION:version,LAYERS:'atlas:world',STYLES:'',FORMAT:'image/png',WIDTH:'256',HEIGHT:'256',BBOX:'0,0,20037508.342789244,20037508.342789244',[version==='1.3.0'?'CRS':'SRS']:'EPSG:3857'}))url.searchParams.set(k,v);return url;}
test('GetCapabilities advertises the layer, versions and coordinate system',async()=>{
  for(const version of ['1.1.1','1.3.0']){const response=await fetch(`${endpoint}?service=WMS&request=GetCapabilities&version=${version}`),body=await response.text();assert.equal(response.status,200);assert.match(body,new RegExp(`version="${version}"`));assert.match(body,/<Name>atlas:world<\/Name>/);assert.match(body,/EPSG:3857/);assert.equal(response.headers.get('access-control-allow-origin'),'*');}
});
test('GetMap returns a nonempty PNG with land and ocean for both versions',async()=>{
  for(const version of ['1.1.1','1.3.0']){const response=await fetch(mapUrl(version));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');const bytes=Buffer.from(await response.arrayBuffer());assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);const image=await loadImage(bytes),canvas=createCanvas(256,256),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const colors=new Set();const pixels=ctx.getImageData(0,0,256,256).data;for(let i=0;i<pixels.length;i+=400)colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);assert.ok(colors.size>2,'map should contain land and ocean');const pixel=(x,y)=>[...ctx.getImageData(x,y,1,1).data.slice(0,3)];assert.deepEqual(pixel(128,249),[215,237,247],'Indian Ocean should be water');assert.deepEqual(pixel(142,184),[255,255,255],'central Asia should be land');}
});
test('transparent GetMap keeps the ocean transparent and land opaque',async()=>{
  for(const version of ['1.1.1','1.3.0']) {
    const url=mapUrl(version);url.searchParams.set('TRANSPARENT','TRUE');
    const response=await fetch(url);assert.equal(response.status,200);
    const image=await loadImage(Buffer.from(await response.arrayBuffer())),ctx=createCanvas(256,256).getContext('2d');ctx.drawImage(image,0,0);
    assert.deepEqual([...ctx.getImageData(128,249,1,1).data],[0,0,0,0],'ocean should be transparent');
    assert.deepEqual([...ctx.getImageData(142,184,1,1).data],[255,255,255,255],'land should remain white and opaque');
    url.searchParams.set('TRANSPARENT','false');const opaque=await fetch(url);const opaqueImage=await loadImage(Buffer.from(await opaque.arrayBuffer()));ctx.clearRect(0,0,256,256);ctx.drawImage(opaqueImage,0,0);
    assert.deepEqual([...ctx.getImageData(128,249,1,1).data],[215,237,247,255],'explicit false should keep the blue ocean');
  }
});
test('GetMap renders a level-10 Web Mercator tile',async()=>{
  const extent=20037508.342789244,n=1024,x=906,y=403,url=mapUrl();
  url.searchParams.set('BBOX',[-extent+2*extent*x/n,extent-2*extent*(y+1)/n,-extent+2*extent*(x+1)/n,extent-2*extent*y/n].join(','));
  const response=await fetch(url);assert.equal(response.status,200);const image=await loadImage(Buffer.from(await response.arrayBuffer()));assert.equal(image.width,256);assert.equal(image.height,256);
});

const earthRadius=6378137;
function meters(lon,lat){const latRad=lat*Math.PI/180;return [earthRadius*lon*Math.PI/180,earthRadius*Math.log(Math.tan(Math.PI/4+latRad/2))];}
async function mapArea(west,south,east,north){
  const [minx,miny]=meters(west,south),[maxx,maxy]=meters(east,north),url=mapUrl();
  url.searchParams.set('TRANSPARENT','true');url.searchParams.set('WIDTH','512');url.searchParams.set('HEIGHT','512');url.searchParams.set('BBOX',[minx,miny,maxx,maxy].join(','));
  const response=await fetch(url);assert.equal(response.status,200);const image=await loadImage(Buffer.from(await response.arrayBuffer()));
  const ctx=createCanvas(512,512).getContext('2d');ctx.drawImage(image,0,0);
  return {ctx,project:(lon,lat)=>{const [x,y]=meters(lon,lat);return [Math.round((x-minx)/(maxx-minx)*512),Math.round((maxy-y)/(maxy-miny)*512)]}};
}
function countDark(ctx,x,y,width,height){const data=ctx.getImageData(x,y,width,height).data;let count=0;for(let i=0;i<data.length;i+=4)if(data[i+3]>0 && data[i]<200 && data[i+1]<210 && data[i+2]<220)count++;return count;}
test('country and provincial boundaries are visible on the rendered map',async()=>{
  const country=await mapArea(5.5,49,6.7,50);const [cx,cy]=country.project(6.1361,49.4953);
  assert.ok(countDark(country.ctx,cx-3,cy-3,7,7)>0,'country border should be drawn');
  const province=await mapArea(112,24,115,27);const [px,py]=province.project(113.2829,25.5176);
  assert.ok(countDark(province.ctx,px-3,py-3,7,7)>0,'Hunan–Guangdong boundary should be drawn');
});
test('Chinese island and island-group names are present and rendered',async()=>{
  const {readFile}=await import('node:fs/promises');const labels=JSON.parse(await readFile(new URL('../data/island-labels.json',import.meta.url),'utf8'));
  for(const name of ['海南岛','台湾岛','西沙群岛','南沙群岛'])assert.ok(labels.some(item=>item.name===name));
  const region=await mapArea(110,15,114,18);const [x,y]=region.project(112.1803085,16.303809);
  assert.ok(countDark(region.ctx,x+4,y-7,65,14)>5,'island-group label should be rendered');
});

test('invalid map requests return XML exceptions',async()=>{
  for(const [key,value,expected] of [['LAYERS','wrong','LayerNotDefined'],['CRS','EPSG:4326','InvalidCRS'],['WIDTH','99999','WIDTH'],['BBOX','1,2,0,3','BBOX']]){const url=mapUrl();url.searchParams.set(key,value);const response=await fetch(url);assert.equal(response.status,400);assert.match(await response.text(),new RegExp(expected));}
});
test('OPTIONS allows browser access',async()=>{const response=await fetch(endpoint,{method:'OPTIONS'});assert.equal(response.status,204);assert.equal(response.headers.get('access-control-allow-origin'),'*');});
