# Music Quiz 로컬 개발 환경 설정 가이드

이 문서는 Music Quiz 서비스를 로컬 환경에서 실행하는 방법을 안내합니다.

## 목차

- [사전 요구사항](#사전-요구사항)
- [빠른 시작](#빠른-시작)
- [상세 설정](#상세-설정)
- [서비스 실행](#서비스-실행)
- [접속 URL](#접속-url)
- [문제 해결](#문제-해결)

---

## 사전 요구사항

로컬 개발을 위해 다음 소프트웨어가 설치되어 있어야 합니다:

| 소프트웨어 | 버전 | 용도 |
|-----------|------|------|
| Node.js | 20.x 이상 | 백엔드/프론트엔드 실행 |
| npm | 10.x 이상 | 패키지 관리 |
| Docker | 최신 | PostgreSQL, Redis 실행 |
| Docker Compose | 최신 | 컨테이너 오케스트레이션 |

---

## 빠른 시작

### 1단계: 환경 설정 스크립트 실행

프로젝트 루트 디렉토리에서 실행합니다:

**Windows (PowerShell):**
```powershell
.\scripts\setup-local.ps1
```

**macOS/Linux (Bash):**
```bash
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh
```

이 스크립트는 모든 서비스의 `.env` 파일을 자동으로 생성합니다.

### 2단계: Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **APIs & Services > Credentials** 이동
4. **Create Credentials > OAuth 2.0 Client ID** 선택
5. Application type: **Web application** 선택
6. 다음 정보 입력:
   - Name: `Music Quiz Local`
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:3001/auth/google/callback`
7. **Create** 클릭
8. 생성된 **Client ID**와 **Client Secret**을 복사

### 3단계: OAuth 정보 입력

`backend/services/auth/.env` 파일을 열고 다음 값을 수정합니다:

```env
GOOGLE_CLIENT_ID=your-actual-client-id
GOOGLE_CLIENT_SECRET=your-actual-client-secret
```

### 4단계: 데이터베이스 실행

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 5단계: 서비스 실행

5개의 터미널 창을 열고 각각 실행합니다:

```bash
# 터미널 1 - Auth Service
cd backend/services/auth && npm install && npm run start:dev

# 터미널 2 - Quiz Service
cd backend/services/quiz && npm install && npm run start:dev

# 터미널 3 - Game Service
cd backend/services/game && npm install && npm run start:dev

# 터미널 4 - Social Service
cd backend/services/social && npm install && npm run start:dev

# 터미널 5 - Frontend
cd frontend && npm install && npm run dev
```

### 6단계: 접속

브라우저에서 http://localhost:5173 접속

---

## 상세 설정

### 프로젝트 구조

```
music_game/
├── backend/
│   ├── services/
│   │   ├── auth/      # 인증 서비스 (포트 3001)
│   │   ├── quiz/      # 퀴즈 서비스 (포트 3002)
│   │   ├── game/      # 게임 서비스 (포트 3003)
│   │   └── social/    # 소셜 서비스 (포트 3004)
│   └── shared/        # 공통 모듈
├── frontend/          # React 프론트엔드 (포트 5173)
├── infrastructure/    # Terraform, Docker 설정
└── scripts/           # 유틸리티 스크립트
```

### 환경 변수 파일

각 서비스별 `.env` 파일 위치:

| 서비스 | 파일 경로 |
|--------|----------|
| Auth | `backend/services/auth/.env` |
| Quiz | `backend/services/quiz/.env` |
| Game | `backend/services/game/.env` |
| Social | `backend/services/social/.env` |
| Frontend | `frontend/.env` |

### 주요 환경 변수 설명

**Auth Service (`backend/services/auth/.env`):**
```env
NODE_ENV=development          # 실행 환경
PORT=3001                     # 서비스 포트

# 데이터베이스 연결
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=music_quiz

# Redis 연결
REDIS_URL=redis://localhost:6379

# JWT 설정
JWT_SECRET=your-jwt-secret    # JWT 서명 키

# Google OAuth
GOOGLE_CLIENT_ID=xxx          # Google OAuth Client ID
GOOGLE_CLIENT_SECRET=xxx      # Google OAuth Client Secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# 프론트엔드 URL (CORS)
FRONTEND_URL=http://localhost:5173

# 내부 API 키
INTERNAL_API_KEY=local-internal-api-key
```

**Frontend (`frontend/.env`):**
```env
VITE_API_BASE_URL=http://localhost:3001       # Auth API URL
VITE_GAME_SERVICE_URL=http://localhost:3003   # Game API URL
VITE_SOCIAL_SERVICE_URL=http://localhost:3004 # Social API URL
```

---

## 서비스 실행

### Docker로 데이터베이스 실행

**시작:**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

**상태 확인:**
```bash
docker-compose -f docker-compose.dev.yml ps
```

**로그 확인:**
```bash
docker-compose -f docker-compose.dev.yml logs -f
```

**중지:**
```bash
docker-compose -f docker-compose.dev.yml down
```

**데이터 삭제 후 중지:**
```bash
docker-compose -f docker-compose.dev.yml down -v
```

### 개별 서비스 실행

각 서비스 디렉토리에서:

```bash
# 의존성 설치
npm install

# 개발 모드 실행 (hot-reload)
npm run start:dev

# 프로덕션 빌드
npm run build

# 프로덕션 모드 실행
npm run start:prod
```

### 프론트엔드 실행

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

---

## 접속 URL

### 서비스 엔드포인트

| 서비스 | URL | 설명 |
|--------|-----|------|
| Frontend | http://localhost:5173 | React 애플리케이션 |
| Auth API | http://localhost:3001 | 인증, OAuth, 프로필 |
| Quiz API | http://localhost:3002 | 퀴즈 CRUD |
| Game API | http://localhost:3003 | 게임룸, 실시간 게임 |
| Social API | http://localhost:3004 | 친구 시스템 |

### 데이터베이스 접속

| 서비스 | Host | Port | 사용자 | 비밀번호 | 데이터베이스 |
|--------|------|------|--------|----------|-------------|
| PostgreSQL | localhost | 5432 | postgres | postgres | music_quiz |
| Redis | localhost | 6379 | - | - | - |

**PostgreSQL 접속 (psql):**
```bash
psql -h localhost -U postgres -d music_quiz
```

**Redis 접속 (redis-cli):**
```bash
redis-cli -h localhost -p 6379
```

---

## 문제 해결

### 자주 발생하는 문제

#### 1. 데이터베이스 연결 오류

**증상:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**해결:**
```bash
# Docker 컨테이너 상태 확인
docker-compose -f docker-compose.dev.yml ps

# 컨테이너 재시작
docker-compose -f docker-compose.dev.yml restart
```

#### 2. CORS 오류

**증상:**
```
Access to fetch at 'http://localhost:3001' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**해결:**
- 각 백엔드 서비스의 `.env` 파일에서 `FRONTEND_URL=http://localhost:5173` 확인
- 서비스 재시작

#### 3. OAuth 리다이렉트 오류

**증상:**
```
Error 400: redirect_uri_mismatch
```

**해결:**
1. Google Cloud Console에서 Authorized redirect URIs 확인
2. `http://localhost:3001/auth/google/callback` 정확히 입력되어 있는지 확인
3. `.env`의 `GOOGLE_CALLBACK_URL` 값 확인

#### 4. 포트 충돌

**증상:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**해결:**
```bash
# Windows - 해당 포트 사용 프로세스 확인
netstat -ano | findstr :3001

# macOS/Linux
lsof -i :3001

# 프로세스 종료 후 재시작
```

#### 5. npm 설치 오류

**증상:**
```
npm ERR! code ERESOLVE
```

**해결:**
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

### 로그 확인

**백엔드 서비스 로그:**
각 터미널에서 실시간으로 확인 가능

**Docker 컨테이너 로그:**
```bash
# PostgreSQL 로그
docker-compose -f docker-compose.dev.yml logs postgres

# Redis 로그
docker-compose -f docker-compose.dev.yml logs redis
```

---

## 개발 팁

### Hot Reload

모든 백엔드 서비스는 `npm run start:dev`로 실행 시 파일 변경 감지 후 자동 재시작됩니다.

프론트엔드는 Vite의 HMR(Hot Module Replacement)을 지원합니다.

### 데이터베이스 초기화

```bash
# 모든 데이터 삭제 후 재시작
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### API 테스트

[Postman](https://www.postman.com/) 또는 [Insomnia](https://insomnia.rest/)를 사용하여 API를 테스트할 수 있습니다.

---

## 다음 단계

- [API 문서](./API.md) - API 엔드포인트 상세 정보
- [아키텍처](./ARCHITECTURE.md) - 시스템 구조 설명
- [배포 가이드](./DEPLOYMENT.md) - 프로덕션 배포 방법
