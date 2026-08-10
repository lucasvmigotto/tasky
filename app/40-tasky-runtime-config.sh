#!/bin/sh
set -eu

envsubst '${DEMO_MODE} ${GOOGLE_CLIENT_ID}' \
  < /etc/tasky/runtime-config.js.template \
  > /usr/share/nginx/html/runtime-config.js
