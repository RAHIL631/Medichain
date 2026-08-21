# frontend/Dockerfile
# MediChain Frontend — Production Docker Image

# ── Stage 1: Build the React Application ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Accept API URL at build time (CRA uses REACT_APP_* prefix, not VITE_*)
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Copy dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build the Create React App application for production
RUN npm run build

# ── Stage 2: Serve via Nginx ──────────────────────────────────────────────────
FROM nginx:alpine AS runtime

LABEL maintainer="MediChain Team"
LABEL description="MediChain React Frontend served via Nginx"

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the built React app from the builder stage
COPY --from=builder /usr/src/app/build /usr/share/nginx/html

# Copy custom Nginx configuration for Single Page Application routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Healthcheck to verify Nginx is serving
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
