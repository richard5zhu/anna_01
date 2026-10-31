<!-- coderabbit-ai-generated:v1 -->

# 本地 WMS 地图服务

本服务使用项目内的 Natural Earth 数据生成全球海陆轮廓和地名图片，不需要地图 API 密钥或联网地图服务。

## 启动

需要 Node.js 20 或更高版本。在仓库根目录执行：

```sh
npm install --prefix wms-server
npm start --prefix wms-server
```

服务默认监听 `127.0.0.1:8080`，地址为 `http://127.0.0.1:8080/wms`。如果端口被占用，可在启动时设置 `WMS_PORT`；如需监听其他网卡，可设置 `WMS_HOST`。

## 连接前端

启动前端后打开「图层管理」，填写：

- 类型：WMS
- 服务地址：`http://127.0.0.1:8080/wms`
- WMS 图层名称：`atlas:world`
- WMS 版本：1.1.1 或 1.3.0

服务支持浏览器跨域访问。如果 WMS 底图的地名与前端地名重复，可取消勾选地图下方的「本地地名」。浏览器中的 `127.0.0.1` 指运行浏览器的电脑；如果前端通过 HTTPS 打开，浏览器可能限制 HTTP 服务的访问。

## 接口与范围

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:09de08a7bf9890ab1f1a6b2f561ca94c1d09a8e59cbbada340d6c18583a316e1 -->

- `GET /wms?SERVICE=WMS&REQUEST=GetCapabilities` 返回服务说明。
- `GetMap` 请求使用 `TRANSPARENT=true` 时海洋为透明背景，陆地、边界和地名仍会绘制；省略该参数或使用 `false` 时，海洋为淡蓝色。前端默认请求透明背景，并由地球底色显示淡蓝色海洋。

<!-- /coderabbit-ai-generated:v1 -->
- 支持 WMS 1.1.1 和 1.3.0 的 `GetMap`，图层 `atlas:world`，投影 `EPSG:3857`，格式 `image/png`，最大图片尺寸为 2048 × 2048。
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:e84bbc899dcd729c30bdd3fbec4a026508e30729d925bd15fa22715f51508332 -->

- 地图使用白色陆地、淡蓝色海洋，显示国家和省级边界；部分争议或未确定的边界以虚线表示。省界从约第 2 级开始显示。
- 标注包括海南岛、台湾岛、西沙群岛和南沙群岛；放大地图可看到更多地名和简化的东亚沿海岛屿。岛屿和边界数据适合概览，不包含街道或建筑。
- 边界、岛屿和地名来自 [Natural Earth 10m 数据](https://github.com/nvkelso/natural-earth-vector/tree/ca96624a56bd078437bca8184e78163e5039ad19/geojson)，经筛选与简化；中国相关的边界线参照数据中的 `FCLASS_CN` 分类。该数据不是中国官方审图数据，边界、海岸和岛屿可能有简化、缺漏或不同观点，不应用于测绘或正式出版。
- 文字使用系统可用的中文字体，若中文显示为方框，请安装中文字体（如 Noto Sans CJK）。

<!-- /coderabbit-ai-generated:v1 -->
- 测试：`npm test --prefix wms-server`。
