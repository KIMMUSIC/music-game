# Music Quiz AWS 배포 가이드

이 문서는 Music Quiz 서비스를 AWS에 배포하고 자동화하는 방법을 상세히 안내합니다.

## 목차

- [아키텍처 개요](#아키텍처-개요)
- [사전 요구사항](#사전-요구사항)
- [1단계: AWS 계정 설정](#1단계-aws-계정-설정)
- [2단계: Terraform 인프라 구축](#2단계-terraform-인프라-구축)
- [3단계: ECR 저장소 설정](#3단계-ecr-저장소-설정)
- [4단계: GitHub Actions CI/CD 설정](#4단계-github-actions-cicd-설정)
- [5단계: 도메인 및 SSL 설정](#5단계-도메인-및-ssl-설정)
- [6단계: 모니터링 및 로깅](#6단계-모니터링-및-로깅)
- [7단계: 보안 설정](#7단계-보안-설정)
- [운영 가이드](#운영-가이드)
- [비용 최적화](#비용-최적화)
- [문제 해결](#문제-해결)

---

## 아키텍처 개요

### 인프라 구성도

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                         AWS Cloud                            │
                                    │                                                              │
    ┌──────────┐                    │  ┌─────────────────────────────────────────────────────┐   │
    │  Users   │───────────────────►│  │                 Application Load Balancer            │   │
    └──────────┘                    │  │                    (Public Subnet)                   │   │
                                    │  └───────────────────────────┬─────────────────────────┘   │
                                    │                              │                              │
                                    │              ┌───────────────┼───────────────┐             │
                                    │              ▼               ▼               ▼              │
                                    │  ┌─────────────────────────────────────────────────────┐   │
                                    │  │                    ECS Fargate                       │   │
                                    │  │                  (Private Subnet)                    │   │
                                    │  │                                                      │   │
                                    │  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │   │
                                    │  │   │  Auth   │ │  Quiz   │ │  Game   │ │ Social  │  │   │
                                    │  │   │ Service │ │ Service │ │ Service │ │ Service │  │   │
                                    │  │   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │   │
                                    │  │        │          │          │          │         │   │
                                    │  └────────┼──────────┼──────────┼──────────┼─────────┘   │
                                    │           │          │          │          │             │
                                    │           ▼          ▼          ▼          ▼             │
                                    │  ┌─────────────────────────────────────────────────────┐   │
                                    │  │              RDS PostgreSQL │ ElastiCache Redis     │   │
                                    │  │                  (Private Subnet)                    │   │
                                    │  └─────────────────────────────────────────────────────┘   │
                                    │                                                              │
                                    └─────────────────────────────────────────────────────────────┘
```

### 사용 AWS 서비스

| 서비스 | 용도 | 비고 |
|--------|------|------|
| VPC | 네트워크 격리 | Public/Private Subnet |
| ECS Fargate | 컨테이너 오케스트레이션 | 서버리스 컨테이너 |
| ECR | Docker 이미지 저장소 | 5개 서비스 이미지 |
| ALB | 로드 밸런서 | HTTPS, 경로 기반 라우팅 |
| RDS | PostgreSQL 데이터베이스 | Multi-AZ (프로덕션) |
| ElastiCache | Redis 캐시 | 세션, 실시간 데이터 |
| Route 53 | DNS 관리 | 도메인 연결 |
| ACM | SSL 인증서 | HTTPS 설정 |
| CloudWatch | 모니터링/로깅 | 메트릭, 알람, 로그 |
| Secrets Manager | 비밀 정보 관리 | API 키, DB 비밀번호 |
| IAM | 접근 제어 | 역할 기반 권한 |

---

## 사전 요구사항

### 필수 도구 설치

```bash
# AWS CLI 설치
# Windows
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Terraform 설치
# Windows (Chocolatey)
choco install terraform

# macOS
brew install terraform

# Linux
sudo apt-get update && sudo apt-get install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Docker 설치 (이미지 빌드용)
# https://docs.docker.com/get-docker/
```

### 버전 확인

```bash
aws --version      # aws-cli/2.x.x
terraform version  # Terraform v1.x.x
docker --version   # Docker version 24.x.x
```

---

## 1단계: AWS 계정 설정

### 1.1 AWS 계정 생성

1. https://aws.amazon.com 접속
2. **Create an AWS Account** 클릭
3. 이메일, 비밀번호, 계정 이름 입력
4. 결제 정보 등록 (신용카드 필요)
5. 본인 확인 완료

### 1.2 IAM 사용자 생성

**루트 계정 대신 IAM 사용자를 사용하는 것이 보안상 권장됩니다.**

```bash
# AWS Console에서 IAM 사용자 생성
# 1. IAM > Users > Add users
# 2. User name: musicquiz-admin
# 3. AWS credential type: Access key - Programmatic access
# 4. Permissions: AdministratorAccess (또는 필요한 권한만)
# 5. Access Key ID와 Secret Access Key 저장
```

### 1.3 AWS CLI 설정

```bash
aws configure
# AWS Access Key ID: [발급받은 Access Key]
# AWS Secret Access Key: [발급받은 Secret Key]
# Default region name: ap-northeast-2
# Default output format: json

# 설정 확인
aws sts get-caller-identity
```

### 1.4 Terraform 상태 저장용 S3 버킷 생성

```bash
# S3 버킷 생성 (Terraform 상태 파일 저장용)
aws s3 mb s3://musicquiz-terraform-state --region ap-northeast-2

# 버전 관리 활성화
aws s3api put-bucket-versioning \
  --bucket musicquiz-terraform-state \
  --versioning-configuration Status=Enabled

# 암호화 활성화
aws s3api put-bucket-encryption \
  --bucket musicquiz-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

# DynamoDB 테이블 생성 (상태 잠금용)
aws dynamodb create-table \
  --table-name musicquiz-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-2
```

---

## 2단계: Terraform 인프라 구축

### 2.1 Terraform 백엔드 설정

`infrastructure/terraform/main.tf` 파일에서 백엔드 주석 해제:

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # S3 백엔드 활성화
  backend "s3" {
    bucket         = "musicquiz-terraform-state"
    key            = "terraform.tfstate"
    region         = "ap-northeast-2"
    encrypt        = true
    dynamodb_table = "musicquiz-terraform-locks"
  }
}
```

### 2.2 환경별 변수 파일 생성

**개발 환경 (`infrastructure/terraform/environments/dev/terraform.tfvars`):**

```hcl
# 기본 설정
aws_region   = "ap-northeast-2"
project_name = "musicquiz"
environment  = "dev"

# VPC
vpc_cidr = "10.0.0.0/16"

# RDS
db_instance_class = "db.t3.micro"
db_name           = "music_quiz"
db_username       = "postgres"
db_password       = "YourSecurePassword123!"  # 실제 배포 시 Secrets Manager 사용

# Redis
redis_node_type = "cache.t3.micro"

# Application
jwt_secret           = "your-jwt-secret-key-change-this"
internal_api_key     = "your-internal-api-key"
google_client_id     = "your-google-client-id"
google_client_secret = "your-google-client-secret"

# Container Images (초기값, CI/CD에서 업데이트)
auth_image   = ""
quiz_image   = ""
game_image   = ""
social_image = ""
```

**프로덕션 환경 (`infrastructure/terraform/environments/prod/terraform.tfvars`):**

```hcl
# 기본 설정
aws_region   = "ap-northeast-2"
project_name = "musicquiz"
environment  = "prod"

# VPC
vpc_cidr = "10.1.0.0/16"

# RDS (프로덕션용 더 큰 인스턴스)
db_instance_class = "db.t3.small"
db_name           = "music_quiz"
db_username       = "postgres"
db_password       = "YourSecurePassword123!"

# Redis
redis_node_type = "cache.t3.small"

# Application (Secrets Manager에서 관리 권장)
jwt_secret           = "your-production-jwt-secret"
internal_api_key     = "your-production-internal-api-key"
google_client_id     = "your-google-client-id"
google_client_secret = "your-google-client-secret"

# Container Images
auth_image   = ""
quiz_image   = ""
game_image   = ""
social_image = ""
```

### 2.3 Terraform 실행

```bash
cd infrastructure/terraform

# 초기화
terraform init

# 개발 환경 배포
terraform workspace new dev
terraform workspace select dev
terraform plan -var-file="environments/dev/terraform.tfvars"
terraform apply -var-file="environments/dev/terraform.tfvars"

# 프로덕션 환경 배포
terraform workspace new prod
terraform workspace select prod
terraform plan -var-file="environments/prod/terraform.tfvars"
terraform apply -var-file="environments/prod/terraform.tfvars"
```

### 2.4 Terraform 출력 확인

```bash
# 배포된 리소스 정보 확인
terraform output

# 예상 출력:
# alb_dns_name = "musicquiz-dev-alb-123456789.ap-northeast-2.elb.amazonaws.com"
# ecr_repository_urls = {
#   "auth" = "123456789.dkr.ecr.ap-northeast-2.amazonaws.com/musicquiz-dev-auth"
#   "quiz" = "123456789.dkr.ecr.ap-northeast-2.amazonaws.com/musicquiz-dev-quiz"
#   ...
# }
```

---

## 3단계: ECR 저장소 설정

### 3.1 ECR 로그인

```bash
# AWS 계정 ID 확인
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com
```

### 3.2 Docker 이미지 빌드 및 푸시 (수동)

```bash
# 프로젝트 루트에서 실행

# Auth Service
docker build -t musicquiz-auth -f backend/services/auth/Dockerfile .
docker tag musicquiz-auth:latest ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/musicquiz-dev-auth:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/musicquiz-dev-auth:latest

# Quiz Service
docker build -t musicquiz-quiz -f backend/services/quiz/Dockerfile .
docker tag musicquiz-quiz:latest ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/musicquiz-dev-quiz:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/musicquiz-dev-quiz:latest

# Game Service
docker build -t musicquiz-game -f backend/services/game/Dockerfile .
docker tag musicquiz-game:latest ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/musicquiz-dev-game:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/musicquiz-dev-game:latest

# Social Service
docker build -t musicquiz-social -f backend/services/social/Dockerfile .
docker tag musicquiz-social:latest ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/musicquiz-dev-social:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/musicquiz-dev-social:latest

# Frontend
docker build -t musicquiz-frontend -f frontend/Dockerfile \
  --build-arg VITE_API_BASE_URL=https://your-domain.com \
  --build-arg VITE_GAME_SERVICE_URL=https://your-domain.com \
  --build-arg VITE_SOCIAL_SERVICE_URL=https://your-domain.com .
docker tag musicquiz-frontend:latest ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/musicquiz-dev-frontend:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/musicquiz-dev-frontend:latest
```

---

## 4단계: GitHub Actions CI/CD 설정

### 4.1 GitHub Secrets 설정

GitHub 저장소에서 **Settings > Secrets and variables > Actions**로 이동하여 다음 시크릿 추가:

| Secret Name | 설명 | 예시 값 |
|-------------|------|---------|
| `AWS_ACCOUNT_ID` | AWS 계정 ID | `123456789012` |
| `AWS_ROLE_ARN` | GitHub Actions용 IAM Role ARN | `arn:aws:iam::123456789012:role/github-actions` |
| `FRONTEND_URL` | 프론트엔드 URL | `https://musicquiz.example.com` |
| `GAME_SERVICE_URL` | 게임 서비스 URL | `https://musicquiz.example.com` |
| `SOCIAL_SERVICE_URL` | 소셜 서비스 URL | `https://musicquiz.example.com` |

### 4.2 GitHub OIDC IAM Role 생성

GitHub Actions에서 AWS에 접근하기 위한 IAM Role을 생성합니다:

```bash
# OIDC Provider 생성
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

# IAM Role 생성을 위한 정책 파일
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO:*"
        }
      }
    }
  ]
}
EOF

# YOUR_ACCOUNT_ID와 YOUR_GITHUB_ORG/YOUR_REPO를 실제 값으로 변경

# IAM Role 생성
aws iam create-role \
  --role-name github-actions \
  --assume-role-policy-document file://trust-policy.json

# 필요한 정책 연결
aws iam attach-role-policy \
  --role-name github-actions \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

aws iam attach-role-policy \
  --role-name github-actions \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess
```

### 4.3 CI/CD 파이프라인 동작

**.github/workflows/ci.yml** - Pull Request 및 푸시 시:
1. 코드 린트 및 타입 체크
2. 각 서비스 유닛 테스트
3. Docker 이미지 빌드 테스트
4. 보안 스캔 (Trivy)

**.github/workflows/cd.yml** - main 브랜치 푸시 또는 태그 생성 시:
1. Docker 이미지 빌드
2. ECR에 이미지 푸시
3. ECS 서비스 업데이트
4. 배포 완료 대기

### 4.4 배포 트리거

```bash
# 스테이징 배포 (main 브랜치 푸시)
git push origin main

# 프로덕션 배포 (버전 태그 생성)
git tag v1.0.0
git push origin v1.0.0
```

---

## 5단계: 도메인 및 SSL 설정

### 5.1 Route 53 호스팅 영역 생성

```bash
# 호스팅 영역 생성
aws route53 create-hosted-zone \
  --name musicquiz.example.com \
  --caller-reference $(date +%s)

# NS 레코드 확인 (도메인 등록 기관에 설정 필요)
aws route53 list-resource-record-sets \
  --hosted-zone-id YOUR_HOSTED_ZONE_ID \
  --query "ResourceRecordSets[?Type=='NS']"
```

### 5.2 ACM SSL 인증서 발급

```bash
# SSL 인증서 요청
aws acm request-certificate \
  --domain-name musicquiz.example.com \
  --subject-alternative-names "*.musicquiz.example.com" \
  --validation-method DNS \
  --region ap-northeast-2

# 인증서 ARN 확인
aws acm list-certificates --region ap-northeast-2
```

### 5.3 DNS 검증

ACM에서 제공하는 CNAME 레코드를 Route 53에 추가:

```bash
# ACM 인증서 상세 정보 확인
aws acm describe-certificate \
  --certificate-arn YOUR_CERTIFICATE_ARN \
  --region ap-northeast-2

# Route 53에 CNAME 레코드 추가 (DNS 검증용)
# AWS Console에서 수동으로 추가하거나 CLI 사용
```

### 5.4 ALB에 HTTPS 리스너 추가

Terraform에 HTTPS 리스너 추가 (`infrastructure/terraform/modules/ecs/main.tf`):

```hcl
# HTTPS 리스너
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["frontend"].arn
  }
}

# HTTP to HTTPS 리다이렉트
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

### 5.5 Route 53 A 레코드 설정

```bash
# ALB를 가리키는 A 레코드 (Alias) 생성
cat > route53-record.json << 'EOF'
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "musicquiz.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "ALB_HOSTED_ZONE_ID",
          "DNSName": "ALB_DNS_NAME",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_HOSTED_ZONE_ID \
  --change-batch file://route53-record.json
```

---

## 6단계: 모니터링 및 로깅

### 6.1 CloudWatch 로그 확인

```bash
# 로그 그룹 목록
aws logs describe-log-groups --log-group-name-prefix /ecs/musicquiz

# 최근 로그 확인
aws logs tail /ecs/musicquiz-dev/auth --follow

# 특정 시간대 로그 조회
aws logs filter-log-events \
  --log-group-name /ecs/musicquiz-dev/auth \
  --start-time $(date -d '1 hour ago' +%s000) \
  --filter-pattern "ERROR"
```

### 6.2 CloudWatch 알람 설정

```bash
# CPU 사용률 알람
aws cloudwatch put-metric-alarm \
  --alarm-name "musicquiz-dev-auth-cpu-high" \
  --alarm-description "Auth service CPU utilization > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ClusterName,Value=musicquiz-dev Name=ServiceName,Value=musicquiz-dev-auth \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:ap-northeast-2:YOUR_ACCOUNT_ID:alerts

# 메모리 사용률 알람
aws cloudwatch put-metric-alarm \
  --alarm-name "musicquiz-dev-auth-memory-high" \
  --alarm-description "Auth service memory utilization > 80%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ClusterName,Value=musicquiz-dev Name=ServiceName,Value=musicquiz-dev-auth \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:ap-northeast-2:YOUR_ACCOUNT_ID:alerts
```

### 6.3 CloudWatch 대시보드 생성

AWS Console에서 CloudWatch > Dashboards > Create dashboard:

**권장 위젯:**
- ECS 서비스 CPU/메모리 사용률
- ALB 요청 수 및 응답 시간
- RDS 연결 수 및 CPU
- ElastiCache 히트율 및 메모리
- 에러 로그 카운트

### 6.4 SNS 알림 설정

```bash
# SNS 토픽 생성
aws sns create-topic --name musicquiz-alerts

# 이메일 구독 추가
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-northeast-2:YOUR_ACCOUNT_ID:musicquiz-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com
```

---

## 7단계: 보안 설정

### 7.1 Secrets Manager 사용

민감한 정보를 Secrets Manager에 저장:

```bash
# 시크릿 생성
aws secretsmanager create-secret \
  --name musicquiz/prod/database \
  --description "Production database credentials" \
  --secret-string '{"username":"postgres","password":"YourSecurePassword123!"}'

aws secretsmanager create-secret \
  --name musicquiz/prod/jwt \
  --description "JWT secret key" \
  --secret-string '{"secret":"your-very-long-and-secure-jwt-secret-key"}'

aws secretsmanager create-secret \
  --name musicquiz/prod/google-oauth \
  --description "Google OAuth credentials" \
  --secret-string '{"clientId":"xxx","clientSecret":"xxx"}'
```

### 7.2 ECS Task Definition에서 Secrets 사용

```json
{
  "containerDefinitions": [
    {
      "name": "auth",
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-2:YOUR_ACCOUNT_ID:secret:musicquiz/prod/database:password::"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-2:YOUR_ACCOUNT_ID:secret:musicquiz/prod/jwt:secret::"
        }
      ]
    }
  ]
}
```

### 7.3 보안 그룹 규칙

```bash
# ALB 보안 그룹 - 80, 443 포트만 허용
aws ec2 authorize-security-group-ingress \
  --group-id sg-alb \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-alb \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# ECS 보안 그룹 - ALB에서만 접근 허용
aws ec2 authorize-security-group-ingress \
  --group-id sg-ecs \
  --protocol tcp \
  --port 0-65535 \
  --source-group sg-alb

# RDS 보안 그룹 - ECS에서만 접근 허용
aws ec2 authorize-security-group-ingress \
  --group-id sg-rds \
  --protocol tcp \
  --port 5432 \
  --source-group sg-ecs
```

### 7.4 WAF 설정 (선택사항)

```bash
# WAF Web ACL 생성
aws wafv2 create-web-acl \
  --name musicquiz-waf \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules file://waf-rules.json \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=musicquiz-waf

# ALB에 WAF 연결
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:ap-northeast-2:YOUR_ACCOUNT_ID:regional/webacl/musicquiz-waf/xxx \
  --resource-arn arn:aws:elasticloadbalancing:ap-northeast-2:YOUR_ACCOUNT_ID:loadbalancer/app/musicquiz-dev-alb/xxx
```

---

## 운영 가이드

### 서비스 스케일링

```bash
# ECS 서비스 스케일 업
aws ecs update-service \
  --cluster musicquiz-prod \
  --service musicquiz-prod-auth \
  --desired-count 3

# Auto Scaling 설정
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/musicquiz-prod/musicquiz-prod-auth \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# CPU 기반 Auto Scaling 정책
aws application-autoscaling put-scaling-policy \
  --policy-name cpu-scaling \
  --service-namespace ecs \
  --resource-id service/musicquiz-prod/musicquiz-prod-auth \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleOutCooldown": 300,
    "ScaleInCooldown": 300
  }'
```

### 배포 롤백

```bash
# 이전 Task Definition으로 롤백
aws ecs update-service \
  --cluster musicquiz-prod \
  --service musicquiz-prod-auth \
  --task-definition musicquiz-prod-auth:PREVIOUS_VERSION \
  --force-new-deployment

# 배포 상태 확인
aws ecs describe-services \
  --cluster musicquiz-prod \
  --services musicquiz-prod-auth
```

### 데이터베이스 백업

```bash
# 수동 스냅샷 생성
aws rds create-db-snapshot \
  --db-instance-identifier musicquiz-prod-postgres \
  --db-snapshot-identifier musicquiz-prod-manual-backup-$(date +%Y%m%d)

# 스냅샷 목록 확인
aws rds describe-db-snapshots \
  --db-instance-identifier musicquiz-prod-postgres
```

### 로그 다운로드

```bash
# 로그 내보내기
aws logs create-export-task \
  --task-name "auth-logs-export" \
  --log-group-name "/ecs/musicquiz-prod/auth" \
  --from $(date -d '1 day ago' +%s000) \
  --to $(date +%s000) \
  --destination "musicquiz-logs-bucket" \
  --destination-prefix "exports/auth"
```

---

## 비용 최적화

### 예상 월간 비용 (개발 환경)

| 서비스 | 사양 | 예상 비용 (USD) |
|--------|------|----------------|
| ECS Fargate | 5 tasks × 0.25 vCPU × 0.5 GB | ~$30 |
| RDS | db.t3.micro | ~$15 |
| ElastiCache | cache.t3.micro | ~$12 |
| ALB | 1 ALB | ~$20 |
| NAT Gateway | 1 NAT | ~$35 |
| Data Transfer | ~50GB | ~$5 |
| **합계** | | **~$117/월** |

### 비용 절감 팁

1. **Fargate Spot 사용** (개발/스테이징 환경)
   - 최대 70% 비용 절감
   - 중단될 수 있으므로 프로덕션에는 비권장

2. **Reserved Instances** (프로덕션)
   - RDS, ElastiCache에 예약 인스턴스 적용
   - 1년 약정 시 ~30% 절감

3. **NAT Gateway 대안**
   - NAT Instance 사용 (관리 오버헤드 증가)
   - VPC Endpoints 활용

4. **Auto Scaling 활용**
   - 야간/주말 스케일 다운
   - 트래픽 기반 자동 조절

5. **로그 보존 기간 최적화**
   - 개발: 7일
   - 프로덕션: 30일

---

## 문제 해결

### ECS 서비스가 시작되지 않음

```bash
# 서비스 이벤트 확인
aws ecs describe-services \
  --cluster musicquiz-dev \
  --services musicquiz-dev-auth \
  --query 'services[0].events[:5]'

# Task 실패 이유 확인
aws ecs describe-tasks \
  --cluster musicquiz-dev \
  --tasks TASK_ARN \
  --query 'tasks[0].stoppedReason'

# 일반적인 원인:
# - 이미지를 찾을 수 없음: ECR에 이미지가 푸시되었는지 확인
# - 포트 충돌: 보안 그룹 규칙 확인
# - 메모리 부족: Task Definition의 메모리 증가
# - 헬스체크 실패: 애플리케이션 /health 엔드포인트 확인
```

### RDS 연결 실패

```bash
# 보안 그룹 확인
aws ec2 describe-security-groups --group-ids sg-rds

# 연결 테스트 (ECS Task 내에서)
nc -zv RDS_ENDPOINT 5432

# 일반적인 원인:
# - 보안 그룹에서 ECS 접근 허용 안됨
# - Private Subnet에서 NAT Gateway 없음
# - 잘못된 엔드포인트 주소
```

### 502 Bad Gateway

```bash
# Target Group 상태 확인
aws elbv2 describe-target-health \
  --target-group-arn TARGET_GROUP_ARN

# 일반적인 원인:
# - 애플리케이션이 시작되지 않음: 로그 확인
# - 헬스체크 실패: 헬스체크 경로 및 응답 코드 확인
# - 타임아웃: ALB 타임아웃 설정 확인
```

### 배포 실패

```bash
# GitHub Actions 로그 확인
# GitHub 저장소 > Actions 탭에서 실패한 워크플로우 확인

# 일반적인 원인:
# - AWS 자격 증명 만료: GitHub Secrets 확인
# - ECR 푸시 실패: IAM 권한 확인
# - ECS 업데이트 실패: 서비스 이벤트 확인
```

---

## 체크리스트

### 배포 전 체크리스트

- [ ] AWS 계정 및 IAM 사용자 설정 완료
- [ ] Terraform 상태 저장용 S3 버킷 생성
- [ ] 환경별 terraform.tfvars 파일 작성
- [ ] Google OAuth 클라이언트 생성 및 설정
- [ ] GitHub Secrets 설정 완료
- [ ] 도메인 및 SSL 인증서 준비

### 배포 후 체크리스트

- [ ] 모든 ECS 서비스 Running 상태 확인
- [ ] ALB 헬스체크 통과 확인
- [ ] 프론트엔드 접속 테스트
- [ ] Google 로그인 테스트
- [ ] 게임 생성 및 플레이 테스트
- [ ] CloudWatch 로그 수집 확인
- [ ] 알람 설정 및 테스트

---

## 참고 자료

- [AWS ECS 공식 문서](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
