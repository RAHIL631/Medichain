# backend/Dockerfile
# MediChain Backend API — Production Docker Image

# ── Stage 1: Build & Install Dependencies ─────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including devDependencies if needed for build steps)
RUN npm ci

# Copy application source code
COPY . .

# ── Stage 2: Production Runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runtime

LABEL maintainer="MediChain Team"
LABEL description="MediChain Node.js Backend API Microservice"

WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies to keep image size small
RUN npm ci --only=production && npm cache clean --force

# Copy application source from builder stage
COPY --from=builder /usr/src/app/ .

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /usr/src/app

USER nodejs

# Expose API port
EXPOSE 5000

# Healthcheck to verify the API is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the application
CMD ["npm", "start"]
