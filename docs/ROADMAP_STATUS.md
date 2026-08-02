# TaskY Roadmap Status

Fonte de escopo e numeracao: `docs/ANALISE_TASKY.md`. Este quadro e conservador: uma task so pode ser marcada como concluida quando todos os criterios descritos na analise estiverem implementados e validados. Arquivo existente, migration ou teste isolado nao equivalem a conclusao.

## Status

| Task | Escopo em ANALISE_TASKY | Estado | Evidencia e pendencia principal |
|---|---|---|---|
| TASK-001 | JWT_SECRET obrigatorio e rotacao | Parcial | Configuracao obrigatoria existe; rotacao em secret manager e scan do historico nao foram comprovados. |
| TASK-002 | Validacao do Google ID token | Parcial | Validacoes e testes existem; revisao do fluxo real e seus timeouts ainda precisa ser registrada. |
| TASK-003 | IDOR e tenant em todas as queries | Parcial | Ha consultas tenant-aware e testes negativos de membership entre organizacoes/setores/equipes; nao ha inventario/teste de todos os endpoints. |
| TASK-004 | Refresh rotativo e revogacao | Parcial | Sessao rotativa, revogacao e coordenacao de refresh entre abas via Web Locks existem; concorrencia maliciosa e lifetime absoluto seguem pendentes. |
| TASK-005 | Cliente HTTP sem deadlock/retry infinito | Parcial | Single-flight 1/10/100, restore invalido sem logout concorrente e logout aguardado foram testados; faltam E2E multiaba e falhas de rede amplas. |
| TASK-006 | Autorizacao central por recurso | Parcial | `PermissionService`, gestao de membros e `/me/sector` derivam setor/equipe no servidor com testes negativos; falta validar a matriz completa dos demais recursos. |
| TASK-007 | CORS e endpoints operacionais | Concluida | Producao exige origins HTTP(S) explicitas, preflight permitido/negado esta testado, Springdoc e desativado e Actuator expoe somente health sem detalhes. |
| TASK-008 | Somente um timer aberto | Parcial | Indice parcial e testes existem; idempotencia do comando nao foi comprovada. |
| TASK-009 | Sobreposicao de horarios | Parcial | Deteccao/409 existem; policy configuravel e fluxo de resolucao completo na UI nao foram comprovados. |
| TASK-010 | Separar timer de entrada manual | Parcial | Endpoint manual existe; semantica e cobertura de timezone ainda nao fecham todo o ticket. |
| TASK-011 | Pause/resume no servidor | Parcial | Estado persistido existe; versionamento, idempotencia e reconciliacao multidispositivo seguem pendentes. |
| TASK-012 | Timezone e calendario de trabalho | Parcial | Timezone IANA foi introduzido; jornada, feriados e cobertura DST completa estao pendentes. |
| TASK-013 | Status/workflow de atividade | Parcial | Status e posicao persistidos existem; concorrencia e cobertura integral de transicoes nao foram comprovadas. |
| TASK-014 | Kanban drag-and-drop acessivel | Parcial | Mouse, touch, teclado, fallback de movimento, optimistic update e rollback foram implementados/testados; auditoria completa em browser real esta pendente. |
| TASK-015 | Subtarefas e hierarquia | Parcial | Relacao pai foi adicionada; limites de profundidade, conversao e progresso agregado estao incompletos. |
| TASK-016 | Timeline/Gantt de producao | Parcial | Timeline foi integrada ao workspace do projeto com alternativa em lista e navegacao para a atividade; zoom, edicao de datas e conectores de dependencia seguem pendentes. |
| TASK-017 | Comentarios, mencoes e feed | Parcial | Comentarios basicos existem; mencoes, feed integrado, notificacao e auditoria completa estao pendentes. |
| TASK-018 | Anexos seguros | Parcial | So ha metadata/URL; nao existem object storage gerenciado, presigned URL, MIME allowlist nem antivirus comprovados. |
| TASK-019 | Templates e recorrencia | Nao iniciada | Nao foram encontrados templates versionados nem scheduler de recorrencia idempotente. |
| TASK-020 | Planejado x realizado | Parcial | Estimativas e agregados basicos existem; validacao completa por projeto/atividade esta pendente. |
| TASK-021 | Orcamento, custo e rentabilidade | Parcial | Campos e snapshots basicos existem; alertas, historico e permissoes financeiras completas estao pendentes. |
| TASK-022 | Aprovacao/bloqueio de timesheet | Parcial | Estados foram modelados; aprovacao em lote, fechamento e excecao auditada nao foram comprovados. |
| TASK-023 | Capacidade e workload | Parcial | `Meu Setor` exibe carga planejada aberta por pessoa no escopo autorizado; disponibilidade real, ferias/feriados e capacidade temporal continuam pendentes. |
| TASK-024 | Relatorios empresariais e exports | Parcial | CSV e metricas financeiras basicas existem; PDF/XLSX, filtros salvos e export assincrono real nao existem. |
| TASK-025 | Auditoria imutavel | Parcial | Eventos/viewer basicos existem; imutabilidade operacional e cobertura transversal nao foram comprovadas. |
| TASK-026 | Testes de seguranca/multi-tenancy | Parcial | A suite backend executa 78 testes com PostgreSQL Testcontainers compartilhado e cobre membership/tenant/setor/equipe; ainda nao cobre todos os endpoints e recursos. |
| TASK-027 | Testes frontend e fluxos criticos | Parcial | Vitest/MSW executa 44 testes, incluindo auth restore, convites, Kanban, workspace e Meu Setor; cobertura ampla e E2E Playwright continuam incompletos. |
| TASK-028 | Observabilidade e erros | Parcial | Correlation ID e Problem Details existem; logs JSON, metricas, tracing e alertas estao pendentes. |
| TASK-029 | Backup, restore e continuidade | Parcial | Scripts e runbook local existem; criptografia, copia externa, PITR e teste periodico de restore nao estao implantados. |
| TASK-030 | Queries e indices | Parcial | Contagem de checklist em lote e alguns indices/queries foram melhorados; N+1 remanescentes, filtros em memoria, planos e carga continuam pendentes. |
| TASK-031 | Estados de UI | Parcial | `QueryState` cobre workspace de projeto e Meu Setor com loading, erro e vazio seguro; aplicacao uniforme nas demais paginas nao foi validada. |
| TASK-032 | Nginx e runtime | Parcial | Runtime config e gerado no startup em URL nova sem cache, HTML e no-store e apenas assets hash sao imutaveis; TLS/ingress e imagens por digest seguem pendentes. |
| TASK-033 | CI/CD reprodutivel e seguro | Parcial | Frozen install, scans, SBOM e idempotencia foram configurados; execucao verde e ambientes protegidos ainda precisam ser comprovados. |
| TASK-034 | Performance frontend | Parcial | Page size foi reduzido; query keys, bundle budget, paginacao e medicao ainda estao pendentes. |
| TASK-035 | Busca global e command palette | Parcial | Implementacao basica existe; cobertura de permissao, escala e UX completa nao foi validada. |
| TASK-036 | Notificacoes e lembretes | Parcial | Inbox in-app basico existe; preferencias, jobs, lembretes e canais externos estao pendentes. |
| TASK-037 | LGPD e governanca | Parcial | Export inicial e documento existem; exclusao/anonimizacao, legal hold, retencao automatizada e processo operacional estao pendentes. |
| TASK-038 | WCAG 2.2 AA | Parcial | Checklist e um teste acessivel existem; auditoria axe, teclado, contraste e fluxos completos nao foram executados. |
| TASK-039 | Codigo morto e contratos | Parcial | Alguns mocks/hooks foram removidos; demais candidatos e unificacao de contratos nao foram concluidos. |
| TASK-040 | Documentacao e onboarding | Parcial | Alegacoes criticas foram corrigidas; fresh-clone CI, deploy/rollback e matriz RBAC completa ainda precisam de validacao. |

## Leitura atual

- Nenhuma task esta registrada como 100% concluida sem evidencia integral dos criterios de aceite.
- `TASK-016` a `TASK-019` agora seguem a numeracao correta da analise: Timeline, Comentarios, Anexos, Templates/recorrencia.
- Prioridade operacional imediata: concluir e comprovar P0/P1 antes de tratar o produto como pronto para dados empresariais sensiveis.

## Ultima validacao local

- Data: 2026-08-01.
- Backend: `./gradlew :api:test` com 80 testes aprovados.
- Frontend: `bun run test` com 44 testes aprovados e `bun run build` concluido.
- Runtime: imagens `api` e `app` reconstruidas; `/actuator/health` respondeu `UP` e app respondeu HTTP 200.
- Banco: Flyway validou 23 migrations e aplicou `V23__membership_invitation_lifecycle.sql` com sucesso.
- Convites: pre-cadastros possuem lifecycle pendente/aceito/revogado/expirado e ativacao automatica no login institucional verificado.
