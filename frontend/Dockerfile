# frontend/Dockerfile
# MediChain Frontend — Production Docker Image

# ── Stage 1: Build the React Application ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Accept API URL at build time for Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy dependencies
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Build the Vite application for production
RUN npm run build

# ── Stage 2: Serve via Nginx ──────────────────────────────────────────────────
FROM nginx:alpine AS runtime

LABEL maintainer="MediChain Team"
LABEL description="MediChain React Frontend served via Nginx"

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the built React app from the builder stage
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for Single Page Application routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Healthcheck to verify Nginx is serving
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
