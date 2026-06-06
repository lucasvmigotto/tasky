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
