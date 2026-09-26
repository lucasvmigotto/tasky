#!/bin/sh
set -eu

envsubst '${GOOGLE_CLIENT_ID} ${MICROSOFT_CLIENT_ID} ${MOCK_OAUTH2_ENABLED} ${MOCK_OAUTH2_URL} ${SENTRY_DSN}' \
  < /etc/tasky/runtime-config.js.template \
  > /usr/share/nginx/html/runtime-config.js
