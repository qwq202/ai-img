# 重大变更记录

> 仅记录新增模块或大规模修改。

## YYYY-MM-DD - 简短标题
- 位置：
- 背景：
- 变更：
- 影响：
- 验证：

## 2026-01-11 - 新增图片修改功能
- 范围：src/components/image-generator.tsx, src/app/api/edit/route.ts, README.md
- 背景：需要按官方文档支持 Gemini 图片修改能力
- 变更：新增“修改”模式与图片上传；新增 /api/edit 调用 gemini-2.5-flash-image
- 影响：前端新增编辑流程与新的后端接口
- 验证：上传图片并输入修改要求可返回新的编辑图像

## 2026-01-11 - 图片编辑支持多图输入
- 范围：src/components/image-generator.tsx, src/app/api/edit/route.ts, README.md
- 背景：对齐官方文档的图片编辑多图输入能力
- 变更：编辑模式支持多图上传并按模型限制数量；/api/edit 接收 images 数组并生成多 inline_data
- 影响：编辑流程支持多图输入，模型切换会截断超额图片
- 验证：上传多图编辑可正常提交并返回结果

## 2026-02-07 - 模型选择改为 API 实时可用
- 范围：src/lib/gemini-models.ts, src/app/api/models/route.ts, src/app/api/generate/route.ts, src/app/api/edit/route.ts, src/components/image-generator.tsx, README.md
- 背景：需要仅以 Gemini Models API 实时返回结果作为模型可用性依据，避免静态模型列表滞后
- 变更：新增统一模型解析与能力推导模块；/api/models 扩展返回 imageModels/promptModels/capabilities；generate/edit 接口改为实时可用模型校验并按能力自动适配参数
- 影响：前端下拉仅展示实时可用模型，参数与上传张数随模型能力自动变化；不可用模型提交会返回标准错误码
- 验证：调用 /api/models 返回扩展字段；生成/编辑在模型不在线时返回 MODEL_NOT_AVAILABLE；模型切换后参数禁用与上限生效

## 2026-02-07 - 用户体验增强（连接测试/上传交互/进度文案）
- 范围：src/components/image-generator.tsx, src/lib/task-store.ts, src/app/api/task/[taskId]/route.ts, src/app/api/generate/route.ts
- 背景：提升模型选择可理解性与配置可用性，减少上传和等待过程中的不确定感
- 变更：模型下拉新增能力标签；设置弹窗新增“测试连接”；无可用图像模型时提供空状态与一键重试；上传区支持拖拽高亮并给出粘贴/拖拽反馈；任务状态新增 phase 并展示更细粒度加载文案
- 影响：用户可更快确认模型能力与 API 配置有效性，上传与生成过程反馈更直观
- 验证：设置弹窗可返回连接测试结果；拖拽和粘贴上传有即时提示；生成过程中会显示排队/准备/生成/解析阶段文案

## 2026-02-07 - 新增图片历史与回收站
- 范围：src/components/image-generator.tsx
- 背景：需要支持用户查看历史生成结果、可配置保留上限并防止误删
- 变更：新增历史记录与回收站模块；生成/修改成功后自动入历史；支持设置“最多保留张数”；删除操作改为移入回收站并支持恢复/永久删除/清空回收站；数据持久化到浏览器本地存储
- 影响：用户可回看并复用历史图片，误删可恢复，历史容量可按个人习惯配置
- 验证：生成或修改成功后历史新增记录；删除后进入回收站；恢复后回到历史；刷新页面后历史/回收站/上限配置保持

## 2026-02-07 - 前端工作站重构与独立页面化
- 范围：src/components/image-generator.tsx, src/app/history/page.tsx, src/app/trash/page.tsx
- 背景：需要将界面重构为白色主色+蓝色副色的扁平化工作站，并将历史与回收站作为独立页面访问
- 变更：重写 image-generator 结构为“侧边导航 + 统计卡片 + 工作区”；新增 `/history` 与 `/trash` 路由；设置中心统一管理 API/调试/历史上限；保留实时模型、能力适配、历史与回收站、调试报告等既有功能
- 影响：页面信息层次更清晰，创作与资产管理分区明确；历史和回收站可独立访问并通过侧边导航快速切换
- 验证：访问 `/` `/history` `/trash` 均可正常渲染；模型加载、生成/编辑、历史恢复、回收站删除流程可用；`pnpm lint` 无 error

## 2026-02-10 - 新增 Linux Docker 部署支持
- 范围：Dockerfile, .dockerignore, next.config.ts, README.md
- 背景：不再使用 Vercel 部署，需要可在 Linux 环境直接运行的容器化版本
- 变更：新增多阶段 Dockerfile（pnpm 安装、Next.js 构建、standalone 运行时镜像）；新增 .dockerignore；Next 配置启用 `output: "standalone"`；README 补充 Linux 镜像构建与运行命令
- 影响：项目可直接构建为 Linux 容器镜像并在任意 Docker 环境运行，部署方式从平台托管转为自托管容器
- 验证：`pnpm lint` 与 `pnpm build` 通过；`docker build --platform linux/amd64 -t ai-img:linux .` 能成功构建镜像
