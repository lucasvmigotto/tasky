# Security And Multi-Tenancy Test Matrix

Obrigatorio para `TASK-026` e regressao continua.

## Backend

- Auth: Google audience/issuer/email verified/expired token.
- Refresh: rotacao, reuse detection, logout, switch org.
- Tenant: cada recurso tenant-owned deve testar mesmo tenant, outro tenant, inexistente.
- RBAC: admin, manager, leader, employee para projetos, atividades, membros, reports e auditoria.
- Ownership: time entries proprias vs terceiros.
- CORS/Swagger/Actuator: prod deny-by-default.
- Flyway: migrations habilitadas em Testcontainers.

## Frontend

- `apiClient`: refresh single-flight e 401/403/409.
- Auth store: restore, logout e switch org.
- Timer: start, pause, resume, stop e reload.
- Timesheet: submit/approve/reject e bloqueio de aprovadas.
- Kanban: move via drag/drop e teclado.
- Reports: empty/loading/error e export.
