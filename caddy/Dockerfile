# Builder stage for custom Caddy with plugins
FROM caddy:2-builder AS builder
RUN xcaddy build \
    --with github.com/mholt/caddy-ratelimit \
    --with github.com/caddy-dns/cloudflare

# Security scanning stage (optional)
FROM alpine:latest AS security
RUN apk add --no-cache curl && \
    # Add any security tools you want to run
    echo "Security scan placeholder - add your tools here"

# Configuration preparation stage
FROM caddy:2-alpine AS config-prep
ARG ENVIRONMENT=production

# Copy environment-specific Caddyfile
COPY Caddyfile${ENVIRONMENT:+.${ENVIRONMENT}} /etc/caddy/Caddyfile

# Validate Caddyfile syntax
RUN caddy validate --config /etc/caddy/Caddyfile

# Create necessary directories with proper permissions
RUN mkdir -p /caddy_data /caddy_config /var/log/caddy && \
    chown -R caddy:caddy /caddy_data /caddy_config /var/log/caddy

# Final production stage
FROM caddy:2-alpine AS production

# Copy custom-built Caddy with plugins from builder stage
COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Copy validated configuration from config-prep stage
COPY --from=config-prep /etc/caddy/Caddyfile /etc/caddy/Caddyfile

# Create directories with proper permissions but don't change ownership yet
RUN mkdir -p /caddy_data /caddy_config /var/log/caddy && \
    chmod 755 /caddy_data /caddy_config /var/log/caddy

# Don't switch to non-root user yet - let's get basic functionality working
# USER caddy

EXPOSE 80
EXPOSE 443

# Simple health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD caddy version || exit 1

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]