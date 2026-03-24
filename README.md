# AI Image Generator

一个优雅的 AI 图像生成工具，基于 Google Gemini API，支持文生图、图片编辑、智能提示词优化。

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 核心功能

### 文本转图像
输入描述词，即可生成精美图像。支持多种风格和场景描述。

### 智能提示词优化
AI 自动优化你的描述词，获得更准确的生成结果。

### 灵活参数调节
- **多种宽高比**：1:1、2:3、3:2、3:4、4:3、4:5、5:4、9:16、16:9、21:9
- **多种分辨率**：1K、2K、4K
- **支持参考图**：上传参考图引导生成方向

### 实时搜索增强
连接 Google 搜索，获取实时信息辅助图像生成。

## 界面预览

**首页** - 输入描述词、调节参数、上传参考图，一键生成 AI 图像。

![首页](image/首页.png)

**历史** - 自动保存所有生成记录，方便回顾和管理过往作品。

![历史](image/历史.png)

**设置** - 配置 API Key 和偏好设置，自定义生成体验。

![设置](image/设置.png)

## Vercel 部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/qunqin45/ai-img)

点击上方按钮，一键免费部署到 Vercel。

## Docker 部署

一键部署：

```bash
docker run -d --name ai-img --restart unless-stopped -p 3000:3000 qunqin45/ai-img:latest
```

部署后访问 `http://<你的服务器IP>:3000`。

常用运维命令：
```bash
docker logs -f ai-img   # 查看日志
docker restart ai-img   # 重启
docker stop ai-img && docker rm ai-img  # 停止并删除
```

## 快速开始

```bash
# 克隆项目
git clone https://github.com/qunqin45/ai-img.git
cd ai-img

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 开始使用。

## 配置

在页面右上角设置中填写：
- **API Key**：你的 Gemini API 密钥
- **API URL**：Gemini API 地址（可选）

API 密钥仅保存在本地浏览器中。

## 技术栈

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js) ![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4?style=flat-square&logo=tailwindcss) ![shadcn/ui](https://img.shields.io/badge/shadcn/ui-gray?style=flat-square)

## 许可证

[MIT License](LICENSE)
