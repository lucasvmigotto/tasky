# tasky

TaskY — internal work management: projects, activities, cross-department
requests, time tracking and reports for internal teams.

This repository hosts every TaskY image, distinguished by tag prefix:

| Image  | Tag pattern        | What it is                                            |
| ------ | ------------------ | ----------------------------------------------------- |
| app    | `app-##APP_VERSION##`    | Frontend SPA served by NGINX                    |
| api    | `api-##API_VERSION##`    | Spring Boot backend (REST API)                  |
| docs    | `docs-##DOCS_VERSION##`   | TaskY documentation site                        |

`app-latest`, `api-latest` and `docs-latest` track the newest build of each.

![Docker Pulls](https://img.shields.io/docker/pulls/lucasvmigotto/tasky.svg)
![GitHub stars](https://img.shields.io/github/stars/lucasvmigotto/tasky.svg)

## Pull

```bash
docker pull lucasvmigotto/tasky:api-##API_VERSION##
docker pull lucasvmigotto/tasky:app-##APP_VERSION##
docker pull lucasvmigotto/tasky:docs-##DOCS_VERSION##
```

## Run

The API expects PostgreSQL and, optionally, Redis (cache) and S3/MinIO
(storage); the frontend is a static SPA that talks to the API.

```bash
docker run --rm -p 8080:8080 \
  -e JWT_SECRET="$(openssl rand -base64 32)" \
  -e POSTGRES_HOST=db -e POSTGRES_DB=tasky \
  -e POSTGRES_USER=tasky -e POSTGRES_PASSWORD=tasky \
  lucasvmigotto/tasky:api-##API_VERSION##
```

```bash
docker run --rm -p 8080:8080 lucasvmigotto/tasky:app-##APP_VERSION##
docker run --rm -p 8080:8080 lucasvmigotto/tasky:docs-##DOCS_VERSION##
```

Full documentation — architecture, domain model, API reference and the
roadmap: <https://github.com/lucasvmigotto/tasky>.

## Tags

Versioned images are built on `main` with SBOM and SLSA provenance; the
`*-latest` tags float to the newest release of each image.

| Tag                | Notes                              |
| ------------------ | ---------------------------------- |
| `api-##API_VERSION##`   | versioned backend             |
| `api-latest`       | newest backend                     |
| `app-##APP_VERSION##`   | versioned frontend            |
| `app-latest`       | newest frontend                    |
| `docs-##DOCS_VERSION##`  | versioned documentation      |
| `docs-latest`      | newest documentation               |

## Licence

Proprietary. See the repository for details.
