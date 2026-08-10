---
name: tasky-time-enterprise
description: "Use ONLY for TaskY time-tracking and financial-time work: TASK-008 to TASK-012 and TASK-020 to TASK-024, timer, pause/resume, manual entries, timesheet, overlap, timezone, approvals, estimates, billable rates, budgets, workload, and reports. Enforces server-authoritative time and database integrity."
---

# TaskY Enterprise Time Tracking

Use com `tasky-roadmap-executor`, `tasky-backend`, `tasky-frontend`, `tasky-data-scale` e `tasky-quality-gate` conforme o ticket.

## Princípios

1. O servidor é autoridade sobre estado e duração faturável.
2. Invariantes concorrentes pertencem também ao banco.
3. Entrada manual e timer são comandos diferentes.
4. Armazenar instantes em UTC; interpretar dia/semana no timezone IANA da organização/usuário.
5. Hora aprovada ou faturada não pode mudar sem auditoria.
6. Estimativa, peso, custo e preço são conceitos separados.

## Estado do timer

Modele estados explícitos, por exemplo:

```text
RUNNING -> PAUSED -> RUNNING -> STOPPED
RUNNING ---------------------> STOPPED
```

Escolha entre:

- Segmentos (`time_entry_segments`) para cada intervalo ativo; melhor auditoria e multidispositivo.
- Campos `paused_at` e `paused_seconds`; mais simples, menos expressivo.

Para uso empresarial, segmentos são preferíveis quando pausas precisam ser explicadas. Não dependa do contador Zustand para calcular valor persistido.

## Invariantes de banco

- No máximo um timer aberto por membership no escopo de produto definido.
- `end_time > start_time` quando finalizado.
- Duração não negativa.
- Membership, projeto e atividade pertencem à mesma organização.
- Projeto/atividade arquivada segue policy explícita para novos lançamentos.
- Versão otimista ou comando idempotente impede duplo stop/pause/resume.

Exemplo PostgreSQL:

```sql
CREATE UNIQUE INDEX uq_time_entries_running_membership
ON time_entries (membership_id)
WHERE end_time IS NULL;
```

Capture violation e retorne 409 estável, não 500.

## Overlap

Dois intervalos `[start, end)` se sobrepõem quando:

```text
existing.start < newEnd AND existing.end > newStart
```

Use intervalo half-open para permitir que uma entrada termine exatamente quando outra começa. Trate timer aberto com fim efetivo apropriado. Exclua o próprio ID ao editar.

Defina policy da organização:

- Bloquear sempre.
- Avisar e exigir override autorizado.
- Permitir categorias específicas.

Não faça checagem apenas no frontend. Para concorrência forte, considere exclusion constraint PostgreSQL após validar compatibilidade com timers abertos e policy.

## Comandos separados

Fluxo recomendado:

- `POST /time-entries/timer/start`
- `POST /time-entries/{id}/pause`
- `POST /time-entries/{id}/resume`
- `POST /time-entries/{id}/stop`
- `POST /time-entries/manual`
- `PUT /time-entries/{id}`

Start/stop/pause/resume devem ser idempotentes por key ou versão. Entrada manual recebe intervalo/duração de uma vez; nunca faça start seguido de update para simular lançamento.

## Timezone e calendário

- Salve timezone IANA, como `America/Sao_Paulo`, não offset fixo.
- Converta data local para Instant na borda usando timezone efetivo.
- Semana e dia de relatório são definidos no timezone da organização.
- Teste virada de dia, início/fim de mês, DST de zonas que possuem transição e semana ISO/configurável.
- Evite construir timestamps com string `T09:00:00.000Z`.
- Armazene jornada, dias úteis e feriados separadamente de time entries.

## Timesheet

Uma grade semanal precisa:

- Loading, error, empty e retry.
- Edição atômica.
- Total por dia/semana e validação contra jornada.
- Indicação clara de overlap e timer aberto.
- Estado draft/submitted/approved/rejected/locked.
- Bloqueio de alteração após aprovação, salvo override auditado.
- Mobile em formato agenda/cards ou scroll explicitamente acessível.

## Aprovação

Workflow mínimo:

```text
DRAFT -> SUBMITTED -> APPROVED -> LOCKED
                  `-> REJECTED -> DRAFT
```

Regras:

- Colaborador submete período completo.
- Gestor autorizado aprova/rejeita no próprio escopo.
- Rejeição exige comentário.
- Aprovação registra actor e timestamp.
- Reabertura exige permissão e audit event.
- Alterar entrada do período recalcula status conforme policy.

## Planejado x realizado

Não reutilize peso Fibonacci como hora. Adicione estimativa em unidade inteira (`estimated_seconds` ou minutos). Calcule:

- Planejado.
- Realizado aprovado e não aprovado.
- Restante.
- Desvio absoluto e percentual.
- Forecast quando houver histórico suficiente.

Agregações devem ocorrer no banco/projections e respeitar tenant/RBAC.

## Financeiro

Separe:

- `billable`: entrada pode ser cobrada.
- `billing_rate`: preço ao cliente.
- `cost_rate`: custo interno.
- `budget`: limite de horas ou valor.
- Receita, custo e margem.

Taxas mudam com o tempo. Use snapshot aplicável à entrada/período ou tabela versionada; recalcular toda história com taxa atual é incorreto. Campos financeiros exigem permissão específica e auditoria.

## Relatórios

- Intervalos filtrados no SQL, nunca `findAll().stream()`.
- Projections para resumo e detalhado; evitar grafo JPA.
- Mesmo escopo de autorização em tela e export.
- Paginar detalhado.
- Export grande deve ser assíncrono, com arquivo temporário seguro e expiração.
- CSV protege fórmulas; PDF/XLSX preserva locale/timezone.
- Incluir billable, custo, receita, margem, aprovado e não aprovado somente quando role permitir.

## Concorrência e multidispositivo

Teste:

- Dois starts simultâneos.
- Dois stops simultâneos.
- Pause em um dispositivo e stop em outro.
- Retry da mesma mutation após timeout.
- Reload durante cada estado.
- Mudança de relógio local e suspensão de aba.

O frontend usa relógio local apenas para exibição. Refetch/reconciliação do servidor corrige drift. Considere polling moderado, focus refetch ou SSE, sem introduzir WebSocket sem necessidade comprovada.

## Critérios de aceite obrigatórios

- Nenhuma hora duplicada por corrida/overlap não autorizado.
- Timer é restaurado com estado correto.
- Operações são tenant-safe e ownership-safe.
- Intervalos usam timezone correto.
- Erros 409 orientam resolução.
- Relatórios reconciliam com entradas aprovadas.
- Auditoria explica criação, edição, aprovação e override.
- Testes incluem banco real via Testcontainers e UI via MSW/E2E.
