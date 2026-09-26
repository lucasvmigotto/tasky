#!/bin/sh
# Generates the local TLS material for the mock-OIDC HTTPS proxy.
# Preferred: mkcert (browsers and OS trust the cert after `mkcert -install`).
# Fallback: openssl self-signed CA (browsers will warn; API still works
# because the CA is mounted into the api container — see docker-compose.yml).
# Output (gitignored): certs/mock-oidc.pem, certs/mock-oidc-key.pem,
#                      certs/mock-ca.pem (empty unless openssl fallback).
set -eu
cd "$(dirname "$0")/.."
mkdir -p certs

if command -v mkcert >/dev/null 2>&1; then
  mkcert -cert-file certs/mock-oidc.pem -key-file certs/mock-oidc-key.pem \
    localhost 127.0.0.1 ::1
  # Local CA public cert: mounted into the api container so the JVM trusts
  # the proxy on JWKS fetches (see api/docker-entrypoint.sh).
  cp "$(mkcert -CAROOT)/rootCA.pem" certs/mock-ca.pem
  echo "mock TLS ready (mkcert). Run 'mkcert -install' once so browsers trust it."
else
  openssl req -x509 -newkey rsa:2048 -sha256 -days 825 -nodes \
    -keyout certs/mock-oidc-key.pem -out certs/mock-oidc.pem \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1" 2>/dev/null
  cp certs/mock-oidc.pem certs/mock-ca.pem
  echo "mock TLS ready (openssl self-signed fallback)."
  echo "Browsers will warn; install mkcert and re-run for trusted certs."
fi
