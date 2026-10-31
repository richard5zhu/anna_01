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
  for(const version of ['1.1.1','1.3.0']){const response=await fetch(mapUrl(version));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');const bytes=Buffer.from(await response.arrayBuffer());assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);const image=await loadImage(bytes),canvas=createCanvas(256,256),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const colors=new Set();const pixels=ctx.getImageData(0,0,256,256).data;for(let i=0;i<pixels.length;i+=400)colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);assert.ok(colors.size>2,'map should contain land and ocean');const pixel=(x,y)=>[...ctx.getImageData(x,y,1,1).data.slice(0,3)];assert.deepEqual(pixel(128,249),[36,66,59],'Indian Ocean should be water');assert.deepEqual(pixel(142,184),[154,171,139],'central Asia should be land');}
});
test('GetMap renders a level-10 Web Mercator tile',async()=>{
  const extent=20037508.342789244,n=1024,x=906,y=403,url=mapUrl();
  url.searchParams.set('BBOX',[-extent+2*extent*x/n,extent-2*extent*(y+1)/n,-extent+2*extent*(x+1)/n,extent-2*extent*y/n].join(','));
  const response=await fetch(url);assert.equal(response.status,200);const image=await loadImage(Buffer.from(await response.arrayBuffer()));assert.equal(image.width,256);assert.equal(image.height,256);
});
test('invalid map requests return XML exceptions',async()=>{
  for(const [key,value,expected] of [['LAYERS','wrong','LayerNotDefined'],['CRS','EPSG:4326','InvalidCRS'],['WIDTH','99999','WIDTH'],['BBOX','1,2,0,3','BBOX']]){const url=mapUrl();url.searchParams.set(key,value);const response=await fetch(url);assert.equal(response.status,400);assert.match(await response.text(),new RegExp(expected));}
});
test('OPTIONS allows browser access',async()=>{const response=await fetch(endpoint,{method:'OPTIONS'});assert.equal(response.status,204);assert.equal(response.headers.get('access-control-allow-origin'),'*');});
