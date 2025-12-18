FROM node:20-alpine AS base

WORKDIR /app

# Copy shared-libs first
COPY shared-libs ./shared-libs

# Copy service package files
COPY sample-automation-service/package*.json ./

# Development stage
FROM base AS development
RUN npm install
COPY sample-automation-service .
EXPOSE 5006
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
RUN npm install --omit=dev
COPY sample-automation-service .
EXPOSE 5006
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5006/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
CMD ["node", "server.js"]
