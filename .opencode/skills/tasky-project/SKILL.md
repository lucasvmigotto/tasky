---
name: tasky-project
description: Use for ANY work on the TaskY monorepo (api/ + app/). One-stop reference covering how to run it (Docker, public images, Google OAuth vs demo mode), full-stack architecture, RBAC matrix, commands, time-tracking and reports features, known pitfalls (Spring Boot 4 Flyway module, JWT secret base64, lazy loading, Vite chunk caching), and the improvement playbook. Trigger keywords: tasky, projeto, como rodar, rodar docker, stack, full-stack, arquitetura, mono repo, mexer no projeto, features, bugs, melhorias. Pairs with the tasky-backend and tasky-frontend skills for deeper detail.
---

# TaskY — Guia completo do projeto

Plataforma **multi-tenant de controle de horas/atividades** (estilo Clockify). Monorepo com `api/` (backend) e `app/` (frontend).

## Roadmap enterprise obrigatório

Antes de executar tickets `TASK-001` a `TASK-040`, leia `docs/ANALISE_TASKY.md` e carregue `tasky-roadmap-executor`. Use as skills especializadas `tasky-security-enterprise`, `tasky-time-enterprise`, `tasky-work-management`, `tasky-data-scale`, `tasky-ux-enterprise`, `tasky-quality-gate` e `tasky-platform-enterprise` conforme a matriz da orquestradora.

O documento de auditoria prevalece sobre descrições históricas desta skill quando tratar de vulnerabilidades e gaps. P0 bloqueia uso empresarial com dados reais.

## Stack resumida

| Camada | Tecnologia |
|---|---|
| Backend | Java 21, Spring Boot **4.0.6**, Spring Data JPA, Spring Security + JJWT (HS256), Flyway, springdoc, Testcontainers |
| Frontend | React 19, TypeScript, Vite 6, Tailwind 4, Radix UI, TanStack Query, Zustand, React Router 7, Recharts, Bun, Vitest + MSW |
| Infra | Docker Compose (api, app, db), Nginx (envsubst proxy `/api/*`), PostgreSQL 16, Google OAuth 2.0 |

## Como rodar (Docker)

```bash
cp .env.example .env      # edite GOOGLE_CLIENT_ID/SECRET (o .env NÃO vai pro git)
docker compose up -d --build
```

- App: `http://localhost:5173` · API: `http://localhost:8080` · Swagger: `http://localhost:8080/swagger-ui.html` · Health: `http://localhost:8080/actuator/health`
- DB: `localhost:5432` (tasky/tasky/tasky). Shell: `docker exec -it tasky-db psql -U tasky -d tasky`

**IMPORTANTE sobre imagens:** os Dockerfiles originais usavam o registry privado `dhi.io` (precisa login). Foram trocados por imagens públicas (`eclipse-temurin:21-jdk`/`21-jre`, `oven/bun:1`, `nginx:stable-alpine`) — **não reverter para `dhi.io`** sem credenciais. A app Dockerfile usa `--mount=type=bind` (BuildKit) e o `nginx.conf.template` vira o server block via envsubst (`NGINX_ENVSUBST_FILTER=API_UPSTREAM`).

**Rebuild de um serviço:** `docker compose up -d --build api` (ou `app`). Migrations Flyway rodam sozinhas no boot; o `api/Dockerfile` builda com `-x test` por velocidade.

## Configuração / autenticação

- **JWT_SECRET**: é **base64** (32 bytes → HS256) e vai no `.env`. `JwtTokenProvider` faz `Base64.getDecoder().decode(...)` + `Keys.hmacShaKeyFor`. Trocar exige recrear o container da API.
- **Google OAuth**: fluxo implícito (`response_type=id_token`). No Google Console registre **Authorized JavaScript origins** `http://localhost:5173` e **redirect URIs** `http://localhost:5173/`. `GOOGLE_CLIENT_ID` também vai no `app/public/config.js` (runtime config, sem cache).
- **Demo mode**: `app/public/config.js` `DEMO_MODE: 'true'` pula o login (mock user "Ana Silva"). Hoje o projeto roda em modo real.
- **Org ativa**: vem do JWT (`org_id` claim). A troca está implementada via `POST /auth/switch-org`, que reemite o token e atualiza o `authStore`; ainda exige correção de revogação/cache conforme TASK-004/TASK-005.

## Arquitetura

```
api/src/main/java/io/tasky/api
├── config/        AppConfig (Flyway bean), TaskYProperties (@ConfigurationProperties tasky.*)
├── security/      SecurityConfig, JwtAuthenticationFilter, JwtTokenProvider,
│                  GoogleTokenVerifier, PermissionService, SecurityUser
├── domain/        organization/ department/ team/ user/ membership/ project/ label/
│                  activity/ timeentry/ report/   (entidade + service + repository)
└── api/           controllers + DTOs (auth/ org/ dept/ team/ membership/ project/
                  label/ activity/ timeentry/ report/ common/)
```

```
app/src
├── core/api/      apiClient.ts (tipado), interceptors.ts (401/403/429), types.ts,
│                  hooks/index.ts (todos os hooks Query/Mutation), msw/handlers.ts
├── core/auth/     authStore.ts (Zustand), permissions.ts, googleOAuth.ts, demoAuth.ts
├── core/org/      OrgContext.ts (tenant ativo)
├── core/config/   routes.ts, runtimeConfig.ts (window.__TASKY_CONFIG__)
├── modules/       auth/ dashboard/ projects/ activities/ admin/ calendar/
│                  timesheet/ time-tracker/ reports/ settings/
└── shared/        components/ui/* (Radix), charts/, layout/, lib/ (cn, dates, formatters)
```

### Modelo de domínio (tenant = Organization)
```
Organization
  └── Department
       ├── Team
       └── Project (managerMembership)
            ├── ProjectAssignment (project_id + membership_id)
            ├── CrossDepartmentProjectAccess
            └── Activity (weight Fibonacci 1/2/3/5/8/13, DAG deps)
                 ├── ActivityLabel (composta activity_id+label_id)
                 └── ActivityDependency (parent-child)
ManagerDepartment / LeaderTeam  → escopos de gestão
TimeEntry (membership + org + project? + activity? + start/end + duration)
```

### RBAC (hierarquia: admin > manager > leader > employee)
- `admin` faz tudo; `manager` gerencia deptos/projetos (não convida admin); `leader` cria para employee/leader; `employee` só si próprio.
- **Backend**: `PermissionService` (`@Component("access")`) — `canCreateProject`, `canManageProject`, `canManageDepartment/Team`, `canInviteRole`, `canCreateActivityFor`, `isAdmin`, `getMembership(userId, orgId)`.
- **Frontend**: `core/auth/permissions.ts` (hasMinRole, canManageOrganization, etc.) — manter em sincronia com o backend.

## Comandos

```bash
# Backend (na raiz; o Docker build roda no container)
./gradlew :api:build --no-daemon -x test
./gradlew :api:test              # Testcontainers (requer Docker)

# Frontend
cd app && bun install
bun run dev                      # Vite :5173 com proxy /api -> :8080
bun run build                    # tsc --noEmit && vite build
bun run lint                     # tsc --noEmit
bun run test                     # vitest
```

> Em Windows o host pode não ter Java 21/Bun; compilar/testar via Docker (`docker compose up -d --build <svc>`) valida tsc/build.

## Fluxos de dados (front → back)

- Página → hook tipado (`useProjects(orgId)`, `useActivityQuery({from,to})`, `useTimeEntries({from,to})`, `useReportSummary({})`, ...) → `apiClient.get<T>(...)`.
- `useActivityQuery` lê o `GET /activities` **paginado** (`size=5000`) e devolve `.content`.
- Novos endpoints = novo tipo em `types.ts` + hook em `hooks/index.ts` (mutation com `useQueryClient().invalidateQueries`).
- `apiClient` tem `get/post/put/patch/delete`. Token em memória (Zustand); refresh via `POST /auth/refresh`.
- Páginas admin e dashboards consomem dados reais. Os arquivos `data/*.mock.ts` estão majoritariamente órfãos e o MSW não é inicializado globalmente; não presuma que o modo demo fornece dados completos sem validar o fluxo.

## Endpoints principais (`/api/v1`)

- **Auth**: `POST /auth/google`, `POST /auth/refresh`, `GET /auth/me`.
- **Org/Dept/Team**: `POST /organizations` (cria org + admin + 5 labels sistema), `.../departments` CRUD, `.../teams` CRUD.
- **Memberships**: `GET`/`POST invite`/`PUT {id}/settings`/`PATCH {id}/role`/`DELETE {id}` (remove bloqueia último admin).
- **Projects**: `GET/POST` org, `GET/PUT/DELETE /projects/{id}` (PUT aceita `isActive`), `.../assignments` CRUD, `.../cross-department-access` CRUD.
- **Labels**: CRUD (`PUT /labels/{id}`; sistema não deleta/altera slug).
- **Activities**: create/list/get/query paginada/update/delete/dependencies (com detecção de ciclo).
- **Time entries**: `POST /time-entries` (start), `GET /time-entries?from&to&projectId&membershipId` (próprio; manager/admin por org), `GET /time-entries/org`, `PATCH /{id}/stop`, `PUT /{id}`, `DELETE /{id}`.
- **Reports**: `GET /reports/summary?from&to&projectId&membershipId` (horas semanais/por projeto/membro/label, média, totais, `billableHours`/`nonBillableHours`), `GET /reports/detailed?...`, `GET /reports/export?...` (CSV).

## Armadilhas conhecidas (lições aprendidas — respeitar!)

1. **Spring Boot 4 é modularizado**: Flyway não está no `spring-boot-autoconfigure`. É preciso a dependência `org.springframework.boot:spring-boot-flyway` (já no `api/build.gradle`) **e** `spring.flyway.enabled: true` nos 3 `application*.yml`. Remover/desligar = boot falha com "Schema validation: missing table [activities]".
2. **`ddl-auto: validate`**: schema vem só das migrations `db/migration/`. Nova coluna/tabela = nova migration `V{n}__nome.sql` (não editar aplicadas).
3. **Lazy loading**: `open-in-view` desligado. Alguns controllers estão `@Transactional` e associações de membership estão EAGER como correções históricas, mas isso é dívida técnica. Para código novo, mapeie DTO/projection dentro do service transacional; não transforme associação em EAGER nem abra transação no controller automaticamente.
4. **`@NotBlank` só vale para String** — em `UUID`/numérico use `@NotNull` (senão `UnexpectedTypeException` 500).
5. **JWT**: `JWT_SECRET` base64; tokens HS256. Para testar a API com curl, gere o token com o JJWT e o secret **exato do `.env`** (não confie em cópia manual — leia do arquivo). `SecurityUser` é um **record** → use `user.id()`/`user.email()`, não `getId()`.
6. **Coleção `@OneToMany(mappedBy)` com `orphanRemoval`**: NÃO substitua com `setLabels(novoSet)` (dá `JpaSystemException: collection with orphan deletion no longer referenced`). Use `getLabels().clear()` + `add(...)`.
7. **Coleções lazy em DTOs** (`TimeEntry.tags`, `Activity.labels`): `getTags()` retorna a coleção SEM inicializar; se o record guardar a referência, o Jackson serializa depois da transação → `LazyInitializationException`. **Copie para `new ArrayList<>(...)` no mapeamento**, dentro da transação.
8. **Vite + nginx**: assets com hash são `immutable` (1 ano); `index.html` e `config.js` são **no-cache** (`location = /index.html` e `location = /`). `config.js` ficou `immutable` por engano antes (navegador segurava client ID/DEMO_MODE velhos). Router usa `lazyWithRetry` (auto-reload se chunk falhar após deploy).
9. **`.gitattributes`**: `gradlew text eol=lf` (CRLF quebra no container Linux).
10. **JWT org**: `TimeEntryController` e `ReportController` usam `user.activeOrganizationId()` do token; token sem `org_id` dá 403 "Not a member".
11. **Payload JSON no PowerShell/curl**: use `--data @arquivo.json` (aspas inline são mangled); arrays de headers `-H $array` quebram.

## Padrões de código

- **Backend**: Controller fino → Service `@Transactional` → Repository. DTOs = records em `api/<recurso>/`. Erros: `IllegalArgumentException` → 400, `SecurityException` → 403, `GlobalExceptionHandler` loga exceção não tratada (`log.error`).
- **Frontend**: página → hook tipado → componente `shared/components/ui/*`. Estado servidor = React Query; estado cliente = Zustand. pt-BR na UI. Horas em máscara `HH:MM` (`useHoursMask`, aceita `0200` = 2h).

## Features atuais (entregues)

### Time tracking estilo Clockify (Fase A)
- **Timer global** no Topbar (`TimeTrackerWidget`): mostra `HH:MM:SS`, **pausar/continuar/parar** de qualquer tela. Estado global em `app/src/core/tracker/timeTrackerStore.ts` (Zustand) — `start/pause/resume/stop/setEntry`.
- Pause/Resume **client-side**: o relógio pausa localmente e, ao parar, grava `endTime = startTime + elapsed` (exclui o tempo pausado). A entrada continua "rodando" no servidor até salvar.
- **Recuperar timer pendente**: `GET /time-entries/running` retorna a entrada com `endTime=null`; o widget retoma ao abrir.
- **Entrada manual com início/fim reais** (pickers `type=time`) no TimeTrackerPage (antes fixo 09:00).
- Rota `/time-tracker` adicionada (a página estava órfã) + item "Registro de Tempo" no menu.

### Clients / Tags / Billable / Archive (Fase B)
- Migration `V4__clients_tags.sql`: tabela `clients` (org), `projects.client_id` + `projects.hourly_rate`, `time_entry_tags` (ElementCollection).
- **Clientes**: entidade + `ClientController` (`GET/POST/PUT/DELETE /organizations/{orgId}/clients`; admin/manager). Página admin **Clientes** + item no menu.
- **Projetos**: `clientId` + `hourlyRate` no create/update/response; exibidos no card e no detalhe.
- **Time entries**: campo `tags` (array) + `billable` no create/update/response; UI com tags (vírgula) e checkbox billável no TimeTracker.
- **Archive** = `isActive=false` (já existia).

### Relatórios completos (Fase C)
- `GET /reports/summary` com **filtros** (`projectId`, `membershipId`) + `billableHours`/`nonBillableHours`.
- `GET /reports/detailed?...` → lista detalhada (projeto, membro, descrição, horário, horas, billable, tags).
- `GET /reports/export?...` → **CSV** (`Content-Disposition: attachment`).
- ReportsPage: seletor de período, filtros projeto/membro, abas **Resumo/Detalhado**, botão **Exportar CSV** (`downloadReportCsv`).

### Trocar org ativa (Fase D)
- `POST /auth/switch-org { orgId }` → valida membership, **re-emite JWT** com nova `org_id`/`role`, retorna `{ token, org }`.
- Seletor de org no sidebar chama o switch e atualiza `authStore` (token + activeOrg).

### Base (entregue nas fases anteriores)
- **Atividades**: criação, dependências DAG (árvore), kanban (A Fazer/Em Andamento/Concluído), edição.
- **Admin**: membros (convidar, role, remover, limite diário), depts/teams/projetos (CRUD), labels, clientes.
- **TimesheetPage** (grade semanal lendo/gravando `time_entries`, com edição de descrição/horas), dashboards, Google OAuth, multi-org, UI pt-BR.

## Playbook de melhorias

Ao implementar algo novo:
1. Leia o módulo/pacote correspondente para espelhar o padrão (hook + tipo + página / controller + service + DTO).
2. Dado novo → migration Flyway `V{n}`; se for associação mapeada fora da tx, ajuste lazy/@Transactional.
3. Authz: use `PermissionService` no backend, queries tenant-aware e testes negativos cross-tenant. `permissions.ts` serve apenas para UX.
4. Sincronize `types.ts` + `hooks/index.ts` + `msw/handlers.ts` (contrato de testes).
5. Valide: `docker compose up -d --build api|app` e, se possível, `./gradlew :api:test` / `cd app && bun run test`.
6. Mantenha a UI em **pt-BR**.

## Sugestões pendentes / gaps conhecidos

- **Criar organização pela UI** (hoje só via `POST /organizations` — criei uma org de teste "TaskY Labs" no ambiente).
- Status de atividade explícito (todo/doing/done), notificações, comentários/anexos, aprovações de timesheet, idle detection.
- `getActivitiesByDateRange` filtra em memória (`findAll()`) → mover para `@Query` com paging.
- `GoogleTokenVerifier` não valida `aud`/client_id (aceita qualquer id_token Google válido).
- Component-id embeddables (`ManagerDepartment$Id`, `LeaderTeam$Id`, `ActivityLabel`) sem `equals/hashCode` (warning HHH000038).
- Bundle principal ~545 kB → code-split de gráficos.
