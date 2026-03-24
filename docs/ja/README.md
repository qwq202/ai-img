# AI Image Generator

Google Gemini API に基づいた Elegant な AI 画像生成ツール。テキストから画像への変換、画像編集、Intelligent プロンプト最適化をサポート。

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## コア機能

### テキストから画像へ
描述を入力すると、精美な画像を生成。 다양한 スタイルとシーンの描述をサポート。

### 知的プロンプト最適化
AI が自動的にプロンプトを最適化、より正確な生成結果を実現。

### 柔軟なパラメータ調整
- **複数のアスペクト比**：1:1、2:3、3:2、3:4、4:3、4:5、5:4、9:16、16:9、21:9
- **複数の解像度**：1K、2K、4K
- **参照画像サポート**：参照画像をアップロードして生成をガイド

### リアルタイム検索強化
Google 検索に接続して、リアルタイム情報で画像生成を支援。

## インターフェースプレビュー

**ホーム** - 描述を入力、パラメータを調整、参照画像をアップロード、ワンクリックで AI 画像を生成。

![ホーム](https://github.com/qwq202/ai-img/blob/main/image/首页.png)

**履歴** - すべての生成記録を自動保存、過去の作品のレビューと管理が簡単。

![履歴](https://github.com/qwq202/ai-img/blob/main/image/历史.png)

**設定** - API Key と基本設定を設定して、カスタマイズされた生成体験を。

![設定](https://github.com/qwq202/ai-img/blob/main/image/设置.png)

## Vercel デプロイ

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/qunqin45/ai-img)

上のボタンをクリックすると、ワンクリックで Vercel に無料デプロイ。

## Docker デプロイ

Linux x86_64 アーキテクチャに最適化、ワンクリックデプロイ：

```bash
docker run -d --name ai-img --restart unless-stopped -p 3000:3000 qunqin45/ai-img:latest
```

デプロイ後に `http://<サーバーIP>:3000` でアクセス。

一般的なコマンド：
```bash
docker logs -f ai-img   # ログを表示
docker restart ai-img   # 再起動
docker stop ai-img && docker rm ai-img  # 停止して削除
```

## クイックスタート

```bash
# プロジェクトをクローン
git clone https://github.com/qunqin45/ai-img.git
cd ai-img

# 依存関係をインストール
pnpm install

# 開発サーバーを起動
pnpm dev
```

[http://localhost:3000](http://localhost:3000) を開いて開始。

## 設定

右上隅の設定で入力：
- **API Key**：Gemini API キー
- **API URL**：Gemini API アドレス（オプション）

API キーはローカルブラウザにのみ保存。

## 技術スタック

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js) ![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4?style=flat-square&logo=tailwindcss) ![shadcn/ui](https://img.shields.io/badge/shadcn/ui-gray?style=flat-square)

## ライセンス

[MIT License](../LICENSE)
