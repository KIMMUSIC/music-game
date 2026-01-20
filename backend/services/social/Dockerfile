# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/services/social/package*.json ./backend/services/social/
COPY backend/shared ./backend/shared

# Install dependencies
RUN npm ci --workspace=backend/services/social

# Copy source code
COPY backend/services/social ./backend/services/social

# Build the application
WORKDIR /app/backend/services/social
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./
COPY backend/services/social/package*.json ./backend/services/social/

# Install production dependencies only
RUN npm ci --workspace=backend/services/social --omit=dev

# Copy built application
COPY --from=builder /app/backend/services/social/dist ./backend/services/social/dist
COPY --from=builder /app/backend/shared ./backend/shared

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

WORKDIR /app/backend/services/social

ENV NODE_ENV=production
ENV PORT=3004

EXPOSE 3004

CMD ["node", "dist/main.js"]
