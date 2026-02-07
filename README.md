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
