#!/bin/bash
# Music Quiz - Local Setup Script (Bash)
# Run this script to set up all environment files for local development

echo -e "\033[36mSetting up Music Quiz for local development...\033[0m"

# Root .env
cat > .env << 'EOF'
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=music_quiz
EOF
echo -e "\033[32mCreated .env\033[0m"

# Auth Service .env
cat > backend/services/auth/.env << 'EOF'
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
EOF
echo -e "\033[32mCreated backend/services/auth/.env\033[0m"

# Quiz Service .env
cat > backend/services/quiz/.env << 'EOF'
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
EOF
echo -e "\033[32mCreated backend/services/quiz/.env\033[0m"

# Game Service .env
cat > backend/services/game/.env << 'EOF'
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
EOF
echo -e "\033[32mCreated backend/services/game/.env\033[0m"

# Social Service .env
cat > backend/services/social/.env << 'EOF'
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
EOF
echo -e "\033[32mCreated backend/services/social/.env\033[0m"

# Frontend .env
cat > frontend/.env << 'EOF'
VITE_API_BASE_URL=http://localhost:3001
VITE_GAME_SERVICE_URL=http://localhost:3003
VITE_SOCIAL_SERVICE_URL=http://localhost:3004
EOF
echo -e "\033[32mCreated frontend/.env\033[0m"

echo ""
echo -e "\033[36mEnvironment files created!\033[0m"
echo ""
echo -e "\033[33mIMPORTANT: Edit backend/services/auth/.env and add your Google OAuth credentials:\033[0m"
echo -e "\033[33m  - GOOGLE_CLIENT_ID\033[0m"
echo -e "\033[33m  - GOOGLE_CLIENT_SECRET\033[0m"
echo ""
echo -e "\033[36mNext steps:\033[0m"
echo "  1. docker-compose -f docker-compose.dev.yml up -d"
echo "  2. npm install"
echo "  3. npm run dev (in each service directory)"
