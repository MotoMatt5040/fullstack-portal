# Development stage
FROM node:20-bookworm-slim AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy application files
COPY . .

EXPOSE 5000
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-bookworm-slim AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
# Use npm ci for faster, more reliable builds
RUN npm ci --only=production

# Copy application files
COPY . .

EXPOSE 5000
CMD ["node", "server.js"]