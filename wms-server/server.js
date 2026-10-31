import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { geoMercator, geoPath } from 'd3-geo';

const EXTENT = 20037508.342789244;
const RADIUS = 6378137;
const LAYER = 'atlas:world';
const land = JSON.parse(await readFile(new URL('../public/data/land.geojson', import.meta.url), 'utf8'));
// The stored GeoJSON follows RFC 7946 winding; d3-geo expects the reverse.
for (const feature of land.features) {
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const polygon of polygons) for (const ring of polygon) ring.reverse();
}
const placeFont = ['Noto Sans CJK SC', 'Noto Sans CJK JP', 'Microsoft YaHei', 'PingFang SC', 'WenQuanYi Zen Hei', 'SimHei'].find(name => GlobalFonts.has(name)) || 'sans-serif';
const places = JSON.parse(await readFile(new URL('../public/data/places.json', import.meta.url), 'utf8'));
const escapeXml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');

function capabilities(version, endpoint) {
  const is13 = version === '1.3.0';
  const root = is13 ? 'WMS_Capabilities' : 'WMT_MS_Capabilities';
  const crs = is13 ? 'CRS' : 'SRS';
  const namespace = is13 ? ' xmlns="http://www.opengis.net/wms"' : '';
  const href = escapeXml(endpoint);
  return `<?xml version="1.0" encoding="UTF-8"?><${root} version="${version}"${namespace} xmlns:xlink="http://www.w3.org/1999/xlink"><Service><Name>WMS</Name><Title>Unknown Atlas Local WMS</Title><Abstract>Natural Earth land and populated places</Abstract><OnlineResource xlink:type="simple" xlink:href="${href}"/></Service><Capability><Request><GetCapabilities><Format>text/xml</Format><DCPType><HTTP><Get><OnlineResource xlink:type="simple" xlink:href="${href}"/></Get></HTTP></DCPType></GetCapabilities><GetMap><Format>image/png</Format><DCPType><HTTP><Get><OnlineResource xlink:type="simple" xlink:href="${href}"/></Get></HTTP></DCPType></GetMap></Request><Exception><Format>application/vnd.ogc.se_xml</Format></Exception><Layer><Title>Local map</Title><${crs}>EPSG:3857</${crs}><Layer queryable="0"><Name>${LAYER}</Name><Title>World land and place names</Title><${crs}>EPSG:3857</${crs}><BoundingBox ${crs}="EPSG:3857" minx="-${EXTENT}" miny="-${EXTENT}" maxx="${EXTENT}" maxy="${EXTENT}"/></Layer></Layer></Capability></${root}>`;
}
function exception(message, code='InvalidParameterValue') {
  return `<?xml version="1.0" encoding="UTF-8"?><ServiceExceptionReport version="1.1.1"><ServiceException code="${escapeXml(code)}">${escapeXml(message)}</ServiceException></ServiceExceptionReport>`;
}
function renderMap(bbox, width, height) {
  const [minX,minY,maxX,maxY] = bbox;
  const canvas=createCanvas(width,height), ctx=canvas.getContext('2d');
  ctx.fillStyle='#24423b';ctx.fillRect(0,0,width,height);
  const xScale=width/(maxX-minX), yScale=height/(maxY-minY);
  const projection=geoMercator().scale(RADIUS).translate([0,0]);
  ctx.save();ctx.setTransform(xScale,0,0,yScale,-minX*xScale,maxY*yScale);
  ctx.beginPath();geoPath(projection,ctx)(land);ctx.fillStyle='#9aab8b';ctx.fill();ctx.restore();
  const zoom=Math.max(0,Math.log2(2*EXTENT/(maxX-minX))); const occupied=[];
  ctx.font=`12px "${placeFont}"`;ctx.textBaseline='middle';
  for(const place of places){
    if(place.minZoom>zoom+1)continue;
    const [mx,my]=projection(place.coordinates);const x=(mx-minX)*xScale,y=(maxY+my)*yScale;
    if(x<4||y<8||x>width-4||y>height-8)continue;
    const labelWidth=ctx.measureText(place.name).width, box=[x-3,y-9,x+labelWidth+8,y+9];
    if(occupied.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1]))continue;
    occupied.push(box);ctx.fillStyle='#eef1e2';ctx.beginPath();ctx.arc(x,y,2,0,2*Math.PI);ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#354b3f';ctx.strokeText(place.name,x+5,y);ctx.fillStyle='#edf1e2';ctx.fillText(place.name,x+5,y);
    if(occupied.length>=150)break;
  }
  return canvas.toBuffer('image/png');
}
export function createWmsServer() {
  return http.createServer((req,res)=>{
    res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
    if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
    if(req.method!=='GET'){res.writeHead(405,{'Content-Type':'text/plain; charset=utf-8'});res.end('Method not allowed');return}
    const requestUrl=new URL(req.url,'http://localhost');
    if(requestUrl.pathname!=='/wms'){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('WMS endpoint: /wms');return}
    const params=Object.fromEntries([...requestUrl.searchParams].map(([k,v])=>[k.toUpperCase(),v]));
    const fail=(message,code)=>{res.writeHead(400,{'Content-Type':'application/vnd.ogc.se_xml; charset=utf-8'});res.end(exception(message,code))};
    if(params.SERVICE && params.SERVICE.toUpperCase()!=='WMS')return fail('SERVICE must be WMS');
    const version=params.VERSION||'1.3.0';if(!['1.1.1','1.3.0'].includes(version))return fail('Supported versions: 1.1.1 and 1.3.0');
    const action=(params.REQUEST||'GetCapabilities').toLowerCase();
    if(action==='getcapabilities'){
      const endpoint=`http://${req.headers.host || 'localhost'}/wms`;
      res.writeHead(200,{'Content-Type':'text/xml; charset=utf-8'});res.end(capabilities(version,endpoint));return;
    }
    if(action!=='getmap')return fail('Supported requests: GetCapabilities and GetMap','OperationNotSupported');
    if(params.LAYERS!==LAYER)return fail(`Unknown layer. Use ${LAYER}`,'LayerNotDefined');
    if((params.STYLES||'')!=='')return fail('Only the default style is available','StyleNotDefined');
    if((version==='1.3.0'?params.CRS:params.SRS)?.toUpperCase()!=='EPSG:3857')return fail('Only EPSG:3857 is supported','InvalidCRS');
    if((params.FORMAT||'').toLowerCase()!=='image/png')return fail('Only image/png is supported','InvalidFormat');
    const width=Number(params.WIDTH),height=Number(params.HEIGHT),bboxParts=(params.BBOX||'').split(','),bbox=bboxParts.map(Number);
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>2048||height>2048)return fail('WIDTH and HEIGHT must be integers between 1 and 2048');
    if(bbox.length!==4||bboxParts.some(s=>!s.trim())||bbox.some(n=>!Number.isFinite(n))||bbox[0]>=bbox[2]||bbox[1]>=bbox[3])return fail('BBOX must contain four ordered finite coordinates');
    try {const png=renderMap(bbox,width,height);res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'public, max-age=3600'});res.end(png)} catch {fail('Could not render map','NoApplicableCode')}
  });
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const port=Number(process.env.WMS_PORT||8080),host=process.env.WMS_HOST||'127.0.0.1';
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('WMS_PORT must be between 1 and 65535');
  createWmsServer().listen(port,host,()=>console.log(`WMS listening at http://${host}:${port}/wms (layer: ${LAYER})`));
}
