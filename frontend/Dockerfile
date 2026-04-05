# Production Dockerfile for React Frontend
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Build arguments for environment
ARG VITE_API_URL
ARG VITE_AI_API_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AI_API_URL=$VITE_AI_API_URL

# Build the application
RUN npm run build

# Verify build output
RUN ls -la /app/dist && echo "Build successful!"

# Stage 2: Production with Nginx
FROM nginx:alpine AS production

# Copy custom nginx config template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Default port (platforms like Render inject PORT env var)
ENV PORT=80

# Expose port
EXPOSE 80

# Start nginx — use envsubst to inject PORT, then start
CMD ["/bin/sh", "-c", "envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
