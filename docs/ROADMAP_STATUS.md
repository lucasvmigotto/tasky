# TaskY Roadmap Status

Fonte de escopo e numeracao: `docs/ANALISE_TASKY.md`. Este quadro e conservador: uma task so pode ser marcada como concluida quando todos os criterios descritos na analise estiverem implementados e validados. Arquivo existente, migration ou teste isolado nao equivalem a conclusao.

## Status

| Task | Escopo em ANALISE_TASKY | Estado | Evidencia e pendencia principal |
|---|---|---|---|
| TASK-001 | JWT_SECRET obrigatorio e rotacao | Parcial | Fail-fast + Base64≥32B; rotation runbook em `docs/runbooks/deploy.md`; gitleaks limpo; secret manager externo pendente. |
| TASK-002 | Validacao do Google ID token | Parcial | `aud/iss/exp/email_verified` + timeout + 7 testes negativos; OIDC generico (Google/Microsoft/mock) em `POST /auth/oidc` com testes RSA; code-flow com state/nonce pendente. |
| TASK-003 | IDOR e tenant em todas as queries | Parcial | Inventario de 155 rotas (`docs/perf/baseline-phase0.md`); guards T-01..T-08, finds atomicos, `TenantArchitectureTest`; matriz negativa ampliada (fase 5); cobertura literal 100% ainda nao. |
| TASK-004 | Refresh rotativo e revogacao | Parcial | Familia rotativa + reuse-revoke + metrica/alerta; lifetime absoluto e concorrencia maliciosa seguem pendentes. |
| TASK-005 | Cliente HTTP sem deadlock/retry infinito | Parcial | Single-flight 1/10/100 comprovado; faltam E2E multiaba e falhas de rede amplas. |
| TASK-006 | Autorizacao central por recurso | Parcial | `PermissionService` + matriz publicada (`docs/security/rbac-matrix.md`); checklist/activity gates corrigidos; checklist de PR exige teste negativo. |
| TASK-007 | CORS e endpoints operacionais | Concluida | Origins explicitas, preflight testado, Springdoc off em prod, Actuator minimo (+ `/prometheus` interno). |
| TASK-008 | Somente um timer aberto | Parcial | Indice parcial + advisory lock + prova paralela (10 rounds, 1 win); idempotencia de stop comprovada. |
| TASK-009 | Sobreposicao de horarios | Parcial | `EXCLUDE` no banco (relatorio pre-migracao zerado) + 409 app + prova paralela; policy configuravel e resolver completo na UI pendentes. |
| TASK-010 | Separar timer de entrada manual | Parcial | Endpoints timer/manual separados; timezone na borda; DST amplo pendente. |
| TASK-011 | Pause/resume no servidor | Parcial | Pause persistido + reconciliacao ≤10s entre abas/dispositivos (`reconcileTrackerState`, 8 testes); versionamento e offline-queue pendentes. |
| TASK-012 | Timezone e calendario de trabalho | Parcial | Timezone IANA + fallback UTC nos relatorios; jornada/feriados/DST completa pendentes. |
| TASK-013 | Status/workflow de atividade | Parcial | Enum + CHECK alinhados (V42 `IN_TESTING`); concorrencia de transicoes pendente. |
| TASK-014 | Kanban drag-and-drop acessivel | Parcial | Implementado/testado em jsdom; auditoria em browser real pendente. |
| TASK-015 | Subtarefas e hierarquia | Parcial | Relacao pai + limites; progresso agregado/conversao incompletos. |
| TASK-016 | Timeline/Gantt de producao | Parcial | Integrada com fallback em lista; zoom/edicao/conectores pendentes. |
| TASK-017 | Comentarios, mencoes e feed | Parcial | Feed/mencoes reais + notificacao com `event_key`; prefs passaram a valer para mencao (`ACTIVITY_MENTION`, V47); canais externos pendentes. |
| TASK-018 | Anexos seguros | Parcial | Metadata + `FileStorageService` (local/Azure) + MIME allowlist (incl. `text/csv`); presigned/antivirus pendentes. |
| TASK-019 | Templates e recorrencia | Parcial | Entidades + scheduler + teste existem (analise anterior estava defasada); idempotencia sob carga nao comprovada. |
| TASK-020 | Planejado x realizado | Parcial | Estimativas + agregados; validacao completa pendente. |
| TASK-021 | Orcamento, custo e rentabilidade | Parcial | Snapshots atualizados no reassign com auditoria `REASSIGN` (fase 8); alertas/historico/permissoes financeiras pendentes. |
| TASK-022 | Aprovacao/bloqueio de timesheet | Parcial | Lote + fechamento + excecao auditada (`REOPEN_LOCKED`) com testes (`TimesheetPeriodIntegrationTest`); UI de fila em lote pendente. |
| TASK-023 | Capacidade e workload | Parcial | `Meu Setor` com carga planejada; disponibilidade/ferias/capacidade temporal pendentes. |
| TASK-024 | Relatorios empresariais e exports | Parcial | CSV via worker assincrono (artefato, sem 2x query), `/detailed` limitado + `/page`, CSV do UI via jobs; PDF/XLSX e filtros salvos pendentes. |
| TASK-025 | Auditoria imutavel | Parcial | Trigger append-only + requestId; cobertura transversal e viewer RBAC completos pendentes. |
| TASK-026 | Testes de seguranca/multi-tenancy | Parcial | Suite backend com **115 testes** (PG18 Testcontainers): tenant matrix, races paralelas, OIDC RSA, periodo/fechamento; cobrir 155 rotas literalmente pendente. |
| TASK-027 | Testes frontend e fluxos criticos | Parcial | Vitest: 41 passam (+ MSW); **12 falhas pre-existentes** na arvore limpa (apiClient/authStore/AdminMembers/Notification/MySector) aguardam triagem; Playwright smoke (auth + timesheet) verde + CI. |
| TASK-028 | Observabilidade e erros | Parcial | JSON prod + MDC, Prometheus + 5 contadores, OTel env, Sentry FE/BE, dashboard + alertas commitados; collector/DSN reais e disparo comprovado pendentes. |
| TASK-029 | Backup, restore e continuidade | Parcial | WAL archiving ao vivo + drill logico 47/47 + runbooks; copia externa criptografada e PITR timestamp pendentes. |
| TASK-030 | Queries e indices | Parcial | JOIN FETCH em feed/comments com contadores assertivos; EXPLAIN saudavel; worker index; N+1 residual e carga 1M pendentes. |
| TASK-031 | Estados de UI | Parcial | `QueryState` em workspace, Meu Setor e AdminProjects; auditoria pagina-a-pagina pendente. |
| TASK-032 | Nginx e runtime | Parcial | Headers/rate-limit/cache OK; digests pinados, non-root, healthchecks, limites; TLS/ingress permanece externo. |
| TASK-033 | CI/CD reprodutivel e seguro | Parcial | Frozen, scans, SBOM, idempotencia + jobs novos (E2E smoke, contract-check); execucao verde e ambientes protegidos pendentes de prova em CI. |
| TASK-034 | Performance frontend | Parcial | Caps + keep-previous-data; chunks charts/motion split (index ~478KB); paginacao real e budget <350KB pendentes. |
| TASK-035 | Busca global e command palette | Parcial | Basica existe; permissao/escala/UX completa nao validada. |
| TASK-036 | Notificacoes e lembretes | Parcial | Inbox + prefs (agora aplicadas a mencao) + jobs; lembretes externos pendentes. |
| TASK-037 | LGPD e governanca | Parcial | Export e documento existem; exclusao/anonimizacao/legal hold/retencao pendentes. |
| TASK-038 | WCAG 2.2 AA | Parcial | Checklist + teste acessivel; auditoria axe/teclado/contraste pendente. |
| TASK-039 | Codigo morto e contratos | Parcial | OrgContext e dead export removidos; gate de contrato OpenAPI↔types no CI; varredura final pendente. |
| TASK-040 | Documentacao e onboarding | Parcial | Matriz RBAC, 4 runbooks, 6 ADRs, SLOs publicados; fresh-clone CI e protecao de branches pendentes (passo manual). |

## Plataforma (fases 0–10, 2026-09-19)

- Java 25 + Gradle 9, PostgreSQL 18 (v47), compose unico dev-only
  (api/app/db/redis/minio/mock-oauth2), OIDC generico (Google/Microsoft/mock),
  Redis cache de summary (fail-open), worker de export assincrono.
- Backend: 115 testes verdes. Frontend: 41 passam, 12 falhas pre-existentes
  comprovadas na arvore limpa. E2E Playwright verde (2 perfis). k6 smoke
  verde (p95 ~1–2ms). Contrato OpenAPI verde. Imagens rebuildadas; API e app
  healthy; WAL archiving ao vivo; drill 47/47.

## Leitura atual

- `TASK-007` segue a unica Concluida; `TASK-019` foi corrigida para Parcial
  (codigo existia, analise estava defasada).
- Prioridade restante antes de dados sensiveis: lifetime absoluto do refresh,
  code-flow OIDC, triagem dos 12 testes frontend, collector/DSN reais,
  copia externa de backup, auditoria axe e protecao de branches.
