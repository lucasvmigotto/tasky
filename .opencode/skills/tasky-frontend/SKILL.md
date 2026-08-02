---
name: tasky-frontend
description: Use when creating, fixing, or improving features in the TaskY React frontend (app/). Covers the architecture (core/api · core/auth · modules · shared), typed API client + interceptors, TanStack Query hooks, Zustand auth/org stores, demo mode (mock data), Radix UI + Tailwind 4 components, React Router 7 lazy routes, charts, Vitest + MSW tests, and the Bun/nginx build. Trigger keywords: frontend, react, componente, página, hook, apiClient, zustand, query, mock, demo, vitest, msw, tailwind, radix, vite, bun.
---

# TaskY Frontend

React 19 SPA in `app/` (TypeScript, Vite 6, Bun as package manager/runtime). Served by Nginx (`app:8080`, host port 5173) which proxies `/api/*` to the Java API.

## Architecture map

```
app/src
├── core/
│   ├── api/            apiClient.ts (typed client), interceptors.ts (401/403/429),
│   │                   types.ts (API contract), hooks/index.ts (all React Query hooks),
│   │                   msw/handlers.ts (MSW network mocks)
│   ├── auth/           authStore.ts (Zustand), permissions.ts, googleOAuth.ts,
│   │                   demoAuth.ts (mock login), authTypes.ts
│   ├── org/            OrgContext.ts (active tenant)
│   ├── config/         routes.ts (ROUTES map), runtimeConfig.ts (window.__TASKY_CONFIG__)
│   └── types/          models.ts
├── modules/            Feature pages: auth/ dashboard/ projects/ activities/ admin/
│                       calendar/ timesheet/ time-tracker/ reports/ settings/
│                       (each: pages/ + data/*.mock.ts + optional hooks/)
├── shared/             UI components (components/ui/*), charts/, layout/, lib/ (cn, dates,
│                       formatters, storage), hooks/
└── styles/             globals.css (Tailwind CSS v4)
```

## Key flows / conventions

- **State split**: server state → TanStack React Query (`core/api/hooks`); client state → Zustand (`useAuthStore`). O tenant ativo efetivo vem hoje de `authStore.activeOrg`; `OrgContext.ts` está órfão e não deve virar uma segunda fonte de verdade.
- **Typed client** (`core/api/apiClient.ts`): adiciona `Authorization: Bearer` e tenta refresh em 401. O fluxo auditado possui risco de deadlock/recursão e 429 apenas mostra toast, sem backoff real. Ao tocar autenticação, carregue `tasky-security-enterprise`. Nunca armazene access token no localStorage.
- **Data flow**: page → typed hook (`useProjects(orgId)`, `useActivityQuery({from,to})`, `useMemberships(orgId)`, …) → `apiClient.get<Response>('/...')`. New endpoint = new hook + type in `types.ts`.
- **Demo mode**: `runtimeConfig` lê `public/config.js` e `authStore.restore()` pode autenticar usuário demo. Porém as páginas atuais usam hooks da API real, os `data/*.mock.ts` estão órfãos e o MSW não é inicializado; portanto o demo não deve ser considerado completo sem implementar explicitamente mock network via MSW.
- **Google OAuth (real mode)**: `core/auth/googleOAuth.ts` — `startGoogleLogin()` redirects to Google with `response_type=id_token` (redirect_uri = `${window.location.origin}/`); `handleGoogleCallback()` parses `#id_token`, exchanges it via `POST /auth/google`, clears the hash. `authStore.restore()` calls it before the refresh flow when demo mode is off. `LoginPage` redirects to dashboard once authenticated. Backend validates via Google `tokeninfo` endpoint (any valid Google ID token is accepted).
- **Routing**: `core/config/routes.ts` is the single source; pages are lazy-loaded in `app/router.tsx`. New page → add route constant + lazy import.
- **UI**: Radix primitives wrapped in `shared/components/ui/*` (Button, Dialog, Modal, Select, Tabs, DataTable, etc.) + Tailwind 4 via `globals.css`. Use existing components — don't inline raw Radix in pages.
- **Style**: components use `class-variance-authority` + `clsx`/`tailwind-merge` (`shared/lib/cn.ts`).
- **Charts**: Recharts inside `shared/components/charts/` (ChartCard, StatCard).
- **Authz in UI**: `core/auth/permissions.ts` (canCreateActivity, canInviteRole, etc.) + guard components. Keep this matrix in sync with backend RBAC.

## Commands

```bash
cd app
bun install
bun run dev          # Vite dev server :5173, proxies /api -> http://localhost:8080
bun run build        # tsc --noEmit && vite build
bun run lint         # tsc --noEmit
bun run test         # vitest run (unit + component)
bun run test:watch
bun run test:coverage
```

## Docker / runtime

- `app/Dockerfile`: builds with `oven/bun:1` (bind-mounted sources), runs on `nginx:stable-alpine`. Nginx uses envsubst templates (`nginx.conf.template` → `/etc/nginx/conf.d/`); `nginx.conf` is the http-level config including `/etc/nginx/conf.d/*.conf`. `NGINX_ENVSUBST_FILTER=API_UPSTREAM` substitutes `API_UPSTREAM` only.
- `docker compose up -d --build app` to rebuild the SPA image.
- Config is baked at build time for `import.meta.env.*`; runtime overrides come from `public/config.js`.

## Improvement playbook (frontend)

When asked to improve/extend the frontend:

1. Encontre o módulo em `modules/`, leia páginas/hooks/componentes e confirme se qualquer mock possui consumidor antes de atualizá-lo.
2. Backend endpoint change → update `core/api/types.ts` + `core/api/hooks/index.ts` (query/mutation with `useQueryClient().invalidateQueries` on success) + `core/api/msw/handlers.ts` so tests exercise the same contract.
3. New UI → reuse `shared/components/ui/*`; if a new primitive is needed, wrap the Radix package (already installed) in the same pattern as existing ones.
4. Demo data: só atualize `*.mock.ts` se o ticket também conectar oficialmente o demo via MSW; não mantenha arquivos órfãos por obrigação fictícia.
5. Verify: `cd app && bun run lint && bun run test`. For visual/logic changes, run `bun run dev` against the Docker API (demo mode hits mock data).
6. Keep `core/auth/permissions.ts` aligned with the backend RBAC matrix.
7. Bundle: watch the >500 kB chunk warning — use dynamic `import()` / `React.lazy` for heavy modules (charts) rather than growing the main chunk.

## F1/F2 wiring (implemented)

- **New hooks** in `core/api/hooks/index.ts`: `useProject`, `useUpdateProject`, `useDeleteProject`, `useProjectAssignments`, `useCrossDepartmentAccess`/`useRemoveCrossDepartmentAccess`, `useUpdateActivity`, `useUpdateDepartment`/`useDeleteDepartment`, `useUpdateTeam`/`useDeleteTeam`, `useUpdateLabel`, `useRemoveMember`, `useChangeMembershipRole`, and time entries: `useTimeEntries`, `useTimeEntriesOrg`, `useStartTimeEntry`, `useStopTimeEntry`, `useUpdateTimeEntry`, `useDeleteTimeEntry`. `apiClient` gained `patch<T>()`. `useAllTeams(deptIds)` (via `useQueries`) fetches teams per department — `AdminTeamsPage` was broken with `useTeams(null)`.
- **`useActivityQuery`** now hits the paginated `GET /activities` (`size=5000`) and returns `res.content` — all consumers (Dashboard/Timesheet/Calendar) keep working unchanged.
- **Pages moved to real API**: `ProjectDetailPage` (project/activities/assignments), `AdminProjectsPage` (create/deactivate/delete real), `AdminDepartmentsPage`+`AdminTeamsPage` (delete real), `AdminMembersPage` (remove member + change role), `SettingsPage` (real user + membership settings), `TimeTrackerPage` (timer persisted via API, manual entry, delete), `TimesheetPage` (reads/writes `time_entries`).
- **`ActivitiesPage`**: project filter now actually loads that project (or all via `useActivityQuery`), and the kanban view renders A Fazer / Em Andamento / Concluído columns.
- **MSW handlers** cover the missing `GET /activities`, `GET /activities/:id`, project detail, assignments, and the time-entry endpoints.
- **Nginx**: `config.js` is served `Cache-Control: no-cache, no-store` (it was `immutable` for 1y — stale client IDs/`DEMO_MODE` after rebuilds). Sidebar toggle fixed: `DashboardLayout` passes `onToggle` (desktop collapse + mobile overlay close); toggle removed from the `logo` node.

## F3 (Reports — implemented)

- Backend `GET /api/v1/reports/summary?from&to` (`domain/report/ReportService` + `api/report/ReportController` + `ReportSummaryResponse`) aggregates real data: weekly hours (Mon–Sun buckets), hours per project, member productivity (hours from `time_entries` + activity count), label distribution (from activity labels), daily average, totals. `ActivityRepository.findByProject_Department_Organization_Id` added for org-scoped activity queries.
- `app/src/modules/reports/pages/ReportsPage.tsx` now uses `useReportSummary({})` (from `core/api/hooks`), with client-side color palettes and loading/empty/error states. The mock `reports.mock.ts` is no longer used.
- Caught + fixed a real bug: `updateActivity` replaced the `Activity.labels` collection on a `mappedBy`/orphanRemoval relationship, causing `JpaSystemException: A collection with orphan deletion was no longer referenced`. Fix: mutate in place via `activity.getLabels().clear()` + `add(...)`.

## Recent polish (pt-BR + UX)

- UI está **full pt-BR** (Dashboard, Projetos, Atividades, Detalhe, Admin, Calendário, etc.). Ao criar telas novas, use pt-BR.
- `useHoursMask` reescrito: aceita `0200` = 2h (1–2 dígitos = horas; 3–4 = HH:MM), sem setas de número; expõe `setDigits` e `hoursToMaskDigits(hours)`.
- Timesheet permite **editar** descrição/horas de cada registro (botão lápis → `useUpdateTimeEntry` PUT), sem deletar/recriar.
- `modules/admin/pages/AdminDashboardPage` usa dados reais (membros/projetos/depts/equipes + horas por membro via `useReportSummary` + horas por depto via `useTimeEntriesOrg`).
- `modules/dashboard/pages/AdminDashboardPage.tsx` é **órfã**. Só remover na TASK-039 depois de busca de consumidores e testes; não a use como implementação ativa.

## F4 (Clockify — implemented)

- **Timer global**: `app/src/core/tracker/timeTrackerStore.ts` (Zustand) com `start/pause/resume/stop/setEntry` + tick de 1s; widget `shared/components/layout/TimeTrackerWidget.tsx` no Topbar (iniciar via rota `/time-tracker`, pausar/continuar/parar). Pause é client-side: ao parar, grava `endTime = startTime + elapsed` (exclui pausas). `restore`/widget usa `useRunningTimeEntry()` (`GET /time-entries/running`).
- **TimeTrackerPage**: rota `/time-tracker` criada (estava órfã) + item de menu; entrada manual com pickers de **início/fim** (`type=time`); campos de **tags** (vírgula) e **billável**.
- **Clientes**: `useClients/useCreateClient/useUpdateClient/useDeleteClient`; página admin `AdminClientsPage` + rota `/admin/clients` + item de menu (manager+). Projeto com `clientId`+`hourlyRate` (create/card/detalhe).
- **Reports**: `useReportSummary`/`useReportDetailed` com filtros (`from/to/projectId/membershipId`); `downloadReportCsv()` (fetch com `Authorization` + blob); ReportsPage com seletor de período, filtros, abas Resumo/Detalhado e botão Exportar.
- **Switch org**: `useSwitchOrg()` chama `POST /auth/switch-org`; o seletor no sidebar atualiza token+activeOrg via `useAuthStore.setState`.

## Known improvement candidates

- Main bundle is ~545 kB min (174 kB gzip) → code-split charts/dashboard with lazy routes.
- `interceptors.ts` is both dynamically and statically imported (`apiClient` vs `authStore`) — Vite warns; consider exporting the refresh handler from one module.
- Only `permissions.test.ts`, `types.test.ts`, and MSW handlers have coverage; pages lack component tests.

## Execução do roadmap

Para `TASK-001` a `TASK-040`, carregue `tasky-roadmap-executor`. Use `tasky-ux-enterprise` para estados assíncronos, responsividade, DnD e acessibilidade; `tasky-quality-gate` para todo comportamento; `tasky-security-enterprise` para auth/cache tenant; e a skill de domínio correspondente.
