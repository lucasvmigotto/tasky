# Analise Critica e Plano de Evolucao do TaskY

> Auditoria tecnica e funcional para transformar o TaskY em uma plataforma corporativa de gestao de trabalho e tempo, inspirada no Clockify e no Asana, sem substituir a stack atual.

**Data da analise:** 1 de agosto de 2026  
**Repositorio analisado:** monorepo TaskY (`api/` + `app/`)  
**Versao declarada:** API 1.1.0 / App 1.1.0  
**Objetivo:** uso interno real, multi-tenant, seguro, auditavel, escalavel e agradavel de usar  
**Publico deste documento:** equipe tecnica e agentes de IA encarregados da implementacao

---

## Sumario

1. [Resumo executivo](#resumo-executivo)
2. [Criterios da analise](#criterios-da-analise)
3. [Levantamento da stack atual](#1-levantamento-da-stack-atual)
4. [O que esta excelente](#2-o-que-esta-excelente-nao-mexer)
5. [O que esta ruim ou perigoso](#3-o-que-esta-ruim-ou-perigoso-corrigir)
6. [Gaps funcionais](#4-o-que-esta-faltando-gaps-funcionais)
7. [Problemas arquiteturais](#5-problemas-arquiteturais)
8. [Avaliacao de UI e UX](#6-avaliacao-de-ui-e-ux)
9. [Checklist de seguranca](#7-checklist-de-seguranca)
10. [Plano de acao executavel](#8-plano-de-acao-priorizado)
11. [Benchmark Clockify + Asana](#9-benchmark-clockify--asana)
12. [Definicao de pronto](#definicao-de-pronto-do-produto)
13. [Instrucoes para a IA executora](#instrucoes-finais-para-a-ia-executora)

---

## Resumo executivo

O TaskY nao e um prototipo vazio. Ja existe uma base full-stack relevante: multi-tenancy por organizacao, RBAC hierarquico, projetos, atividades, dependencias em DAG, timesheet semanal, timer global, clientes, tags, horas faturaveis, relatorios reais, CSV, Google OAuth, Docker e UI responsiva em pt-BR. A stack e atual, coerente e suficiente para o produto. **Nao ha justificativa para troca-la.**

Entretanto, o sistema **ainda nao deve ser tratado como enterprise ou liberado para dados empresariais sensiveis**. Existem falhas bloqueantes:

1. O segredo JWT possui fallbacks conhecidos no codigo e no Compose. Uma implantacao sem configuracao correta permite forjar tokens.
2. A autenticacao Google nao valida a audiencia do ID token. Um token emitido para outro aplicativo Google pode ser aceito.
3. Varios endpoints autenticados nao aplicam o isolamento por organizacao. Ha risco de leitura e alteracao cross-tenant por IDOR.
4. O refresh aceita token expirado sem revogacao nem revalidacao do usuario. Remocao ou rebaixamento de membro nao encerra seu acesso.
5. No frontend, o login real nao sobrevive a um recarregamento completo e o fluxo de refresh pode entrar em deadlock.
6. O timer permite entradas simultaneas por corrida concorrente; nao ha deteccao de sobreposicao.
7. O Kanban e apenas visual: nao existe status persistido nem drag-and-drop.
8. A cobertura de testes e muito baixa e parte dela cria falsa seguranca: `PermissionServiceTest` testa uma copia local da regra, nao a classe real.

### Veredito

| Dimensao | Estado atual | Veredito |
|---|---:|---|
| Stack e fundacao | Boa | Manter e consolidar |
| Seguranca | Critica | Bloqueia producao empresarial |
| Isolamento multi-tenant | Critico | Bloqueia producao empresarial |
| Time tracking | Intermediario | Util, mas sem garantias de integridade |
| Gestao de trabalho | Basico/intermediario | Longe do Asana em colaboracao e workflow |
| Relatorios | Intermediario | Boa base; faltam custo, aprovacao e formatos |
| UX desktop | Boa base | Inconsistente entre modulos |
| UX mobile | Responsiva | Nao equivale a aplicativo mobile/offline |
| Testes e observabilidade | Insuficiente | Alto risco de regressao |
| Prontidao enterprise | Nao pronta | Executar P0 e P1 antes do rollout |

### Ordem obrigatoria de evolucao

1. **P0 - Conter risco:** rotacionar segredos, corrigir OAuth, isolamento tenant, refresh e sessao.
2. **P1 - Garantir integridade:** concorrencia do timer, sobreposicao, status real, autorizacao central, auditoria e testes.
3. **P2 - Gerar valor:** Kanban DnD, subtarefas, comentarios, notificacoes, aprovacoes, planejado x realizado.
4. **P3 - Escalar:** consultas, indices, bundle, cache, observabilidade, UX uniforme e exports avancados.
5. **P4 - Lapidar:** remover codigo morto, atualizar documentacao e consistencia cosmetica.

---

## Criterios da analise

A avaliacao considerou o estado atual do working tree, incluindo arquivos ainda nao commitados. Linhas sao aproximadas e podem mudar durante a execucao dos tickets. Antes de alterar qualquer trecho, a IA executora deve localizar novamente a classe e a funcao citadas.

Foram examinados:

- Configuracoes Gradle, Bun, Vite, Vitest, Spring, Flyway, Docker, Nginx e GitHub Actions.
- Entidades, repositories, services, controllers, DTOs, filtros JWT e regras de permissao.
- Cliente HTTP, interceptors, stores Zustand, hooks React Query, rotas e paginas.
- Migracoes V1 a V4, testes backend/frontend e mocks.
- Fluxos de timer, timesheet, atividades, projetos, administracao, relatorios e autenticacao.

Nao foram feitos testes de penetracao externos, carga de producao, auditoria formal de licencas ou avaliacao visual com usuarios reais. Esses itens aparecem no plano de acao.

---

# 1. Levantamento da stack atual

## 1.1 Visao geral

| Camada | Tecnologia | Versao observada |
|---|---|---:|
| Backend | Java | 21 |
| Framework backend | Spring Boot | 4.0.6 |
| Persistencia | Spring Data JPA / Hibernate | gerenciada pelo BOM do Spring Boot |
| Seguranca | Spring Security + JJWT | JJWT 0.12.6 |
| Validacao | Jakarta Validation | gerenciada pelo BOM |
| Migracoes | Flyway + modulo PostgreSQL | gerenciada pelo BOM |
| Documentacao API | springdoc OpenAPI | 2.8.6 |
| Banco | PostgreSQL | 16 Alpine |
| Frontend | React | declarado ^19.0.0; lock 19.2.7 |
| Linguagem frontend | TypeScript | 5.7.3 |
| Build frontend | Vite | declarado ^6.1.0; lock 6.4.3 |
| CSS | Tailwind CSS | lock 4.3.1 |
| Componentes | Radix UI | varios pacotes |
| Estado servidor | TanStack Query | lock 5.101.0 |
| Estado cliente | Zustand | lock 5.0.14 |
| Rotas | React Router DOM | lock 7.17.0 |
| Formularios | React Hook Form + Zod | 7.79.0 / 3.25.76 |
| Graficos | Recharts | 2.15.4 |
| Animacoes | Motion | 12.40.0 |
| Feedback | Sonner | 2.0.7 |
| Testes frontend | Vitest + Testing Library + MSW | 3.2.6 / 16.3.2 / 2.14.6 |
| Gerenciador frontend | Bun | imagem `oven/bun:1` |
| Containers | Docker Compose | API + App + DB |
| Servidor web | Nginx | `stable-alpine` |
| CI/CD | GitHub Actions | 2 workflows |

## 1.2 Dependencias backend

Fonte: `api/build.gradle` e BOM Spring Boot 4.0.6.

### Producao

- `spring-boot-starter-web`
- `spring-boot-starter-data-jpa`
- `spring-boot-starter-security`
- `spring-boot-starter-oauth2-resource-server`
- `spring-boot-starter-validation`
- `spring-boot-starter-actuator`
- `spring-boot-flyway`
- `flyway-core`
- `flyway-database-postgresql`
- `postgresql` como runtime
- `jjwt-api`, `jjwt-impl`, `jjwt-jackson` 0.12.6
- `springdoc-openapi-starter-webmvc-ui` 2.8.6
- Lombok e configuration processor

### Testes

- Spring Boot Starter Test
- Spring Security Test
- Spring Boot Testcontainers
- Testcontainers BOM 1.20.6
- Testcontainers PostgreSQL e JUnit Jupiter

## 1.3 Dependencias frontend

Fonte declarada: `app/package.json`. A reproducibilidade efetiva vem de `app/bun.lock`.

### Producao

- Radix UI: accordion, alert-dialog, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toggle, toggle-group e tooltip.
- `@tanstack/react-query`, `zustand`, `react-router-dom`.
- `react`, `react-dom`, `react-hook-form`, `zod`.
- `recharts`, `motion`, `sonner`, `lucide-react`.
- `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`.

### Desenvolvimento

- TypeScript, Vite, plugin React, Tailwind/Vite.
- Vitest, jsdom, Testing Library e jest-dom.
- MSW.
- Tipos Node, React e React DOM.

## 1.4 Arquitetura backend

```text
api/src/main/java/io/tasky/api/
|-- config/                 # propriedades e configuracao
|-- security/               # JWT, OAuth Google, filtro, RBAC
|-- domain/
|   |-- organization/
|   |-- department/
|   |-- team/
|   |-- user/
|   |-- membership/
|   |-- project/
|   |-- label/
|   |-- activity/
|   |-- client/
|   |-- timeentry/
|   `-- report/
`-- api/                    # controllers e DTOs por recurso
```

O desenho predominante e **arquitetura em camadas organizada por dominio**:

```text
Controller REST -> Service transacional -> Repository Spring Data -> PostgreSQL
```

Nao e arquitetura hexagonal completa, pois regras dependem diretamente de JPA/repositories e controllers mapeiam DTOs. Ainda assim, a separacao atual e adequada ao tamanho do sistema se as fronteiras forem respeitadas.

## 1.5 Arquitetura frontend

```text
app/src/
|-- app/                    # router, layouts e providers
|-- core/
|   |-- api/                # cliente tipado, hooks e contratos
|   |-- auth/               # autenticacao e permissoes
|   |-- config/             # rotas/config runtime
|   |-- org/                # contexto tenant legado
|   `-- tracker/            # store global do timer
|-- modules/                # paginas por feature
|-- shared/                 # UI, layouts, charts, hooks, helpers
`-- styles/
```

Fluxo predominante:

```text
Pagina -> Hook TanStack Query -> apiClient -> /api/v1
```

Estado de servidor fica no TanStack Query; autenticacao e timer usam Zustand. Este e o desenho correto e deve ser preservado.

## 1.6 Modelo de dados atual

```text
Organization
`-- Department
    |-- Team
    `-- Project
        |-- ProjectAssignment
        |-- CrossDepartmentProjectAccess
        `-- Activity
            |-- ActivityLabel
            `-- ActivityDependency

OrganizationMembership -> User + Organization + Role
ManagerDepartment / LeaderTeam -> escopos de gestao
Client -> Organization
TimeEntry -> Organization + Membership + Project? + Activity? + Tags
```

Pontos centrais:

- Tenant boundary pretendida: `Organization`.
- Hierarquia: `admin > manager > leader > employee`.
- Atividades possuem peso Fibonacci e dependencias em DAG.
- TimeEntry armazena `start_time`, `end_time`, `duration_seconds`, `billable` e tags.
- Projeto pode ter cliente, gerente e valor/hora.

## 1.7 Autenticacao e autorizacao atuais

- Login por Google ID token: `POST /api/v1/auth/google`.
- JWT assinado com chave HMAC derivada de segredo Base64.
- Claims principais: `sub`, `email`, `org_id`, `role`, `iat`, `exp`.
- Refresh: `POST /api/v1/auth/refresh` usando o proprio bearer token.
- Troca de organizacao: `POST /api/v1/auth/switch-org`, que emite novo JWT.
- Filtro: `JwtAuthenticationFilter` monta `SecurityUser` a partir do token.
- Autorizacao: verificacoes manuais via `PermissionService` nos controllers/services.
- `@EnableMethodSecurity` esta ativo, mas nao ha uso efetivo de `@PreAuthorize`.

## 1.8 Deploy e infraestrutura

### Docker Compose

- `db`: PostgreSQL `16-alpine`, volume `pgdata`, porta 5432.
- `api`: build multi-stage Java 21, porta 8080, profile `prod`.
- `app`: build Bun e runtime Nginx, porta host 5173 para container 8080.
- Nginx envia `/api/*` para a API usando `API_UPSTREAM` e `envsubst`.

### Imagens

- API builder/runtime: `eclipse-temurin:21-jdk` e `eclipse-temurin:21-jre`.
- Frontend builder: `oven/bun:1`.
- Frontend runtime: `nginx:stable-alpine`.

### CI

- `.github/workflows/api-ci.yml`: testes Gradle, tag, build/push de imagem e release.
- `.github/workflows/app-ci.yml`: TypeScript, Vitest, tag, build/push e release.
- O README menciona workflows CD separados que nao existem.

## 1.9 Variaveis de ambiente identificadas

| Variavel | Uso | Obrigatoria em producao |
|---|---|---:|
| `POSTGRES_HOST` | Host do banco | Sim |
| `POSTGRES_PORT` | Porta do banco | Nao, padrao 5432 |
| `POSTGRES_DB` | Nome do banco | Sim |
| `POSTGRES_USER` | Usuario do banco | Sim |
| `POSTGRES_PASSWORD` | Senha do banco | Sim |
| `JWT_SECRET` | Chave HMAC em Base64 | Sim, sem fallback |
| `JWT_EXPIRATION_HOURS` | Duracao do access token | Nao |
| `GOOGLE_CLIENT_ID` | Audiencia OAuth | Sim no modo real |
| `GOOGLE_CLIENT_SECRET` | Declarada, mas nao usada | Remover ou documentar |
| `APP_CORS_ALLOWED_ORIGINS` | Origins permitidas | Sim em producao |
| `SPRING_PROFILES_ACTIVE` | Profile Spring | Sim |
| `API_UPSTREAM` | Proxy Nginx | Sim no container app |
| `NGINX_ENVSUBST_FILTER` | Limita envsubst | Sim no container app |
| `VITE_API_URL` | Proxy local do Vite | Desenvolvimento |
| `VITE_GOOGLE_CLIENT_ID` | Fallback build-time | Sobreposta por `runtime-config.js`, gerado no startup e sem cache |
| `VITE_DEMO_MODE` | Modo demonstracao | Opcional |

**Alerta:** `.env` esta ignorado pelo Git, o que e correto. Nao registrar seus valores neste documento. O problema e a existencia de fallbacks conhecidos em arquivos rastreados.

---

# 2. O que esta excelente (nao mexer)

## 2.1 Stack moderna e coerente

Java 21, Spring Boot 4, PostgreSQL 16, React 19, TypeScript, TanStack Query, Zustand, Tailwind 4 e Docker formam uma stack robusta. Trocar tecnologias agora aumentaria risco e prazo sem resolver os problemas reais, que sao de seguranca, consistencia, dominio e acabamento.

## 2.2 Fluxo de schema disciplinado

`spring.jpa.hibernate.ddl-auto: validate` e Flyway como fonte do schema sao decisoes corretas. Novas alteracoes devem continuar entrando como migracoes incrementais; migracoes aplicadas nao devem ser editadas.

Manter tambem:

- `spring.flyway.enabled: true` nos profiles.
- Dependencia `spring-boot-flyway`, necessaria no Spring Boot 4 modularizado.
- Timestamps com timezone e Hibernate em UTC.
- `open-in-view: false` como objetivo arquitetural.

## 2.3 Separacao de estado no frontend

Server state no TanStack Query e client state no Zustand e um padrao correto. Nao migrar respostas da API para stores globais. Corrigir o store de autenticacao e o timer sem destruir essa separacao.

## 2.4 Cliente API centralizado e tipado

`app/src/core/api/apiClient.ts`, `types.ts` e `hooks/index.ts` criam uma entrada unica para comunicacao. Manter o padrao:

```text
endpoint backend -> DTO -> tipo frontend -> hook Query/Mutation -> pagina
```

O cliente possui tratamento central de 401/403/429 e `ApiError`. A ideia e correta; a implementacao do refresh e que precisa ser refeita.

## 2.5 Rotas com code splitting

`app/src/app/router.tsx` aplica `React.lazy` a todas as paginas. Isso evita carregar modulos inteiros no boot e deve ser preservado. A funcao de retry deve apenas ganhar limite contra reload infinito.

## 2.6 Base visual reutilizavel

Wrappers Radix em `shared/components/ui`, Tailwind, `class-variance-authority` e `cn()` criam uma base consistente. Novas telas devem reutilizar esses componentes, evitando primitives raw em paginas.

## 2.7 UI em pt-BR e shell responsivo

O sistema possui:

- Sidebar desktop recolhivel.
- Drawer mobile com overlay.
- Botao hamburger no Topbar.
- Breakpoints e grids responsivos.
- Toast global via Sonner.
- Skeletons, empty states e error states em boa parte das telas.

Esses padroes devem ser replicados onde ainda faltam.

## 2.8 Fundacao de dominio relevante

Ja existem decisoes de produto valiosas:

- Tenant por organizacao.
- Escopo gerencial por departamento/equipe.
- Dependencias de atividades com deteccao de ciclo.
- Peso Fibonacci.
- Clientes e valor/hora por projeto.
- Horas faturaveis e tags.
- Projetos cross-department.
- Limite diario de atividade por membro.

## 2.9 Timer global e recuperacao de entrada aberta

O `TimeTrackerWidget` esta no layout global e o backend oferece `GET /time-entries/running`. A recuperacao da entrada aberta depois de reabrir a SPA e uma boa base. O delta do tick tambem tolera throttling de abas melhor do que simplesmente somar 1 a cada intervalo.

## 2.10 Relatorios reais e exportacao CSV

Resumo, detalhamento, filtros por periodo/projeto/membro e CSV ja existem. A pagina usa dados reais, possui loading/error/empty e graficos. Isso deve ser expandido, nao refeito do zero.

## 2.11 Boas protecoes pontuais

- DTOs em records reduzem mass assignment.
- Repositories Spring Data evitam SQL concatenado; nao foi encontrado SQL injection.
- `GlobalExceptionHandler` nao devolve stack trace no 500.
- `TimeEntryService.getOwnedEntry` aplica ownership corretamente.
- Exclusao do ultimo admin e bloqueada.
- Colecoes com orphan removal ja sao mutadas in-place em parte do codigo.
- Nginx evita cache de `index.html` e `runtime-config.js` e usa assets imutaveis somente em `/assets/` com hash.

---

# 3. O que esta ruim ou perigoso (corrigir)

## Legenda

- **Critico:** exploracao pode comprometer contas, tenants ou dados; bloqueia producao.
- **Alto:** pode causar perda/inconsistencia, indisponibilidade ou regressao grave.
- **Medio:** eleva custo, reduz escalabilidade ou gera comportamento confuso.
- **Baixo:** divida tecnica, documentacao e acabamento.

## 3.1 Criticos

### SEC-01 - Segredo JWT conhecido e fallback inseguro

**Evidencia:** `docker-compose.yml:15`, `api/src/main/resources/application.yml:33`, `application-dev.yml:23`.

O Compose e o YAML permitem iniciar com segredo conhecido. O segredo local atual nao deve ser reproduzido aqui, mas precisa ser considerado comprometido porque existe valor equivalente em arquivo rastreado. O profile dev tambem contem valor que nao e Base64 valido para `Base64.getDecoder()`.

**Impacto:** forja de token com role/admin e `org_id` arbitrario.

**Correcao esperada:**

```yaml
# application.yml
tasky:
  jwt:
    secret: ${JWT_SECRET}
```

```yaml
# docker-compose.yml
environment:
  JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required}
```

Depois, gerar chave nova de pelo menos 32 bytes, distribuir pelo secret manager da empresa e invalidar todas as sessoes.

### SEC-02 - Google OAuth nao valida audiencia

**Evidencia:** `api/src/main/java/io/tasky/api/security/GoogleTokenVerifier.java:20-29`.

O codigo consulta `tokeninfo` e extrai `sub`, `email`, `name` e `picture`, mas nao compara `aud` com `GOOGLE_CLIENT_ID` e nao exige `email_verified`.

**Impacto:** um ID token valido emitido para outro aplicativo Google pode autenticar no TaskY.

**Correcao sugerida:** usar a verificacao JWT do ecossistema Spring/Google ou, mantendo a implementacao atual, validar explicitamente:

```java
String audience = (String) response.get("aud");
Object emailVerified = response.get("email_verified");
if (!properties.google().clientId().equals(audience)) {
    throw new SecurityException("Invalid Google token audience");
}
if (!Boolean.parseBoolean(String.valueOf(emailVerified))) {
    throw new SecurityException("Google email is not verified");
}
```

Adicionar timeouts HTTP e nao enviar credencial em URL registrada por proxies.

### SEC-03 - Vazamento cross-tenant em atividades

**Evidencia:** `ActivityService.getActivitiesByDateRange`, aproximadamente linhas 248-261.

```java
var activities = activityRepository.findAll();
var stream = activities.stream();
```

Nao existe filtro obrigatorio por organizacao, a filtragem ocorre em memoria e a paginacao e manual.

**Impacto:** usuario autenticado pode enumerar atividades de outras empresas; consumo de memoria cresce com toda a base.

**Correcao sugerida:** tornar `orgId` obrigatorio derivado do `SecurityUser`, nunca do cliente, e paginar no banco.

```java
@Query("""
    select a from Activity a
    where a.project.department.organization.id = :orgId
      and (:from is null or a.endDatetime >= :from)
      and (:to is null or a.startDatetime <= :to)
      and (:assignedTo is null or a.assignedTo.id = :assignedTo)
      and (:projectId is null or a.project.id = :projectId)
    """)
Page<Activity> search(UUID orgId, Instant from, Instant to,
                      UUID assignedTo, UUID projectId, Pageable pageable);
```

### SEC-04 - IDOR em listagens e mutacoes

**Evidencia aproximada:**

- `ProjectController.listByOrganization/get`.
- `DepartmentController.list`.
- `TeamController.list`.
- `MembershipController.list`, expondo emails.
- `ClientController.list`.
- `LabelController.list`.
- `ProjectAssignmentController.list`.
- `CrossDepartmentAccessController.list`.
- `ActivityController.listByProject/getById/addDependency/removeDependency`.
- `ReportController.summary/detailed/export`.

Varias rotas exigem apenas autenticacao global, sem provar que o usuario pertence ao tenant ou possui escopo no recurso.

**Impacto:** leitura de PII, projetos, horas e alteracao de dependencias entre organizacoes.

**Correcao:** cada busca deve receber `activeOrganizationId()` do token revalidado e a query precisa incluir o tenant. Nao buscar por `id` sozinho quando o recurso for tenant-owned; preferir `findByIdAndOrganizationId` ou equivalente. Relatorios organizacionais devem exigir manager/admin ou politica explicita.

### SEC-05 - Refresh perpetuo e sem revogacao

**Evidencia:** `JwtTokenProvider.validateTokenIgnoringExpiry` e `AuthController.refresh`, aproximadamente linhas 95-117.

O endpoint aceita token expirado assinado e cria novo access token sem verificar DB, membership, role atual, `User.isActive`, revogacao ou familia de token.

**Impacto:** token roubado ou usuario removido pode renovar acesso indefinidamente.

**Correcao:** implementar refresh token distinto, opaco ou JWT com `typ=refresh`, `jti`, hash persistido, expiracao, rotacao e reuse detection. No refresh, reconsultar usuario e membership. Revogar familia no logout, remocao, troca de senha/role e deteccao de replay.

### FE-SEC-01 - Sessao nao sobrevive ao F5

**Evidencia:** `app/src/core/api/apiClient.ts:11-19` e `authStore.ts:115-133`.

Token e store ficam apenas em memoria. Apos reload, `getAccessToken()` retorna `null`; nao ha cookie httpOnly ou refresh token persistente para restaurar a sessao.

**Impacto:** experiencia quebrada e incentivo a solucoes inseguras como salvar access token longo no localStorage.

**Correcao:** access token curto em memoria e refresh token rotativo em cookie `HttpOnly; Secure; SameSite=Lax/Strict`, emitido pelo backend. `restore()` deve chamar `/auth/refresh` com credentials e restaurar a sessao.

### FE-SEC-02 - Deadlock e recursao infinita no refresh

**Evidencia:** `interceptors.ts:19-41`, `apiClient.ts:40-46`, `authStore.ts:38-48`.

Se `/auth/refresh` responder 401 usando o mesmo `apiClient`, ele entra novamente no interceptor enquanto `isRefreshing=true`, aguardando a propria promise. Alem disso, a repeticao apos refresh nao possui limite.

**Correcao:** criar request sem interceptor para refresh, single-flight baseada em uma unica Promise, flag `_retried` e falha tipada.

```ts
let refreshPromise: Promise<string | null> | null = null

async function refreshOnce() {
  refreshPromise ??= rawRefreshRequest().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

// request(path, options, retried = false)
if (response.status === 401 && !retried && !isRefreshPath(path)) {
  const token = await refreshOnce()
  if (token) return request(path, options, true)
}
throw new ApiError(401, 'Sessao expirada')
```

## 3.2 Altos

### DATA-01 - Corrida permite varios timers abertos

**Evidencia:** `TimeEntryService.startEntry`, `getRunningEntry` e `V3__time_entries.sql`.

Nao ha verificacao atomica nem indice unico parcial. Dois POST concorrentes podem criar duas entradas abertas; a API passa a exibir somente a mais recente.

**Correcao de banco:**

```sql
CREATE UNIQUE INDEX uq_time_entries_one_running_per_membership
ON time_entries (membership_id)
WHERE end_time IS NULL;
```

Tratar `DataIntegrityViolationException` como 409 e definir se o produto permite um timer por usuario ou um por organizacao.

### DATA-02 - Nao existe deteccao de sobreposicao

**Evidencia:** `TimeEntryService.startEntry/updateEntry`, `TimesheetPage.tsx`, `TimeTrackerPage.tsx`.

Entradas manuais podem ocupar o mesmo intervalo. O backend so verifica `end > start` em parte do fluxo.

**Correcao:** query de overlap por membership e org:

```sql
existing.start_time < :newEnd
AND COALESCE(existing.end_time, now()) > :newStart
AND existing.id <> :editingId
```

Retornar 409 com os IDs conflitantes e oferecer ao usuario editar, mesclar ou cancelar.

### PERF-01 - N+1 em time entries e relatorios

**Evidencia:**

- `TimeEntryController.toResponse`: membership/user e tags por entrada.
- `ReportService.getDetailed`: project, membership e tags por entrada.
- `ReportService.buildSummary`: labels por atividade e `labelRepository.findById` por label.
- `ActivityController.toResponse`: labels e parents por atividade.

**Impacto:** centenas/milhares de queries em telas de relatorio.

**Correcao:** projections/DTO queries para relatorios; `@EntityGraph` ou fetch join paginado com cuidado; consulta em lote para tags/parents; agregacoes SQL `GROUP BY`.

### PERF-02 - Filtros de relatorio e time entry em memoria

**Evidencia:** `ReportService.buildSummary/getDetailed`, `TimeEntryService.getEntries/getEntriesForOrganization`, `ActivityService.getTotalActivityMinutesForDate`.

As consultas carregam listas amplas e filtram datas/projeto/membro em Java.

**Correcao:** mover todos os filtros para repositories com intervalo half-open `[from, to)`, indexes compostos e pageable.

### AUTHZ-01 - Autorizacao manual inconsistente

`@EnableMethodSecurity` existe, mas `@PreAuthorize` nao e usado. Isso facilitou endpoints sem check.

**Correcao:** criar metodos tenant-aware em `PermissionService`, aplicar `@PreAuthorize` nos endpoints e manter verificacao de ownership no service. Controller nao deve ser a unica barreira.

### AUTHZ-02 - Bug de tipo no gerenciamento de atividade

**Evidencia:** `ActivityController` passa `activityId` para `permissionService.canManageProject`, que busca projeto por aquele UUID.

**Impacto:** admin/manager nao consegue executar a regra pretendida; o erro sinaliza fragilidade na API de autorizacao.

**Correcao:** `canManageActivity(SecurityUser, UUID activityId)` resolve atividade, projeto e tenant internamente.

### AUTHZ-03 - Atribuicao cross-org

**Evidencia:** `ActivityService.createActivity` busca `assignedToMembershipId` por ID e compara roles, sem validar a organizacao do projeto. Convites tambem usam referencias de departamento/equipe sem garantir o mesmo tenant.

**Correcao:** repositories tenant-scoped e validacao unica em service antes de persistir.

### AUTHZ-04 - Claims de role ficam obsoletas

JWT carrega role/org como snapshot. Apos remocao ou rebaixamento, o token continua valido. Alguns endpoints usam o role do token diretamente.

**Correcao:** access token curto, revalidacao no refresh, `tokenVersion` ou revogacao e uso consistente da membership atual para operacoes sensiveis.

### FE-01 - Timer usa relogio de parede e pause so existe no cliente

**Evidencia:** `timeTrackerStore.ts:61-69` usa `Date.now()`. Pause nao e persistido no backend; o servidor considera a entrada rodando ate o stop.

**Impacto:** alteracao de relogio, outra aba/dispositivo ou crash perde estado de pausa; reconciliacao gera duracao incorreta.

**Correcao:** modelar sessoes/segmentos ou campos `paused_at`, `paused_seconds`, versionamento otimista e comandos idempotentes `pause/resume/stop`. Para exibicao local, usar `performance.now()` apenas como auxiliar; servidor permanece autoridade.

### FE-02 - Cache React Query fica obsoleto

**Evidencia:** `useGrantCrossDepartmentAccess` nao invalida `cross-dept-access`; mutacoes de atividade/projeto nao invalidam todas as listas/detalhes; `useSwitchOrg` nao limpa caches tenant-scoped.

**Correcao:** query-key factories por dominio e tenant; invalidacao precisa; limpar/remover queries do tenant anterior na troca de org.

### INFRA-01 - CORS configurado como wildcard

`application.yml` usa `*`; `APP_CORS_ALLOWED_ORIGINS` e enviada pelo Compose, mas nao e consumida corretamente.

**Correcao:** bind da propriedade para a variavel real, lista explicita por ambiente e teste de integracao de preflight.

### INFRA-02 - Sem rate limiting

Nao ha limite para login, refresh, export e endpoints caros.

**Correcao:** rate limit por IP/usuario/tenant, preferencialmente no gateway/Nginx e complementarmente no backend para auth/export. Responder 429 com `Retry-After`.

### TEST-01 - Cobertura insuficiente e teste falso

`PermissionServiceTest` implementa funcoes privadas equivalentes e testa a copia. Frontend possui somente testes de permissions e types. MSW nao e iniciado; nao ha componentes nem E2E. Flyway esta desabilitado no profile de integracao.

**Correcao:** excluir o teste-copia e testar o bean real; ativar Flyway em Testcontainers; criar testes de isolamento, auth, timer, DAG, relatorios, stores, interceptors, paginas e E2E dos fluxos criticos.

## 3.3 Medios

### ARCH-01 - Transacoes em controllers

`ActivityController`, `TimeEntryController`, `ReportController` e `CrossDepartmentAccessController` usam `@Transactional` para manter lazy associations vivas. GETs entram em transacao read-write e o mapeamento depende desse detalhe.

**Correcao:** montar DTO/projection dentro do service transacional; controllers finos e sem transacao.

### ARCH-02 - DTOs e modelos duplicados

`core/api/types.ts` possui `TimeEntryResponse`, enquanto `core/types/models.ts` possui shapes antigos (`TimeEntry`, `Activity`, etc.). `useTimer.ts` usa o modelo legado.

**Correcao:** uma unica fonte de contratos; remover tipos/hook legados depois de provar que nao existem consumidores.

### DATA-03 - IDs compostos sem equals/hashCode

`ManagerDepartmentId`, `LeaderTeamId` e `ActivityLabel` nao implementam igualdade. Isso quebra semantica de `Set`, gera warnings Hibernate e pode causar duplicata de label na flush.

**Correcao:** `@Embeddable` e `equals/hashCode` baseados nas chaves imutaveis; deduplicar `labelIds`/tags antes de persistir.

### DATA-04 - Dados derivados podem divergir

`time_entries.organization_id` replica a org da membership e `duration_seconds` replica a diferenca entre timestamps, sem constraint de consistencia.

**Correcao:** definir autoridade de cada campo, validar no banco/service e adicionar testes. Se mantidos por performance, documentar e impedir cross-org com trigger/constraint ou service estrito.

### DATA-05 - Hard delete generalizado

Projetos, atividades, membros e entradas sao apagados. Para um sistema empresarial, isso compromete auditoria e explicacao de relatorios historicos.

**Correcao:** arquivamento/soft delete para entidades de negocio, com politica de retencao e hard delete administrativo/LGPD. Nao implementar soft delete generico sem definir consultas e constraints.

### VALID-01 - DTOs sem limites

Start/update time entry, project, activity, organization, client e label possuem campos sem `@Size`, `@Pattern`, `@DecimalMin`, `@Digits` ou `@NotNull` suficientes.

**Correcao:** validar no boundary e repetir invariantes criticas no service/banco. Definir limites de payload no Nginx/Spring.

### UX-01 - Kanban sem status real

`ActivitiesPage.getActivityStatus` deriva status de `startDatetime` e `endDatetime`. Cards sao botoes em colunas estaticas, sem DnD.

**Correcao:** enum persistido `TODO/IN_PROGRESS/DONE/BLOCKED/CANCELED`, ordem por coluna, endpoints de transicao/reorder e DnD acessivel.

### UX-02 - Timesheet cria horarios artificiais

`TimesheetPage` ancora lancamentos em 09:00 UTC e faz POST start seguido de PUT para fechar. Isso mistura comando de timer com entrada manual.

**Correcao:** endpoint atomico de entrada manual com inicio/fim/duracao e timezone da organizacao; timesheet pode editar total diario sem inventar horario ou deve exigir horario real.

### PERF-03 - Busca de 5000 atividades

`useActivityQuery` envia `size=5000` e descarta metadados. Dashboard pode executar duas buscas amplas.

**Correcao:** paginacao/infinite query, endpoints agregados para dashboard e query de calendario pelo mes.

### INFRA-03 - Pipeline e documentacao divergentes

- README descreve refresh cookie, exponential backoff, `X-Org-Id` e workflows CD que nao correspondem ao codigo.
- Tags fixas por versao falham em rerun.
- `bun install` no CI nao usa `--frozen-lock-file`.
- Login em registry `dhi.io` nao corresponde aos Dockerfiles atuais.
- Nao existe `.dockerignore`.

**Correcao:** documentar o real e tornar pipeline idempotente/reprodutivel.

## 3.4 Baixos

- `OrgContext.ts` nao e usado e cria uma segunda ideia de tenant ativo.
- `modules/time-tracker/hooks/useTimer.ts` esta orfao.
- `shared/components/activities/GanttChart.tsx` existe, mas nao e usado.
- `modules/dashboard/pages/AdminDashboardPage.tsx` esta orfao.
- Arquivos `data/*.mock.ts` nao sao consumidos; demo mode nao esta conectado a eles.
- MSW handlers existem sem `setupServer/setupWorker`.
- `ProjectsPage` e outras telas possuem imports/estados mortos.
- V2 cria funcao SQL de seed, mas o seed efetivo esta duplicado em Java.
- `AuditorAware` retorna vazio e nenhuma entidade usa a infraestrutura de auditing.
- Nginx nao desliga `server_tokens`; faltam HSTS, Permissions-Policy, COOP/CORP e limites de body.
- Healthcheck PostgreSQL fixa usuario `tasky` e quebra ao alterar `POSTGRES_USER`.
- `lazyWithRetry` pode entrar em reload infinito se o chunk continuar indisponivel.

---

# 4. O que esta faltando (gaps funcionais)

## 4.1 Modulo Time Tracking

| Capacidade | Estado | Observacao / gap |
|---|---|---|
| Timer global | Parcial | Disponivel no Topbar |
| Iniciar por projeto/atividade | Presente | Fluxo na pagina de tracker |
| Pausar/continuar | Parcial | Estado somente client-side |
| Parar timer | Presente | Atualiza entrada no backend |
| Recuperar timer aberto | Presente | `GET /running` |
| Persistencia cross-session | Parcial | Recupera running, mas pausa e sessao auth nao persistem corretamente |
| Um timer por usuario | Ausente como garantia | Falta constraint atomica |
| Multidispositivo | Ausente | Sem sincronizacao realtime/versionamento |
| Entrada manual | Presente | Tracker e timesheet |
| Timesheet semanal | Presente | Grade por projeto/dia |
| Timesheet diario/mensal | Ausente | Somente grade semanal |
| Deteccao de overlap | Ausente | Backend e frontend aceitam conflitos |
| Arredondamento | Ausente | Sem politica configuravel |
| Idle detection | Ausente | Nao detecta inatividade |
| Lembretes | Ausente | Sem reminder para timer aberto/nao preenchido |
| Aprovacao de timesheet | Ausente | Sem submissao, aprovacao ou bloqueio |
| Lock de periodo | Ausente | Entradas antigas seguem editaveis |
| Auditoria de alteracao | Ausente | Sem historico antes/depois |
| Billable/non-billable | Presente | Campo e relatorio basico |
| Taxa por projeto | Presente | `hourlyRate` |
| Custo por membro | Ausente | Sem cost rate |
| Orcamento de horas/dinheiro | Ausente | Sem budget/alertas |
| Export CSV | Presente | Relatorio detalhado |
| PDF/XLSX | Ausente | Necessario para operacao empresarial |
| API key/integracoes | Ausente/incompleto | Nao ha produto de integracao maduro |
| Quiosque | Ausente | Recurso Clockify especializado |
| Offline | Ausente | SPA depende de conexao |
| Apps desktop/mobile | Ausente | Layout responsivo nao substitui app |

### Decisoes de produto necessarias

1. Timesheet deve registrar horarios reais ou apenas duracao por dia?
2. Pause deve criar segmentos ou acumular `paused_seconds`?
3. Organizacao permite entradas sobrepostas em casos especiais?
4. Quem pode editar horas aprovadas e por quanto tempo?
5. Rate faturavel e custo devem ser versionados no momento da entrada para preservar historico?

## 4.2 Modulo Gestao de Projetos

| Capacidade | Estado | Observacao / gap |
|---|---|---|
| Lista de projetos | Presente | Cards/listagem |
| Detalhe do projeto | Presente | Atividades e assignments |
| Arquivar projeto | Parcial | `isActive=false` |
| Kanban | Parcial | Visual, sem status persistido/DnD |
| Lista de tarefas | Presente | Atividades |
| Calendario | Parcial | Somente atividades; filtros meeting/deadline vazios |
| Timeline/Gantt | Parcial/Orfao | Componente existe sem rota/uso |
| Status customizavel | Ausente | Status derivado de datas |
| Drag-and-drop | Ausente | Nenhuma biblioteca/handler DnD |
| Subtarefas | Ausente | Dependencia nao equivale a hierarquia pai-filho |
| Dependencias | Presente | DAG com ciclo detectado |
| Marcos/milestones | Ausente | Sem tipo de atividade |
| Prioridade | Ausente | Peso Fibonacci nao e prioridade |
| Campos customizados | Ausente | Sem schema de campos |
| Assignee unico | Presente | Nao ha multi-assignee |
| Seguidores | Ausente | Sem watchers |
| Comentarios | Ausente | Sem thread ou mencoes |
| Anexos | Ausente | Sem storage/antivirus/presigned URLs |
| Notificacoes | Ausente | Sem inbox/email/push |
| Templates | Ausente | Sem modelos de projeto/tarefa |
| Recorrencia | Ausente | Sem tarefas recorrentes |
| Formularios de intake | Ausente | Sem criacao por formulario |
| Portfolios | Ausente | Sem visao multi-projeto |
| Workload/capacidade | Ausente | Limite diario parcial nao e planejamento de capacidade |
| Goals/OKRs | Ausente | Fora da base atual |
| Regras/automacoes | Ausente | Sem trigger/action |
| Busca global | Ausente | Sem pesquisa unificada |
| Atividade/audit feed | Ausente | Sem timeline de eventos |

## 4.3 Integracao Time Tracking + Projetos

| Integracao | Estado | Gap |
|---|---|---|
| Vincular hora a projeto | Presente | Projeto opcional |
| Vincular hora a atividade | Presente | Atividade opcional |
| Iniciar timer dentro da atividade | Parcial | Precisa acao direta e contexto preselecionado em todas as views |
| Exibir horas na atividade | Parcial/insuficiente | Falta painel planejado, realizado, restante e custo |
| Exibir horas no projeto | Parcial | Relatorios agregam, mas detalhe nao e cockpit financeiro |
| Planejado x realizado | Ausente | Peso nao representa estimativa de horas |
| Orcamento x realizado | Ausente | Sem budget |
| Capacidade da equipe | Ausente | Sem disponibilidade/calendario de trabalho |
| Bloquear timer em projeto arquivado | Deve ser garantido | Validar backend |
| Fechar tarefa ao atingir horas | Ausente | Sem automacao |
| Aprovar horas por projeto | Ausente | Sem workflow |

## 4.4 Capacidades enterprise transversais

- SSO corporativo (OIDC/SAML), provisionamento SCIM e MFA condicionado pelo IdP.
- Politicas de sessao, dispositivos e revogacao.
- Auditoria imutavel de eventos administrativos e dados de horas.
- Retencao, exportacao e exclusao LGPD.
- Backup testado, point-in-time recovery e procedimento de desastre.
- Observabilidade com logs estruturados, metricas, tracing e alertas.
- Feature flags e rollout por organizacao.
- Webhooks assinados, API tokens com scopes e idempotency keys.
- Internacionalizacao real, timezone por org/usuario e calendario de feriados.
- SLA, runbooks, suporte e pagina de status interna.
- Acessibilidade WCAG 2.2 AA validada.

---

# 5. Problemas arquiteturais

## 5.1 Fronteira tenant nao e obrigatoria na persistencia

O maior problema estrutural e buscar recursos por UUID global sem incluir a organizacao. O tenant deve fazer parte de toda operacao de dominio:

```text
Ruim: findById(resourceId)
Bom:  findByIdAndOrganizationId(resourceId, activeOrgId)
```

Para recursos cujo caminho ate Organization passa por Project/Department, encapsular essa navegacao em repository query e nunca confiar em `orgId` enviado no payload.

## 5.2 Autorizacao espalhada

Regras estao em controllers e services, com nomes que aceitam UUID generico e permitem type confusion. A arquitetura alvo deve ser:

- Controller aplica policy declarativa.
- Service aplica invariantes/ownership novamente onde necessario.
- Repository sempre restringe tenant.
- Frontend apenas esconde/acessa UI; nunca e autoridade.

## 5.3 Mapeamento DTO depende de sessao JPA aberta

`@Transactional` no controller mascara N+1 e lazy loading. Mover o mapeamento para services/projections torna o contrato explicito, melhora testes e permite remover transacoes da camada web.

## 5.4 Agregacao de relatorio na camada Java

Relatorios carregam entidades e fazem agrupamentos em memoria. Isso nao escala e mistura leitura analitica com grafo JPA transacional. Manter PostgreSQL e criar queries de projection/agregacao; nao e necessario trocar de banco.

## 5.5 Estado de autenticacao duplicado

JWT existe na variavel de modulo do `apiClient` e no `authStore.token`. Troca de org usa `useAuthStore.setState` diretamente. Deve haver uma unica API do store para instalar/remover sessao, sincronizando cliente e estado.

## 5.6 Status de atividade modelado por inferencia

Datas de planejamento e status de workflow sao conceitos diferentes. Uma tarefa pode estar atrasada e ainda nao concluida; hoje data final passada a transforma automaticamente em "Concluido". Adicionar status explicito e preservar datas para calendario/Gantt.

## 5.7 Comandos de time entry ambiguos

O mesmo endpoint de iniciar timer e usado para criar lancamento manual em duas etapas. Separar comandos:

- `POST /time-entries/timer/start`
- `POST /time-entries/{id}/pause`
- `POST /time-entries/{id}/resume`
- `POST /time-entries/{id}/stop`
- `POST /time-entries/manual`
- `PUT /time-entries/{id}`

Todos devem aceitar idempotency key ou versionamento quando houver risco de repeticao.

## 5.8 Ausencia de trilha de auditoria

`createdAt/updatedAt` nao informa quem alterou o que. Para horas, role, membership, projetos e faturamento, e preciso evento de auditoria com actor, tenant, acao, recurso, before/after sanitizado, IP/request ID e timestamp.

## 5.9 Contrato frontend duplicado e mocks desconectados

Existem tipos legados e mocks nao consumidos. Se modo demo for requisito, ele deve funcionar por MSW com o mesmo contrato da API. Caso contrario, remover mocks para impedir falsa manutencao.

## 5.10 API sem estrategia consistente de erro

`IllegalArgumentException` vira 400 com mensagem interna; erros de JSON/tipo/constraint podem virar 500. Criar erros de dominio tipados e envelope:

```json
{
  "type": "https://tasky/errors/time-entry-overlap",
  "title": "Conflito de horario",
  "status": 409,
  "code": "TIME_ENTRY_OVERLAP",
  "detail": "Existe um registro no mesmo intervalo.",
  "traceId": "...",
  "fieldErrors": []
}
```

Usar Problem Details (`application/problem+json`) e nunca expor stack, SQL ou IDs desnecessarios.

---

# 6. Avaliacao de UI e UX

## 6.1 Avaliacao geral

A interface possui fundacao visual superior a um CRUD comum: shell responsivo, componentes reutilizaveis, animacoes, graficos, skeletons e feedback por toast. A principal fraqueza e a inconsistencia de estados entre paginas e a existencia de controles que parecem funcionais, mas nao representam uma capacidade real.

## 6.2 Matriz por pagina

| Pagina | Loading | Empty | Error | Skeleton | Observacao principal |
|---|---:|---:|---:|---:|---|
| Dashboard | Sim | Sim | Nao | Sim | Hook nao expoe erro |
| Projetos | Sim | Sim | Sim | Sim | Imports/estado de dialog mortos |
| Atividades | Sim | Sim | Sim | Sim | Kanban sem DnD/status real |
| Detalhe atividade | Sim | N/A | Sim | Sim | Boa base |
| Admin dashboard | Sim | Sim | Nao | Sim | Falha parcial pode parecer zero |
| Admin membros | Sim | Sim | Sim | Sim | Base consistente |
| Admin departamentos | Sim | Sim | Sim | Sim | Contagem de membros usa heuristica incorreta |
| Admin equipes | Sim | Sim | Sim | Sim | N requests por departamento |
| Admin projetos | Nao | Sim | Nao | Nao | Corrigir antes das demais telas admin |
| Admin labels | Sim | Sim | Sim | Sim | Boa base |
| Admin clientes | Sim | Sim | Sim | Sim | Boa base |
| Calendario | Nao efetivo | Sim | Nao | Nao | `isLoading`/Skeleton nao usados; filtros vazios |
| Timesheet | Nao | Parcial | Nao | Nao | Sem estado da pagina e sem overlap |
| Time tracker | Nao | Sim | Nao | Nao | Queries podem falhar silenciosamente |
| Relatorios | Sim | Sim | Sim | Sim | Melhor tela em estados assincronos |
| Configuracoes | Nao | Nao | Nao | Nao | Form pode parecer vazio durante carga |

## 6.3 Responsividade

### Bom

- Drawer mobile real com overlay e animacao.
- Hamburger condicional.
- Sidebar desktop colapsavel.
- Grids com breakpoints.
- Topbar adapta breadcrumbs e usuario.

### Melhorar

- Timesheet largo precisa estrategia mobile dedicada: cards por dia, horizontal scroll bem sinalizado ou modo agenda.
- Tabelas de relatorio precisam headers sticky e apresentacao mobile.
- Kanban deve suportar touch, teclado e screen reader.
- Graficos precisam descricoes/text alternatives.
- Inputs de tempo precisam ser testados em Safari/iOS e Android.

## 6.4 Feedback e prevencao de erro

Sonner e usado de forma ampla, mas toast nao substitui erro inline. Formularios devem:

- Exibir erro por campo.
- Bloquear submit duplicado.
- Preservar valores em falha.
- Pedir confirmacao em exclusoes destrutivas.
- Usar optimistic update somente com rollback.
- Informar conflito de versao/overlap com acao de resolucao.

## 6.5 Semantica enganosa

- Kanban sugere workflow, mas apenas organiza por data.
- Calendario oferece Meeting/Prazo sem produzir esses tipos.
- Icone de grip no timesheet sugere reorder inexistente.
- Dashboard quick submit apenas navega para timesheet.
- Gantt existe no codigo, mas nao no produto.

Remover affordances falsas ou implementar a capacidade. Produto empresarial perde confianca quando controles aparentam fazer mais do que fazem.

## 6.6 Performance percebida

- Rotas sao lazy, positivo.
- Bundle principal observado anteriormente em torno de 545 kB minificado merece reducao.
- Recharts/Motion devem permanecer nos chunks de suas rotas.
- Evitar `size=5000`; usar endpoints agregados.
- Prefetch ao navegar pode ser aplicado a detalhes frequentes.
- Skeleton deve espelhar layout final para reduzir layout shift.

## 6.7 Acessibilidade

Nao ha evidencia de auditoria WCAG completa. Antes do rollout:

- Testar navegacao integral por teclado.
- Garantir foco em dialogs/drawers e retorno de foco.
- Adicionar labels/aria para graficos, timer e DnD.
- Testar contraste nos estados muted e badges.
- Respeitar `prefers-reduced-motion`.
- Anunciar mudancas do timer via regiao `aria-live` sem atualizar a cada segundo de forma intrusiva.

---

# 7. Checklist de seguranca

| Controle | Estado | Risco | Acao |
|---|---|---|---|
| Segredo JWT externo | Falha | Critico | Remover fallbacks e rotacionar |
| Algoritmo JWT forte | Parcial | Medio | Fixar algoritmo/chave minima e claims |
| Validacao `iss/aud/typ` JWT | Falha | Alto | Validar claims esperadas |
| Refresh token distinto | Falha | Critico | Cookie httpOnly + rotacao/revogacao |
| Logout/revogacao | Falha | Alto | Revogar familia/sessao |
| Revalidacao membership | Falha | Critico | Consultar DB no refresh e operacoes sensiveis |
| Audiencia Google | Falha | Critico | Comparar `aud` com client ID |
| Email Google verificado | Falha | Alto | Exigir `email_verified` |
| Timeout chamada Google | Falha | Alto | Configurar connect/read timeout |
| Tenant scoping | Falha | Critico | Query tenant-aware em todos os recursos |
| RBAC backend | Parcial | Critico | Policy central + testes |
| RBAC frontend | Parcial | Medio | Alinhar escopos, sem tratar UI como seguranca |
| Ownership time entry | Bom parcial | Medio | Expandir testes |
| CSRF | Aceitavel hoje | Baixo | Reavaliar ao adotar cookie; SameSite + CSRF quando necessario |
| CORS | Falha | Alto | Origins explicitas por ambiente |
| CSP | Parcial | Medio | Endurecer diretivas e testar OAuth |
| HSTS | Ausente | Medio | Configurar no terminador TLS |
| Headers Nginx | Parcial | Medio | Permissions-Policy, COOP/CORP, server_tokens |
| TLS | Externo/nao comprovado | Alto | TLS 1.2+ no ingress e redirect HTTPS |
| Rate limiting | Ausente | Alto | Auth, export e endpoints caros |
| Limite de payload | Ausente | Medio | Nginx + Spring + DTO limits |
| SQL injection | Sem evidencia | Baixo | Manter repositories parametrizados |
| Mass assignment | Bem controlado | Baixo | Manter DTO records |
| Validacao de entrada | Insuficiente | Alto | Bean Validation + dominio + DB |
| Overlap/concurrency | Falha | Alto | Constraint e locks/versionamento |
| Upload seguro | N/A | Futuro | Presigned, MIME, tamanho, antivirus |
| Logs sem segredo | Nao comprovado | Alto | Redaction e logs estruturados |
| Auditoria de negocio | Ausente | Alto | AuditEvent imutavel |
| Dependencias auditadas | Nao automatizado | Medio | Dependabot/Renovate + audit CI |
| SAST/secret scanning | Nao comprovado | Alto | CodeQL, Gitleaks/TruffleHog |
| DAST | Ausente | Medio | OWASP ZAP em staging |
| Backup/restore | Nao documentado | Alto | PITR e teste de restauracao |
| LGPD | Nao documentado | Alto | Retencao, export, exclusao, base legal |
| Swagger publico | Sim | Medio | Restringir/desabilitar em prod |
| Actuator | Health publico | Baixo | Expor apenas health minimo |
| DB exposto na porta host | Sim | Medio | Nao publicar em producao |

## 7.1 Comandos de auditoria recomendados

Executar em CI e registrar artefatos, sem atualizar dependencias automaticamente no mesmo PR:

```bash
cd app && bun audit
./gradlew :api:dependencies
docker scout cves <imagem-api>
docker scout cves <imagem-app>
```

Adicionar CodeQL e secret scanning. Qualquer segredo encontrado no historico deve ser rotacionado; apagar somente do HEAD nao o torna seguro.

---

# 8. Plano de acao priorizado

## Regras de execucao

- P0 bloqueia qualquer uso com dados reais.
- P1 bloqueia rollout geral ou confiabilidade operacional.
- P2 entrega capacidades centrais Clockify/Asana.
- P3 melhora escala, operacao e qualidade.
- P4 e limpeza/cosmetica.
- Esforco: **P** ate 2 dias, **M** 3-5 dias, **G** 1-2 semanas, **GG** epico multi-sprint.
- Estimativas sao relativas e devem ser refinadas depois do primeiro teste de integracao.

## Seguranca e isolamento

### TASK-001 | P0 - Rotacionar e tornar obrigatorio o JWT_SECRET

**Problema:** segredo/fallback conhecido permite forjar tokens.  
**Solucao:** remover todos os defaults, validar Base64 e minimo de 32 bytes no startup, provisionar chave nova no secret manager e invalidar tokens antigos. Fazer secret scan do historico.  
**Arquivos:** `docker-compose.yml`, `api/src/main/resources/application*.yml`, `TaskYProperties.java`, documentacao e pipeline.  
**Esforco:** P  
**Dependencias:** nenhuma.

### TASK-002 | P0 - Corrigir validacao do Google ID token

**Problema:** `aud` e `email_verified` nao sao verificados; chamada nao possui timeout.  
**Solucao:** validar assinatura, issuer, audience, expiracao e email verificado com componente apropriado do ecossistema atual; adicionar timeouts e testes para audience incorreta.  
**Arquivos:** `GoogleTokenVerifier.java`, `TaskYProperties.java`, `AuthController.java`, testes.  
**Esforco:** M  
**Dependencias:** TASK-001.

### TASK-003 | P0 - Fechar IDOR e impor tenant em todas as queries

**Problema:** endpoints listam/leem recursos por ID/org arbitrario sem membership.  
**Solucao:** inventariar endpoints, derivar org do usuario autenticado, criar repository methods tenant-aware e negar cross-org por padrao. Adicionar testes parametrizados para todos os tenants.  
**Arquivos:** todos os controllers/services/repositories de activity, project, membership, department, team, client, label, reports e assignments.  
**Esforco:** GG  
**Dependencias:** TASK-002 apenas para fluxo de teste real; pode iniciar em paralelo.

### TASK-004 | P0 - Implementar sessao com refresh rotativo e revogacao

**Problema:** token expirado renova indefinidamente; login some no F5.  
**Solucao:** criar entidade/tabela de sessao ou refresh token hasheado, cookie httpOnly Secure SameSite, access token curto, rotacao, reuse detection, logout e revogacao por usuario/org. Revalidar user/membership/role.  
**Arquivos:** migration V5+, auth/security backend, `apiClient.ts`, `interceptors.ts`, `authStore.ts`, login e testes.  
**Esforco:** GG  
**Dependencias:** TASK-001, TASK-002.

### TASK-005 | P0 - Eliminar deadlock e retry infinito do cliente HTTP

**Problema:** refresh 401 trava fila; retry recursivo e ilimitado; falha retorna `undefined as T`.  
**Solucao:** raw client para refresh, promise single-flight, um retry por request, erro tipado e logout atomico. Testar 1, 10 e 100 requests concorrentes.  
**Arquivos:** `apiClient.ts`, `interceptors.ts`, `authStore.ts`, testes Vitest/MSW.  
**Esforco:** M  
**Dependencias:** coordenar contrato com TASK-004.

### TASK-006 | P0 - Centralizar autorizacao por recurso

**Problema:** verificacoes manuais foram omitidas e ha type confusion de UUID.  
**Solucao:** adicionar policies claras (`canReadProject`, `canManageActivity`, etc.), `@PreAuthorize` onde adequado e invariantes no service. Corrigir activityId passado como projectId.  
**Arquivos:** `PermissionService.java`, `SecurityConfig.java`, controllers/services e testes.  
**Esforco:** G  
**Dependencias:** TASK-003.

### TASK-007 | P0 - Corrigir CORS e exposicao de endpoints operacionais

**Problema:** wildcard efetivo; Swagger publico em prod.  
**Solucao:** bind real de `APP_CORS_ALLOWED_ORIGINS`, fail-fast em prod, testes preflight, desabilitar/restringir Swagger e limitar Actuator.  
**Arquivos:** `application*.yml`, `TaskYProperties.java`, `SecurityConfig.java`, Compose.  
**Esforco:** P  
**Dependencias:** nenhuma.

## Integridade do time tracking

### TASK-008 | P1 - Garantir somente um timer aberto

**Problema:** POST concorrente cria varios timers.  
**Solucao:** indice unico parcial, tratamento 409, comando idempotente e teste concorrente.  
**Arquivos:** migration V5+, `TimeEntryRepository.java`, `TimeEntryService.java`, handler e testes.  
**Esforco:** M  
**Dependencias:** TASK-003.

### TASK-009 | P1 - Detectar e resolver sobreposicao de horarios

**Problema:** entradas conflitantes geram horas duplicadas.  
**Solucao:** query de overlap no backend, policy configuravel, erro 409 com conflitos e UI de resolucao. Aplicar em create/update/timer.  
**Arquivos:** timeentry backend, migration/indexes, `TimesheetPage.tsx`, `TimeTrackerPage.tsx`, tipos/hooks.  
**Esforco:** G  
**Dependencias:** TASK-008.

### TASK-010 | P1 - Separar timer de entrada manual

**Problema:** timesheet usa start + update e horario artificial de 09:00 UTC.  
**Solucao:** endpoint atomico manual; definir semantica duracao versus horario; preservar timezone. Manter endpoints timer separados.  
**Arquivos:** controller/service/DTO timeentry, `hooks/index.ts`, timesheet/tracker e testes.  
**Esforco:** G  
**Dependencias:** TASK-009.

### TASK-011 | P1 - Persistir pause/resume no servidor

**Problema:** pausa so existe no browser e se perde entre dispositivos/sessoes.  
**Solucao:** modelar segmentos ou paused state, versionar entrada, endpoints idempotentes e reconciliar widget em realtime/refetch.  
**Arquivos:** migration, `TimeEntry`, service/controller, `timeTrackerStore.ts`, widget/pagina.  
**Esforco:** G  
**Dependencias:** TASK-008, TASK-010.

### TASK-012 | P1 - Implementar timezone e calendario de trabalho

**Problema:** UTC e horarios artificiais produzem dia errado para usuarios; nao ha timezone da org.  
**Solucao:** adicionar timezone IANA em org/usuario, converter apenas na borda, periodos half-open e testes de DST. Definir semana, jornada e feriados.  
**Arquivos:** migration, organization/membership settings, helpers de data, todas as telas de tempo/reports.  
**Esforco:** G  
**Dependencias:** TASK-010.

## Gestao de projetos estilo Asana

### TASK-013 | P1 - Criar status persistido e workflow de atividade

**Problema:** status e inferido de datas; tarefa atrasada vira concluida.  
**Solucao:** enum de status, posicao, timestamps de transicao, endpoints move/reorder e filtros. Planejar migration de dados pelo comportamento atual.  
**Arquivos:** migration, `Activity`, DTO/service/controller, types/hooks, Activities/Detail/Calendar/Reports.  
**Esforco:** G  
**Dependencias:** TASK-003, TASK-006.

### TASK-014 | P1 - Implementar Kanban drag-and-drop acessivel

**Problema:** cards apenas navegam; nao ha DnD.  
**Solucao:** usar biblioteca React compativel com a stack, optimistic update com rollback, teclado/touch, reorder persistido e concorrencia por versao.  
**Arquivos:** `ActivitiesPage.tsx`, componentes Kanban, hooks e endpoints da TASK-013.  
**Esforco:** G  
**Dependencias:** TASK-013.

### TASK-015 | P2 - Implementar subtarefas e hierarquia

**Problema:** dependencia DAG nao representa decomposicao pai-filho.  
**Solucao:** `parent_activity_id`, regras de profundidade, progresso agregado, indentacao na lista, breadcrumbs e conversao de tarefa/subtarefa.  
**Arquivos:** migration, activity backend/frontend e relatorios.  
**Esforco:** G  
**Dependencias:** TASK-013.

### TASK-016 | P2 - Ativar Timeline/Gantt de producao

**Problema:** componente Gantt esta orfao e nao cobre edicao/escala/dependencias.  
**Solucao:** integrar ao detalhe do projeto, exibir dependencias, zoom dia/semana/mes, drag de datas com validacao e caminho critico futuro.  
**Arquivos:** `GanttChart.tsx`, router/routes, ProjectDetail, activity APIs.  
**Esforco:** G  
**Dependencias:** TASK-013, TASK-014.

### TASK-017 | P2 - Comentarios, mencoes e feed de atividade

**Problema:** nao ha colaboracao dentro da tarefa.  
**Solucao:** comentarios tenant-scoped, edicao/exclusao com auditoria, `@mentions`, feed de eventos e notificacao. Comecar com polling/refetch; WebSocket somente quando necessario.  
**Arquivos:** migrations e novo dominio comment/event, APIs, ActivityDetail, notifications.  
**Esforco:** GG  
**Dependencias:** TASK-003, TASK-006, TASK-025.

### TASK-018 | P2 - Anexos seguros

**Problema:** tarefas nao aceitam documentos.  
**Solucao:** storage de objetos, URLs assinadas, metadata no Postgres, limites, MIME allowlist, antivirus, ownership e exclusao auditada.  
**Arquivos:** novo dominio attachment, config/storage, ActivityDetail.  
**Esforco:** GG  
**Dependencias:** TASK-003, TASK-017.

### TASK-019 | P2 - Templates e tarefas recorrentes

**Problema:** projetos repetitivos exigem criacao manual.  
**Solucao:** templates versionados de projeto/tarefa e recorrencia com job idempotente, timezone e proxima execucao.  
**Arquivos:** migrations, novos services/controllers, UI admin/projetos, scheduler.  
**Esforco:** GG  
**Dependencias:** TASK-012, TASK-013, TASK-015.

## Fusao tempo + trabalho

### TASK-020 | P1 - Planejado x realizado por atividade/projeto

**Problema:** peso Fibonacci nao informa horas planejadas; nao ha desvio.  
**Solucao:** adicionar estimativa em segundos/minutos separada do peso, agregar realizado das time entries, restante, desvio e progresso.  
**Arquivos:** migration, activity/project/reports backend, detalhe e dashboards.  
**Esforco:** G  
**Dependencias:** TASK-009, TASK-013.

### TASK-021 | P2 - Orcamento, custo e rentabilidade

**Problema:** hourly rate parcial nao permite margem, budget ou historico.  
**Solucao:** budget horas/valor, cost rate por membership, snapshots de taxas, alertas 50/80/100%, margem e permissoes financeiras.  
**Arquivos:** migrations, project/membership/timeentry/report, admin e reports.  
**Esforco:** GG  
**Dependencias:** TASK-020.

### TASK-022 | P2 - Aprovacao e bloqueio de timesheet

**Problema:** horas podem ser editadas sem workflow.  
**Solucao:** draft/submitted/approved/rejected/locked, comentarios de rejeicao, aprovacao em lote, periodo de fechamento e excecao auditada.  
**Arquivos:** migrations, timeentry/timesheet approval, admin/manager UI e auditoria.  
**Esforco:** GG  
**Dependencias:** TASK-009, TASK-025.

### TASK-023 | P2 - Capacidade e workload

**Problema:** nao existe distribuicao de carga planejada.  
**Solucao:** disponibilidade por membro, estimativas por periodo, ferias/feriados e visual workload com sobrecarga.  
**Arquivos:** membership/calendar/activity/report e nova pagina.  
**Esforco:** GG  
**Dependencias:** TASK-012, TASK-020.

### TASK-024 | P2 - Relatorios empresariais e exports

**Problema:** CSV e resumo basico nao atendem financeiro/gestao.  
**Solucao:** salvar filtros, agrupamentos, billable/cost/revenue/margin, PDF e XLSX, export assincrono para grandes volumes e controle de acesso.  
**Arquivos:** report repositories/services/controllers, frontend reports, jobs/storage.  
**Esforco:** GG  
**Dependencias:** TASK-020; TASK-021 para financeiro.

## Plataforma, qualidade e operacao

### TASK-025 | P1 - Implementar auditoria imutavel

**Problema:** nao ha trilha de quem alterou horas, roles e dados financeiros.  
**Solucao:** tabela/eventos append-only, actor/tenant/resource/action/before-after/request ID, mascaramento de PII e viewer com RBAC.  
**Arquivos:** migration, auditoria transversal, security context e pagina admin.  
**Esforco:** G  
**Dependencias:** TASK-003, TASK-006.

### TASK-026 | P1 - Criar suite de testes de seguranca e multi-tenancy

**Problema:** testes nao capturam IDOR/RBAC; `PermissionServiceTest` testa copia.  
**Solucao:** testar classe real, matriz role x recurso x tenant, todos os endpoints, refresh/OAuth/CORS, ownership e migrations Flyway com Testcontainers.  
**Arquivos:** `api/src/test`, `application-test.yml`.  
**Esforco:** GG  
**Dependencias:** acompanhar TASK-002, TASK-003, TASK-004, TASK-006.

### TASK-027 | P1 - Testar frontend, interceptors e fluxos criticos

**Problema:** zero testes de componentes/stores; MSW inativo.  
**Solucao:** setup MSW, testes de apiClient concorrente, authStore, timer, formularios, paginas e acessibilidade basica. Adicionar Playwright para login, timer, timesheet, Kanban e org switch.  
**Arquivos:** `vitest.config.ts`, `src/test`, `msw`, paginas e novo Playwright config.  
**Esforco:** GG  
**Dependencias:** TASK-004, TASK-005, TASK-014.

### TASK-028 | P1 - Observabilidade e tratamento de erros

**Problema:** erros nao possuem codigo/trace; logs e metricas operacionais sao insuficientes.  
**Solucao:** Problem Details, correlation ID, logs JSON, metricas de auth/timer/query/export, tracing OpenTelemetry e alertas. Nunca logar tokens/PII.  
**Arquivos:** GlobalExceptionHandler, filtros/config, frontend error handling, infraestrutura.  
**Esforco:** G  
**Dependencias:** TASK-004.

### TASK-029 | P1 - Backup, restauracao e continuidade

**Problema:** volume Docker nao constitui estrategia de backup.  
**Solucao:** backup criptografado, PITR, retencao, teste mensal de restore, RPO/RTO, runbook e ambiente de recuperacao.  
**Arquivos:** infraestrutura/documentacao, nao apenas codigo.  
**Esforco:** G  
**Dependencias:** definicao do ambiente de producao.

### TASK-030 | P2 - Otimizar queries e indices

**Problema:** N+1, filtros em memoria e indices ausentes.  
**Solucao:** projections/agregacoes, pageable, query plans com EXPLAIN ANALYZE, indices para org/membership/time ranges/activity e teste de carga.  
**Arquivos:** repositories/services, migrations, relatorios e dashboard.  
**Esforco:** GG  
**Dependencias:** TASK-003, TASK-009, contrato funcional de reports.

### TASK-031 | P2 - Padronizar estados de UI

**Problema:** paginas importantes nao exibem loading/error/skeleton.  
**Solucao:** aplicar padrao do ReportsPage a AdminProjects, Calendar, Timesheet, TimeTracker, Settings e dashboards; erro parcial quando multiplas queries.  
**Arquivos:** paginas citadas e componentes shared.  
**Esforco:** M  
**Dependencias:** nenhuma.

### TASK-032 | P2 - Endurecer Nginx e runtime

**Problema:** headers incompletos, sem body limit/rate limit/server_tokens e DB publicada.  
**Solucao:** configurar headers no terminador TLS, limites, timeouts, rate zones, `server_tokens off`, healthchecks, nao expor DB em producao e imagens pinadas por digest.  
**Arquivos:** nginx configs, Dockerfiles, Compose/deploy.  
**Esforco:** M  
**Dependencias:** TASK-007.

### TASK-033 | P2 - Tornar CI/CD reprodutivel e seguro

**Problema:** tags falham em rerun, lock nao e frozen, registries/documentacao divergentes e sem scans.  
**Solucao:** versionamento idempotente, `bun install --frozen-lock-file`, cache, testes obrigatorios, SBOM, SAST, secret/dependency/container scan e ambientes protegidos.  
**Arquivos:** `.github/workflows`, README, Dockerfiles.  
**Esforco:** M  
**Dependencias:** TASK-001.

### TASK-034 | P3 - Melhorar performance frontend

**Problema:** `size=5000`, queries repetidas, chunk principal grande e invalidacao imprecisa.  
**Solucao:** query-key factories, paginacao, endpoints agregados, lazy de graficos, analisar bundle e budget no CI.  
**Arquivos:** hooks, router, dashboards, calendar, reports, Vite.  
**Esforco:** G  
**Dependencias:** TASK-030.

### TASK-035 | P3 - Busca global e command palette

**Problema:** usuario precisa navegar modulo a modulo.  
**Solucao:** endpoint de busca tenant-aware para projetos/atividades/membros, command palette com atalhos e permissoes.  
**Arquivos:** search backend, Topbar e componentes shared.  
**Esforco:** G  
**Dependencias:** TASK-003, TASK-030.

### TASK-036 | P3 - Notificacoes e lembretes

**Problema:** sistema nao avisa atraso, mencao, timer aberto ou timesheet faltante.  
**Solucao:** notification inbox, preferencias, jobs idempotentes e canais email/in-app. WebSocket/SSE apenas para atualizacao quando necessario.  
**Arquivos:** novo dominio notification, scheduler, UI e settings.  
**Esforco:** GG  
**Dependencias:** TASK-012, TASK-017, TASK-022.

### TASK-037 | P3 - LGPD e governanca de dados

**Problema:** nao ha retencao, exportacao do titular ou processo de exclusao.  
**Solucao:** mapa de dados, politicas, export, anonimizacao/exclusao, legal hold e auditabilidade.  
**Arquivos:** dominios de user/audit/timeentry, jobs e documentacao.  
**Esforco:** GG  
**Dependencias:** TASK-025, TASK-029.

### TASK-038 | P3 - Acessibilidade WCAG 2.2 AA

**Problema:** nao ha validacao sistematica.  
**Solucao:** axe em testes, keyboard flows, foco, contraste, reduced motion, DnD acessivel e graficos com alternativa textual.  
**Arquivos:** app inteiro, testes e design tokens.  
**Esforco:** G  
**Dependencias:** TASK-014, TASK-031.

### TASK-039 | P4 - Remover codigo morto e unificar contratos

**Problema:** stores, hooks, components, mocks e tipos orfaos confundem manutencao.  
**Solucao:** confirmar por busca/testes e remover `OrgContext`, `useTimer`, dashboard duplicado, tipos legados e imports mortos; decidir oficialmente entre demo via MSW ou sem mocks.  
**Arquivos:** frontend core/modules/shared.  
**Esforco:** M  
**Dependencias:** TASK-027.

### TASK-040 | P4 - Corrigir documentacao e onboarding

**Problema:** README promete comportamentos inexistentes e instrui registries/workflows incorretos.  
**Solucao:** documentar arquitetura real, auth, comandos, deploy, variaveis, runbooks e matriz RBAC; adicionar `.dockerignore`; validar fresh clone em CI.  
**Arquivos:** README, docs, env examples, Docker/CI.  
**Esforco:** M  
**Dependencias:** atualizar continuamente; finalizar depois de TASK-033.

## Sequencia recomendada por ondas

| Onda | Tickets | Resultado |
|---|---|---|
| 0 - Contencao | 001-007 | Fecha comprometimento imediato |
| 1 - Integridade | 008-012, 025-029 | Tempo confiavel, auditavel e operavel |
| 2 - Core Asana | 013-020 | Workflow real, Kanban, hierarquia e planejamento |
| 3 - Gestao | 021-024, 030-033 | Financeiro, aprovacao, escala e deploy |
| 4 - Excelencia | 034-040 | Busca, notificacoes, LGPD, a11y e limpeza |

---

# 9. Benchmark Clockify + Asana

> A coluna TaskY descreve o codigo analisado, nao intencoes do README.

| Funcionalidade | Clockify | Asana | TaskY atual | Gap principal |
|---|---:|---:|---|---|
| Timer global | Sim | Nao nativo | Parcial | Integridade, sessao, multidispositivo |
| Timer por tarefa | Sim | Integracoes | Sim parcial | Acao direta em todas as views |
| Pause/resume persistido | Sim | N/A | Nao | Somente cliente |
| Entrada manual | Sim | N/A | Sim | Fluxo atomico/timezone |
| Timesheet semanal | Sim | Nao central | Sim | Loading, overlap, aprovacao |
| Aprovacao de timesheet | Sim | Via workflows | Nao | Workflow completo |
| Deteccao de idle | Sim | Nao | Nao | Agente/browser policy |
| Lembretes de timer | Sim | Regras | Nao | Notifications/jobs |
| Deteccao de overlap | Sim/controles | N/A | Nao | Constraint e UX |
| Billable | Sim | Nao central | Sim | Rate historico |
| Clientes | Sim | Campos/projetos | Sim | Portal/faturamento |
| Budget de projeto | Sim | Parcial | Nao | Horas e valor |
| Custo/rentabilidade | Planos pagos | Portfolios/campos | Nao | Cost rate e margem |
| Relatorio resumo | Sim | Dashboards | Sim | Escala e customizacao |
| Relatorio detalhado | Sim | Search/reporting | Sim | N+1, presets |
| CSV | Sim | Sim | Sim | Export grande assincrono |
| PDF/XLSX | Sim | Variavel | Nao | Implementar |
| Lista de tarefas | Basico | Sim | Sim | Ordenacao/status/filtros |
| Kanban | Nao central | Sim | Visual | Status real + DnD |
| Drag-and-drop | N/A | Sim | Nao | Implementar acessivel |
| Status customizado | Nao central | Sim | Nao | Workflow persistido |
| Subtarefas | Nao central | Sim | Nao | Hierarquia |
| Dependencias | Nao central | Sim | Sim | Visual/timeline e permissao |
| Timeline/Gantt | Nao central | Sim | Orfao | Integrar e editar |
| Calendario | Sim | Sim | Parcial | Tipos/filtros e UX |
| Marcos | Nao central | Sim | Nao | Tipo milestone |
| Prioridade | Tags | Campos | Nao | Campo proprio |
| Peso Fibonacci | Nao | Via campo | Sim | Manter separado de estimativa |
| Estimativa de horas | Sim | Sim | Nao | Planejado x realizado |
| Comentarios | Limitado | Sim | Nao | Thread/mencoes |
| Anexos | Nao central | Sim | Nao | Storage seguro |
| Mencoes | Nao central | Sim | Nao | Comentarios/notificacoes |
| Inbox/notificacoes | Alertas | Sim | Nao | In-app/email |
| Templates | Sim | Sim | Nao | Projeto/tarefa |
| Recorrencia | Sim | Sim | Nao | Scheduler |
| Formularios | Nao central | Sim | Nao | Intake |
| Campos customizados | Parcial | Sim | Nao | Schema e filtros |
| Regras/automacao | Parcial | Sim | Nao | Trigger/action |
| Portfolios | Nao | Sim | Nao | Multi-projeto |
| Workload | Scheduling | Sim | Nao | Capacidade |
| Goals/OKR | Nao | Sim | Nao | Futuro, nao prioritario |
| Busca global | Sim | Sim | Nao | Search tenant-aware |
| Multi-organizacao | Sim | Sim | Sim | Seguranca e cache na troca |
| RBAC | Sim | Sim | Parcial | Falhas de escopo/IDOR |
| SSO corporativo | Pago | Enterprise | Google somente | OIDC/SAML/SCIM |
| API/Webhooks | Sim | Sim | API interna | Tokens scoped/webhooks |
| Audit log | Pago | Enterprise | Nao | Auditoria imutavel |
| App mobile | Sim | Sim | Nao | Apenas web responsiva |
| App desktop | Sim | Desktop/web | Nao | Avaliar depois do core |
| Offline | Apps | Parcial | Nao | Estrategia futura |
| Integracoes | Muitas | Muitas | Nao | Webhooks/API primeiro |
| Seguranca enterprise | Madura | Madura | Critica | Onda 0 obrigatoria |

## 9.1 O que torna o TaskY potencialmente superior para a empresa

Nao e necessario copiar cada detalhe dos concorrentes. O diferencial deve ser a fusao nativa:

1. Planejamento de atividade e horas no mesmo modelo.
2. Timer iniciado da tarefa sem extensao de terceiro.
3. Planejado x realizado x custo x faturamento em tempo real.
4. Capacidade da equipe ligada a prazos e dependencias.
5. Aprovacao de horas dentro do workflow do projeto.
6. Relatorio de atraso explicando dependencia, carga e horas consumidas.
7. Automacoes que combinam status e tempo, por exemplo: alertar quando 80% da estimativa for consumida e tarefa ainda estiver em andamento.

## 9.2 Recursos que nao devem vir antes da fundacao

Adiar ate P0/P1 estarem concluidos:

- Aplicativo mobile/desktop nativo.
- IA generativa dentro do produto.
- Marketplace de integracoes.
- Goals/OKRs completos.
- Portfolios sofisticados.
- Custom fields altamente dinamicos.

Implementar esses itens sobre tenant isolation e time tracking inconsistentes ampliaria o custo de correcao.

---

# Definicao de pronto do produto

O TaskY pode ser considerado pronto para rollout interno amplo quando:

## Seguranca

- Todos os P0 estao concluidos e revisados.
- Teste automatizado prova que tenant A nao le/altera tenant B em nenhum endpoint.
- Segredos nao existem no repositorio/historico ativo e foram rotacionados.
- Sessao possui refresh seguro, logout e revogacao.
- Security scans rodam em toda PR/release.

## Confiabilidade

- E impossivel criar dois timers abertos por corrida.
- Overlaps sao bloqueados ou explicitamente autorizados por policy.
- Pause/resume e consistente em reload e outro dispositivo.
- Timezone e DST possuem testes.
- Backup foi restaurado com sucesso em ambiente limpo.

## Produto

- Kanban possui status real, DnD e acessibilidade.
- Timesheet possui submissao/aprovacao ou politica formal de fechamento.
- Projeto mostra planejado x realizado.
- Todas as paginas possuem loading, empty e error coerentes.
- Acoes destrutivas e conflitos fornecem feedback claro.

## Qualidade

- Backend possui testes de integracao para auth, RBAC, tenant, timer e migrations.
- Frontend possui testes dos stores/interceptors e componentes criticos.
- E2E cobre login, troca de org, timer, timesheet, projeto, tarefa e relatorio.
- Nenhum finding critico/alto aberto no scan de seguranca sem aceite formal.
- Metricas e alertas permitem detectar erro, latencia e falha de jobs.

## Metas sugeridas de SLO

- Disponibilidade mensal: 99,9% para uso interno critico.
- API p95 de operacoes comuns: menor que 400 ms.
- Paginas principais interativas: menor que 2,5 s em notebook corporativo/rede real.
- Erros 5xx: menor que 0,1% das requests.
- RPO: ate 15 minutos; RTO: ate 2 horas, a validar com a empresa.
- Zero vazamento cross-tenant em testes e producao.

---

# Instrucoes finais para a IA executora

1. Nao trocar Java/Spring/PostgreSQL/React/TypeScript/TanStack/Zustand/Tailwind/Docker.
2. Ler novamente os arquivos citados antes de editar; o working tree pode ter mudado.
3. Nao reverter alteracoes preexistentes ou de outros agentes.
4. Executar um ticket por vez ou um grupo pequeno com dependencia clara.
5. Para mudanca de dados, criar nova migration Flyway; nunca editar migration aplicada.
6. Toda query de recurso tenant-owned deve incluir a organizacao do usuario autenticado.
7. Toda autorizacao nova deve existir no backend e possuir teste negativo cross-tenant.
8. Nao salvar access token em `localStorage`; usar refresh seguro em cookie httpOnly.
9. Nao expor segredo, token, PII ou stack trace em log/resposta.
10. Atualizar em conjunto DTO backend, `types.ts`, hooks, MSW e testes.
11. Manter UI em pt-BR e componentes existentes.
12. Implementar loading, empty, error e sucesso para cada fluxo assincrono.
13. Rodar formatacao/lint/test/build relevantes ao finalizar cada ticket.
14. Para backend, validar migrations em PostgreSQL Testcontainers com Flyway habilitado.
15. Para frontend, testar desktop, mobile, teclado e falhas de rede.
16. Medir query count e plano SQL nas telas de relatorio; nao aceitar apenas "funciona localmente".
17. Nao marcar ticket pronto sem criterios de aceite e evidencia de verificacao.

## Template de entrega por ticket

```markdown
### TASK-XXX - Resultado

**Implementado:** resumo objetivo.
**Decisoes:** escolhas e trade-offs.
**Arquivos alterados:** lista.
**Migracao:** versao e efeito, se houver.
**Seguranca:** como tenant/RBAC/validacao foram cobertos.
**Testes:** comandos e resultados.
**Riscos restantes:** itens conhecidos.
**Evidencias:** screenshots, logs sanitizados ou resultados de teste.
```

---

## Conclusao

O TaskY tem potencial para se tornar uma ferramenta interna mais integrada do que usar Clockify e Asana separadamente. A base tecnica e aproveitavel e varias features relevantes ja existem. O caminho correto nao e reescrever: e **fechar seguranca e isolamento, tornar o tempo contabilmente confiavel, modelar workflow real e depois ampliar colaboracao, planejamento e inteligencia gerencial**.

O maior erro seria investir primeiro em aparencia ou volume de features. O melhor produto sera aquele em que cada hora e cada permissao possam ser explicadas, auditadas e confiadas. Executando as ondas deste documento na ordem proposta, o TaskY deixa de ser uma boa demonstracao funcional e passa a ser uma plataforma empresarial defensavel.
