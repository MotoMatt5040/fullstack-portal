# Development stage
FROM node:20-bookworm-slim as development

# Create app directory
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5001
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-bookworm-slim as production

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY --from=development /app /app

EXPOSE 5000

CMD ["node", "server.js"]