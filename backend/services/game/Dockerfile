# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/services/game/package*.json ./backend/services/game/
COPY backend/shared ./backend/shared

# Install dependencies
RUN npm ci --workspace=backend/services/game

# Copy source code
COPY backend/services/game ./backend/services/game

# Build the application
WORKDIR /app/backend/services/game
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./
COPY backend/services/game/package*.json ./backend/services/game/

# Install production dependencies only
RUN npm ci --workspace=backend/services/game --omit=dev

# Copy built application
COPY --from=builder /app/backend/services/game/dist ./backend/services/game/dist
COPY --from=builder /app/backend/shared ./backend/shared

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

WORKDIR /app/backend/services/game

ENV NODE_ENV=production
ENV PORT=3003

EXPOSE 3003

CMD ["node", "dist/main.js"]
