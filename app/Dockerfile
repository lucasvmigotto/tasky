ARG BUN_VERSION=1
ARG NGINX_VERSION=stable-alpine

FROM oven/bun:${BUN_VERSION}@sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895 AS build

ARG GOOGLE_CLIENT_ID="00000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"

ENV VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}

WORKDIR /app

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=bun.lock,target=bun.lock \
    --mount=type=bind,source=src,target=src \
    --mount=type=bind,source=public,target=public \
    --mount=type=bind,source=index.html,target=index.html \
    --mount=type=bind,source=vite.config.ts,target=vite.config.ts \
    --mount=type=bind,source=tsconfig.json,target=tsconfig.json \
    --mount=type=bind,source=tsconfig.node.json,target=tsconfig.node.json \
    --mount=type=bind,source=vite-env.d.ts,target=vite-env.d.ts \
    --mount=type=bind,source=components.json,target=components.json \
    bun install --frozen-lock-file \
    && bun run build

FROM nginx:${NGINX_VERSION}@sha256:ef8676b33d681f272ba429b27658bdd7e640963279714c96bddf1dc76307f7b6

ARG API_UPSTREAM=http://api:8080
ENV API_UPSTREAM=${API_UPSTREAM}
ENV NGINX_ENVSUBST_FILTER=API_UPSTREAM
ENV DEMO_MODE=false
ENV GOOGLE_CLIENT_ID=""
ENV MICROSOFT_CLIENT_ID=""
ENV MOCK_OAUTH2_ENABLED=false
ENV MOCK_OAUTH2_URL=http://localhost:48080
ENV SENTRY_DSN=""

COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-security-headers.conf /etc/nginx/security-headers.conf
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY runtime-config.js.template /etc/tasky/runtime-config.js.template
COPY --chmod=755 40-tasky-runtime-config.sh /docker-entrypoint.d/40-tasky-runtime-config.sh

RUN rm /etc/nginx/conf.d/default.conf

COPY --from=build \
    --chown=nginx:nginx \
    /app/dist /usr/share/nginx/html

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/ > /dev/null || exit 1

EXPOSE 8080
