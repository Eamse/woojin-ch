# 🏢 Woojin Interior - 우진인테리어

LX 하우시스 공식 협력사 우진인테리어의 시공사례 및 고객 문의 관리 웹사이트

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)

## 📋 목차

- [프로젝트 소개](#-프로젝트-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [시작하기](#-시작하기)
- [환경 변수 설정](#-환경-변수-설정)
- [배포](#-배포)

---

## 🎯 프로젝트 소개

우진인테리어는 창호 시공 전문 업체로, 이 웹사이트는:
- **고객용 프론트엔드**: 시공사례 조회, 문의 접수
- **관리자 대시보드**: 프로젝트/문의/통계 관리

를 제공합니다.

**도메인**:
- 메인: `https://woojin-ch.kr`
- 관리자: `https://admin.woojin-ch.kr`

---

## ✨ 주요 기능

### 고객용 기능
- 📸 시공사례 갤러리 (카테고리별 필터링)
- 📝 온라인 견적 문의 폼
- 🏢 회사 소개 및 브랜드 정보

### 관리자 기능
- 📊 **대시보드**: 통계 요약 및 최근 활동
- 🔨 **프로젝트 관리**: 등록/수정/삭제 (카테고리 필터)
- 📩 **문의 관리**: 상태별 필터링 및 메모
- 📈 **방문자 통계**: Chart.js 기반 실시간 분석

---

## 🛠 기술 스택

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **File Upload**: Multer
- **Storage**: Cloudflare R2 (S3 compatible)

### Frontend
- **Core**: Vanilla JavaScript (ES6+)
- **Styling**: Custom CSS
- **Charts**: Chart.js
- **Icons**: Font Awesome

### DevOps
- **Server**: Nginx (reverse proxy)
- **Process Manager**: PM2
- **Version Control**: Git

---

## 📁 프로젝트 구조

```
woojin-ch/
├── public/                 # 프론트엔드 정적 파일
│   ├── admin/             # 관리자 페이지
│   │   ├── admin-dashboard.html
│   │   ├── admin-projects.html
│   │   ├── admin-gallery.html
│   │   ├── admin-inquiries.html
│   │   └── admin-analytics.html
│   ├── project/           # 시공사례 페이지
│   ├── inquiries/         # 문의 페이지
│   ├── information/       # 회사 소개
│   └── common.js          # 공통 유틸리티
├── src/                   # 백엔드 소스
│   ├── server.js          # Express 서버 진입점
│   ├── db.js             # Prisma 클라이언트
│   ├── auth.js           # JWT 인증 미들웨어
│   ├── projectRouter.js  # 프로젝트 API
│   ├── inquiryRouter.js  # 문의 API
│   ├── metricsRouter.js  # 통계 API
│   └── uploadRouter.js   # 파일 업로드 API
├── prisma/
│   └── schema.prisma     # DB 스키마 정의
└── package.json
```

---

## 🚀 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/Eamse/woojin-ch.git
cd woojin-ch
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env` 파일 생성 (아래 섹션 참고)

### 4. 데이터베이스 설정

```bash
# Prisma 마이그레이션
npx prisma migrate dev

# (선택) Prisma Studio 실행
npx prisma studio
```

### 5. 개발 서버 실행

```bash
npm run dev
```

서버가 `http://localhost:4000`에서 실행됩니다.

---

## 🔐 환경 변수 설정

`.env` 파일을 프로젝트 루트에 생성:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/woojin_db"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-change-this"

# Cloudflare R2 (S3 Compatible)
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="woojin-images"
R2_PUBLIC_URL="https://your-r2-domain.com"

# Server
PORT=3000
NODE_ENV=development
```

---

## 📦 배포

### Nginx 설정 예시

```nginx
# /etc/nginx/sites-available/woojin-ch

# 메인 사이트
server {
    listen 80;
    server_name woojin-ch.kr www.woojin-ch.kr;

    root /path/to/woojin-ch/public;
    index index.html;

    # API 프록시
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Clean URLs
    location / {
        try_files $uri $uri/ $uri/index.html =404;
    }
}

# 관리자 사이트
server {
    listen 80;
    server_name admin.woojin-ch.kr;

    root /path/to/woojin-ch/public;
    index admin-login.html;

    location /api {
        proxy_pass http://localhost:3000;
    }
}
```

### PM2로 서버 실행

```bash
pm2 start src/server.js --name woojin-api
pm2 save
pm2 startup
```

---

## 📝 주요 API 엔드포인트

### 인증
- `POST /api/users/login` - 로그인

### 프로젝트
- `GET /api/projects` - 전체 프로젝트 조회
- `GET /api/projects/:id` - 프로젝트 상세
- `POST /api/projects` - 프로젝트 등록 (인증 필요)
- `PATCH /api/projects/:id` - 프로젝트 수정 (인증 필요)
- `DELETE /api/projects/:id` - 프로젝트 삭제 (인증 필요)

### 문의
- `GET /api/inquiries` - 전체 문의 조회 (인증 필요)
- `POST /api/inquiries` - 문의 등록 (공개)
- `PATCH /api/inquiries/:id` - 문의 수정 (인증 필요)

### 통계
- `GET /api/metrics/daily` - 일별 방문 통계 (인증 필요)

---