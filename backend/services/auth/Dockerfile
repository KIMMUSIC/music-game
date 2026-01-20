# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/services/auth/package*.json ./backend/services/auth/
COPY backend/shared ./backend/shared

# Install dependencies
RUN npm ci --workspace=backend/services/auth

# Copy source code
COPY backend/services/auth ./backend/services/auth

# Build the application
WORKDIR /app/backend/services/auth
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./
COPY backend/services/auth/package*.json ./backend/services/auth/

# Install production dependencies only
RUN npm ci --workspace=backend/services/auth --omit=dev

# Copy built application
COPY --from=builder /app/backend/services/auth/dist ./backend/services/auth/dist
COPY --from=builder /app/backend/shared ./backend/shared

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

WORKDIR /app/backend/services/auth

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/main.js"]
