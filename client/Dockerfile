# Development stage
FROM node:20-bookworm-slim as development

# Create app directory
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

ARG VITE_DEV_API_URL
ARG VITE_DOCKER_API_URL
ARG VITE_ENV
RUN VITE_DEV_API_URL=${VITE_DEV_API_URL} DOMAIN_NAME=${DOMAIN_NAME} VITE_ENV=${VITE_ENV} npm run build

#Production stage
FROM caddy:2-alpine as production
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=development /app/dist /srv