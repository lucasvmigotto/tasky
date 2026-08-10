# TaskY Onboarding

## Estado do roadmap

Consulte `docs/ROADMAP_STATUS.md` antes de iniciar qualquer trabalho.

## Rodar localmente

```bash
cp .env.example .env
docker compose up -d --build
```

Configure `JWT_SECRET` com base64 de 32 bytes:

```bash
openssl rand -base64 32
```

## Verificacoes principais

Backend:

```bash
./gradlew :api:test :api:build --no-daemon
```

Frontend:

```bash
cd app
bun install --frozen-lockfile
bun run lint
bun run test
bun run build
```

## Operacao

- Backup/restore: `docs/runbooks/backup-restore.md`.
- LGPD: `docs/governance/lgpd.md`.
- Acessibilidade: `docs/quality/accessibility.md`.
- Testes de seguranca: `docs/quality/security-test-matrix.md`.
- Limitacoes conhecidas: `docs/limitations.md`.

## Convenções

- Backend usa Flyway; nova tabela/coluna exige migration nova.
- Frontend usa API real + MSW para testes, sem mocks soltos por pagina.
- Tenant sempre vem do JWT/org ativa; nao confiar em org/role enviados pelo cliente.
