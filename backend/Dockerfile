# Base image: Node.js 20 on Alpine Linux
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Ensure temporary upload staging directory exists
RUN mkdir -p /tmp/netflix-uploads /app/uploads

# Expose backend port
EXPOSE 8000

# Default environment variables
ENV NODE_ENV=production
ENV SERVER_PORT=8000

# Start backend server
CMD ["node", "index.js"]
