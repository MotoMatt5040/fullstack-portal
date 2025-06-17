# Development stage
FROM node:20-bookworm-slim AS development

# Create app directory
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-bookworm-slim AS production

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

# COPY --from=development /app /app

EXPOSE 5000

CMD ["node", "server.js"]