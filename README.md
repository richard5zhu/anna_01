<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:3e27d31aa88af43078b2baaee883c758b7396a2c3279b7c82f2526b3f7280af4 -->

# 异闻地图

## 前端启动

需要 Node.js 20.19+ 或 22.12+。在项目目录执行：

```sh
npm install
npm run dev
```

打开终端显示的本地地址。生产构建使用 `npm run build`，构建产物在 `dist/`，可由任意静态文件服务器部署；`npm run preview` 可预览构建结果。

地球、地名和事件在同一视图中。点击左侧事件可以定位；拖动地球旋转，使用滚轮或按钮可在 1–10 级缩放。地图运行时读取项目内数据，不需要地图服务、API 密钥或 Python。

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:1d13b07a24ea6bd83744bd0614d55511a9729dad32ee0ebcf92d23820cf3dec8 -->

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:d428d7ae24177df6f6f6d337c18263d043c4b8c79f809855bf1ad4deea691e4e -->

## 本地 WMS 服务

可独立启动本仓库提供的 WMS 地图服务。安装、启动及连接方法见 [WMS 服务说明](wms-server/README.md)。

## 自定义图层

<!-- /coderabbit-ai-generated:v1 -->

点击页面右上角「图层管理」，填写名称、类型与地址后添加。XYZ 地址需要包含 `{z}`、`{x}`、`{y}`，例如 `https://example.com/tiles/{z}/{x}/{y}.png`。WMS 填写服务地址及图层名称，支持 1.1.1 和 1.3.0，使用 PNG 和 EPSG:3857。服务地址可保留额外查询参数。填写署名后会在地图上显示。

在线服务及本机服务均由浏览器直接访问，服务需支持 CORS；如果页面使用 HTTPS，浏览器也可能阻止不安全的 HTTP 请求。`localhost` 指打开页面的那台电脑。图层配置保存在浏览器本地存储中，请勿在共享设备上保存包含敏感凭据的地址。可在图层管理中选择内置底图或删除自定义配置。

## 数据与范围

<!-- /coderabbit-ai-generated:v1 -->

- 地理轮廓和约 7,300 个地名来自 [Natural Earth](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/)，地名优先使用中文。陆地轮廓经过简化，数据为公有领域。
- 图层适合全球概览；放大到第 10 级时不提供街道、建筑或完整行政区划。
- 使用 D3 地理投影将本地数据绘制到球面，示例事件用于演示。


<!-- /coderabbit-ai-generated:v1 -->
