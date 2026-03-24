# AI Image Generator

Google Gemini API 기반의 우아한 AI 이미지 생성 도구. 텍스트から画像 변환,画像編集, 지능형 프롬프트 최적화 지원.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 핵심 기능

### 텍스트から画像へ
설명을 입력하면精美한 이미지 생성. 다양한 스타일과シーン 설명 지원.

### 지능형 프롬프트 최적화
AI가 자동으로 프롬프트 최적화하여보다 정확한 생성 결과 획득.

### 유연한 파라미터 조정
- **다양한 종횡비**: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
- **다양한 해상도**: 1K, 2K, 4K
- **참조 이미지 지원**: 참조 이미지를 업로드하여 생성 안내

### 실시간 검색 강화
Google 검색에 연결하여 실시간 정보로 이미지 생성 지원.

## 인터페이스 미리보기

**홈** - 설명 입력, 파라미터 조정, 참조 이미지 업로드, 원클릭 AI 이미지 생성.

![홈](https://github.com/qwq202/ai-img/blob/main/image/首页.png)

**기록** - 모든 생성 기록을 자동 저장하여 과거 작품 검토 및 관리 용이.

![기록](https://github.com/qwq202/ai-img/blob/main/image/历史.png)

**설정** - API Key 및 기본 설정 구성하여 맞춤형 생성 경험.

![설정](https://github.com/qwq202/ai-img/blob/main/image/设置.png)

## Vercel 배포

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/qunqin45/ai-img)

위의 버튼을 클릭하면 원클릭으로 Vercel에 무료 배포.

## Docker 배포

Linux x86_64 아키텍처에 최적화, 원클릭 배포:

```bash
docker run -d --name ai-img --restart unless-stopped -p 3000:3000 qunqin45/ai-img:latest
```

배포 후 `http://<서버IP>:3000`에서 액세스.

일반 명령:
```bash
docker logs -f ai-img   # 로그 보기
docker restart ai-img   # 재시작
docker stop ai-img && docker rm ai-img  # 중지 및 삭제
```

## 빠른 시작

```bash
# 프로젝트 클론
git clone https://github.com/qunqin45/ai-img.git
cd ai-img

# 의존성 설치
pnpm install

# 개발 서버 시작
pnpm dev
```

[http://localhost:3000](http://localhost:3000) 을 열어 시작.

## 설정

우측 상단 설정에서 입력:
- **API Key**: Gemini API 키
- **API URL**: Gemini API 주소 (선택)

API 키는 로컬 브라우저에만 저장.

## 기술 스택

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js) ![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4?style=flat-square&logo=tailwindcss) ![shadcn/ui](https://img.shields.io/badge/shadcn/ui-gray?style=flat-square)

## 라이선스

[MIT License](../LICENSE)
