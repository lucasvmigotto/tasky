---
name: tasky-security-enterprise
description: "Use ONLY for TaskY security and identity work: TASK-001 to TASK-007, JWT secrets, Google OAuth, refresh sessions, tenant isolation, IDOR, RBAC, CORS, rate limiting, audit authorization, or security review. Enforces deny-by-default multi-tenancy and mandatory negative tests."
---

# TaskY Enterprise Security

Use com `tasky-roadmap-executor`, `tasky-project` e `tasky-backend`. Para mudanças no cliente de autenticação, carregue também `tasky-frontend`.

## Princípio central

Todo dado pertence a um tenant. Autenticação responde “quem é”; membership atual responde “em qual organização e com qual escopo”; policy responde “pode fazer isto neste recurso”. Um UUID conhecido nunca concede acesso.

## Ameaças prioritárias atuais

- Fallbacks conhecidos de `JWT_SECRET` em configuração versionada.
- Google ID token sem validação de `aud` e `email_verified`.
- Refresh do próprio access token, inclusive expirado, sem revogação.
- Claims de role/org obsoletas após mudança de membership.
- Endpoints que leem por `orgId`/resource ID sem validar membership.
- Autorização manual inconsistente e ausência efetiva de `@PreAuthorize`.
- CORS wildcard e Swagger público em produção.
- Deadlock/recursão no refresh do frontend.

Não copie valores de `.env` para prompts, testes, docs ou logs.

## Invariante de tenant

Para recurso tenant-owned, aplique as três barreiras:

1. Derive `activeOrgId` do contexto autenticado.
2. Consulte com tenant no repository.
3. Autorize a ação no recurso carregado.

```java
// Evitar
projectRepository.findById(projectId)

// Preferir
projectRepository.findByIdAndDepartmentOrganizationId(projectId, activeOrgId)
```

Se o recurso não existir no tenant, retorne 404 para evitar enumeração. Use 403 quando a existência já for conhecida e a política exigir transparência.

## Checklist de endpoint

- Rota está autenticada?
- Tenant vem do token/membership, não do body/query?
- Repository inclui tenant?
- Role é revalidada para ação sensível?
- Escopo manager/leader considera departamento/equipe específicos?
- IDs relacionados pertencem ao mesmo tenant?
- Leitura lista apenas dados permitidos?
- Export aplica exatamente a mesma policy da tela?
- Erro não revela PII ou existência cross-tenant?
- Há teste same-tenant permitido e cross-tenant negado?

## JWT e segredo

- Exigir `JWT_SECRET` em todos os ambientes não-test.
- Decodificar Base64 e validar pelo menos 32 bytes no startup.
- Fixar algoritmo esperado e rejeitar algoritmo diferente.
- Validar `iss`, `aud`, `typ`, `iat`, `exp` e, quando usado, `jti`.
- Access token deve ser curto e não revogável isoladamente; sessão/refresh controla continuidade.
- Rotação de segredo invalida tokens anteriores; planejar comunicação e rollout.
- Segredo de teste pode ser fixo somente em resources de teste.

## Google OAuth

Valide no mínimo:

- Assinatura via issuer/JWK confiável.
- `iss` Google esperado.
- `aud == GOOGLE_CLIENT_ID` configurado.
- `exp` e `iat` válidos.
- `email_verified == true`.
- `sub` como identidade estável; email não deve ser a única chave.

Configure connect/read timeout. Não envie token em logs ou mensagens de exceção. Testes obrigatórios: audience errada, expirado, email não verificado, assinatura inválida e token válido.

## Modelo de sessão recomendado

Mantenha access token em memória no frontend. Use refresh token aleatório, de alta entropia, em cookie `HttpOnly`, `Secure` e `SameSite` adequado.

Persistir apenas hash do refresh token/sessão com:

- `id/jti`, `user_id`, timestamps, expiração.
- `family_id` para rotação e reuse detection.
- `revoked_at`, motivo e substituto.
- Metadata mínima de dispositivo, se aprovada pela privacidade.

No refresh:

1. Validar cookie e hash.
2. Rejeitar expirado/revogado/reutilizado.
3. Recarregar user e membership atual.
4. Rotacionar em transação.
5. Revogar família se token anterior for reutilizado.
6. Emitir access token curto com claims atuais.

Logout revoga a sessão. Mudança de role, remoção, desativação e incidente podem revogar todas as sessões afetadas.

## Frontend auth

- Nunca usar `localStorage` para access/refresh token.
- Refresh usa request raw, sem interceptor de 401.
- Uma única Promise single-flight atende 401 concorrentes.
- Cada request original tenta refresh no máximo uma vez.
- Falha encerra a sessão e rejeita com erro tipado; nunca `undefined as T`.
- Troca de org instala token e org por uma única action e remove cache do tenant anterior.
- Requests com cookie devem definir `credentials` conforme o contrato.

## RBAC

Hierarquia simples não substitui escopo:

- Admin: organização.
- Manager: departamentos/projetos explicitamente gerenciados.
- Leader: equipes explicitamente lideradas.
- Employee: recursos próprios/atribuídos conforme policy.

Prefira métodos semanticamente tipados:

```java
canReadProject(user, projectId)
canManageActivity(user, activityId)
canViewOrganizationReports(user, organizationId)
```

Evite `canManageProject(user, UUID)` quando o chamador pode passar ID de outro tipo. O método resolve tenant e relação internamente.

Frontend replica permissões apenas para UX. Backend sempre decide.

## CORS, CSRF e rate limit

- Origins explícitas por ambiente; nunca `*` em produção.
- Ao usar cookie, reavaliar CSRF. SameSite ajuda, mas não substitui análise do fluxo.
- Limitar auth por IP/identidade e exports por usuário/tenant.
- Retornar 429 com `Retry-After` real.
- Swagger deve ser restrito/desabilitado em produção.
- Health público expõe somente estado mínimo.

## Erros seguros

Use Problem Details com `code` estável e `traceId`. Não devolver mensagem crua de exceção de persistência, SQL, stack, token, email ou IDs internos desnecessários.

Mapeamentos mínimos:

- 400: payload/tipo/validação.
- 401: autenticação ausente/inválida.
- 403: policy negada.
- 404: recurso inexistente no tenant.
- 409: overlap, versão, uniqueness ou estado inválido.
- 429: rate limit.

## Matriz mínima de testes

Para cada endpoint tenant-owned:

| Cenário | Esperado |
|---|---|
| Usuário correto, tenant correto, role correta | sucesso |
| Sem token | 401 |
| Token inválido/expirado | 401 |
| Usuário tenant A acessa ID tenant B | 404/403 conforme policy, nunca dados |
| Role abaixo da necessária | 403 |
| Manager de outro departamento | 403 |
| Membership removida/desativada | 401/403 após refresh/revalidação |
| IDs relacionados de tenants diferentes | 400/404 e nenhum write |

Inclua testes para list, get, create, update, delete, nested resources e export. Listagem vazia não prova isolamento: crie dados em dois tenants e compare o conteúdo.

## Definição de pronto

- Não há segredo conhecido ou fallback.
- Auth Google rejeita tokens de outro client.
- Refresh é rotativo/revogável e sobrevive a reload com segurança.
- Toda rota alterada possui teste cross-tenant negativo.
- Claims obsoletas não renovam acesso.
- CORS/rate/error behavior tem teste.
- Logs e respostas foram revisados para segredo/PII.
