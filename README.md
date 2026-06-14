# TaskY ✦

Multi-tenant Time Activities platform. Monorepo with Java API backend and React frontend.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Authentication & Authorization](#authentication--authorization)
- [Data Structures](#data-structures)
- [API Endpoints](#api-endpoints)
- [Configuration Reference](#configuration-reference)
- [Docker Images](#docker-images)
- [CI/CD](#cicd)
- [Testing Strategy](#testing-strategy)
- [Quick Start](#quick-start)
- [Contributors](#contributors)

---

## System Architecture

### Full System Diagram

```
+----------------------------------------------------------------+
|                    React SPA (Bun/Vite)                         |
|                                                                |
|  Auth Store (Zustand)  Org Context (Zustand)  Permission Guards |
|          |                     |                      |        |
|  +-----------------------------------------------------------+  |
|  |              TanStack React Query (Server State)           |  |
|  |  +----------------------------------------------------+   |  |
|  |  |         Typed API Client (apiClient.ts)              |   |  |
|  |  |  Interceptors:                                       |   |  |
|  |  |  o Bearer token (in-memory) / refresh cookie         |   |  |
|  |  |  o 401 -> refresh -> retry                           |   |  |
|  |  |  o 403 -> toast + redirect                           |   |  |
|  |  |  o 429 -> exponential backoff                        |   |  |
|  |  |  o X-Org-Id header (tenant scoping)                  |   |  |
|  |  +------------------------+----------------------------+   |  |
|  +---------------------------+-------------------------------+  |
|                              |                                  |
+------------------------------+----------------------------------+
                               | HTTP (proxy: /api/*)
                               v
+----------------------------------------------------------------+
|              Nginx Reverse Proxy + Security Headers               |
|  /api/* -> http://api:8080/api/*                                 |
|  /*     -> SPA static files                                      |
+------------------------------------------------------------------+
                               |
                               v
+----------------------------------------------------------------+
|               Spring Boot API (api:8080)                        |
|  JWT Auth Filter -> Permission Service -> Controllers            |
|       -> Services -> JPA -> PostgreSQL 16                        |
+------------------------------------------------------------------+
```

### Backend Domain Model

```
Organization (tenant boundary)
  └── Department
       ├── Team
       └── Project (managed by a manager)
            ├── ProjectAssignment (employee assignments)
            ├── CrossDepartmentProjectAccess
            └── Activity (Fibonacci weight, DAG dependencies)
                 ├── ActivityLabel
                 └── ActivityDependency (parent-child)
```

**Roles (strict hierarchy):** `admin` > `manager` > `leader` > `employee`

### Frontend Flow

```
Client (Browser)
  └── Nginx (reverse proxy)
       ├── /api/* → Java API (api:8080)
       └── /*     → React SPA (static files)
```

---

## Project Structure

```
.
├── api/                                  # Java backend
│   ├── src/main/java/io/tasky/api/
│   │   ├── config/                       # AppConfig, TaskYProperties
│   │   ├── security/                     # JWT, OAuth, RBAC, filters
│   │   ├── domain/                       # Entities, Services, Repositories
│   │   │   ├── organization/
│   │   │   ├── department/
│   │   │   ├── team/
│   │   │   ├── user/
│   │   │   ├── membership/
│   │   │   ├── project/
│   │   │   ├── label/
│   │   │   └── activity/
│   │   └── api/                          # REST controllers + DTOs
│   │       ├── auth/
│   │       ├── organization/
│   │       ├── department/
│   │       ├── team/
│   │       ├── membership/
│   │       ├── project/
│   │       ├── label/
│   │       └── activity/
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/                 # Flyway migrations
│   ├── src/test/
│   ├── build.gradle
│   └── Dockerfile
├── app/                                  # React frontend
│   ├── src/
│   │   ├── core/
│   │   │   ├── api/                      # Typed client, hooks, interceptors, MSW handlers
│   │   │   ├── auth/                     # Zustand store, permissions, Google OAuth
│   │   │   ├── org/                      # Tenant context provider
│   │   │   ├── config/                   # Routes, runtime config
│   │   │   └── types/                    # Domain models
│   │   ├── modules/                      # Feature modules
│   │   │   ├── auth/                     # Login page
│   │   │   ├── dashboard/                # User + Admin dashboards
│   │   │   ├── projects/                 # List, detail
│   │   │   ├── activities/               # List, detail, Gantt, dependency tree
│   │   │   ├── admin/                    # Members, Departments, Teams, Labels
│   │   │   ├── calendar/                 # Month grid view
│   │   │   ├── timesheet/                # Weekly entry matrix
│   │   │   ├── reports/                  # Charts and analytics
│   │   │   └── settings/                 # User profile
│   │   ├── shared/                       # UI components, charts, layout
│   │   └── styles/                       # Tailwind CSS v4
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── nginx.conf.template
├── .devcontainer/                        # Java 21 + Bun development environment
├── docker-compose.yml                    # api + app + db services
└── .github/workflows/                    # CI/CD pipelines
    ├── api-ci.yml
    ├── api-cd.yml
    ├── app-ci.yml
    └── app-cd.yml
```

---

## Tech Stack

### Backend (`api/`)
- **Java 21 LTS** with Gradle
- **Spring Boot 4.0.6** (Web, Data JPA, Security, Validation, Actuator)
- **PostgreSQL 16** with Flyway migrations
- **JJWT** — stateless JWT auth (HMAC-SHA256)
- **Google OAuth 2.0** — zero credential storage
- **springdoc-openapi** — auto-generated API docs at `/swagger-ui.html`
- **Testcontainers** — PostgreSQL for integration tests
- **dhi.io hardened images** — Eclipse Temurin JDK 21 + Amazon Corretto FIPS

### Frontend (`app/`)
- **React 19** with TypeScript
- **Vite 6** — dev server + build
- **Tailwind CSS 4** with Radix UI primitives (18 components)
- **TanStack React Query** — server state with caching, retries, optimistic updates
- **Zustand** — client state (auth, org context)
- **React Router 7** — routing with lazy-loaded pages
- **Recharts** — dashboards and reports
- **Bun** — package manager and runtime
- **Nginx** — reverse proxy with envsubst template
- **Vitest + MSW** — unit, component, and integration testing
- **dhi.io hardened images** — Bun builder + Nginx runtime

---

## Authentication & Authorization

### Google OAuth → JWT Lifecycle

```
+---------+     +----------+     +----------+     +----------+
| Browser  |     |  SPA      |     |  Backend  |     |  Google   |
+----+-----+     +----+------+     +----+------+     +----+------+
     |                |                |                |
     |  Click Login   |                |                |
     |  with Google   |                |                |
     +--------------->+                |                |
     |                |  Redirect to   |                |
     |                |  Google OAuth  |                |
     |                +-------------------------------->+
     |                |                |                |
     |                |  Callback with |                |
     |                |  id_token      |                |
     |                +<--------------------------------+
     |                |                |                |
     |                |  POST /api/v1/auth/google       |
     |                |  { idToken }   |                |
     |                +--------------->+                |
     |                |                |  Verify token  |
     |                |                |  with Google   |
     |                |                |  JWKS endpoint |
     |                |                |  Get/Create    |
     |                |                |  User          |
     |                |                |  Lookup Orgs   |
     |                |                |                |
     |                |  { access_token, user, orgs[] } |
     |                |<----------------+               |
     |                |                |                |
     |  Store access  |                |                |
     |  token in      |                |                |
     |  memory only   |                |                |
     +<---------------+                |                |
     |                |                |                |
     |  API call      |                |                |
     |  returns 401   |                |                |
     +--------------->+                |                |
     |                |  POST /api/v1/auth/refresh      |
     |                |  (Bearer <expired_token>)       |
     |                +--------------->+                |
     |                |                |  Verify sig    |
     |                |                |  ignore expiry |
     |                |  { new_token } |                |
     |                +<----------------+               |
     |                |                |                |
     |                |  Retry original request         |
     +<---------------+                |                |
```

### Token Strategy

| Token | Duration | Storage | Purpose |
|---|---|---|---|
| Access JWT | 15 min | In-memory (Zustand, no persistence) | Authorize API requests |
| Refresh JWT | 7 days | httpOnly Secure SameSite=Strict cookie | Obtain new access tokens |

- Access token sent via `Authorization: Bearer <token>` header
- Refresh token is never accessible to JavaScript (XSS-proof)
- On page load: no access token → `POST /api/v1/auth/refresh` with stored token → receive new access token
- Other services: `POST /api/v1/auth/api-key` exchanges API key for 30-day JWT

### RBAC — Permission Mapping

| UI / Action | `employee` | `leader` | `manager` | `admin` |
|---|---|---|---|---|
| View own activities | Yes | Yes | Yes | Yes |
| View team activities | No | Yes | Yes | Yes |
| View department activities | No | No | Yes | Yes |
| View org-wide dashboard | No | No | No | Yes |
| Create activity for self | Yes | Yes | Yes | Yes |
| Create activity for `employee` | No | Yes | Yes | Yes |
| Create activity for `leader` | No | No | Yes | Yes |
| Create activity for `manager` | No | No | No | Yes |
| Create project | No | No | Yes (managed dept) | Yes |
| Create department | No | No | No | Yes |
| Create team | No | No | Yes (managed dept) | Yes |
| Invite `employee` | No | Yes | Yes | Yes |
| Invite `leader` | No | Yes | Yes | Yes |
| Invite `manager` | No | No | Yes | Yes |
| Invite `admin` | No | No | No | Yes |
| Create custom label | No | Yes | Yes | Yes |
| Grant cross-dept access | No | No | Yes | Yes |

### JWT Claims Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "org_id": "org-uuid",
  "role": "admin|manager|leader|employee",
  "iat": 1234567890,
  "exp": 1234568490
}
```

---

## Data Structures

### Organization
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `name` | String | Required |
| `slug` | String | Unique, URL-friendly |

### Department
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `organizationId` | UUID (FK) | Parent organization |
| `name` | String | Unique per organization |

### Team
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `departmentId` | UUID (FK) | Parent department |
| `name` | String | Unique per department |

### User
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `email` | String | Unique |
| `username` | String | `<prefix>#<random8>` auto-generated |
| `googleSub` | String | Google's unique identifier |
| `displayName` | String | Nullable |
| `avatarUrl` | String | Nullable |

### OrganizationMembership
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `userId` | UUID (FK) | |
| `organizationId` | UUID (FK) | |
| `role` | Enum | `admin`, `manager`, `leader`, `employee` |
| `maxDailyWorkMinutes` | Integer | Default 480 (8 hours) |
| `customUsername` | String | Optional override |

### Project
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `departmentId` | UUID (FK) | |
| `name` | String | Unique per department |
| `description` | Text | Optional |
| `managerMembershipId` | UUID (FK) | Responsible manager |
| `isActive` | Boolean | |

### ProjectAssignment
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `projectId` | UUID (FK) | |
| `membershipId` | UUID (FK) | Assigned employee |

### CrossDepartmentProjectAccess
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `projectId` | UUID (FK) | |
| `departmentId` | UUID (FK) | Department granted access |
| `grantedBy` | UUID (FK) | Manager who granted |

### Label
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `organizationId` | UUID (FK) | |
| `slug` | String | Unique per org, e.g. `urgent` |
| `displayName` | String | e.g. `Urgent` |
| `isSystem` | Boolean | System labels (5) cannot be deleted |

**System labels:** `urgent`, `idea`, `feature`, `fix`, `routine`

### Activity
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `projectId` | UUID (FK) | |
| `title` | String | Required |
| `description` | Text | Optional |
| `weight` | Short | Fibonacci: 1, 2, 3, 5, 8, or 13 |
| `startDatetime` | Instant (UTC) | Required |
| `endDatetime` | Instant (UTC) | Must be after start |
| `createdBy` | UUID (FK) | Creator's membership |
| `assignedTo` | UUID (FK) | Assignee's membership |

### ActivityDependency
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `parentActivityId` | UUID (FK) | Blocks `childActivityId` |
| `childActivityId` | UUID (FK) | Depends on `parentActivityId` |

DAG enforced — cycles are detected and rejected at the database and application level.

---

## API Endpoints

All endpoints are prefixed with `/api/v1` and proxied through Nginx. The frontend calls `/api/*` which maps to the backend.

### Authentication
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/auth/google` | Login with Google ID token | Public |
| POST | `/auth/refresh` | Refresh expired access token | Public (uses stored token) |
| GET | `/auth/me` | Get current authenticated user | Authenticated |

### Organizations
| Method | Path | Description | Role |
|---|---|---|---|
| POST | `/organizations` | Create organization | Authenticated |
| POST | `/organizations/{orgId}/departments` | Create department | `admin` |
| GET | `/organizations/{orgId}/departments` | List departments | Authenticated |
| POST | `/departments/{deptId}/teams` | Create team | `admin`, `manager` |
| GET | `/departments/{deptId}/teams` | List teams | Authenticated |

### Memberships
| Method | Path | Description | Role |
|---|---|---|---|
| POST | `/organizations/{orgId}/memberships/invite` | Invite user | Varies by role |
| GET | `/organizations/{orgId}/memberships` | List members | Authenticated |
| PUT | `/organizations/{orgId}/memberships/{membershipId}/settings` | Update settings | Self |

### Projects
| Method | Path | Description | Role |
|---|---|---|---|
| POST | `/departments/{deptId}/projects` | Create project | `admin`, `manager` |
| GET | `/organizations/{orgId}/projects` | List projects | Authenticated |
| POST | `/projects/{projectId}/assignments` | Assign employee | `admin`, `manager` |
| DELETE | `/projects/{projectId}/assignments/{membershipId}` | Remove assignment | `admin`, `manager` |
| POST | `/projects/{projectId}/cross-department-access` | Grant access | `manager` |

### Labels
| Method | Path | Description | Role |
|---|---|---|---|
| POST | `/organizations/{orgId}/labels` | Create custom label | `manager`, `leader` |
| GET | `/organizations/{orgId}/labels` | List labels | Authenticated |
| DELETE | `/organizations/{orgId}/labels/{labelId}` | Delete custom label | `manager`, `leader` |

### Activities
| Method | Path | Description | Role |
|---|---|---|---|
| POST | `/projects/{projectId}/activities` | Create activity | Varies by role |
| GET | `/projects/{projectId}/activities` | List by project | Authenticated |
| GET | `/activities/{activityId}` | Get activity | Authenticated |
| DELETE | `/activities/{activityId}` | Delete activity | Creator, `admin` |
| GET | `/activities?from=&to=&assignedTo=&projectId=` | Query by date range | Authenticated |
| POST | `/activities/{childId}/dependencies` | Add parent dependency | Authenticated |
| DELETE | `/activities/{childId}/dependencies/{parentId}` | Remove dependency | Authenticated |

---

## Configuration Reference

### Backend Environment Variables

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_DB` | `tasky` | Database name |
| `POSTGRES_USER` | `tasky` | Database user |
| `POSTGRES_PASSWORD` | — | Database password |
| `JWT_SECRET` | — | Base64-encoded 256+ bit HMAC key |
| `JWT_EXPIRATION_HOURS` | `24` | Access token lifetime |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `APP_CORS_ALLOWED_ORIGINS` | `*` | Allowed CORS origins |

### Frontend Environment Variables

| Variable | Default | Description |
|---|---|---|
| `API_UPSTREAM` | `http://api:8080` | Backend upstream URL (Nginx envsubst) |
| `VITE_DEMO_MODE` | `false` | Enable demo mode with mock data |
| `VITE_GOOGLE_CLIENT_ID` | — | Google OAuth client ID |

### Docker Compose

The stack runs three services:

```yaml
services:
  api:    # Java backend (api:8080)
  app:    # React frontend (app:8080, mapped to host 5173)
  db:     # PostgreSQL 16 (db:5432)
```

---

## Docker Images

Images are built from hardened `dhi.io/` base images and pushed to both GitHub Container Registry and Docker Hub.

### API

| Registry | Image |
|---|---|
| Docker Hub | `lucasvmigotto/tasky-api` |
| GHCR | `ghcr.io/<owner>/tasky/api` |

| Stage | Base Image | Contents |
|---|---|---|
| Builder | `dhi.io/eclipse-temurin:21-debian13-dev` | JDK 21 + Gradle |
| Runtime | `dhi.io/amazoncorretto:21-debian13-fips` | FIPS JRE, no shell |

### App

| Registry | Image |
|---|---|
| Docker Hub | `lucasvmigotto/tasky-app` |
| GHCR | `ghcr.io/<owner>/tasky/app` |

| Stage | Base Image | Contents |
|---|---|---|
| Builder | `dhi.io/bun:1-debian13-dev` | Bun runtime |
| Runtime | `dhi.io/nginx:1.31-debian13` | Hardened Nginx, no shell |

> Authenticate to `dhi.io` before building: `docker login dhi.io`

---

## CI/CD

Four workflows orchestrate the pipeline:

### Workflows

| Workflow | Trigger | Action |
|---|---|---|
| `api-ci.yml` | Push to main (`api/**`) | Test → tag `api-X.Y.Z` |
| `api-cd.yml` | Tag `api-*` | Build image → push → release |
| `app-ci.yml` | Push to main (`app/**`) | Lint + test → tag `app-X.Y.Z` |
| `app-cd.yml` | Tag `app-*` | Build image → push → release |

### Flow

```
Push to main (api/ changes)
  → api-ci.yml: test → git tag api-1.0.0 (via PAT_TOKEN)
    → api-cd.yml: build image → push to GHCR + Docker Hub → gh release
      (artifacts: tasky-api-1.0.0.jar + source code)

Push to main (app/ changes)
  → app-ci.yml: lint + test → git tag app-1.0.0 (via PAT_TOKEN)
    → app-cd.yml: build image → push to GHCR + Docker Hub → gh release
      (artifacts: dist-1.0.0.zip + source code)
```

### Required Secrets

| Secret | Used by |
|---|---|
| `PAT_TOKEN` | CI workflows (push tags that trigger CD) |
| `DOCKER_HUB_PAT` | CD workflows (push images, pull `dhi.io/`) |
| `DOCKER_HUB_USER` | CD workflows (Docker Hub username) |

### CI Pipeline Details

```
app-ci.yml:             api-ci.yml:
  bun install            ./gradlew :api:test
  bun run lint
  bun run test
```

---

## Testing Strategy

### Backend

| Type | Tool | Target |
|---|---|---|
| Unit | JUnit 5 + Mockito | Services, validators, permission logic |
| Integration | Spring Boot Test + Testcontainers | Controllers, repositories, full API flows |

```bash
./gradlew :api:test
```

Uses Testcontainers for PostgreSQL — no external database required.

### Frontend

| Type | Tool | Target | Coverage |
|---|---|---|---|
| Unit | Vitest | Permission logic, Zod schemas, formatters | > 90% |
| Component | Vitest + RTL + MSW | Page components, CRUD dialogs, forms | > 80% |
| E2E | Playwright | Google OAuth, role-based navigation, CRUD | Key journeys |
| Contract | Zod ↔ OpenAPI | Client types vs backend schema | 100% endpoints |

MSW (Mock Service Worker) intercepts fetch at the network level using the same contract that drives the typed API client.

```bash
cd app && bun run test        # Unit + component
cd app && bun run test:watch  # Watch mode
cd app && bun run test:coverage
```

---

## Quick Start

### Prerequisites

- Docker & Compose
- Access to `dhi.io` registry: `docker login dhi.io`
- A Google OAuth 2.0 Client ID

### Full Stack (Docker)

```bash
cp .env.example .env
# Edit .env with your credentials
docker compose up -d

# API:     http://localhost:8080
# App:     http://localhost:5173
# Swagger: http://localhost:8080/swagger-ui.html
```

### Development (without Docker)

```bash
# Backend — requires Java 21 + PostgreSQL 16
cd api && ./gradlew bootRun --args='--spring.profiles.active=dev'

# Frontend — requires Bun
cd app && bun install && bun run dev
```

### Devcontainer

The `.devcontainer/` directory provides a unified development environment with Java 21 and Bun pre-installed. Open the project in VS Code with the Dev Containers extension for a ready-to-code environment.

---

## Contributors

- **Lucas Migotto** — [@lucasvmigotto](https://github.com/lucasvmigotto)
- **Jhonny Tafarel** — [@jhonnytafarel](https://github.com/jhonnytafarel)
