# TaskY ✦

Multi-tenant Time Activities platform. Monorepo with Java API backend and React frontend.

## Architecture

### Backend
```
Organization (tenant boundary)
  └── Department
       ├── Team
       └── Project (managed by a manager)
            └── Activity (Fibonacci weight, DAG dependencies, labels)
```

**Roles (strict hierarchy):** `admin` > `manager` > `leader` > `employee`

### Frontend
```
Client (Browser) → Nginx (reverse proxy)
  ├── /api/* → Java API (api:8080)
  └── /*     → React SPA (static files)
```

### Project Structure

```
.
├── api/                           # Java backend
│   ├── src/main/java/io/tasky/api/
│   ├── build.gradle
│   └── Dockerfile
├── app/                           # React frontend
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── .devcontainer/                 # Java 21 + Bun
├── docker-compose.yml             # api + app + db
└── .github/workflows/             # CI/CD workflows
    ├── api-ci.yml
    ├── api-cd.yml
    ├── app-ci.yml
    └── app-cd.yml
```

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

# API:    http://localhost:8080
# App:    http://localhost:5173
# Swagger: http://localhost:8080/swagger-ui.html
```

### Development (without Docker)

```bash
# Backend — requires Java 21 + PostgreSQL 16
cd api && ./gradlew bootRun --args='--spring.profiles.active=dev'

# Frontend — requires Bun
cd app && bun install && bun run dev
```

## API Endpoints

All endpoints are prefixed with `/api/v1` and proxied through Nginx.

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/auth/google` | Login with Google ID token | — |
| POST | `/organizations` | Create organization | — |
| POST | `/organizations/{orgId}/departments` | Create department | admin |
| GET | `/organizations/{orgId}/departments` | List departments | authenticated |
| POST | `/departments/{deptId}/teams` | Create team | admin, manager |
| GET | `/departments/{deptId}/teams` | List teams | authenticated |
| POST | `/organizations/{orgId}/memberships/invite` | Invite user | varies by role |
| GET | `/organizations/{orgId}/memberships` | List memberships | authenticated |
| PUT | `/organizations/{orgId}/memberships/{membershipId}/settings` | Update settings | self |
| POST | `/departments/{deptId}/projects` | Create project | admin, manager |
| GET | `/organizations/{orgId}/projects` | List projects | authenticated |
| POST | `/organizations/{orgId}/labels` | Create custom label | manager, leader |
| GET | `/organizations/{orgId}/labels` | List labels | authenticated |
| DELETE | `/organizations/{orgId}/labels/{labelId}` | Delete custom label | manager, leader |
| POST | `/projects/{projectId}/activities` | Create activity | varies by role |
| GET | `/projects/{projectId}/activities` | List project activities | authenticated |
| GET | `/activities/{activityId}` | Get activity | authenticated |
| DELETE | `/activities/{activityId}` | Delete activity | creator, admin |
| POST | `/activities/{childId}/dependencies` | Add parent dependency | authenticated |
| DELETE | `/activities/{childId}/dependencies/{parentId}` | Remove dependency | authenticated |

## Configuration

### Backend

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_DB` | `tasky` | Database name |
| `POSTGRES_USER` | `tasky` | Database user |
| `POSTGRES_PASSWORD` | — | Database password |
| `JWT_SECRET` | — | Base64-encoded 256+ bit key |
| `JWT_EXPIRATION_HOURS` | `24` | Token lifetime |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `APP_CORS_ALLOWED_ORIGINS` | `*` | Allowed CORS origins |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `API_UPSTREAM` | `http://api:8080` | Backend upstream URL (Nginx envsubst) |
| `VITE_DEMO_MODE` | `true` | Enable demo mode with mock data |

## Docker Images

Images are built from hardened `dhi.io/` base images and pushed to both registries.

### API

| Registry | Image |
|---|---|
| Docker Hub | `lucasvmigotto/tasky-api` |
| GHCR | `ghcr.io/<owner>/tasky/api` |

**Builder:** `dhi.io/eclipse-temurin:21-debian13-dev` — JDK 21 with Gradle tooling  
**Runtime:** `dhi.io/amazoncorretto:21-debian13-fips` — FIPS-compliant JRE, no shell

### App

| Registry | Image |
|---|---|
| Docker Hub | `lucasvmigotto/tasky-app` |
| GHCR | `ghcr.io/<owner>/tasky/app` |

**Builder:** `dhi.io/bun:1-debian13-dev` — Bun runtime for build  
**Runtime:** `dhi.io/nginx:1.31-debian13` — hardened Nginx serving static files

> Authenticate to `dhi.io` before building: `docker login dhi.io`

## CI/CD

Four workflows orchestrate the pipeline:

| Workflow | Trigger | Action |
|---|---|---|
| `api-ci.yml` | Push to main (`api/**`) | Test → tag `api-X.Y.Z` |
| `api-cd.yml` | Tag `api-*` | Build image → push → release (`.jar` + source) |
| `app-ci.yml` | Push to main (`app/**`) | Lint → tag `app-X.Y.Z` |
| `app-cd.yml` | Tag `app-*` | Build image → push → release (`dist/` + source) |

### Flow

```
Push to main (api/ changes)
  → api-ci.yml: test → git tag api-1.0.0 (via PAT_TOKEN)
    → api-cd.yml: build image → push to GHCR + Docker Hub → gh release

Push to main (app/ changes)
  → app-ci.yml: lint → git tag app-1.0.0 (via PAT_TOKEN)
    → app-cd.yml: build image → push to GHCR + Docker Hub → gh release
```

Each release includes:
- **API release** — `tasky-api-X.Y.Z.jar` + source code
- **App release** — `dist-X.Y.Z.zip` + source code

### Required Secrets

| Secret | Used by |
|---|---|
| `PAT_TOKEN` | CI workflows (push tags that trigger CD) |
| `DOCKER_HUB_PAT` | CD workflows (push images to Docker Hub) |
| `DOCKER_HUB_USER` | CD workflows (Docker Hub username) |

## Testing

```bash
# Backend (Testcontainers for PostgreSQL)
./gradlew :api:test

# Frontend
cd app && bun run lint
```

## Tech Stack

### Backend (`api/`)
- **Java 21 LTS** with Gradle
- **Spring Boot 4.0.6** (Web, Data JPA, Security, Validation, Actuator)
- **PostgreSQL 16** with Flyway migrations
- **JJWT** — stateless JWT auth
- **Google OAuth 2.0** — zero credential storage
- **springdoc-openapi** — auto-generated API docs
- **Testcontainers** — integration testing
- **dhi.io hardened images** — Eclipse Temurin + Amazon Corretto FIPS

### Frontend (`app/`)
- **React 19** with TypeScript
- **Vite 6** — dev server + build
- **Tailwind CSS 4** with Radix UI primitives
- **TanStack React Query** — server state
- **Zustand** — client state
- **React Router 7** — routing
- **Recharts** — dashboards
- **Bun** — package manager + runtime
- **Nginx** — reverse proxy with envsubst template
- **dhi.io hardened images** — Bun builder + Nginx runtime

## Contributors

- **Lucas Migotto** — [@lucasvmigotto](https://github.com/lucasvmigotto)
- **Jhonny Tafarel** — [@jhonnytafarel](https://github.com/jhonnytafarel)
