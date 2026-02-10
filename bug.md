# Bug 记录

> 每条记录请按以下模板追加。

## YYYY-MM-DD - 简短标题
- 位置：
- 现象：
- 原因：
- 修复：
- 验证：

## 2026-02-07 - 提示词优化模型误包含图片模型
- 位置：`src/components/image-generator.tsx` 设置弹窗 `提示词优化模型` 下拉框
- 现象：提示词优化模型列表中出现了图片生成模型，用户可误选导致优化请求失败或效果异常。
- 原因：提示词优化下拉复用了 `availableModels` 全量模型列表，未区分文本模型与图片模型。
- 修复：新增优化模型筛选逻辑（排除名称包含 `image` 的模型），并在当前已选模型不合法时自动回退到首个可用优化模型。
- 验证：打开设置弹窗，确认“提示词优化模型”下拉不再显示 `gemini-3-pro-image-preview`、`gemini-2.5-flash-image` 等图片模型；触发提示词优化接口返回正常。

## 2026-02-07 - 图像模型下拉误包含文本模型
- 位置：`src/components/image-generator.tsx` 生成模型与编辑模型下拉框
- 现象：图像生成/编辑模型列表中出现文本模型，用户可误选导致接口使用到不支持图像的模型。
- 原因：生成与编辑模型下拉同样复用了 `availableModels` 全量列表，未按图像能力筛选。
- 修复：新增图像模型筛选逻辑（仅保留名称包含 `image` 的模型），并在当前已选模型不合法时自动回退到首个可用图像模型。
- 验证：在页面中检查“生成模型”“编辑模型”下拉，不再显示 `gemini-2.5-flash-lite` 等文本模型；发起生成/编辑请求可正常返回结果。

## 2026-02-07 - 支持通过 URL 参数注入 API 设置
- 位置：`src/components/image-generator.tsx` 初始化配置读取逻辑
- 现象：无法通过分享链接一次性注入 `Gemini API Key` 和 `API URL`，新设备打开后仍需手动填写设置。
- 原因：页面仅从 `localStorage` 读取配置，未解析 URL 查询参数中的 `settings`。
- 修复：在首屏挂载后增加 `?settings=` 解析（支持 JSON 与 URL 编码 JSON），将 `key/url/optimizeModel` 写入状态与 `localStorage`，并在读取后从地址栏移除 `settings` 参数。
- 验证：访问 `/?settings={...}`（URL 编码 JSON），页面应自动填充并保存 Key/URL，刷新后仍可读取，地址栏不再保留 `settings`。

## 2026-02-07 - 手动保存设置缺少成功/失败反馈
- 位置：`src/components/image-generator.tsx` 设置弹窗保存逻辑
- 现象：用户点击“保存设置”后缺少明确成功/失败提示，难以判断是否已保存。
- 原因：保存流程未提供专门的状态反馈，仅在输入为空时写入全局错误。
- 修复：新增设置反馈状态，保存时显示成功/失败提示；补充 URL 格式校验和本地存储异常捕获。
- 验证：在设置弹窗输入有效 key/url 点击保存，显示“设置保存成功”；输入非法 URL 或留空时显示对应失败提示。

## 2026-02-07 - 设置按钮点击触发未定义函数
- 位置：`src/components/image-generator.tsx` 顶部“设置”按钮 `onClick`
- 现象：点击“设置”立即报错 `ReferenceError: setSettingsFeedback is not defined`，页面交互中断。
- 原因：移除 `settingsFeedback` 状态后，按钮点击逻辑仍保留 `setSettingsFeedback(null)` 的残留调用。
- 修复：删除残留调用，按钮仅负责打开设置弹窗；同步回归检查设置弹窗打开流程。
- 验证：点击“设置”可正常打开弹窗，无控制台运行时错误。

## 2026-02-07 - edit 后缀模型可被误用于生成
- 位置：`src/lib/gemini-models.ts`, `src/components/image-generator.tsx`, `src/app/api/generate/route.ts`
- 现象：名称包含 `/edit` 或 `-edit` 的模型会出现在生成模型列表中，用户可误选后发起生成请求。
- 原因：模型能力推导未区分 edit-only 模型，默认将图像模型同时标记为可生成与可编辑。
- 修复：将 edit 后缀模型标记为 `supportsGenerate=false, supportsEdit=true`；前端生成/编辑下拉按能力分流；后端生成接口增加 `supportsGenerate` 硬校验。
- 验证：`fal-ai/nano-banana/edit` 仅出现在编辑模型列表，不出现在生成模型列表；若绕过前端调用生成接口会返回 `MODEL_CAPABILITY_MISMATCH`。


## 2026-02-07 - 上游 503 错误未友好化直接暴露给用户
- 位置：`src/app/api/generate/route.ts` (`fetchAndReadWithRetry` / `processTask`)
- 现象：当上游返回 `503 No capacity available` 时，任务失败信息直接显示原始英文错误与整段响应内容，用户难以理解。
- 原因：后端仅抛出通用 `Error` 并把 `error.message` 原样写入任务状态，未做状态码与上游错误语义映射。
- 修复：新增 `UpstreamApiError` 与 `toFriendlyTaskError`；将 `503/504/502/429/鉴权失败` 等转换为中文友好提示；将 `503` 等暂时性错误纳入重试条件。
- 验证：模拟上游返回 `503` 后，前端显示“服务端暂时不可用，请稍后重试”，不再暴露原始报文。

## 2026-02-07 - 历史记录写入 localStorage 超配额导致运行时异常
- 位置：`src/components/image-generator.tsx` 历史/回收站持久化逻辑
- 现象：生成多张图片后刷新页面，报错 `QuotaExceededError`，历史无法继续保存。
- 原因：历史和回收站以 base64 图片形式写入 `localStorage`，容量上限较小（通常几 MB），很快超限。
- 修复：将历史/回收站存储迁移到 `IndexedDB`；启动时优先读取 `IndexedDB`，并兼容迁移旧 `localStorage` 数据；后续持久化仅写入 `IndexedDB`。
- 验证：批量生成与刷新后不再出现 `QuotaExceededError`；历史和回收站数据可正常保留。

## 2026-02-10 - 模型加载响应类型过窄导致生产构建失败
- 位置：`src/components/image-generator.tsx` `loadModels`
- 现象：执行 `next build` 时 TypeScript 报错：`Property 'imageModels' does not exist on type 'ApiErrorLike'`，生产构建中断。
- 原因：`/api/models` 成功响应被声明为 `ApiErrorLike`（仅错误字段），访问 `imageModels`/`promptModels` 缺少类型定义。
- 修复：新增 `ModelsApiResponse` 类型（继承 `ApiErrorLike` 并补充 `imageModels`、`promptModels`），并将 `loadModels` 的响应解析改为该类型。
- 验证：重新执行 `pnpm exec next build --webpack`，构建与类型检查通过。
