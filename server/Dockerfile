# Development stage
FROM node:20-bookworm-slim AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# Dependencies stage - cacheable layer for production
FROM node:20-bookworm-slim AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Security audit stage (optional but recommended)
FROM dependencies AS security-check
RUN npm audit --audit-level high || true  # Don't fail build on audit issues

# Runtime preparation stage
FROM dependencies AS runtime-prep
WORKDIR /app
COPY . .
# Remove development files
RUN rm -rf tests/ docs/ .github/ README.md *.md && \
    find . -name "*.test.js" -delete && \
    find . -name "*.spec.js" -delete

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && \
    chown -R node:node /app/logs

# Final production stage  
FROM node:20-bookworm-slim AS production
WORKDIR /app

# Copy from runtime-prep stage
COPY --from=runtime-prep /app ./

# Ensure logs directory exists with proper permissions
RUN mkdir -p /logs /app/logs && \
    chmod 755 /logs /app/logs

# Don't switch to non-root user yet - let's get basic functionality working first
# USER node

EXPOSE 5000
CMD ["node", "server.js"]