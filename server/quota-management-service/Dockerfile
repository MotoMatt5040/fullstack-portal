FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
EXPOSE 5008
CMD ["npm", "run", "dev"]

FROM base AS production
RUN npm install --omit=dev
COPY . .
EXPOSE 5008
CMD ["node", "server.js"]
