# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY frontend/ ./

# Build arguments for environment variables
ARG VITE_API_BASE_URL
ARG VITE_GAME_SERVICE_URL
ARG VITE_SOCIAL_SERVICE_URL

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GAME_SERVICE_URL=$VITE_GAME_SERVICE_URL
ENV VITE_SOCIAL_SERVICE_URL=$VITE_SOCIAL_SERVICE_URL

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
