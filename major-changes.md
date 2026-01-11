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

