#!/bin/sh
# Adds an optional extra CA (e.g. the local mkcert CA for the mock-OIDC
# HTTPS proxy) to a throwaway copy of the JVM trust store. Prod is
# unaffected: without /certs/mock-ca.pem this is a plain exec.
set -eu

TRUST_OPTS=""
if [ -f /certs/mock-ca.pem ]; then
  cp "$JAVA_HOME/lib/security/cacerts" /tmp/cacerts-with-mock
  keytool -importcert -trustcacerts -noprompt -alias mock-oidc-ca \
    -file /certs/mock-ca.pem \
    -keystore /tmp/cacerts-with-mock -storepass changeit >/dev/null
  TRUST_OPTS="-Djavax.net.ssl.trustStore=/tmp/cacerts-with-mock -Djavax.net.ssl.trustStorePassword=changeit"
  echo "trust store: mock OIDC CA added"
fi

# shellcheck disable=SC2086
exec java $TRUST_OPTS "$@"
