FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

# Development stage
FROM base AS development
RUN npm install
COPY . .
EXPOSE 5005
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
RUN npm install --omit=dev
COPY . .
EXPOSE 5005
CMD ["node", "server.js"]
