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
