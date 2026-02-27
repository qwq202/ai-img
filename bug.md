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

## 2026-02-10 - 任务状态存储未清理终态记录导致服务端内存增长
- 位置：`src/lib/task-store.ts` `createTask` / `updateTask`
- 现象：任务完成或失败后仍长期保留在内存 `Map` 中，持续运行后进程内存占用不断增长。
- 原因：仅对 `pending` 任务设置过期清理，`completed`/`failed` 任务没有回收策略。
- 修复：引入统一的定时清理调度；创建任务时设置 pending TTL；任务进入终态时重置为终态 TTL；删除任务时同步清理定时器。
- 验证：连续触发任务并等待 TTL 后，终态任务从内存存储中自动移除，不再无限累积。

## 2026-02-10 - 本地图片预览 URL 未释放导致页面内存泄漏
- 位置：`src/components/image-generator.tsx` `toRefImage` / `removeImage` / 组件卸载清理
- 现象：频繁上传/删除参考图后，浏览器内存持续升高，长时间使用会出现卡顿。
- 原因：`URL.createObjectURL` 生成的 `blob:` 预览地址在删除图片或卸载组件时未调用 `URL.revokeObjectURL` 释放。
- 修复：新增预览 URL 释放逻辑：删除单张图片时释放对应 URL，并在组件卸载时统一释放剩余预览 URL。
- 验证：重复上传和删除图片后，浏览器内存曲线稳定，不再持续增长。

## 2026-02-27 - 512px 分辨率走错生成通道导致实际输出为 1K
- 位置：`src/app/api/generate/route.ts` `processTask`
- 现象：前端选择 `512px`（0.5K）后，最终返回图片仍为 1K 尺寸。
- 原因：后端将 `imageSize === '512px'` 单独分流到 `generateContent` 通道，导致与其他分辨率走不同请求路径，出现分辨率参数未按预期生效。
- 修复：移除 `512px` 的特殊分流逻辑，改为仅根据 `useGoogleImageSearch` 选择通道，保持 `512px` 与其他分辨率一致的生成链路。
- 验证：使用 `gemini-3.1-flash-image-preview` 选择 `1:1 + 512px` 生成，输出应为 512 尺寸；切换 `1K/2K/4K` 结果不受影响。

## 2026-02-27 - 3.1 图片模型比例参数与官方能力不一致
- 位置：`src/lib/gemini-models.ts`, `src/components/image-generator.tsx`, `src/app/api/generate/route.ts`, `src/app/api/edit/route.ts`
- 现象：`gemini-3.1-flash-image-preview` 在界面中缺少官方支持的极端比例选项（`1:4`、`1:8`、`4:1`、`8:1`），且后端未校验模型可用比例，存在参数与模型能力不一致风险。
- 原因：比例选项采用全局静态列表，未按模型能力下发与约束；后端只校验尺寸未校验比例。
- 修复：为模型能力补充 `supportedAspectRatios`；3.1 Flash Image 按官方能力开放完整比例；前端按模型动态渲染比例并在模型切换时自动回退；生成与编辑接口新增比例合法性校验。
- 验证：选择 `gemini-3.1-flash-image-preview` 时可见并可提交 `1:4/1:8/4:1/8:1`；切换到不支持这些比例的模型后自动回退并拒绝非法比例请求。

## 2026-02-27 - 0.5K(512px) 仍输出 1K（流式接口参数失效）
- 位置：`src/app/api/generate/route.ts` `processTask`
- 现象：分辨率选择 `0.5K` 后，最终返回图片仍为 `1K`。
- 原因：图片生成默认走 `streamGenerateContent`，与官方图像生成示例的 `generateContent` 通道不一致，导致 `imageConfig.imageSize=512px` 在部分网关/模型路径下未按预期生效。
- 修复：图片生成统一改为 `generateContent`；移除 `streamGenerateContent` 分支解析；`thinkingLevel` 值同步回退为官方示例格式（`Minimal/High`）。
- 验证：同模型同提示词下分别生成 `0.5K` 与 `1K`，输出分辨率应有明显差异且 `0.5K` 为 512 尺寸。
