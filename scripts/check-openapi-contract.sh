#!/bin/sh
# PHASE 5 (T-CONTRACT): fail on drift between backend DTOs (springdoc) and
# the frontend contract (app/src/core/api/types.ts) for covered schemas.
# Usage: API_BASE_URL=http://127.0.0.1:8080 ./scripts/check-openapi-contract.sh
set -eu
BASE="${API_BASE_URL:-http://127.0.0.1:8080}"
curl -sf "$BASE/api-docs" -o /tmp/tasky-openapi.json
python3 - "$BASE" <<'EOF'
import json, sys, re

base = sys.argv[1]
spec = json.load(open('/tmp/tasky-openapi.json'))
schemas = spec.get('components', {}).get('schemas', {})
ts = open('app/src/core/api/types.ts').read()

def ts_fields(interface):
    m = re.search(r'export interface %s \{(.*?)\n\}' % interface, ts, flags=re.S)
    assert m, f"TS interface {interface} not found"
    fields = []
    for line in m.group(1).splitlines():
        line = line.strip()
        if not line or line.startswith('//'):
            continue
        name = re.split(r'[:?]', line, maxsplit=1)[0].strip()
        if name:
            fields.append(name.rstrip('?'))
    return fields

COVERED = ['TimeEntryResponse', 'UpdateTimeEntryRequest', 'ProjectResponse',
           'UpdateProjectRequest', 'OidcAuthRequest', 'AuthResponse']
failures = []
for name in COVERED:
    schema = schemas.get(name)
    if schema is None:
        failures.append(f"{name}: missing from OpenAPI (served at {base}/api-docs)")
        continue
    props = set((schema.get('properties') or {}).keys())
    for field in ts_fields(name):
        if field not in props:
            failures.append(f"{name}: TS field '{field}' missing from OpenAPI schema")

if failures:
    print("CONTRACT DRIFT:")
    for f in failures:
        print(" -", f)
    sys.exit(1)
print(f"contract OK: {len(COVERED)} schemas match {base}/api-docs")
EOF
