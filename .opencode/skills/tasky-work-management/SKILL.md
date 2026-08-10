---
name: tasky-work-management
description: "Use ONLY for TaskY Asana-style work management: TASK-013 to TASK-019, TASK-035, TASK-036, activity status, Kanban drag-and-drop, ordering, subtasks, dependencies, Gantt/timeline, comments, mentions, attachments, templates, recurrence, search, and notifications."
---

# TaskY Work Management

Use com `tasky-roadmap-executor`, `tasky-backend`, `tasky-frontend`, `tasky-security-enterprise` e `tasky-quality-gate`.

## Modelo conceitual

Não confunda:

- **Status:** etapa atual do workflow.
- **Datas:** planejamento e prazo.
- **Prioridade:** urgência/impacto.
- **Peso Fibonacci:** complexidade/esforço relativo.
- **Estimativa:** tempo planejado.
- **Dependência:** bloqueio lógico entre tarefas.
- **Subtarefa:** decomposição hierárquica.

Cada conceito precisa de campo e regra próprios.

## Status persistido

Comece com enum estável:

```text
TODO, IN_PROGRESS, DONE, BLOCKED, CANCELED
```

Se status customizado for requisito imediato, modele workflow/status por organização/projeto desde o início; caso contrário, entregue enum simples e planeje migração posterior. Não derive DONE de `endDatetime`.

Ao marcar DONE:

- Registre `completedAt`.
- Defina policy de dependências incompletas.
- Não altere automaticamente data planejada.
- Em reabertura, limpe/registre novo evento com auditoria.

## Ordenação e Kanban

Persistir status e posição. A API de movimento deve receber origem, destino, posição esperada e versão quando necessário.

Requisitos DnD:

- Optimistic update com rollback.
- Reorder entre e dentro de colunas.
- Backend valida tenant, projeto e transição.
- Operação concorrente não perde cards.
- Suporte a mouse, touch e teclado.
- Announcements para screen reader.
- Fallback por menu “Mover para” sem DnD.

Não adicione biblioteca antes de verificar compatibilidade React 19, bundle e padrões do projeto.

## Subtarefas

Use `parent_activity_id` para hierarquia. Dependências continuam em tabela separada.

Defina:

- Profundidade máxima ou suporte recursivo consciente.
- Proibição de ciclo hierárquico.
- Mesma organização/projeto do pai, salvo requisito explícito.
- Comportamento ao mover pai de projeto.
- Agregação de progresso/estimativa.
- Exclusão/arquivamento com filhos.

Teste ciclo indireto, não apenas self-parent.

## Dependências

O DAG existente deve manter:

- Proibição de self-dependency.
- Detecção de ciclo indireto.
- Autorização para add/remove.
- Tenant igual nos dois lados.
- Sem N+1 ao mapear parents/children.

Defina semântica de tipos antes de expandir: finish-to-start pode ser suficiente inicialmente. Não misture dependência com subtarefa.

## Timeline/Gantt

Integrar o componente existente somente após verificar que não é código legado incompatível.

Mínimo de produção:

- Zoom dia/semana/mês.
- Datas planejadas e marco.
- Dependências visuais.
- Scroll e sticky labels.
- Edição de data com validação e rollback.
- Timezone correto.
- Estado loading/error/empty.
- Alternativa tabular acessível.

Caminho crítico e baseline são evolução posterior; não fingir que existem.

## Comentários e feed

Comentários pertencem ao tenant e à atividade. Incluir:

- Autor, conteúdo, timestamps e edição.
- Soft delete/tombstone para preservar conversa.
- Sanitização de conteúdo.
- Menções resolvidas apenas entre membros autorizados.
- Eventos de criação, status, atribuição, data e horas relevantes.
- Paginação cursor-based no feed.

Comece com polling/refetch se volume permitir. SSE/WebSocket só com requisito de latência e operação definido.

## Anexos

Não guardar binário grande no PostgreSQL. Usar object storage com:

- Metadata tenant-aware no banco.
- Upload/download por URL assinada curta.
- Limite de tamanho e MIME allowlist.
- Nome de storage gerado, nunca path do usuário.
- Antivirus/quarentena.
- Autorização no download.
- Retenção e exclusão auditada.

## Templates e recorrência

Templates devem ser versionados e clonados em transação, incluindo atividades, subtarefas, dependências, labels e estimativas permitidas.

Recorrência exige:

- Regra, timezone e próxima execução.
- Job idempotente e lock distribuído/DB.
- Chave única por ocorrência.
- Comportamento para atraso, edição da série e exceção.
- Observabilidade e retry controlado.

## Busca global

- Escopo sempre no tenant e permissões do usuário.
- Buscar projeto, atividade e membro sem expor PII indevida.
- Ranking simples antes de solução sofisticada.
- Debounce, cancelamento e paginação no frontend.
- Command palette com teclado e ações autorizadas.

PostgreSQL full-text/trigram pode ser usado dentro da stack atual; medir antes de adicionar infraestrutura.

## Notificações

Modelar evento, destinatário e preferência. Casos iniciais:

- Menção/comentário.
- Atribuição.
- Mudança de prazo/status.
- Dependência liberada/bloqueada.
- Timer aberto e timesheet pendente.
- Aprovação/rejeição.

Jobs devem ser idempotentes; email/in-app não pode duplicar por retry. Não notificar dados que o destinatário não pode mais acessar.

## Contrato full-stack

Para cada capacidade:

1. Migration nova.
2. Entidade/repository tenant-aware.
3. Service com invariantes.
4. Policy de recurso.
5. DTO/endpoint e erros estáveis.
6. Tipos/hooks/query keys.
7. UI responsiva e acessível.
8. Teste backend, componente e E2E crítico.

## Definição de pronto

- Status é persistido e independente de data.
- DnD persiste, reverte em erro e funciona por teclado.
- Subtarefas e dependências não criam ciclos.
- Feed/anexos/search não vazam tenant.
- Jobs recorrentes/notificações são idempotentes.
- Gantt possui alternativa acessível.
- Nenhum controle visual promete função inexistente.
