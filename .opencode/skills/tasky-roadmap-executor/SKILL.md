---
name: tasky-roadmap-executor
description: "Use when executing TASK-001 through TASK-040 from docs/ANALISE_TASKY.md, choosing the next roadmap ticket, or implementing the Clockify+Asana enterprise evolution. Coordinates dependencies, specialized TaskY skills, acceptance criteria, verification, and delivery evidence. Trigger keywords: TASK-001, TASK-040, roadmap, plano de ação, próxima task, executar ticket, Clockify Asana, evolução enterprise."
---

# TaskY Roadmap Executor

Use esta skill como orquestradora para qualquer ticket de `docs/ANALISE_TASKY.md`. Ela não substitui `tasky-project`, `tasky-backend` ou `tasky-frontend`: carrega e coordena essas skills e uma skill especializada do domínio.

## Fonte de verdade

Leia antes de planejar:

1. `docs/ANALISE_TASKY.md`, especialmente o ticket solicitado, suas dependências e a definição de pronto.
2. `.opencode/skills/tasky-project/SKILL.md`.
3. A skill especializada indicada na matriz abaixo.
4. Os arquivos reais citados no ticket. O documento é uma auditoria, não substitui o código atual.

Se o código divergir do documento, siga o código, explique a divergência e ajuste apenas o necessário. Nunca invente que uma dependência está pronta.

## Matriz de roteamento

| Tickets / assunto | Skill obrigatória |
|---|---|
| TASK-001 a TASK-007, autenticação, tenant, RBAC, CORS | `tasky-security-enterprise` |
| TASK-008 a TASK-012, TASK-020 a TASK-024, timer/timesheet | `tasky-time-enterprise` |
| TASK-013 a TASK-019, TASK-035 e TASK-036 | `tasky-work-management` |
| TASK-003, TASK-008 a TASK-010, TASK-020, TASK-021, TASK-024, TASK-030 | `tasky-data-scale` |
| TASK-005, TASK-014, TASK-016 a TASK-024, TASK-031, TASK-034, TASK-035, TASK-038 | `tasky-ux-enterprise` |
| TASK-026, TASK-027 e qualquer alteração com testes | `tasky-quality-gate` |
| TASK-025, TASK-028, TASK-029, TASK-032, TASK-033, TASK-037, TASK-040 | `tasky-platform-enterprise` |

Um ticket full-stack normalmente exige duas ou três skills especializadas. Carregue somente as relevantes, mas nunca omita `tasky-quality-gate` ao alterar comportamento.

## Regra de prioridade

1. P0 antes de P1.
2. P1 antes de P2.
3. P2 antes de P3/P4.
4. Não iniciar feature dependente de segurança ou integridade ainda aberta.
5. Exceção: trabalho independente pode ocorrer em paralelo quando o ticket declarar isso e não consolidar comportamento inseguro.

Se o usuário pedir uma task posterior com dependência pendente, não recuse automaticamente. Verifique se é possível preparar uma parte isolada. Caso não seja, explique o bloqueio em uma frase e proponha executar a dependência primeiro.

## Ciclo obrigatório de execução

### 1. Enquadrar

- Identifique o ID exato, prioridade, problema, solução, arquivos, esforço e dependências.
- Defina o comportamento anterior e o comportamento esperado.
- Liste riscos de tenant, autorização, concorrência, timezone, migração e compatibilidade.
- Use uma task list para qualquer ticket não trivial.

### 2. Verificar dependências

- Não deduza conclusão pelo número de arquivos existentes.
- Procure migrations, endpoints, testes e uso frontend que comprovem o comportamento.
- Confirme se há mudanças não commitadas no mesmo fluxo; preserve-as.
- Se uma dependência estiver parcialmente pronta, registre exatamente o que falta.

### 3. Explorar antes de editar

Leia no mínimo:

- Entidade, repository, service, controller e DTO do recurso backend.
- Migration mais recente e schema relacionado.
- Tipos, hooks, MSW e página/componente frontend afetados.
- Testes existentes do fluxo.
- Configuração de segurança quando houver resource ID ou dados tenant-owned.

Não crie helpers ou abstrações antes de verificar o padrão já usado.

### 4. Definir critérios de aceite observáveis

Todo ticket deve ter critérios Given/When/Then ou equivalentes. Inclua sempre:

- Caminho feliz.
- Entrada inválida.
- Usuário sem permissão.
- Usuário de outro tenant.
- Repetição/concorrência quando houver mutation.
- Reload/falha de rede quando houver estado frontend.
- Migração em banco vazio e banco com dados quando houver schema.

### 5. Implementar no menor corte vertical

Ordem preferencial para full-stack:

1. Invariante e migration.
2. Repository tenant-aware.
3. Service transacional.
4. Policy/autorização.
5. DTO/controller e Problem Details.
6. Tipo e hook frontend.
7. UI com loading, empty, error e sucesso.
8. MSW/testes.
9. Documentação estritamente afetada.

Não entregue backend desconectado do contrato frontend quando o ticket for explicitamente full-stack.

### 6. Verificar

Use o menor conjunto que prove a alteração e depois o conjunto amplo da camada:

```bash
# Backend
./gradlew :api:test
./gradlew :api:build

# Frontend
cd app
bun run lint
bun run test
bun run build

# Containers quando schema/config/runtime mudar
docker compose up -d --build api
docker compose up -d --build app
docker compose ps
```

No Windows sem Java/Bun, use Docker. Não declare sucesso de testes que não foram executados.

### 7. Revisar contra regressões

Antes de finalizar:

- Nenhuma query tenant-owned usa somente `findById(id)` sem validação equivalente.
- Nenhuma role do frontend é tratada como autoridade.
- Nenhum segredo ou token foi adicionado a arquivos/logs.
- Nenhuma migration aplicada foi editada.
- DTO backend, `types.ts`, hooks e mocks/testes estão sincronizados.
- Mutations invalidam as query keys corretas.
- Erros não viram `undefined as T` nem 500 genérico para entrada inválida.
- UI preserva pt-BR, responsividade, teclado e estados assíncronos.
- Não houve alteração não solicitada em arquivos de outros agentes.

## Barreiras de qualidade por prioridade

### P0

- Teste de integração negativo é obrigatório.
- Teste cross-tenant é obrigatório para resource access.
- Threat model curto deve aparecer no relatório final.
- Não aceitar solução apenas no frontend.
- Não manter fallback inseguro por “compatibilidade”.

### P1

- Invariante deve existir no banco quando concorrência puder quebrá-la.
- Teste de concorrência ou idempotência quando aplicável.
- Rollback/migração de dados deve ser explicado.
- Métrica/log de falha operacional para fluxo crítico.

### P2/P3

- Feature deve ter estado vazio/erro/loading.
- Acessibilidade e mobile fazem parte do aceite, não são polish opcional.
- Medir performance antes/depois em tickets de escala.

### P4

- Remover código apenas após busca de consumidores e testes.
- Documentação deve descrever o comportamento real.

## Proibições

- Não trocar a stack.
- Não editar V1-V4 ou qualquer migration já aplicada.
- Não colocar access token em `localStorage`.
- Não confiar em `orgId`, `membershipId` ou role enviados pelo cliente.
- Não usar EAGER global ou `@Transactional` em controller como correção automática de lazy loading.
- Não buscar todos os registros para filtrar/paginar em memória.
- Não criar status de tarefa derivado apenas de data.
- Não criar timer manual via “start e imediatamente stop/update”.
- Não ignorar testes porque o Dockerfile usa `-x test`.
- Não marcar task pronta com TODO, mock ou endpoint sem consumidor quando o ticket é vertical.

## Formato de entrega obrigatório

```markdown
### TASK-XXX - Resultado

**Implementado:** comportamento entregue.
**Critérios atendidos:** lista objetiva.
**Decisões:** escolhas e trade-offs.
**Arquivos alterados:** lista.
**Migração:** versão, dados afetados e estratégia.
**Segurança:** tenant, RBAC, validação e abuse cases.
**Testes executados:** comandos e resultados reais.
**Não executado:** comandos impossíveis e motivo.
**Riscos restantes:** somente riscos concretos.
**Próxima dependência:** ticket recomendado.
```

## Quando considerar concluído

Conclua somente quando comportamento, autorização, persistência, contrato, UI aplicável e testes estiverem coerentes. “Compila” não é definição de pronto. A meta é deixar uma base que uma IA menor consiga continuar sem adivinhar decisões ocultas.
