import http from 'k6/http';
import { check } from 'k6';

// PHASE 5 (T-K6): unauthenticated smoke baseline against local dev API.
// Seeded authenticated mix (50 RPS, p95 budgets) lands in Phase 7.
export const options = {
  stages: [
    { duration: '20s', target: 10 },
    { duration: '30s', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    // 401/403 on guarded endpoints are the asserted behavior, not failures.
    checks: ['rate==1.0'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE = __ENV.API_BASE_URL || 'http://127.0.0.1:8080';

export default function () {
  const health = http.get(`${BASE}/actuator/health`);
  check(health, {
    'health 200': (r) => r.status === 200,
    'health UP': (r) => r.body.includes('UP'),
  });

  const summary = http.get(
    `${BASE}/api/v1/reports/summary?from=2026-01-01T00:00:00Z&to=2026-02-01T00:00:00Z`
  );
  check(summary, { 'summary denies anonymous': (r) => r.status === 401 || r.status === 403 });

  const login = http.post(
    `${BASE}/api/v1/auth/oidc`,
    JSON.stringify({ provider: 'MOCK_GOOGLE', idToken: 'bogus' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(login, { 'bogus token rejected': (r) => r.status === 400 || r.status === 401 || r.status === 403 });
}
