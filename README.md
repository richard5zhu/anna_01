<!-- coderabbit-ai-generated:v1 -->

# 异闻地图

## 本地运行

在项目目录执行：

```sh
python3 -m http.server 4173 --bind 0.0.0.0
```

打开 `http://localhost:4173/`，选择「地名地图」即可查看本地图层。地图运行时使用项目内的数据和 Leaflet 文件，不需要地图服务或 API 密钥。请通过 HTTP 服务访问，避免浏览器限制本地文件读取。

地图支持 1–10 级缩放，可拖动、滚轮缩放和使用右下角按钮。事件筛选和地点选择与地球视图共用。

## 数据与范围

- 陆地轮廓与城镇地名来自 [Natural Earth 1:10m 数据](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/)，地名文件提取了名称、坐标、缩放阈值和人口字段；优先显示中文名称。Natural Earth 数据为公有领域。
- 本图层是轻量的全球概览，包含海陆轮廓和约 7,300 个地名；放大到第 10 级时不提供街道、建筑或完整行政区划。
- 地图由本地的 [Leaflet 1.9.4](https://leafletjs.com/) 渲染，许可证见 `vendor/leaflet-LICENSE.txt`。
