ARG BUN_VERSION=1
ARG NGINX_VERSION=stable-alpine

FROM oven/bun:${BUN_VERSION} AS build

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

FROM nginx:${NGINX_VERSION}

ARG API_UPSTREAM=http://api:8080
ENV API_UPSTREAM=${API_UPSTREAM}
ENV NGINX_ENVSUBST_FILTER=API_UPSTREAM
ENV DEMO_MODE=false
ENV GOOGLE_CLIENT_ID=""

COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-security-headers.conf /etc/nginx/security-headers.conf
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY runtime-config.js.template /etc/tasky/runtime-config.js.template
COPY --chmod=755 40-tasky-runtime-config.sh /docker-entrypoint.d/40-tasky-runtime-config.sh

RUN rm /etc/nginx/conf.d/default.conf

COPY --from=build \
    --chown=nginx:nginx \
    /app/dist /usr/share/nginx/html

EXPOSE 8080
