# Development stage
FROM node:20-bookworm-slim AS development

# Create app directory
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

ARG VITE_DEV_API_URL
ARG VITE_DOMAIN_NAME
ARG VITE_ENV
RUN VITE_DEV_API_URL=${VITE_DEV_API_URL} VITE_DOMAIN_NAME=${VITE_DOMAIN_NAME} VITE_ENV=${VITE_ENV} npm run build
RUN echo "VITE_DEV_API_URL=${VITE_DEV_API_URL}" \
    && echo "VITE_DOMAIN_NAME=${VITE_DOMAIN_NAME}" \
    && echo "VITE_ENV=${VITE_ENV}"

#Production stage
FROM caddy:2-alpine AS production
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=development /app/dist /srv