# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/services/quiz/package*.json ./backend/services/quiz/
COPY backend/shared ./backend/shared

# Install dependencies
RUN npm ci --workspace=backend/services/quiz

# Copy source code
COPY backend/services/quiz ./backend/services/quiz

# Build the application
WORKDIR /app/backend/services/quiz
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./
COPY backend/services/quiz/package*.json ./backend/services/quiz/

# Install production dependencies only
RUN npm ci --workspace=backend/services/quiz --omit=dev

# Copy built application
COPY --from=builder /app/backend/services/quiz/dist ./backend/services/quiz/dist
COPY --from=builder /app/backend/shared ./backend/shared

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

WORKDIR /app/backend/services/quiz

ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

CMD ["node", "dist/main.js"]
