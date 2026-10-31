import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTileUrl } from '../layers.js';

test('XYZ substitutes tile coordinates and retains query parameters', () => {
  assert.equal(buildTileUrl({type:'xyz',url:'https://example.com/{z}/{x}/{y}.png?key=test'},3,4,5),'https://example.com/3/4/5.png?key=test');
});
test('WMS 1.1.1 produces a Web Mercator GetMap request for the requested tile', () => {
  const url=new URL(buildTileUrl({type:'wms',url:'https://example.com/wms?token=test&SRS=old&layers=old',layers:'workspace:events',version:'1.1.1'},1,0,0));
  assert.equal(url.searchParams.get('token'),'test');assert.equal(url.searchParams.get('LAYERS'),'workspace:events');assert.equal(url.searchParams.get('SRS'),'EPSG:3857');assert.equal(url.searchParams.get('REQUEST'),'GetMap');
  assert.deepEqual(url.searchParams.get('BBOX').split(',').map(Number),[-20037508.342789244,0,0,20037508.342789244]);
  assert.equal(url.searchParams.get('layers'),null);
});
test('WMS 1.3.0 uses CRS and preserves query parameters', () => {
  const url=new URL(buildTileUrl({type:'wms',url:'http://localhost:8080/wms?foo=bar&CRS=old',layers:'events',version:'1.3.0'},2,1,2));
  assert.equal(url.searchParams.get('CRS'),'EPSG:3857');assert.equal(url.searchParams.get('SRS'),null);assert.equal(url.searchParams.get('foo'),'bar');assert.equal(url.searchParams.get('TRANSPARENT'),'true');
});
