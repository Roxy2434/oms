FROM caddy:2-alpine
RUN mkdir -p /data/caddy /config/caddy && chown -R 1000:1000 /data /config
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY frontend /srv
USER 1000:1000
