# Stage 1: Development (for local development)
FROM node:20-bookworm-slim AS development

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# Stage 2: Build the React application
FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Build args for environment variables
ARG VITE_DOMAIN_NAME
ARG VITE_ENV
ARG VITE_DEV_API_URL

# Build the application - Vite outputs to 'dist' by default
RUN VITE_DOMAIN_NAME=${VITE_DOMAIN_NAME} \
    VITE_ENV=${VITE_ENV} \
    VITE_DEV_API_URL=${VITE_DEV_API_URL} \
    npm run build

# Stage 3: Serve the built files with Caddy
FROM caddy:2-alpine AS production

# Copy the Caddyfile
COPY ./Caddyfile /etc/caddy/Caddyfile

# Copy built files from the build stage
# Vite outputs to 'dist' by default, not 'build'
COPY --from=build /app/dist /srv

EXPOSE 80