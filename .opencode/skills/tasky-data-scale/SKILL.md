---
name: tasky-data-scale
description: "Use ONLY for TaskY PostgreSQL/JPA/Flyway integrity and performance work: migrations, tenant-scoped repositories, N+1, projections, indexes, pagination, reports, concurrency constraints, EXPLAIN ANALYZE, or TASK-030. Keeps PostgreSQL and the current Spring Data stack."
---

# TaskY Data Integrity and Scale

Use com `tasky-backend` e a skill de domínio do ticket. Não sugira trocar PostgreSQL/JPA/Flyway.

## Regras de migration

- `ddl-auto: validate` permanece ativo.
- Flyway é a única fonte de schema.
- Nunca editar migration aplicada.
- Descobrir a maior versão antes de criar a próxima.
- DDL PostgreSQL deve ser transacional quando possível.
- Mudança destrutiva usa estratégia expand/migrate/contract.
- Migration de dados deve ser determinística e testável.
- Índices grandes em produção exigem plano de lock; considerar `CONCURRENTLY` com configuração Flyway apropriada quando necessário.

Teste migration em:

1. Banco vazio.
2. Banco migrado até versão anterior com dados representativos.
3. Startup Hibernate `validate` após Flyway.

## Tenant-aware repositories

O tenant faz parte da assinatura da query. Não carregue por ID global e valide depois se a própria query pode impedir vazamento.

```java
Optional<Activity> findByIdAndProjectDepartmentOrganizationId(
    UUID id, UUID organizationId);
```

Para relações, valide todos os IDs no mesmo tenant em uma transação. Não use `getReferenceById` em input externo sem validação anterior.

## Eliminar filtros em memória

Sinais proibidos em caminhos de escala:

```java
repository.findAll().stream().filter(...)
repository.findByOrganizationId(...).stream().filter(date...)
```

Mova filtros de período, projeto, membership e status para SQL. Use `[from, to)` e `Pageable`/cursor. Dashboard deve usar endpoint agregado, não baixar milhares de entidades.

## N+1

Diagnostique antes de corrigir:

- Conte queries em teste ou ambiente dev.
- Ative logs Hibernate de forma temporária e sem PII.
- Inspecione loops que acessam LAZY ou chamam repository.

Escolha a ferramenta mínima:

- Projection DTO para read model e relatórios.
- Fetch join para relação to-one/lista pequena.
- `@EntityGraph` para casos controlados.
- Batch fetch para coleções quando projection não serve.
- Consulta em lote para IDs de dependência/labels.

Não transforme associações em EAGER global para esconder N+1. Não mantenha transação no controller para lazy mapping.

## Read models e relatórios

Relatório não precisa hidratar entidades completas. Use interfaces/records de projection e SQL/JPQL agregado:

- `SUM(duration_seconds)`.
- `GROUP BY project/member/date/label`.
- Filtros tenant/período no WHERE.
- Paginação no detalhado.

Garanta que joins de labels/tags não multipliquem duração. Quando necessário, agregue em subquery/CTE separada.

## Índices

Parta das queries reais e valide com `EXPLAIN (ANALYZE, BUFFERS)` em dados representativos. Candidatos comuns:

- `(organization_id, start_time)`.
- `(membership_id, start_time)`.
- `(project_id, start_time)`.
- Partial index para timer aberto.
- `activity_id` em time entries.
- Status/posição por projeto para Kanban.

Não adicionar índice isolado redundante com prefixo de PK/índice composto. Considere custo de write e cardinalidade.

## Concorrência

Invariante que pode ser violada por duas requests não deve depender apenas de `exists()` seguido de `save()`.

Use conforme o caso:

- Unique/partial unique constraint.
- Exclusion constraint para intervalos.
- `@Version` para optimistic locking.
- `SELECT FOR UPDATE` para transição serializada.
- Idempotency key com unique constraint.

Mapeie violations esperadas para 409 com código de domínio.

## Coleções e IDs compostos

- `orphanRemoval`: mutar coleção in-place; não substituir referência em entidade gerenciada.
- Composite IDs implementam `Serializable`, `equals` e `hashCode`.
- Entidades em `Set` precisam igualdade consistente.
- Deduplicar tags/label IDs antes da flush.
- Copiar coleção LAZY para DTO dentro do service/projection; não guardar PersistentCollection no record.

## Dados derivados e dinheiro

- Duração e organization duplicadas exigem autoridade/invariante explícita.
- Dinheiro usa `NUMERIC`/`BigDecimal`, nunca float/double.
- Definir moeda e escala.
- Taxas históricas usam snapshot/versionamento.
- Campos de audit não devem ser recalculados silenciosamente.

## Medição

Para ticket de performance, registrar:

- Volume de dados de teste.
- Query count antes/depois.
- p50/p95 ou tempo do plano antes/depois.
- Índices usados.
- Memória/linhas carregadas quando relevante.

“Menos código” não prova performance.

## Definição de pronto

- Migration passa em banco vazio e evoluído.
- Hibernate valida schema.
- Query inclui tenant e filtros no banco.
- Não existe N+1 no fluxo alterado.
- Paginação preserva ordenação estável.
- Constraint protege concorrência.
- Plano SQL e testes sustentam a otimização.
