# Only used in production
FROM caddy:2-builder AS builder

RUN xcaddy build \
    --with github.com/mholt/caddy-ratelimit

FROM caddy:2-alpine
ARG ENVIRONMENT

COPY Caddyfile${ENVIRONMENT:+.${ENVIRONMENT}} /etc/caddy/Caddyfile
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
# COPY Caddyfile /etc/caddy/Caddyfile
# COPY --from=builder /usr/bin/caddy /usr/bin/caddy