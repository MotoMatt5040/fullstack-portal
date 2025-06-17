# Stage 1: Build the React application
# RENAMED THIS STAGE FROM 'development' TO 'build'
FROM node:20-bookworm-slim AS build

# Create app directory
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

ARG VITE_DOMAIN_NAME
ARG VITE_ENV
RUN VITE_DOMAIN_NAME=${VITE_DOMAIN_NAME} VITE_ENV=${VITE_ENV} npm run build

# Stage 2: Serve the built files with Caddy
FROM caddy:2-alpine AS production
COPY ./Caddyfile /etc/caddy/Caddyfile

# This line now works because it correctly refers to the 'build' stage above
COPY --from=build /app/build /srv