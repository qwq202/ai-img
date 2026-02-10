# AI 图像生成器

基于 Google Gemini API 的 AI 图像生成应用，使用 Next.js 和 shadcn/ui 构建。

## 功能特性

- 文本转图像生成（使用 gemini-3-pro-image-preview 模型）
- 图片修改（模型列表与能力仅以 API 实时返回为准）
- 智能提示词优化（可在设置中选择模型，默认 gemini-2.5-flash-lite）
- 支持多种宽高比（1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9）
- 支持多种分辨率（1K, 2K, 4K）
- 支持 Google 搜索实时信息生成
- 参考图上传数量按模型能力自动限制
- 图片预览和下载
- 异步任务处理，避免超时

## 配置

在页面右上角的设置中填写 Gemini API Key 和 API URL（仅保存在当前浏览器）。

## 安装和运行

```bash
# 安装依赖
pnpm install

# 开发模式运行
pnpm dev

# 构建生产版本
pnpm build

# 运行生产版本
pnpm start
```

打开 [http://localhost:3000](http://localhost:3000) 访问应用。

## Docker 部署（Linux）

### 方式一：直接使用云端镜像（推荐）

```bash
# 拉取最新镜像
docker pull qunqin45/ai-img:latest

# 后台启动
docker run -d \
  --name ai-img \
  --restart unless-stopped \
  -p 3000:3000 \
  qunqin45/ai-img:latest
```

- `--restart unless-stopped`：容器异常退出、Docker 重启或服务器重启后自动拉起；手动 `docker stop` 后保持停止。
- 启动后访问：`http://<你的服务器IP>:3000`

### 方式二：本地构建镜像再运行（可选）

```bash
# 构建 Linux 镜像（如部署到 x86_64 Linux 服务器）
docker build --platform linux/amd64 -t ai-img:latest .

# 运行容器
docker run -d --name ai-img --restart unless-stopped -p 3000:3000 ai-img:latest
```

### 常用运维命令

```bash
docker ps
docker logs -f ai-img
docker restart ai-img
docker stop ai-img && docker rm ai-img
```

启动后访问 [http://localhost:3000](http://localhost:3000)。
## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons

## API 端点

- `POST /api/generate` - 创建图像生成任务
- `GET /api/task/[taskId]` - 查询任务状态
- `POST /api/optimize-prompt` - 优化提示词
- `POST /api/edit` - 修改图片
- `GET /api/models` - 获取实时可用模型与能力（包含 `models`、`imageModels`、`promptModels`、`fetchedAt`）

## 许可证

MIT
