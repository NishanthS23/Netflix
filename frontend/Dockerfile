# Stage 1: Build the React Vite application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies needed for build
RUN npm install

# Copy application source code
COPY . .

# Build argument for Vite client-side Google Client ID
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Build production assets into dist/
RUN npm run build

# Stage 2: Production web server using Nginx
FROM nginx:alpine

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx server in foreground
CMD ["nginx", "-g", "daemon off;"]
