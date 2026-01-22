# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend-level tsconfig
COPY backend/tsconfig.json ./backend/tsconfig.json

# Copy shared module
COPY backend/shared ./backend/shared

# Copy social service
COPY backend/services/social ./backend/services/social

# Install shared dependencies first
WORKDIR /app/backend/shared
RUN npm install

# Install social service dependencies
WORKDIR /app/backend/services/social
RUN npm install

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app/backend/services/social

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files and install production deps
COPY backend/services/social/package*.json ./
RUN npm install --omit=dev

# Copy shared module (needed at runtime for TypeORM entities)
COPY --from=builder /app/backend/shared /app/backend/shared

# Copy built application
COPY --from=builder /app/backend/services/social/dist ./dist

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

ENV NODE_ENV=production
ENV PORT=3004

EXPOSE 3004

CMD ["node", "dist/services/social/src/main.js"]
