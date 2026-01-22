# GitHub Actions OIDC IAM Role 설정 스크립트 (PowerShell)

$ErrorActionPreference = "Continue"

Write-Host "=== 1. OIDC Provider 생성 ===" -ForegroundColor Cyan
try {
    aws iam create-open-id-connect-provider `
        --url https://token.actions.githubusercontent.com `
        --client-id-list sts.amazonaws.com `
        --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
    Write-Host "OIDC Provider created" -ForegroundColor Green
} catch {
    Write-Host "OIDC Provider already exists or error occurred" -ForegroundColor Yellow
}

Write-Host "`n=== 2. IAM Role 생성 ===" -ForegroundColor Cyan
try {
    aws iam create-role `
        --role-name github-actions-musicquiz `
        --assume-role-policy-document file://trust-policy.json `
        --description "Role for GitHub Actions to deploy MusicQuiz"
    Write-Host "IAM Role created" -ForegroundColor Green
} catch {
    Write-Host "Role already exists or error occurred" -ForegroundColor Yellow
}

Write-Host "`n=== 3. 커스텀 정책 생성 ===" -ForegroundColor Cyan
try {
    aws iam create-policy `
        --policy-name github-actions-musicquiz-policy `
        --policy-document file://github-actions-policy.json
    Write-Host "Policy created" -ForegroundColor Green
} catch {
    Write-Host "Policy already exists or error occurred" -ForegroundColor Yellow
}

Write-Host "`n=== 4. 정책 연결 ===" -ForegroundColor Cyan
try {
    aws iam attach-role-policy `
        --role-name github-actions-musicquiz `
        --policy-arn arn:aws:iam::149536471243:policy/github-actions-musicquiz-policy
    Write-Host "Policy attached" -ForegroundColor Green
} catch {
    Write-Host "Policy already attached or error occurred" -ForegroundColor Yellow
}

Write-Host "`n=== 완료 ===" -ForegroundColor Green
Write-Host ""
Write-Host "GitHub Secrets에 다음 값을 설정하세요:" -ForegroundColor Cyan
Write-Host ""
Write-Host "AWS_ACCOUNT_ID: 149536471243" -ForegroundColor White
Write-Host "AWS_ROLE_ARN: arn:aws:iam::149536471243:role/github-actions-musicquiz" -ForegroundColor White
Write-Host "FRONTEND_URL: https://musicquiz.cloud" -ForegroundColor White
Write-Host "GAME_SERVICE_URL: https://musicquiz.cloud" -ForegroundColor White
Write-Host "SOCIAL_SERVICE_URL: https://musicquiz.cloud" -ForegroundColor White
