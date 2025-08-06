# Development stage
FROM node:20-bookworm-slim AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# Build dependencies stage - for better caching
FROM node:20-bookworm-slim AS build-deps
WORKDIR /app
COPY package*.json ./
RUN npm install && npm cache clean --force

# Build stage
FROM build-deps AS build
COPY . .
ARG VITE_DOMAIN_NAME
ARG VITE_ENV
ARG VITE_DEV_API_URL
RUN VITE_DOMAIN_NAME=${VITE_DOMAIN_NAME} \
    VITE_ENV=${VITE_ENV} \
    VITE_DEV_API_URL=${VITE_DEV_API_URL} \
    npm run build

# Production stage with Caddy
FROM caddy:2-alpine AS production
COPY ./Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/build /srv
EXPOSE 80