---
name: tasky-platform-enterprise
description: "Use ONLY for TaskY platform and enterprise operations: TASK-025, TASK-028, TASK-029, TASK-032, TASK-033, TASK-037, TASK-040, audit logs, observability, Docker/Nginx, CI/CD, security scans, backup/restore, SLOs, LGPD, runbooks, and production hardening."
---

# TaskY Enterprise Platform

Use com `tasky-roadmap-executor` e `tasky-project`. Para alterações Java/React, carregue as skills correspondentes.

## Objetivo

Operação enterprise significa detectar, explicar e recuperar falhas. Container “rodando” não prova disponibilidade, backup não testado não prova recuperação e log sem correlação não prova auditabilidade.

## Auditoria de negócio

Audit event é diferente de application log. Persistir append-only:

- Tenant.
- Actor user/membership e tipo de actor.
- Ação estável.
- Tipo/ID do recurso.
- Timestamp UTC.
- Request/correlation ID.
- Before/after sanitizado ou diff.
- Resultado e motivo de override.

Não registrar token, segredo, comentário sensível integral ou PII desnecessária. Definir retenção e acesso por RBAC. Horas, aprovações, roles, memberships, taxas e exclusões são prioritários.

## Observabilidade

### Logs

- JSON estruturado em produção.
- Correlation/trace ID recebido ou gerado.
- Tenant/user ID pseudonimizado quando necessário.
- Redaction central de Authorization, cookies e secrets.
- Níveis coerentes; não usar DEBUG global em produção.

### Métricas

- Request rate, errors e latency por endpoint.
- Login/refresh falho, reuse detection e rate limits.
- Timers abertos, conflitos e comandos falhos.
- Query/report/export latency.
- Jobs executados, atrasados e falhos.
- Pool de DB, JVM, container e Nginx.

### Tracing

OpenTelemetry para HTTP -> service -> DB/jobs quando o ganho justificar. Não incluir payload sensível em spans.

### Alertas

Basear em sintomas/SLO, com runbook e owner. Evitar alerta sem ação.

## Problem Details e correlação

Resposta de erro inclui código estável e `traceId`; log correspondente inclui o mesmo ID. Usuário recebe mensagem segura. Operação consegue localizar causa sem pedir screenshot de stack.

## Nginx e runtime

- TLS 1.2+ no ingress/terminador e redirect HTTPS.
- HSTS somente onde HTTPS é garantido.
- `server_tokens off`.
- CSP, nosniff, frame policy, referrer e permissions policy.
- Limite de body, timeouts e rate limit.
- Cache longo apenas para assets hash; no-cache para HTML/config runtime.
- Healthcheck de app e API.
- Não publicar PostgreSQL em produção.
- Usuário não-root e filesystem read-only quando viável.
- Pin de imagem por versão/digest e scan de CVE.

Mantenha `NGINX_ENVSUBST_FILTER=API_UPSTREAM`; não reverta para registry privado sem credenciais/requisito.

## Docker

- Criar `.dockerignore` para Git, `.env`, builds, node_modules e caches.
- Nunca COPY de `.env` ou secrets.
- Multi-stage e runtime mínimo.
- Docker build pode pular testes somente se CI já os tornou gate obrigatório.
- Healthcheck usa variáveis configuradas, não usuário fixo.
- Compose local e manifests de produção devem ter objetivos separados quando necessário.

## CI/CD

Pipeline mínimo:

1. Checkout e dependências frozen.
2. Lint/compile.
3. Testes backend/frontend/E2E conforme pipeline.
4. Migration test.
5. SAST, dependency, secret e container scan.
6. Build reprodutível.
7. SBOM e provenance.
8. Push com tag imutável.
9. Deploy em staging.
10. Smoke/migration check.
11. Aprovação para produção.
12. Rollout e rollback observáveis.

Tag/release precisa ser idempotente. Não depender de tag já existente nem supor que evento criado por `GITHUB_TOKEN` dispara outro workflow.

## Backup e desastre

Definir com a empresa:

- RPO e RTO.
- Backup completo + WAL/PITR.
- Criptografia e segregação de credenciais.
- Retenção e cópia fora do domínio de falha.
- Restore automatizado em ambiente isolado.
- Teste periódico documentado.
- Runbook de corrupção, perda de região e rollback de migration.

Volume Docker não é backup. O ticket só termina após restaurar e validar dados/aplicação.

## LGPD

- Inventário de PII e finalidade.
- Base legal e retenção.
- Export do titular.
- Correção, anonimização/exclusão conforme obrigação.
- Legal hold e dados financeiros/auditáveis.
- Acesso mínimo e log de acesso administrativo.
- Processo de incidente.
- Não coletar metadata de dispositivo sem necessidade.

## SLOs

Usar as metas do documento como ponto inicial e validar com negócio:

- Disponibilidade mensal.
- Latência p95.
- Taxa de 5xx.
- RPO/RTO.
- Sucesso/atraso de jobs.
- Zero cross-tenant leak.

Error budget orienta prioridade; não esconder indisponibilidade com retry infinito.

## Runbooks mínimos

- API indisponível.
- Banco indisponível/lento.
- Migration falhou.
- Segredo comprometido.
- OAuth indisponível.
- Fila/job parado.
- Export travado.
- Suspeita de vazamento tenant.
- Restore e rollback.

Cada runbook inclui sinais, diagnóstico, contenção, recuperação, validação e comunicação.

## Documentação

README deve refletir código real. Validar fresh clone automatizado. Documentar:

- Variáveis obrigatórias e sem valores secretos.
- Como rodar/testar.
- Arquitetura real de auth e tenant.
- Deploy/rollback.
- Matriz RBAC.
- Limitações conhecidas.

## Definição de pronto

- Audit events existem e são protegidos.
- Erros têm trace ID e logs correlacionáveis.
- Dashboards/alertas/runbooks cobrem fluxo crítico.
- Images/config/secrets são hardened e scan passam.
- CI/CD é idempotente e reprodutível.
- Restore real atende RPO/RTO acordados.
- Controles LGPD estão documentados e testados.
