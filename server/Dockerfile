# Development stage
FROM node:20-bookworm-slim AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# Dependencies stage - for better caching
FROM node:20-bookworm-slim AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Production stage
FROM node:20-bookworm-slim AS production
WORKDIR /app
# Copy dependencies from cache stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./
# Copy application files
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]