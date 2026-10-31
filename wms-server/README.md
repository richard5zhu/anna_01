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

- `GET /wms?SERVICE=WMS&REQUEST=GetCapabilities` 返回服务说明。
- 支持 WMS 1.1.1 和 1.3.0 的 `GetMap`，图层 `atlas:world`，投影 `EPSG:3857`，格式 `image/png`，最大图片尺寸为 2048 × 2048。
- 数据为简化的全球海陆轮廓及约 7,300 个地名，适合概览；不包含街道或建筑。文字使用系统可用的中文字体，若中文显示为方框，请安装中文字体（如 Noto Sans CJK）。
- 测试：`npm test --prefix wms-server`。
