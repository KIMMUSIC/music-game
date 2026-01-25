# CI/CD 배포 준비 및 백업 플랜

**작성일**: 2026-01-25  
**대상 환경**: AWS ECS Fargate (musicquiz-dev)  
**리전**: ap-northeast-2

---

## 📋 목차

1. [현재 상태 분석](#1-현재-상태-분석)
2. [CI/CD 워크플로우 검토](#2-cicd-워크플로우-검토)
3. [배포 전 체크리스트](#3-배포-전-체크리스트)
4. [백업 플랜](#4-백업-플랜)
5. [배포 실행 절차](#5-배포-실행-절차)
6. [실패 시나리오 및 복구 절차](#6-실패-시나리오-및-복구-절차)
7. [롤백 절차](#7-롤백-절차)

---

## 1. 현재 상태 분석

### ✅ 확인된 AWS 리소스

| 리소스 타입 | 이름 | 상태 |
|------------|------|------|
| **ECS Cluster** | musicquiz-dev | ✅ 존재 |
| **ECS Services** | musicquiz-dev-auth | ✅ 존재 |
| | musicquiz-dev-quiz | ✅ 존재 |
| | musicquiz-dev-game | ✅ 존재 |
| | musicquiz-dev-social | ✅ 존재 |
| | musicquiz-dev-frontend | ✅ 존재 |
| **ECR Repositories** | musicquiz-dev-auth | ✅ 존재 |
| | musicquiz-dev-quiz | ✅ 존재 |
| | musicquiz-dev-game | ✅ 존재 |
| | musicquiz-dev-social | ✅ 존재 |
| | musicquiz-dev-frontend | ✅ 존재 |

### 📁 CI/CD 워크플로우 파일

- `.github/workflows/ci.yml` - 빌드 및 테스트
- `.github/workflows/cd.yml` - 배포 자동화
- `.github/workflows/rollback.yml` - 롤백 자동화

---

## 2. CI/CD 워크플로우 검토

### 2.1 CI 워크플로우 (ci.yml) - ✅ 정상

**트리거**: Push/PR to main, develop

**작업 흐름**:
1. ✅ Frontend 빌드 및 린트
2. ✅ Backend 서비스 빌드 (auth, quiz, game, social)
3. ✅ Docker 이미지 빌드 테스트 (5개 서비스)
4. ✅ GitHub Actions 캐시 활용

**검토 결과**: 
- ✅ 모든 서비스 빌드 검증
- ✅ 캐시 전략 적절
- ⚠️ 린트 실패 시 `|| true`로 무시 (line 35) - 프로덕션에서는 제거 권장

### 2.2 CD 워크플로우 (cd.yml) - ⚠️ 주의 필요

**트리거**: Push to main, workflow_dispatch

**작업 흐름**:
1. AWS 인증 (OIDC)
2. ECR 로그인
3. Docker 이미지 빌드 및 푸시 (matrix 전략)
4. ECS Task Definition 업데이트
5. ECS 서비스 배포

**⚠️ 발견된 이슈**:

#### 🔴 CRITICAL: 환경 변수 불일치
```yaml
# cd.yml line 10-11
env:
  AWS_REGION: ap-northeast-2
  ECR_REGISTRY: 149536471243.dkr.ecr.ap-northeast-2.amazonaws.com
```
- ✅ ECR_REGISTRY가 하드코딩되어 있음 (정상)
- ⚠️ 실제 클러스터 이름은 `musicquiz-dev`인데 cd.yml line 92에서 `musicquiz-cluster` 사용

#### 🟡 WARNING: 서비스 이름 불일치
```yaml
# cd.yml line 26-38 (matrix)
ecs_service: musicquiz-auth-service  # ❌ 실제: musicquiz-dev-auth
ecs_service: musicquiz-quiz-service  # ❌ 실제: musicquiz-dev-quiz
ecs_service: musicquiz-game-service  # ❌ 실제: musicquiz-dev-game
ecs_service: musicquiz-social-service  # ❌ 실제: musicquiz-dev-social
ecs_service: musicquiz-frontend-service  # ❌ 실제: musicquiz-dev-frontend
```

#### 🟡 WARNING: Task Definition 이름 불일치
```yaml
# cd.yml line 76
--task-definition musicquiz-${{ matrix.service }}
# 실제 필요: musicquiz-dev-${{ matrix.service }}
```

#### 🟢 INFO: 동시 배포 전략
- Matrix 전략으로 5개 서비스 동시 배포
- 서비스 간 의존성 고려 안됨 (auth → quiz/game/social)
- 권장: 순차 배포 또는 의존성 그룹화

### 2.3 Rollback 워크플로우 (rollback.yml) - ⚠️ 수정 필요

**트리거**: workflow_dispatch (수동)

**⚠️ 발견된 이슈**:

#### 🔴 CRITICAL: Secret 참조 오류
```yaml
# rollback.yml line 35
role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
```
- cd.yml에서는 하드코딩: `arn:aws:iam::149536471243:role/github-actions-musicquiz`
- rollback.yml에서는 secret 참조
- **해결**: GitHub Secret에 `AWS_ROLE_ARN` 추가 필요

---

## 3. 배포 전 체크리스트

### 3.1 GitHub Secrets 확인

다음 secrets가 설정되어 있어야 합니다:

```bash
# GitHub 저장소 > Settings > Secrets and variables > Actions
```

| Secret 이름 | 필수 여부 | 현재 상태 | 설명 |
|-------------|----------|----------|------|
| `AWS_ROLE_ARN` | ✅ 필수 | ❓ 미확인 | `arn:aws:iam::149536471243:role/github-actions-musicquiz` |
| `FRONTEND_URL` | ✅ 필수 | ❓ 미확인 | 프론트엔드 URL (예: `https://musicquiz.cloud`) |
| `GAME_SERVICE_URL` | ✅ 필수 | ❓ 미확인 | 게임 서비스 URL (ALB 주소) |
| `SOCIAL_SERVICE_URL` | ✅ 필수 | ❓ 미확인 | 소셜 서비스 URL (ALB 주소) |

**확인 방법**:
```bash
# GitHub CLI 사용
gh secret list

# 또는 웹 UI에서 확인
# https://github.com/KIMMUSIC/music-game/settings/secrets/actions
```

### 3.2 AWS 리소스 상태 확인

```bash
# 1. ECS 서비스 상태 확인
aws ecs describe-services \
  --cluster musicquiz-dev \
  --services musicquiz-dev-auth musicquiz-dev-quiz musicquiz-dev-game musicquiz-dev-social musicquiz-dev-frontend \
  --region ap-northeast-2 \
  --query 'services[].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount}' \
  --output table

# 2. 현재 Task Definition 버전 확인
aws ecs describe-services \
  --cluster musicquiz-dev \
  --services musicquiz-dev-auth \
  --region ap-northeast-2 \
  --query 'services[0].taskDefinition' \
  --output text

# 3. ECR 이미지 태그 확인
aws ecr describe-images \
  --repository-name musicquiz-dev-auth \
  --region ap-northeast-2 \
  --query 'imageDetails[*].{Tags:imageTags,Pushed:imagePushedAt}' \
  --output table

# 4. RDS 스냅샷 목록 확인
aws rds describe-db-snapshots \
  --region ap-northeast-2 \
  --query 'DBSnapshots[?starts_with(DBInstanceIdentifier, `musicquiz`)].{ID:DBSnapshotIdentifier,Instance:DBInstanceIdentifier,Created:SnapshotCreateTime,Status:Status}' \
  --output table
```

### 3.3 로컬 빌드 테스트

배포 전 로컬에서 Docker 이미지 빌드 테스트:

```bash
# Frontend
docker build -t musicquiz-frontend-test -f frontend/Dockerfile \
  --build-arg VITE_API_BASE_URL=https://musicquiz.cloud \
  --build-arg VITE_GAME_SERVICE_URL=https://musicquiz.cloud \
  --build-arg VITE_SOCIAL_SERVICE_URL=https://musicquiz.cloud .

# Auth Service
docker build -t musicquiz-auth-test -f backend/services/auth/Dockerfile .

# Quiz Service
docker build -t musicquiz-quiz-test -f backend/services/quiz/Dockerfile .

# Game Service
docker build -t musicquiz-game-test -f backend/services/game/Dockerfile .

# Social Service
docker build -t musicquiz-social-test -f backend/services/social/Dockerfile .
```

---

## 4. 백업 플랜

### 4.1 자동 백업 스크립트

배포 전 실행할 백업 스크립트를 생성합니다:

**`scripts/pre-deployment-backup.sh`**:

```bash
#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CLUSTER="musicquiz-dev"
REGION="ap-northeast-2"
BACKUP_DIR="backups/${TIMESTAMP}"

echo "🔄 Starting pre-deployment backup at ${TIMESTAMP}"

# 1. Create backup directory
mkdir -p "${BACKUP_DIR}"

# 2. Backup current ECS Task Definitions
echo "📦 Backing up ECS Task Definitions..."
for service in auth quiz game social frontend; do
  TASK_DEF=$(aws ecs describe-services \
    --cluster ${CLUSTER} \
    --services musicquiz-dev-${service} \
    --region ${REGION} \
    --query 'services[0].taskDefinition' \
    --output text)
  
  aws ecs describe-task-definition \
    --task-definition ${TASK_DEF} \
    --region ${REGION} \
    --query 'taskDefinition' \
    > "${BACKUP_DIR}/task-def-${service}.json"
  
  echo "  ✅ Backed up ${service}: ${TASK_DEF}"
done

# 3. Backup ECR image tags
echo "📦 Backing up ECR image tags..."
for service in auth quiz game social frontend; do
  aws ecr describe-images \
    --repository-name musicquiz-dev-${service} \
    --region ${REGION} \
    --query 'imageDetails[?imageTags!=null]|[0:5].{Tags:imageTags,Digest:imageDigest,Pushed:imagePushedAt}' \
    > "${BACKUP_DIR}/ecr-images-${service}.json"
  
  echo "  ✅ Backed up ECR images for ${service}"
done

# 4. Create RDS snapshot (if exists)
echo "📦 Creating RDS snapshot..."
DB_INSTANCE=$(aws rds describe-db-instances \
  --region ${REGION} \
  --query 'DBInstances[?starts_with(DBInstanceIdentifier, `musicquiz`)].DBInstanceIdentifier' \
  --output text | head -n1)

if [ -n "${DB_INSTANCE}" ]; then
  SNAPSHOT_ID="${DB_INSTANCE}-backup-${TIMESTAMP}"
  aws rds create-db-snapshot \
    --db-instance-identifier ${DB_INSTANCE} \
    --db-snapshot-identifier ${SNAPSHOT_ID} \
    --region ${REGION}
  
  echo "  ✅ RDS snapshot created: ${SNAPSHOT_ID}"
else
  echo "  ⚠️  No RDS instance found"
fi

# 5. Save current service state
echo "📦 Saving current service state..."
aws ecs describe-services \
  --cluster ${CLUSTER} \
  --services musicquiz-dev-auth musicquiz-dev-quiz musicquiz-dev-game musicquiz-dev-social musicquiz-dev-frontend \
  --region ${REGION} \
  > "${BACKUP_DIR}/ecs-services-state.json"

# 6. Create backup manifest
cat > "${BACKUP_DIR}/MANIFEST.md" << EOF
# Backup Manifest

**Timestamp**: ${TIMESTAMP}
**Cluster**: ${CLUSTER}
**Region**: ${REGION}

## Backed Up Resources

### ECS Task Definitions
- Auth: $(cat ${BACKUP_DIR}/task-def-auth.json | jq -r '.family + ":" + (.revision|tostring)')
- Quiz: $(cat ${BACKUP_DIR}/task-def-quiz.json | jq -r '.family + ":" + (.revision|tostring)')
- Game: $(cat ${BACKUP_DIR}/task-def-game.json | jq -r '.family + ":" + (.revision|tostring)')
- Social: $(cat ${BACKUP_DIR}/task-def-social.json | jq -r '.family + ":" + (.revision|tostring)')
- Frontend: $(cat ${BACKUP_DIR}/task-def-frontend.json | jq -r '.family + ":" + (.revision|tostring)')

### RDS Snapshot
- Instance: ${DB_INSTANCE}
- Snapshot ID: ${SNAPSHOT_ID}

## Rollback Commands

\`\`\`bash
# Rollback Auth Service
aws ecs update-service \\
  --cluster ${CLUSTER} \\
  --service musicquiz-dev-auth \\
  --task-definition \$(cat ${BACKUP_DIR}/task-def-auth.json | jq -r '.family + ":" + (.revision|tostring)') \\
  --region ${REGION}

# Rollback Quiz Service
aws ecs update-service \\
  --cluster ${CLUSTER} \\
  --service musicquiz-dev-quiz \\
  --task-definition \$(cat ${BACKUP_DIR}/task-def-quiz.json | jq -r '.family + ":" + (.revision|tostring)') \\
  --region ${REGION}

# Rollback Game Service
aws ecs update-service \\
  --cluster ${CLUSTER} \\
  --service musicquiz-dev-game \\
  --task-definition \$(cat ${BACKUP_DIR}/task-def-game.json | jq -r '.family + ":" + (.revision|tostring)') \\
  --region ${REGION}

# Rollback Social Service
aws ecs update-service \\
  --cluster ${CLUSTER} \\
  --service musicquiz-dev-social \\
  --task-definition \$(cat ${BACKUP_DIR}/task-def-social.json | jq -r '.family + ":" + (.revision|tostring)') \\
  --region ${REGION}

# Rollback Frontend
aws ecs update-service \\
  --cluster ${CLUSTER} \\
  --service musicquiz-dev-frontend \\
  --task-definition \$(cat ${BACKUP_DIR}/task-def-frontend.json | jq -r '.family + ":" + (.revision|tostring)') \\
  --region ${REGION}
\`\`\`
EOF

echo ""
echo "✅ Backup completed successfully!"
echo "📁 Backup location: ${BACKUP_DIR}"
echo "📄 Manifest: ${BACKUP_DIR}/MANIFEST.md"
echo ""
echo "To rollback, use the commands in the manifest file."
```

**실행 방법**:
```bash
chmod +x scripts/pre-deployment-backup.sh
./scripts/pre-deployment-backup.sh
```

### 4.2 백업 검증

백업 후 다음을 확인:

```bash
# 1. 백업 파일 존재 확인
ls -lh backups/$(ls -t backups | head -n1)/

# 2. Task Definition JSON 유효성 확인
jq . backups/$(ls -t backups | head -n1)/task-def-auth.json

# 3. RDS 스냅샷 상태 확인
aws rds describe-db-snapshots \
  --region ap-northeast-2 \
  --query 'DBSnapshots[?starts_with(DBSnapshotIdentifier, `musicquiz`)].{ID:DBSnapshotIdentifier,Status:Status,Progress:PercentProgress}' \
  --output table
```

---

## 5. 배포 실행 절차

### 5.1 배포 전 준비 (CRITICAL)

#### Step 1: CI/CD 워크플로우 수정

**⚠️ 배포 전 반드시 수정해야 할 파일: `.github/workflows/cd.yml`**

```yaml
# 수정 전 (line 26-38)
- service: auth
  ecr_repo: musicquiz-auth
  ecs_service: musicquiz-auth-service  # ❌ 틀림

# 수정 후
- service: auth
  ecr_repo: musicquiz-dev-auth
  ecs_service: musicquiz-dev-auth  # ✅ 올바름
```

**전체 수정 사항**:

```yaml
# .github/workflows/cd.yml
strategy:
  matrix:
    include:
      - service: auth
        ecr_repo: musicquiz-dev-auth
        ecs_service: musicquiz-dev-auth
      - service: quiz
        ecr_repo: musicquiz-dev-quiz
        ecs_service: musicquiz-dev-quiz
      - service: game
        ecr_repo: musicquiz-dev-game
        ecs_service: musicquiz-dev-game
      - service: social
        ecr_repo: musicquiz-dev-social
        ecs_service: musicquiz-dev-social
      - service: frontend
        ecr_repo: musicquiz-dev-frontend
        ecs_service: musicquiz-dev-frontend

# line 76 수정
--task-definition musicquiz-dev-${{ matrix.service }} \

# line 92 수정
cluster: musicquiz-dev
```

#### Step 2: GitHub Secrets 설정

```bash
# GitHub CLI로 설정
gh secret set AWS_ROLE_ARN --body "arn:aws:iam::149536471243:role/github-actions-musicquiz"
gh secret set FRONTEND_URL --body "https://musicquiz.cloud"
gh secret set GAME_SERVICE_URL --body "https://musicquiz.cloud"
gh secret set SOCIAL_SERVICE_URL --body "https://musicquiz.cloud"

# 확인
gh secret list
```

#### Step 3: 백업 실행

```bash
./scripts/pre-deployment-backup.sh
```

### 5.2 배포 실행

#### 방법 1: GitHub Actions 수동 트리거 (권장)

```bash
# GitHub CLI 사용
gh workflow run cd.yml

# 또는 웹 UI에서
# https://github.com/KIMMUSIC/music-game/actions/workflows/cd.yml
# "Run workflow" 버튼 클릭
```

#### 방법 2: main 브랜치 푸시

```bash
git add .
git commit -m "deploy: trigger CD workflow"
git push origin main
```

### 5.3 배포 모니터링

```bash
# 1. GitHub Actions 로그 실시간 확인
gh run watch

# 2. ECS 서비스 배포 상태 확인
watch -n 5 'aws ecs describe-services \
  --cluster musicquiz-dev \
  --services musicquiz-dev-auth musicquiz-dev-quiz musicquiz-dev-game musicquiz-dev-social musicquiz-dev-frontend \
  --region ap-northeast-2 \
  --query "services[].{Name:serviceName,Running:runningCount,Desired:desiredCount,Status:deployments[0].status}" \
  --output table'

# 3. CloudWatch 로그 확인
aws logs tail /ecs/musicquiz-dev/auth --follow --region ap-northeast-2
```

---

## 6. 실패 시나리오 및 복구 절차

### 시나리오 1: Docker 이미지 빌드 실패

**증상**:
- GitHub Actions에서 "Build and push Docker image" 단계 실패
- 에러 메시지: `ERROR: failed to solve: ...`

**원인**:
- Dockerfile 문법 오류
- 의존성 설치 실패
- 빌드 컨텍스트 문제

**복구 절차**:
```bash
# 1. 로컬에서 빌드 테스트
docker build -t test -f backend/services/auth/Dockerfile .

# 2. 에러 로그 확인
# GitHub Actions > 실패한 워크플로우 > 로그 확인

# 3. 수정 후 재배포
git add .
git commit -m "fix: docker build issue"
git push origin main
```

### 시나리오 2: ECR 푸시 실패

**증상**:
- "Login to Amazon ECR" 성공
- "Build and push Docker image" 실패
- 에러: `denied: User: ... is not authorized to perform: ecr:PutImage`

**원인**:
- IAM Role 권한 부족
- ECR 리포지토리 정책 문제

**복구 절차**:
```bash
# 1. IAM Role 권한 확인
aws iam get-role-policy \
  --role-name github-actions-musicquiz \
  --policy-name ECRAccess

# 2. 필요 시 권한 추가
aws iam attach-role-policy \
  --role-name github-actions-musicquiz \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess

# 3. 재배포
gh workflow run cd.yml
```

### 시나리오 3: ECS Task Definition 업데이트 실패

**증상**:
- "Download task definition" 단계 실패
- 에러: `An error occurred (ClientException) when calling the DescribeTaskDefinition operation: Unable to describe task definition`

**원인**:
- Task Definition이 존재하지 않음
- 이름 불일치

**복구 절차**:
```bash
# 1. 현재 Task Definition 확인
aws ecs list-task-definitions \
  --family-prefix musicquiz-dev \
  --region ap-northeast-2

# 2. Task Definition이 없으면 수동 생성
# (Terraform 또는 AWS Console 사용)

# 3. cd.yml의 task-definition 이름 확인 및 수정
```

### 시나리오 4: ECS 서비스 배포 실패 (일부 서비스만 성공)

**증상**:
- Auth, Quiz 서비스는 배포 성공
- Game 서비스 배포 실패
- 에러: `service musicquiz-dev-game was unable to place a task`

**원인**:
- 리소스 부족 (CPU/메모리)
- 헬스체크 실패
- 의존성 서비스 미준비

**복구 절차**:
```bash
# 1. 실패한 서비스 이벤트 확인
aws ecs describe-services \
  --cluster musicquiz-dev \
  --services musicquiz-dev-game \
  --region ap-northeast-2 \
  --query 'services[0].events[:10]'

# 2. Task 실패 이유 확인
TASK_ARN=$(aws ecs list-tasks \
  --cluster musicquiz-dev \
  --service-name musicquiz-dev-game \
  --region ap-northeast-2 \
  --query 'taskArns[0]' \
  --output text)

aws ecs describe-tasks \
  --cluster musicquiz-dev \
  --tasks ${TASK_ARN} \
  --region ap-northeast-2 \
  --query 'tasks[0].{StoppedReason:stoppedReason,Containers:containers[].{Name:name,Reason:reason}}'

# 3. 헬스체크 실패 시 로그 확인
aws logs tail /ecs/musicquiz-dev/game --follow --region ap-northeast-2

# 4. 롤백 (백업 사용)
# backups/YYYYMMDD-HHMMSS/MANIFEST.md의 롤백 명령 실행
```

### 시나리오 5: 전체 배포 실패 (모든 서비스 다운)

**증상**:
- 모든 서비스가 RUNNING → STOPPED
- 웹사이트 접속 불가 (502 Bad Gateway)

**원인**:
- 데이터베이스 연결 실패
- 환경 변수 오류
- 네트워크 설정 문제

**긴급 복구 절차**:
```bash
# 1. 즉시 전체 롤백
BACKUP_DIR="backups/$(ls -t backups | head -n1)"

for service in auth quiz game social frontend; do
  TASK_DEF=$(cat ${BACKUP_DIR}/task-def-${service}.json | jq -r '.family + ":" + (.revision|tostring)')
  
  aws ecs update-service \
    --cluster musicquiz-dev \
    --service musicquiz-dev-${service} \
    --task-definition ${TASK_DEF} \
    --force-new-deployment \
    --region ap-northeast-2
  
  echo "✅ Rolled back ${service} to ${TASK_DEF}"
done

# 2. 서비스 안정화 대기
aws ecs wait services-stable \
  --cluster musicquiz-dev \
  --services musicquiz-dev-auth musicquiz-dev-quiz musicquiz-dev-game musicquiz-dev-social musicquiz-dev-frontend \
  --region ap-northeast-2

# 3. 상태 확인
aws ecs describe-services \
  --cluster musicquiz-dev \
  --services musicquiz-dev-auth musicquiz-dev-quiz musicquiz-dev-game musicquiz-dev-social musicquiz-dev-frontend \
  --region ap-northeast-2 \
  --query 'services[].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount}'
```

---

## 7. 롤백 절차

### 7.1 GitHub Actions를 통한 롤백

```bash
# 1. 롤백할 Task Definition ARN 확인
BACKUP_DIR="backups/$(ls -t backups | head -n1)"
cat ${BACKUP_DIR}/MANIFEST.md

# 2. GitHub Actions Rollback 워크플로우 실행
gh workflow run rollback.yml \
  -f aws_region=ap-northeast-2 \
  -f cluster=musicquiz-dev \
  -f service=musicquiz-dev-auth \
  -f task_definition_family=musicquiz-dev-auth

# 또는 특정 ARN으로 롤백
gh workflow run rollback.yml \
  -f aws_region=ap-northeast-2 \
  -f cluster=musicquiz-dev \
  -f service=musicquiz-dev-auth \
  -f task_definition_arn=arn:aws:ecs:ap-northeast-2:149536471243:task-definition/musicquiz-dev-auth:5
```

### 7.2 AWS CLI를 통한 수동 롤백

```bash
# 1. 이전 Task Definition 확인
aws ecs list-task-definitions \
  --family-prefix musicquiz-dev-auth \
  --sort DESC \
  --max-items 5 \
  --region ap-northeast-2

# 2. 특정 버전으로 롤백
aws ecs update-service \
  --cluster musicquiz-dev \
  --service musicquiz-dev-auth \
  --task-definition musicquiz-dev-auth:5 \
  --force-new-deployment \
  --region ap-northeast-2

# 3. 배포 완료 대기
aws ecs wait services-stable \
  --cluster musicquiz-dev \
  --services musicquiz-dev-auth \
  --region ap-northeast-2
```

### 7.3 RDS 롤백 (데이터베이스)

```bash
# 1. 스냅샷 목록 확인
aws rds describe-db-snapshots \
  --region ap-northeast-2 \
  --query 'DBSnapshots[?starts_with(DBSnapshotIdentifier, `musicquiz`)].{ID:DBSnapshotIdentifier,Created:SnapshotCreateTime,Status:Status}' \
  --output table

# 2. 스냅샷에서 복원 (새 인스턴스 생성)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier musicquiz-dev-postgres-restored \
  --db-snapshot-identifier musicquiz-dev-postgres-backup-20260125-120000 \
  --region ap-northeast-2

# 3. 복원 완료 대기
aws rds wait db-instance-available \
  --db-instance-identifier musicquiz-dev-postgres-restored \
  --region ap-northeast-2

# 4. 엔드포인트 확인 및 서비스 환경 변수 업데이트
aws rds describe-db-instances \
  --db-instance-identifier musicquiz-dev-postgres-restored \
  --region ap-northeast-2 \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

---

## 8. 배포 후 검증

### 8.1 서비스 헬스체크

```bash
# 1. ECS 서비스 상태
aws ecs describe-services \
  --cluster musicquiz-dev \
  --services musicquiz-dev-auth musicquiz-dev-quiz musicquiz-dev-game musicquiz-dev-social musicquiz-dev-frontend \
  --region ap-northeast-2 \
  --query 'services[].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount,Health:healthCheckGracePeriodSeconds}' \
  --output table

# 2. ALB Target Group 헬스
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --region ap-northeast-2 \
  --query 'LoadBalancers[?starts_with(LoadBalancerName, `musicquiz`)].LoadBalancerArn' \
  --output text)

aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --load-balancer-arn ${ALB_ARN} \
    --region ap-northeast-2 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text) \
  --region ap-northeast-2

# 3. 애플리케이션 엔드포인트 테스트
curl -I https://musicquiz.cloud/health
curl -I https://musicquiz.cloud/api/auth/health
curl -I https://musicquiz.cloud/api/quiz/health
```

### 8.2 로그 확인

```bash
# 각 서비스 로그 확인
aws logs tail /ecs/musicquiz-dev/auth --since 5m --region ap-northeast-2
aws logs tail /ecs/musicquiz-dev/quiz --since 5m --region ap-northeast-2
aws logs tail /ecs/musicquiz-dev/game --since 5m --region ap-northeast-2
aws logs tail /ecs/musicquiz-dev/social --since 5m --region ap-northeast-2
aws logs tail /ecs/musicquiz-dev/frontend --since 5m --region ap-northeast-2

# 에러 로그 필터링
aws logs filter-log-events \
  --log-group-name /ecs/musicquiz-dev/auth \
  --filter-pattern "ERROR" \
  --start-time $(date -d '10 minutes ago' +%s000) \
  --region ap-northeast-2
```

---

## 9. 체크리스트

### 배포 전 체크리스트

- [ ] `.github/workflows/cd.yml` 수정 완료 (서비스 이름, 클러스터 이름)
- [ ] GitHub Secrets 설정 완료 (AWS_ROLE_ARN, FRONTEND_URL, etc.)
- [ ] 로컬 Docker 빌드 테스트 성공
- [ ] AWS 리소스 상태 확인 (ECS, ECR, RDS)
- [ ] 백업 스크립트 실행 완료
- [ ] 백업 파일 검증 완료
- [ ] RDS 스냅샷 생성 완료

### 배포 중 체크리스트

- [ ] GitHub Actions 워크플로우 시작 확인
- [ ] Docker 이미지 빌드 성공
- [ ] ECR 푸시 성공
- [ ] Task Definition 업데이트 성공
- [ ] ECS 서비스 배포 시작
- [ ] 서비스 안정화 대기 (wait-for-service-stability)

### 배포 후 체크리스트

- [ ] 모든 ECS 서비스 RUNNING 상태
- [ ] ALB Target Group 헬스체크 통과
- [ ] 프론트엔드 접속 테스트 (https://musicquiz.cloud)
- [ ] API 엔드포인트 테스트
- [ ] Google 로그인 테스트
- [ ] 게임 생성 및 플레이 테스트
- [ ] CloudWatch 로그 정상 수집 확인
- [ ] 에러 로그 없음 확인

---

## 10. 긴급 연락처 및 리소스

### AWS 리소스 링크

- **ECS 콘솔**: https://ap-northeast-2.console.aws.amazon.com/ecs/v2/clusters/musicquiz-dev
- **ECR 콘솔**: https://ap-northeast-2.console.aws.amazon.com/ecr/repositories
- **CloudWatch 로그**: https://ap-northeast-2.console.aws.amazon.com/cloudwatch/home?region=ap-northeast-2#logsV2:log-groups
- **RDS 콘솔**: https://ap-northeast-2.console.aws.amazon.com/rds/home?region=ap-northeast-2

### GitHub Actions

- **워크플로우**: https://github.com/KIMMUSIC/music-game/actions
- **Secrets 설정**: https://github.com/KIMMUSIC/music-game/settings/secrets/actions

### 유용한 명령어

```bash
# 전체 서비스 상태 한눈에 보기
alias ecs-status='aws ecs describe-services --cluster musicquiz-dev --services musicquiz-dev-auth musicquiz-dev-quiz musicquiz-dev-game musicquiz-dev-social musicquiz-dev-frontend --region ap-northeast-2 --query "services[].{Name:serviceName,Running:runningCount,Desired:desiredCount}" --output table'

# 최신 백업 디렉토리 확인
alias latest-backup='ls -td backups/* | head -n1'

# 빠른 롤백 (최신 백업 사용)
alias quick-rollback='BACKUP_DIR=$(ls -td backups/* | head -n1); for service in auth quiz game social frontend; do TASK_DEF=$(cat ${BACKUP_DIR}/task-def-${service}.json | jq -r ".family + \":\" + (.revision|tostring)"); aws ecs update-service --cluster musicquiz-dev --service musicquiz-dev-${service} --task-definition ${TASK_DEF} --force-new-deployment --region ap-northeast-2; done'
```

---

## 결론

이 문서는 Music Quiz 프로젝트의 CI/CD 배포를 안전하게 수행하기 위한 완전한 가이드입니다.

**핵심 포인트**:
1. ⚠️ **배포 전 반드시 cd.yml 수정** (서비스 이름 불일치 해결)
2. ✅ **백업 스크립트 실행** (롤백 가능성 확보)
3. 📊 **배포 모니터링** (실시간 상태 확인)
4. 🔄 **실패 시 즉시 롤백** (백업 매니페스트 활용)

**다음 단계**:
1. 이 문서의 "3. 배포 전 체크리스트" 실행
2. "4. 백업 플랜" 스크립트 실행
3. "5. 배포 실행 절차" 따라 배포
4. "8. 배포 후 검증" 수행

문제 발생 시 "6. 실패 시나리오 및 복구 절차"를 참조하세요.
