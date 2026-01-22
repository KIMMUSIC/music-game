# Music Quiz Game

친구들과 함께 즐기는 실시간 음악 맞추기 게임 플랫폼

**Live Site**: https://musicquiz.cloud

## 서비스 소개

Music Quiz Game은 여러 사람이 함께 음악을 듣고 제목이나 가수를 맞추는 실시간 멀티플레이어 웹 게임입니다.

### 주요 기능

- **실시간 멀티플레이**: 2~20명의 플레이어가 동시에 참여
- **퀴즈 생성**: YouTube 링크 또는 MP3 파일로 나만의 퀴즈 제작
- **다양한 로그인**: Google 소셜 로그인 또는 게스트 로그인 지원
- **친구 시스템**: 친구 추가 및 게임 초대
- **실시간 채팅**: 게임 중 채팅으로 소통
- **점수 시스템**: 정답 속도에 따른 점수 차등 부여

## 플레이 방법

### 1. 로그인하기

https://musicquiz.cloud 접속 후:
- **Google 로그인**: "Continue with Google" 버튼 클릭
- **게스트 로그인**: 닉네임 입력 후 "게스트로 시작하기" 버튼 클릭

### 2. 퀴즈 만들기

1. 메인 화면에서 **"Create Quiz"** 클릭
2. 퀴즈 제목과 설명 입력
3. **"Add Question"**으로 문제 추가:
   - **YouTube**: YouTube URL 입력 후 재생 구간(시작/종료 시간) 설정
   - **MP3 업로드**: 음악 파일 업로드 (최대 10MB)
4. 정답 입력 (여러 개 가능 - 예: "아이유", "IU", "이지은")
5. 힌트 입력 (선택사항)
6. 모든 문제 추가 후 **"Save Quiz"** 클릭

### 3. 게임 방 만들기

1. 메인 화면에서 **"Create Room"** 클릭
2. 사용할 퀴즈 선택
3. 게임 설정:
   - **최대 인원**: 2~20명
   - **라운드당 시간**: 15~60초
   - **힌트 공개**: ON/OFF
   - **스킵 투표**: ON/OFF
4. **"Create Room"** 클릭
5. 생성된 방 코드를 친구들에게 공유

### 4. 게임 참여하기

1. 메인 화면에서 **"Join Room"** 클릭
2. 6자리 방 코드 입력
3. 로비에서 다른 플레이어들과 대기
4. 호스트가 **"Start Game"** 클릭하면 게임 시작

### 5. 게임 플레이

1. 음악이 재생되면 채팅창에 정답 입력
2. **정답을 맞추면 점수 획득** (빨리 맞출수록 고득점)
3. 힌트가 활성화된 경우 "Reveal Hint" 클릭 가능 (점수 10% 감점)
4. 모든 라운드 종료 후 최종 순위 확인

### 점수 계산

```
점수 = (기본점수 1000 + 시간보너스) × (1 - 힌트페널티)
- 시간보너스: 남은 시간 비율 × 500점
- 힌트페널티: 힌트 사용 시 10%
```

## 기술 스택

### Frontend
- React 18 + TypeScript
- Vite (빌드 도구)
- Tailwind CSS
- Zustand (상태 관리)
- Socket.IO Client (실시간 통신)

### Backend
- NestJS + TypeScript
- PostgreSQL (데이터베이스)
- Redis (세션/캐시)
- Socket.IO (WebSocket)
- Passport.js (OAuth 인증)

### Infrastructure
- AWS ECS Fargate (컨테이너 오케스트레이션)
- AWS RDS PostgreSQL (데이터베이스)
- AWS ElastiCache Redis (캐시)
- AWS ALB (로드 밸런서)
- AWS ECR (컨테이너 레지스트리)

## AWS 인프라 구조

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                         AWS Cloud                            │
                                    │                                                              │
    ┌──────────┐                    │  ┌─────────────────────────────────────────────────────┐   │
    │  Users   │───────────────────►│  │           Application Load Balancer (ALB)           │   │
    │          │   HTTPS            │  │              https://musicquiz.cloud                 │   │
    └──────────┘                    │  └───────────────────────────┬─────────────────────────┘   │
                                    │                              │                              │
                                    │              ┌───────────────┼───────────────┐             │
                                    │              ▼               ▼               ▼              │
                                    │  ┌─────────────────────────────────────────────────────┐   │
                                    │  │                    ECS Fargate Cluster               │   │
                                    │  │                                                      │   │
                                    │  │   ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
                                    │  │   │ Frontend │ │   Auth   │ │   Quiz   │           │   │
                                    │  │   │ :80      │ │  :3001   │ │  :3002   │           │   │
                                    │  │   └──────────┘ └──────────┘ └──────────┘           │   │
                                    │  │                                                      │   │
                                    │  │   ┌──────────┐ ┌──────────┐                        │   │
                                    │  │   │   Game   │ │  Social  │                        │   │
                                    │  │   │  :3003   │ │  :3004   │                        │   │
                                    │  │   └──────────┘ └──────────┘                        │   │
                                    │  │                                                      │   │
                                    │  └────────────────────────┬─────────────────────────────┘   │
                                    │                           │                                  │
                                    │           ┌───────────────┴───────────────┐                │
                                    │           ▼                               ▼                 │
                                    │  ┌─────────────────┐           ┌─────────────────┐        │
                                    │  │ RDS PostgreSQL  │           │ ElastiCache     │        │
                                    │  │ (데이터베이스)    │           │ Redis (세션)     │        │
                                    │  └─────────────────┘           └─────────────────┘        │
                                    │                                                              │
                                    └─────────────────────────────────────────────────────────────┘
```

### 마이크로서비스 구성

| 서비스 | 포트 | 역할 |
|--------|------|------|
| **Frontend** | 80 | React SPA, 사용자 인터페이스 |
| **Auth Service** | 3001 | 인증/인가, OAuth, JWT 토큰 관리 |
| **Quiz Service** | 3002 | 퀴즈 CRUD, 음악 파일 관리 |
| **Game Service** | 3003 | 실시간 게임 로직, WebSocket, 방 관리 |
| **Social Service** | 3004 | 친구 시스템, 알림 |

### ALB 라우팅 규칙

| 경로 패턴 | 대상 서비스 |
|-----------|-------------|
| `/auth/*` | Auth Service |
| `/quiz/*` | Quiz Service |
| `/room/*` | Game Service |
| `/social/*` | Social Service |
| `/*` | Frontend |

## 로컬 개발 환경

### 필수 요구사항

- Node.js 20 LTS
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/your-repo/music-quiz-game.git
cd music-quiz-game

# Docker로 데이터베이스 실행
docker-compose up -d postgres redis

# Backend 서비스 실행 (각 터미널에서)
cd backend/services/auth && npm install && npm run start:dev
cd backend/services/quiz && npm install && npm run start:dev
cd backend/services/game && npm install && npm run start:dev
cd backend/services/social && npm install && npm run start:dev

# Frontend 실행
cd frontend && npm install && npm run dev
```

로컬 환경: http://localhost:5173

## 문서

- [로컬 개발 가이드](./docs/LOCAL_DEVELOPMENT.md)
- [AWS 배포 가이드](./docs/AWS_DEPLOYMENT.md)
- [기능 명세서](./specs/001-music-quiz-game/spec.md)

## 라이선스

MIT License
