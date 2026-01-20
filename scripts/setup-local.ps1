# Music Quiz - Local Setup Script (PowerShell)
# Run this script to set up all environment files for local development

Write-Host "Setting up Music Quiz for local development..." -ForegroundColor Cyan

# Root .env
$rootEnv = @"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=music_quiz
"@
Set-Content -Path ".env" -Value $rootEnv
Write-Host "Created .env" -ForegroundColor Green

# Auth Service .env
$authEnv = @"
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=music_quiz

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=local-dev-jwt-secret-change-in-production

# Google OAuth - Replace with your credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Internal API
INTERNAL_API_KEY=local-internal-api-key
"@
Set-Content -Path "backend\services\auth\.env" -Value $authEnv
Write-Host "Created backend/services/auth/.env" -ForegroundColor Green

# Quiz Service .env
$quizEnv = @"
NODE_ENV=development
PORT=3002

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=music_quiz

# JWT
JWT_SECRET=local-dev-jwt-secret-change-in-production

# Internal API
AUTH_SERVICE_URL=http://localhost:3001
INTERNAL_API_KEY=local-internal-api-key
"@
Set-Content -Path "backend\services\quiz\.env" -Value $quizEnv
Write-Host "Created backend/services/quiz/.env" -ForegroundColor Green

# Game Service .env
$gameEnv = @"
NODE_ENV=development
PORT=3003

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=music_quiz

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=local-dev-jwt-secret-change-in-production

# Internal API
AUTH_SERVICE_URL=http://localhost:3001
QUIZ_SERVICE_URL=http://localhost:3002
INTERNAL_API_KEY=local-internal-api-key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
"@
Set-Content -Path "backend\services\game\.env" -Value $gameEnv
Write-Host "Created backend/services/game/.env" -ForegroundColor Green

# Social Service .env
$socialEnv = @"
NODE_ENV=development
PORT=3004

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=music_quiz

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=local-dev-jwt-secret-change-in-production

# Internal API
AUTH_SERVICE_URL=http://localhost:3001
INTERNAL_API_KEY=local-internal-api-key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
"@
Set-Content -Path "backend\services\social\.env" -Value $socialEnv
Write-Host "Created backend/services/social/.env" -ForegroundColor Green

# Frontend .env
$frontendEnv = @"
VITE_API_BASE_URL=http://localhost:3001
VITE_GAME_SERVICE_URL=http://localhost:3003
VITE_SOCIAL_SERVICE_URL=http://localhost:3004
"@
Set-Content -Path "frontend\.env" -Value $frontendEnv
Write-Host "Created frontend/.env" -ForegroundColor Green

Write-Host ""
Write-Host "Environment files created!" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Edit backend/services/auth/.env and add your Google OAuth credentials:" -ForegroundColor Yellow
Write-Host "  - GOOGLE_CLIENT_ID" -ForegroundColor Yellow
Write-Host "  - GOOGLE_CLIENT_SECRET" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. docker-compose -f docker-compose.dev.yml up -d" -ForegroundColor White
Write-Host "  2. npm install" -ForegroundColor White
Write-Host "  3. npm run dev (in each service directory)" -ForegroundColor White
