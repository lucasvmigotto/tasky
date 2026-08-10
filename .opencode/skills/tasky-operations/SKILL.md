---
name: tasky-operations
description: "Use for the TaskY day-to-day dev loop and runtime troubleshooting: Docker Compose build/redeploy (cache, disk, WSL), PostgreSQL native-query errors (42P18, GROUP BY), Flyway migrations, report scoping by sector, and the quick validation commands. Trigger keywords: docker build, rebuild api, --no-cache, disco cheio, WSL, 42P18, could not determine data type, GROUP BY, migration, relatório por setor, deploy local, container."
---

# TaskY Operations — Loop de desenvolvimento e troubleshooting

Knowledge aprendida "na marra" durante o desenvolvimento do TaskY. Consulte antes de mexer em Docker/DB/reports para não repetir as mesmas perdas de tempo.

## Loop de desenvolvimento (rápido x lento)

- **Frontend é rápido**: `cd app && bun run lint && bun run test`, depois `docker compose build app && docker compose up -d app`. Só rebuild do `app`.
- **Backend é LENTO**: cada `docker compose build --no-cache api` leva ~2min+ (Gradle + bootJar). Evite rebuild desnecessário do `api` — só quando há mudança Java/migration.
- **Para trabalhar só no front**: API e DB ficam no Docker; rode `cd app && bun run dev` (Vite :5173, proxy `/api` → :8080). Não precisa rebuild de nada.
- **Mudou só frontend** → não toque no `api`. **Mudou backend** → rebuild do `api` (ver abaixo).

## Docker — armadilhas que custam tempo

1. **Cache de bind mount é traiçoeiro**: `docker compose build api` (sem flag) pode usar cache **velho** e gerar imagem sem as mudanças Java. Para backend use **sempre**:
   ```bash
   docker compose build --no-cache api && docker compose up -d api
   ```
2. **Disco C: cheio** → erros de I/O do Docker (`metadata_v2.db`, `meta.db`, `input/output error`), builds falham e até `docker image prune` falha.
   - Liberar espaço: `$env:USERPROFILE\.bun\install\cache`, `$env:LOCALAPPDATA\npm-cache`, `%TEMP%`, lixeira.
   - Recuperar depois de disco cheio / erro de I/O: `wsl --shutdown`, esperar ~10s, `docker info` (volta sozinho), depois `docker compose up -d`.
   - Ficar de olho: `(Get-PSDrive C).Free/1MB`.
3. **`app` usa o image builder do compose**; se `docker compose build app` estiver lento, ainda assim é ~1min. Nunca use `--no-cache` no `app` por padrão (só o `api` precisa).

## PostgreSQL — erros clássicos em queries nativas

1. **`42P18: could not determine data type of parameter`** — parâmetro opcional `null` usado como `(:param IS NULL OR ...)` não tem tipo inferido. Corrigir com cast no lado do `IS NULL`:
   ```sql
   AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time >= :from)
   AND (CAST(:projectId AS UUID) IS NULL OR e.project_id = :projectId)
   AND (CAST(:membershipId AS UUID) IS NULL OR e.membership_id = :membershipId)
   ```
   Aplicar em **todas** as ocorrências do arquivo (no ReportRepository há dezenas; use replaceAll por padrão).
2. **`column "e.start_time" must appear in the GROUP BY`** — quando o mesmo parâmetro (ex.: `:zone`) aparece em `SELECT` e `GROUP BY`, o PostgreSQL trata cada ocorrência como parâmetro distinto e não reconhece equivalência. Corrigir com:
   ```sql
   GROUP BY 1
   ORDER BY 1
   ```
3. `ddl-auto: validate` + Flyway: toda mudança de schema = nova migration `V{n}__nome.sql`. Nunca editar migration aplicada.

## Backend — fatos atuais do domínio

- **Multi-tenant = Setor (Department)**: admin enxerga tudo; manager (chefe de setor) só o(s) departamento(s) que gerencia; employee só ele. **Papéis hoje: admin > manager > employee** — `leader`/equipes foram removidos (V37). Se aparecer `Role.leader`/`LeaderTeam`/`Team` em código, é resquício.
- **Removidos (V37)**: etiquetas (`labels`, `activity_labels`, `time_entry_tags`), unidades solicitantes (`clients`, `projects.client_id`) e equipes (`teams`, `leader_teams`, `primary_team_id`, `responsible_team_id`). Não criar endpoints/telas para esses conceitos.
- **Relatório escopado por setor**: `ReportController.reportScope(user, orgId, departmentId)` chama `permissionService.scopedMembershipIdsForDepartment(...)`.
  - `departmentId == null` → `scopedMembershipIds` (admin=todos, manager=depto, employee=ele).
  - admin + `departmentId` → membros ativos do depto (valida que o depto é da org).
  - manager/employee ignoram `departmentId`.
- **Projeto sem responsável**: `projects.manager_membership_id` é **nullable** (V35). `CreateProjectRequest.managerMembershipId` opcional. Proteger `PermissionService.canReadProject` contra `getManagerMembership() == null`. O form não tem Responsável nem Unidade solicitante.
- **Múltiplas funções por membro**: tabela `membership_member_types` (N:N, V36). `InviteRequest`/`ChangeRoleRequest` usam `memberTypeIds` (lista). `MembershipResponse.memberTypes: [{id,name}]`. `MembershipController` é `@Transactional` (lazy da coleção). `updateSettings` aceita `memberTypeIds` (permite chefe editar funções sem mudar role).
- **Chefe do setor**: derivado de `memberships` com `role == manager && primaryDepartmentId == dept.id`. Definir chefe = `PATCH /memberships/{id}/role` com `{ role: 'manager', departmentId }` (só admin; backend já suporta).
- **Apontamento de horas**: `time_entries.glpi_ticket_id` (V34) guarda o chamado GLPI. Excluir/criar/editar NÃO tem bloqueio de período/aprovação (fluxo de aprovação foi removido do produto).
- **Relatório detalhado**: `ReportDetailedRow` expõe `projectId`, `projectColor`, `glpiTicketId`, `memberName`, `hours` (agrega cor do projeto e GLPI). `ReportSummaryResponse` NÃO tem mais `labelDistribution`.
- Endpoints financeiros (`/reports/financials/*`, `/groupings/*`, "Planejado vs Real") **não são usados na UI** (órgão público) — manter no backend, não chamar no front. Financeiros de equipe/cliente foram removidos.

## Frontend — fatos atuais

- **Menu**: Colaborador → Meu Trabalho · Minha Semana · Meu Relatório. Chefe/Admin → + Relatório do Setor · Administrador (dropdown: Visão Geral · Membros · Departamentos · Projetos). Sem Equipes/Etiquetas/Unidades.
- **AdminDepartmentsPage**: cada card mostra o **chefe do setor** (badges) + "Definir chefe" (dialog com select dos membros do setor) + contagem de projetos/membros.
- **ReportsPage é role-based**: `employee` → `CollaboratorReport`; `manager/admin` → `ManagerReport`.
- **Relatório do Setor**: se **1 setor**, `sectorId` = único depto (carrega automático). Se **2+**, admin precisa escolher (`isAdmin && !sectorId` → EmptyState "Selecione um setor" e Export desabilitado). Seletor "Ver por membro" filtra pelo setor.
- **Timesheet ("Minha Semana")**: um único formulário no modal (Horas/Descrição/GLPI) — clicar num registro preenche o mesmo form e o botão vira "Atualizar" (fecha ao salvar). Adicionar fecha ao salvar. Exclusão com confirmação (por registro ou por dia). Modal "Adicionar projeto" com busca + cores + espaçamento.
- `core/auth/permissions.ts` replica RBAC para UX (sem `leader`/`canManageLabels`); a autorização real é no backend.

## Verificação antes de entregar

1. `cd app && bun run lint && bun run test` (42 testes — os que envolviam líder/equipe foram removidos).
2. Se mudou backend: `docker compose build --no-cache api && docker compose up -d api`.
3. `docker compose build app && docker compose up -d app`.
4. `curl -s -o NUL -w "%{http_code}" http://localhost:8080/actuator/health` (espera 200) e `http://localhost:5173` (200).
5. Ver migrations no boot do api (`docker compose logs api | Select-String "Migrating|Successfully applied"`).
6. Depois de qualquer rebuild, o usuário precisa `Ctrl+Shift+R` (bundle/HTML no-cache, assets imutáveis).
