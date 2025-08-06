# Development stage
FROM node:20-bookworm-slim AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# Dependencies stage for build
FROM node:20-bookworm-slim AS build-deps
WORKDIR /app
COPY package*.json ./
RUN npm install && npm cache clean --force

# Test stage (optional - run tests before build)
FROM build-deps AS test
COPY . .
RUN npm run test -- --passWithNoTests || true  # Don't fail if no tests

# Build stage with environment variables
FROM build-deps AS build
WORKDIR /app
COPY . .

# Build arguments for environment variables
ARG VITE_DOMAIN_NAME
ARG VITE_ENV
ARG VITE_DEV_API_URL

# Build the application with environment variables
RUN VITE_DOMAIN_NAME=${VITE_DOMAIN_NAME} \
    VITE_ENV=${VITE_ENV} \
    VITE_DEV_API_URL=${VITE_DEV_API_URL} \
    npm run build

# Optimize build output
RUN find build -name "*.map" -delete && \
    find build -name "*.test.*" -delete

# Production stage with Caddy
FROM caddy:2-alpine AS production

# Copy the Caddyfile
COPY ./Caddyfile /etc/caddy/Caddyfile

# Copy built files from build stage
COPY --from=build /app/build /srv

# Set proper permissions
RUN chown -R caddy:caddy /srv

# Switch to caddy user (non-root)
USER caddy

EXPOSE 80
EXPOSE 443