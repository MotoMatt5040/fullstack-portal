# Builder stage for custom Caddy with plugins
FROM caddy:2-builder AS builder
RUN xcaddy build \
    --with github.com/mholt/caddy-ratelimit

# Production stage
FROM caddy:2-alpine AS production
ARG ENVIRONMENT
COPY Caddyfile${ENVIRONMENT:+.${ENVIRONMENT}} /etc/caddy/Caddyfile
COPY --from=builder /usr/bin/caddy /usr/bin/caddy