# syntax=docker/dockerfile:1
# Baut alle Seiten aus sites.json und liefert sie mit nginx aus.
# Coolify: Build Pack „Dockerfile“, Port 80. Optional Build-Variable BASIS_URL setzen.

# --- 1) Build: Node + cwebp/avifenc (responsive WebP- und AVIF-Bilder) ---
FROM node:20-alpine AS build
RUN apk add --no-cache libwebp-tools \
 && (apk add --no-cache libavif-apps || echo "avifenc nicht verfügbar – Bilder nur als WebP")
WORKDIR /app
COPY . .
ARG BASIS_URL=""
ENV BASIS_URL=${BASIS_URL}
# Bild-Cache bleibt zwischen Builds erhalten (BuildKit) – nur neue/geänderte Fotos werden umgewandelt
RUN --mount=type=cache,target=/app/.bildcache node build-all.js

# --- 2) Auslieferung: nur die fertigen Dateien ---
FROM nginx:1.27-alpine
COPY hosting/nginx.conf /etc/nginx/conf.d/default.conf
COPY hosting/nginx-sicherheit.conf /etc/nginx/snippets/sicherheit.conf
COPY --from=build /app/public /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/robots.txt >/dev/null || exit 1
