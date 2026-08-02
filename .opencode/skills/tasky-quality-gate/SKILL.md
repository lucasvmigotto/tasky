---
name: tasky-quality-gate
description: "Use for ANY TaskY behavior change that needs verification, and especially TASK-026 or TASK-027. Defines backend Testcontainers, frontend Vitest/MSW, Playwright E2E, security regression, migration, concurrency, accessibility, and release quality gates. Trigger keywords: testes, cobertura, Testcontainers, Vitest, MSW, Playwright, E2E, quality gate, regressão."
---

# TaskY Quality Gate

Carregue esta skill em todo ticket que altera comportamento. Cobertura percentual não substitui cenários críticos.

## Estado atual que deve ser corrigido

- `PermissionServiceTest` testa uma implementação privada copiada, não o bean real.
- Testes de integração desabilitam Flyway.
- Frontend testa principalmente permissions e types.
- MSW handlers existem, mas não há server configurado nos testes.
- Não há E2E Playwright configurado.
- Docker build backend pula testes; CI é a barreira real.

## Estratégia

### Backend unitário

Use Mockito apenas para regra pura/service isolado. Teste a classe real, não réplica da lógica. Nomes devem descrever comportamento e resultado.

### Backend integração

Use PostgreSQL Testcontainers e Flyway habilitado para provar:

- Migration real.
- Repository/query real.
- Security filter/method policy.
- Controller/serialization/error contract.
- Constraint/concorrência.

Crie dados de pelo menos dois tenants nos testes de autorização.

### Frontend unitário/componente

Vitest + Testing Library + MSW:

- Testar comportamento percebido, não detalhes internos.
- Setup server em `src/test/setup.ts` com reset após cada teste.
- Handlers por teste para sucesso, 400, 401, 403, 409, 429 e 500.
- Testar stores/interceptors com requests concorrentes e timers controlados.
- Preferir queries por role/name/label.

### E2E

Playwright para fluxos que atravessam camadas:

- Login/restauração/logout.
- Troca de organização sem vazamento de cache.
- Iniciar, pausar, retomar e parar timer.
- Criar/editar entrada e tratar overlap.
- Timesheet submit/approve quando existir.
- Kanban move/reorder.
- Projeto/atividade e relatório/export.

Use ambiente e dados isolados. Não depender de conta Google real no CI; use mecanismo de teste controlado no backend apenas em profile test.

## Matriz de segurança obrigatória

Para endpoint tenant-owned, teste:

- Admin/manager/leader/employee conforme regra.
- Mesmo tenant e tenant diferente.
- Recurso inexistente.
- Relationship ID de outro tenant.
- Membership removida/desativada.
- Listagem e export, não apenas get por ID.

## Migrations

Todo ticket com schema precisa:

1. Migrar banco vazio até latest.
2. Migrar snapshot/fixtures da versão anterior.
3. Confirmar dados transformados.
4. Iniciar Spring com `ddl-auto=validate`.
5. Verificar constraints e índices esperados.

Nunca deixe `flyway.enabled=false` no teste que deveria provar migrations.

## Concorrência e idempotência

Use barreiras/latches ou requests paralelas reais para testar:

- Dois starts de timer.
- Dois stops/moves/aprovações.
- Reuso de idempotency key.
- Optimistic locking.
- Job recorrente executado duas vezes.
- Refresh token reutilizado.

Um teste sequencial de `exists` não prova concorrência.

## Contratos e erros

- DTO backend e type frontend devem representar o mesmo JSON.
- Problem Details possui `status`, `code`, `detail` seguro e `traceId` quando aplicável.
- MSW deve espelhar contrato real, não inventar campos.
- Teste 204/empty body e downloads.
- Teste locale/timezone em datas e números.

## Acessibilidade

- Axe para violações automáticas.
- Teclado manual/automatizado para dialog, menu, DnD e formulário.
- Foco após erro/mutation.
- Reduced motion e nomes acessíveis.

## Performance

Quando ticket tocar query/listagem/relatório:

- Medir query count.
- Fixture com volume representativo.
- Verificar paginação e ordenação estável.
- Registrar plano SQL quando otimizado.
- Definir limite de duração razoável sem criar teste flaky.

## Comandos padrão

```bash
# Backend
./gradlew :api:test
./gradlew :api:build

# Frontend
cd app
bun run lint
bun run test
bun run test:coverage
bun run build

# Stack/runtime
docker compose up -d --build
docker compose ps
```

Rode testes focados durante desenvolvimento e a suíte ampla antes da entrega. Se a máquina não possui Java/Bun, use containers e informe a limitação.

## Anti-padrões

- Testar uma cópia da regra.
- Assertar apenas que componente “renderiza”.
- Mockar repository no teste que pretende provar tenant/query.
- Desabilitar Flyway para fazer integration test passar.
- Snapshot gigante como única verificação.
- Aumentar timeout para esconder race.
- Declarar cobertura sem relatório/comando executado.
- Corrigir teste alterando expectativa para comportamento inseguro.

## Gate por prioridade

### P0

Unit + integration + negative security. Nenhum teste crítico pode ficar skipped.

### P1

Integration de banco/concorrência e E2E do fluxo central quando full-stack.

### P2/P3

Component test, integração de contrato e E2E representativo; a11y/performance conforme feature.

### P4

Build/lint/test e prova de que código removido não tinha consumidor.

## Relatório final

Liste comandos e resultados reais. Para teste não executado, declare “não executado” e motivo. Nunca diga “todos os testes passam” baseado apenas em leitura de código.
