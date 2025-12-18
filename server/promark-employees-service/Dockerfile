FROM node:20-alpine AS base

WORKDIR /app

# Copy shared-libs first
COPY shared-libs ./shared-libs

# Copy service package files
COPY promark-employees-service/package*.json ./

# Development stage
FROM base AS development
RUN npm install
COPY promark-employees-service .
EXPOSE 5015
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
RUN npm install --omit=dev
COPY promark-employees-service .
EXPOSE 5015
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5015/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
CMD ["node", "server.js"]
