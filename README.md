# TaskY

Multi-tenant Time Activities API. Built with Java 21, Spring Boot 4.0.6, PostgreSQL 16.

## Architecture

```
Organization (tenant boundary)
  └── Department
       ├── Team
       └── Project (managed by a manager)
            └── Activity (Fibonacci weight, DAG dependencies, labels)
```

**Roles (strict hierarchy):** `admin` > `manager` > `leader` > `employee`

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Access to `dhi.io` registry authenticated via `docker login dhi.io`
- A Google OAuth 2.0 Client ID (for authentication)

### Setup

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your Google OAuth credentials and a JWT secret

# 2. Start the stack
docker compose up -d

# 3. The API is available at http://localhost:8080
#    Swagger UI: http://localhost:8080/swagger-ui.html
```

### Development (without Docker)

```bash
# Requires: Java 21, PostgreSQL 16 running locally
./gradlew bootRun --args='--spring.profiles.active=dev'
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/google` | Login with Google ID token |
| POST | `/api/v1/organizations` | Create organization |
| POST | `/api/v1/organizations/{orgId}/departments` | Create department (admin) |
| GET | `/api/v1/organizations/{orgId}/departments` | List departments |
| POST | `/api/v1/departments/{deptId}/teams` | Create team (admin/manager) |
| GET | `/api/v1/departments/{deptId}/teams` | List teams |
| POST | `/api/v1/organizations/{orgId}/memberships/invite` | Invite user |
| GET | `/api/v1/organizations/{orgId}/memberships` | List memberships |
| PUT | `/api/v1/organizations/{orgId}/memberships/{id}/settings` | Update settings |
| POST | `/api/v1/departments/{deptId}/projects` | Create project (admin/manager) |
| GET | `/api/v1/organizations/{orgId}/projects` | List projects |
| POST | `/api/v1/organizations/{orgId}/labels` | Create label (manager/leader) |
| GET | `/api/v1/organizations/{orgId}/labels` | List labels |
| DELETE | `/api/v1/labels/{id}` | Delete custom label |
| POST | `/api/v1/projects/{projectId}/activities` | Create activity |
| GET | `/api/v1/projects/{projectId}/activities` | List activities |
| GET | `/api/v1/activities/{id}` | Get activity |
| DELETE | `/api/v1/activities/{id}` | Delete activity |
| POST | `/api/v1/activities/{childId}/dependencies` | Add parent dependency |
| DELETE | `/api/v1/activities/{childId}/dependencies/{parentId}` | Remove dependency |

## Configuration

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_DB` | `tasky` | Database name |
| `POSTGRES_USER` | `tasky` | Database user |
| `POSTGRES_PASSWORD` | — | Database password |
| `JWT_SECRET` | — | Base64-encoded 256+ bit key for JWT signing |
| `JWT_EXPIRATION_HOURS` | `24` | JWT token lifetime |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `APP_CORS_ALLOWED_ORIGINS` | `*` | Allowed CORS origins |

## Docker Hardened Images

The production image uses hardened base images:

| Stage | Image |
|---|---|
| Builder | `dhi.io/eclipse-temurin:21-debian13-dev` |
| Final | `dhi.io/amazoncorretto:21-debian13-fips` |

- **Builder** — Eclipse Temurin JDK 21 on Debian 13 with dev tooling for Gradle
- **Final runtime** — Amazon Corretto JRE 21 on Debian 13 with FIPS mode enabled. No shell, no package manager
- **FIPS compliance** — JVM runs in FIPS-approved mode. JJWT HS256 algorithm is FIPS-compatible

> Authenticate to `dhi.io` before building: `docker login dhi.io`

## Testing

```bash
./gradlew test
```

Tests use Testcontainers for PostgreSQL. No external database required.

## Tech Stack

- **Java 21 LTS** with Gradle
- **Spring Boot 4.0.6** (Web, Data JPA, Security, Validation, Actuator)
- **PostgreSQL 16** with Flyway migrations
- **JWT** (JJWT) for stateless auth
- **Google OAuth 2.0** — zero credential storage
- **springdoc-openapi** — auto-generated API docs
- **Testcontainers** — integration testing
