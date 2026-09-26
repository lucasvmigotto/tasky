import type { DocsContent } from '../types'

export const en: DocsContent = {
  ui: {
    siteName: 'TaskY',
    siteTagline: 'Work, projects and hours for internal teams',
    skipToContent: 'Skip to content',
    menu: 'Menu',
    close: 'Close',
    search: 'Search',
    searchPlaceholder: 'Search the documentation…',
    searchNoResults: 'No results.',
    language: 'Language',
    theme: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    breadcrumbHome: 'Home',
    onThisPage: 'On this page',
    version: 'Version',
    footerNote: 'Documentation generated from the project code, tests and specifications.',
    maturityLabels: {
      implemented: 'Implemented',
      partial: 'Partially implemented',
      planned: 'Planned',
      unavailable: 'Unavailable',
      upstream: 'Upstream limitation',
      na: 'Not applicable',
    },
    groupLabels: {
      start: 'Start',
      understand: 'Understand',
      operate: 'Operate',
      status: 'Status',
    },
    notFoundTitle: 'Page not found',
    notFoundText: 'The address you followed does not exist in this documentation.',
    backHome: 'Back home',
  },
  pages: {
    overview: {
      id: 'overview',
      title: 'Overview',
      summary: 'What TaskY is, who it serves, and which capabilities are actually implemented.',
      maturity: 'implemented',
      sections: [
        {
          id: 'what',
          heading: 'What TaskY is',
          blocks: [
            {
              kind: 'p',
              text: 'TaskY is a web application for internal work management: projects, activities, cross-department requests, time tracking and reports. Authentication uses OIDC providers (Google, Microsoft Entra ID, or the local development mock), and all data is isolated per organization (tenant).',
            },
            {
              kind: 'ul',
              items: [
                'Audience: internal teams — employees, department managers and administrators.',
                'Deployment model: Spring Boot monolith + React SPA, PostgreSQL, Redis (optional cache) and S3/MinIO object storage.',
                'Interface language: Brazilian Portuguese.',
              ],
            },
          ],
        },
        {
          id: 'capabilities',
          heading: 'Capabilities',
          maturity: 'implemented',
          blocks: [
            {
              kind: 'table',
              headers: ['Area', 'What exists today'],
              rows: [
                [
                  'Authentication',
                  'OIDC login (code flow with PKCE), short JWT + rotating refresh per family, organization switching, admin/manager/employee roles.',
                ],
                [
                  'Structure',
                  'Organizations, departments, members, member types, invitations auto-accepted on login.',
                ],
                [
                  'Projects',
                  'Projects per department, canonical columns, member assignments, cross-department access.',
                ],
                [
                  'Activities',
                  'Activities with status, priority, Fibonacci weight, subtasks, dependencies, comments, checklists and attachments.',
                ],
                ['Time', 'Timer (start/pause/resume/stop), manual entry, billing, entry approval.'],
                [
                  'Timesheet',
                  'Weekly periods with a draft → submitted → approved/rejected → locked lifecycle and an approval queue.',
                ],
                [
                  'Reports',
                  'Summaries and aggregations by project/day/member/department with CSV, XLSX and PDF export.',
                ],
                [
                  'Requests',
                  'Internal cross-department requests with a key, priority, assignees and a GLPI link.',
                ],
                [
                  'Notifications',
                  'Notification inbox, mentions, per-type preferences and scheduled reminders.',
                ],
                ['Governance', 'Audit trail, LGPD export and deletion, global/organization/user settings.'],
              ],
            },
            {
              kind: 'shot',
              src: './screenshots/my-work.png',
              alt: 'My Work screen with open task counts, weekly hours and an execution queue.',
              caption: 'The work home screen, shown with synthetic development data.',
            },
            {
              kind: 'shot',
              src: './screenshots/login.png',
              alt: 'Login screen with the available providers and the local (mock) option.',
              caption: 'Sign-in through OIDC providers; development also has the local mock provider.',
            },
          ],
        },
        {
          id: 'maturity',
          heading: 'How to read status labels',
          blocks: [
            {
              kind: 'p',
              text: 'Every page and section carries a status label, so intent (a specification) is never confused with delivered behavior (the code).',
            },
            {
              kind: 'ul',
              items: [
                'Implemented — behaves this way in the current code, verified by tests.',
                'Partially implemented — the main path exists, known parts are missing.',
                'Planned — specified, not built yet.',
                'Unavailable — does not exist and no near-term plan.',
                'Upstream limitation — depends on a provider or environment outside the project.',
                'Not applicable — the category does not apply to this project.',
              ],
            },
          ],
        },
      ],
    },

    'getting-started': {
      id: 'getting-started',
      title: 'Getting started',
      summary:
        'Bringing up the local environment, with or without the mock OIDC provider and synthetic data.',
      maturity: 'implemented',
      sections: [
        {
          id: 'prereqs',
          heading: 'Prerequisites',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Podman (or Docker) with compose; the project prefers Podman.',
                'Java 25 and Bun — or just the containers, which already pin the versions.',
                'openssl and preferably mkcert for the local OIDC provider certificate.',
              ],
            },
          ],
        },
        {
          id: 'quickstart',
          heading: 'Bring up the local stack',
          blocks: [
            {
              kind: 'code',
              lang: 'bash',
              caption: 'Development environment step by step',
              code: `cp .env.example .env
openssl rand -base64 32   # use the output as JWT_SECRET in .env
./scripts/gen-mock-tls.sh # TLS certificate for the local OIDC provider
podman compose up -d --build`,
            },
            {
              kind: 'p',
              text: 'The single development stack starts api, app, db (PostgreSQL 18), redis, minio and mock-oauth2 behind a TLS proxy (NGINX). The app is at http://localhost:5173 and the API at http://localhost:8080.',
            },
          ],
        },
        {
          id: 'seed',
          heading: 'Synthetic development data',
          maturity: 'implemented',
          blocks: [
            {
              kind: 'p',
              text: 'An optional seeder creates a deterministic synthetic dataset on first start, useful for development and screenshot capture. It is idempotent (a marker row in app_settings) and never runs under the production profile.',
            },
            {
              kind: 'code',
              lang: 'bash',
              caption: 'Available profiles (medium is the default)',
              code: `TASKY_SEED_DATA=true TASKY_SEED_PROFILE=medium   # ~25 users, ~2k entries
TASKY_SEED_DATA=true TASKY_SEED_PROFILE=large    # ~100 users, ~16k entries`,
            },
          ],
        },
        {
          id: 'verify',
          heading: 'Main checks',
          blocks: [
            {
              kind: 'code',
              lang: 'bash',
              caption: 'Backend and frontend',
              code: `./gradlew :api:test :api:build --no-daemon
cd app && bun install --frozen-lockfile && bun run lint && bun run test && bun run build`,
            },
            {
              kind: 'p',
              text: 'Conventions: the backend uses Flyway (every schema change needs a new migration); the frontend uses the real API and MSW only for automated tests; the tenant and role always come from the JWT, never from the client body.',
            },
          ],
        },
      ],
    },

    architecture: {
      id: 'architecture',
      title: 'Architecture',
      summary: 'Topology, API style, data, cache and deployment boundaries.',
      maturity: 'implemented',
      sections: [
        {
          id: 'shape',
          heading: 'System shape',
          blocks: [
            {
              kind: 'p',
              text: 'A Spring Boot monolith (Java 25) exposes a versioned REST API at /api/v1 and serves the built React SPA. PostgreSQL 18 is the source of truth; Redis is an optional cache that fails open; MinIO provides S3-compatible storage.',
            },
            {
              kind: 'code',
              lang: 'text',
              caption: 'Component view',
              code: `Browser ──► app (Nginx/SPA) ──► api (Spring Boot) ──► PostgreSQL
                                     │                 └─► Redis (optional cache)
                                     └─► MinIO / S3 (files)
      api ──► OIDC IdP (Google / Microsoft / local mock)`,
            },
          ],
        },
        {
          id: 'api-style',
          heading: 'API style and errors',
          blocks: [
            {
              kind: 'ul',
              items: [
                'REST with JSON; operations grouped by resource, scoped per organization.',
                'Errors use RFC 9457 (ProblemDetail) with a readable code and a traceId.',
                'Optimistic concurrency: @Version + expectedVersion yield 409 on conflict.',
                'Pagination when a collection can grow; report pages capped at 500 rows.',
              ],
            },
          ],
        },
        {
          id: 'consistency',
          heading: 'Consistency and concurrency',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Only one running timer per member: a partial unique index on time_entries.',
                'No overlapping entries: an EXCLUDE constraint over the time range.',
                'Refresh rotation with FAMILIES: token reuse revokes the whole family (theft signal).',
                'Cache never decides security; a Redis outage only makes things slower.',
              ],
            },
          ],
        },
        {
          id: 'decisions',
          heading: 'Recorded decisions',
          blocks: [
            {
              kind: 'p',
              text: 'Architecture decisions live in docs/adr/ in the repository. This documentation summarises the current state; the decision records keep the why.',
            },
          ],
        },
      ],
    },

    domain: {
      id: 'domain',
      title: 'Domain model',
      summary: 'Domain concepts, invariants and lifecycles.',
      maturity: 'implemented',
      sections: [
        {
          id: 'concepts',
          heading: 'Core concepts',
          blocks: [
            {
              kind: 'table',
              headers: ['Concept', 'Description'],
              rows: [
                ['Organization', 'Root tenant; defines time zone and week start day.'],
                [
                  'Member',
                  'A user within an organization, with a role (admin, manager, employee) and a primary department.',
                ],
                ['Department', 'Internal sector; groups projects and defines visibility scope.'],
                ['Project', 'Belongs to a department; holds canonical columns and activities.'],
                [
                  'Activity',
                  'Unit of work with status, priority, weight and assignees; may have subtasks and dependencies.',
                ],
                ['Time entry', 'A time record (timer or manual) with an approval state.'],
                ['Period', 'A canonical timesheet week with its own lifecycle.'],
                ['Request', 'A cross-department request, with a key and an optional GLPI link.'],
              ],
            },
          ],
        },
        {
          id: 'lifecycles',
          heading: 'Lifecycles',
          blocks: [
            {
              kind: 'code',
              lang: 'text',
              caption: 'Timesheet period',
              code: 'DRAFT ──► SUBMITTED ──► APPROVED ──► LOCKED\n   ▲            │\n   └── REJECTED ◄┘',
            },
            {
              kind: 'p',
              text: 'A rejected period returns to draft and can be resubmitted. Only administrators reopen a locked period. Time entries in a locked period cannot be modified.',
            },
            {
              kind: 'code',
              lang: 'text',
              caption: 'Time entry',
              code: 'DRAFT ──► SUBMITTED ──► APPROVED\n   ▲            │\n   └── REJECTED ◄┘',
            },
          ],
        },
        {
          id: 'invariants',
          heading: 'Invariants',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Every command is scoped per organization; cross-tenant access fails closed.',
                'Only one running timer exists per member.',
                'Entries of the same member never overlap.',
                'Time is authoritative on the server, never on the client clock.',
                'Hours and money are aggregated in SQL (GROUP BY), not in memory.',
              ],
            },
          ],
        },
      ],
    },

    features: {
      id: 'features',
      title: 'Features',
      summary: 'What each area does today, with evidence in the code.',
      maturity: 'implemented',
      sections: [
        {
          id: 'planning',
          heading: 'Work planning',
          blocks: [
            {
              kind: 'p',
              text: 'Projects group activities per department. Activities carry status, priority, Fibonacci weight, subtasks (up to 5 levels), acyclic dependencies, comments with mentions and checklists.',
            },
          ],
        },
        {
          id: 'time',
          heading: 'Time tracking',
          blocks: [
            {
              kind: 'p',
              text: 'The timer has start, pause, resume and stop; paused time is discounted. There is also manual entry with a date and time range. Each entry snapshots its billing and cost rates.',
            },
            {
              kind: 'shot',
              src: './screenshots/time-tracker.png',
              alt: 'Time entry screen with a quick timer and the entry list.',
              caption: 'Time tracking with timer and manual entry.',
            },
          ],
        },
        {
          id: 'timesheet',
          heading: 'Timesheet and approval',
          blocks: [
            {
              kind: 'p',
              text: 'The week is shown as a grid, and the period bar lets you open, submit, reopen and close the week. Managers and administrators use the approval queue to approve or reject with a mandatory comment.',
            },
            {
              kind: 'shot',
              src: './screenshots/timesheet.png',
              alt: 'Weekly timesheet with the period bar and the project grid.',
              caption: 'Weekly timesheet with the period bar.',
            },
            {
              kind: 'shot',
              src: './screenshots/approval-queue.png',
              alt: 'Approval queue with pending weeks and approve/reject actions.',
              caption: 'Approval queue for managers.',
            },
          ],
        },
        {
          id: 'reports',
          heading: 'Reports and export',
          blocks: [
            {
              kind: 'p',
              text: 'Summaries and aggregations by project, day, member and department feed charts and tables, with CSV export (synchronous) and XLSX and PDF export (asynchronous, via a background worker).',
            },
            {
              kind: 'shot',
              src: './screenshots/reports.png',
              alt: 'Report with total-hours cards and charts by day and by project.',
              caption: 'Report with aggregations and export.',
            },
          ],
        },
        {
          id: 'more',
          heading: 'Requests, departments and notifications',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Internal cross-department requests, with a per-year sequential key and priority.',
                'A department view for managers: queue, arrivals, workload and recent activities.',
                'Notifications with mentions, per-type preferences and scheduled reminders (30s polling).',
              ],
            },
          ],
        },
      ],
    },

    'security-privacy': {
      id: 'security-privacy',
      title: 'Security and privacy',
      summary: 'Authentication, tenant isolation, auditing and LGPD.',
      maturity: 'implemented',
      sections: [
        {
          id: 'auth',
          heading: 'Authentication',
          blocks: [
            {
              kind: 'ul',
              items: [
                'OIDC with code flow and PKCE (S256) for Google and Microsoft Entra ID; the local mock uses the same flow.',
                'Short access JWT + refresh token in an HttpOnly cookie, with per-family rotation.',
                'Refresh reuse revokes the family (theft detection); a 30-day absolute family lifetime.',
                'Organization switching issues a new token without requiring a new login.',
              ],
            },
          ],
        },
        {
          id: 'tenancy',
          heading: 'Tenant isolation',
          blocks: [
            {
              kind: 'p',
              text: 'Every query and command uses the organization from the JWT. Cross-tenant access fails closed, and there are dedicated negative tests for each sensitive endpoint.',
            },
          ],
        },
        {
          id: 'audit-lgpd',
          heading: 'Auditing and LGPD',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Sensitive actions (login, sessions, roles, timesheet lifecycle, exports) are recorded in the audit trail.',
                'Per-member data export, on an LGPD basis, and administrative deletion with confirmation.',
                'Uploads are treated as untrusted bytes: random prefix, extension/MIME/size policy and image metadata stripping.',
              ],
            },
          ],
        },
      ],
    },

    api: {
      id: 'api',
      title: 'API reference',
      summary: 'The OpenAPI contract and the conventions of the versioned REST API.',
      maturity: 'implemented',
      sections: [
        {
          id: 'contract',
          heading: 'Contract',
          blocks: [
            {
              kind: 'p',
              text: 'The canonical contract is contracts/openapi.yaml, generated from the code (springdoc) and checked for drift against the frontend types. Under the development profile the interactive documentation is at /swagger-ui.html.',
            },
            {
              kind: 'code',
              lang: 'bash',
              caption: 'Check for contract drift',
              code: 'API_BASE_URL=http://127.0.0.1:8080 ./scripts/check-openapi-contract.sh',
            },
          ],
        },
        {
          id: 'conventions',
          heading: 'Conventions',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Prefix /api/v1; resources scoped per organization.',
                'RFC 9457 errors with a code and traceId.',
                'Concurrency conflicts return 409; validation returns 400.',
                'The operations actually served are the source of truth for this document; anything merely specified appears as Planned.',
              ],
            },
          ],
        },
      ],
    },

    testing: {
      id: 'testing',
      title: 'Testing and quality',
      summary: 'Test layers, environments and the quality gates.',
      maturity: 'implemented',
      sections: [
        {
          id: 'layers',
          heading: 'Layers',
          blocks: [
            {
              kind: 'table',
              headers: ['Layer', 'Tool', 'Scope'],
              rows: [
                ['Backend (unit)', 'JUnit + Mockito', 'pure functions: pause math, transitions'],
                [
                  'Backend (integration)',
                  'Testcontainers (PostgreSQL)',
                  'concurrency, lifecycles, query counts',
                ],
                ['Frontend (unit)', 'vitest + MSW', 'stores, hooks, race handling'],
                ['Frontend (types)', 'tsc --noEmit', 'the whole application'],
                ['End to end', 'Playwright', 'login, timesheet, timer journey'],
                ['Contract', 'script vs /api-docs', 'covered schemas'],
              ],
            },
          ],
        },
        {
          id: 'gates',
          heading: 'Gates',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Backend and frontend suites must pass in full.',
                'Contract check with no drift in the covered schemas.',
                'Automated accessibility tests (axe) on the main pages.',
                'Never weaken CI or security just to make something pass.',
              ],
            },
          ],
        },
      ],
    },

    deployment: {
      id: 'deployment',
      title: 'Deployment',
      summary: 'Packaging, environments and what is still missing for production.',
      maturity: 'partial',
      sections: [
        {
          id: 'packaging',
          heading: 'Packaging',
          blocks: [
            {
              kind: 'ul',
              items: [
                'The API is an executable Spring Boot jar, shipped in a digest-pinned JRE image running as non-root.',
                'The frontend is served by NGINX from the static build, with security headers and content-hash caching.',
                'This documentation ships as a static site (Cloudflare R2) and as a multi-stage NGINX image.',
              ],
            },
          ],
        },
        {
          id: 'env',
          heading: 'Environments',
          blocks: [
            {
              kind: 'p',
              text: 'The docker-compose.yml file is development-only. Production uses a separate approach with TLS, secret management, observability and high availability — not yet provided by this repository.',
            },
            {
              kind: 'callout',
              tone: 'warning',
              title: 'Not yet a complete production platform',
              text: 'There is no edge TLS, managed ingress, secret manager, high availability, observability or automated rollback ready. The production compose is a baseline, not the finished platform.',
            },
          ],
        },
        {
          id: 'ops',
          heading: 'Operations',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Backup/restore: docs/runbooks/backup-restore.md.',
                'Observability and alerting: docs/observability/.',
                'LGPD: docs/governance/lgpd.md.',
                'Accessibility: docs/quality/accessibility.md.',
              ],
            },
          ],
        },
      ],
    },

    roadmap: {
      id: 'roadmap',
      title: 'Roadmap',
      summary: 'What is specified and not yet built.',
      maturity: 'planned',
      sections: [
        {
          id: 'note',
          heading: 'How to read this page',
          blocks: [
            {
              kind: 'p',
              text: 'Everything on this page is Planned — specified, but not yet implemented in the code. Do not treat it as current behavior.',
            },
          ],
        },
        {
          id: 'planned',
          heading: 'Planned items',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Verifying the S3/MinIO path outside the development compose.',
                'Push notifications via a service worker + VAPID (events already prepared).',
                'Period reopening with partial semantics and a decision record.',
                'Full-text ranked search (trigram/GIN) and saved searches.',
                'Audit retention/purge with an immutable (WORM) option.',
              ],
            },
          ],
        },
      ],
    },

    limitations: {
      id: 'limitations',
      title: 'Limitations',
      summary: 'What is not ready yet, or only partial.',
      maturity: 'partial',
      sections: [
        {
          id: 'active',
          heading: 'Active limitations',
          blocks: [
            {
              kind: 'table',
              headers: ['Item', 'Status', 'Note'],
              rows: [
                ['Antivirus scanning of uploads', 'Planned', 'no malware scanning yet.'],
                ['End-to-end coverage', 'Partial', 'the timer journey is covered; other flows are not.'],
                ['Object backup', 'Partial', 'the PostgreSQL dump does not cover local-disk blobs.'],
                ['Production platform', 'Partial', 'no edge TLS, HA or observability packaged.'],
              ],
            },
          ],
        },
        {
          id: 'external',
          heading: 'Upstream limitations',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Google/Microsoft identity verification depends on the real providers; development uses the mock.',
                'The real OIDC providers require HTTPS and registered clients; only the mock provider is pre-configured.',
              ],
            },
          ],
        },
      ],
    },
  },
}
