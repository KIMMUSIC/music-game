#!/bin/bash
# GitHub Actions OIDC IAM Role 설정 스크립트

set -e

echo "=== 1. OIDC Provider 생성 ==="
# 이미 존재하는 경우 에러 무시
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  2>/dev/null || echo "OIDC Provider already exists"

echo "=== 2. IAM Role 생성 ==="
aws iam create-role \
  --role-name github-actions-musicquiz \
  --assume-role-policy-document file://trust-policy.json \
  --description "Role for GitHub Actions to deploy MusicQuiz" \
  2>/dev/null || echo "Role already exists"

echo "=== 3. 커스텀 정책 생성 ==="
aws iam create-policy \
  --policy-name github-actions-musicquiz-policy \
  --policy-document file://github-actions-policy.json \
  2>/dev/null || echo "Policy already exists"

echo "=== 4. 정책 연결 ==="
aws iam attach-role-policy \
  --role-name github-actions-musicquiz \
  --policy-arn arn:aws:iam::149536471243:policy/github-actions-musicquiz-policy \
  2>/dev/null || echo "Policy already attached"

echo "=== 완료 ==="
echo ""
echo "GitHub Secrets에 다음 값을 설정하세요:"
echo ""
echo "AWS_ACCOUNT_ID: 149536471243"
echo "AWS_ROLE_ARN: arn:aws:iam::149536471243:role/github-actions-musicquiz"
echo "FRONTEND_URL: https://musicquiz.cloud"
echo "GAME_SERVICE_URL: https://musicquiz.cloud"
echo "SOCIAL_SERVICE_URL: https://musicquiz.cloud"
