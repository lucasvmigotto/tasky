---
name: tasky-ux-enterprise
description: "Use ONLY for TaskY enterprise frontend UX: async states, responsive/mobile behavior, accessible Kanban/Gantt/timesheet, query cache consistency, forms, error recovery, performance, WCAG, TASK-031, TASK-034, or TASK-038. Preserves the current React/Radix/Tailwind visual system."
---

# TaskY Enterprise UX

Use com `tasky-frontend`, `tasky-roadmap-executor` e a skill de domínio. Preserve React 19, Radix wrappers, Tailwind 4, TanStack Query, Zustand, React Router e o idioma pt-BR.

## Resultado esperado

Uma tela empresarial precisa ser previsível sob sucesso, lentidão, vazio, permissão negada, conflito, offline e reload. Aparência sem comportamento robusto não é qualidade.

## Estados obrigatórios

Toda query/página deve tratar:

- Loading inicial com skeleton próximo do layout final.
- Refetch sem apagar conteúdo útil.
- Empty state com próxima ação permitida.
- Error state com mensagem segura e retry.
- Partial error quando múltiplas queries independentes falham.
- Sem permissão com explicação adequada.

Toda mutation deve tratar:

- Botão disabled/progress durante submit.
- Prevenção de duplo clique.
- Sucesso visível.
- Erro inline e toast quando apropriado.
- Preservação dos dados do formulário.
- Rollback de optimistic update.
- Conflito 409 com ação de resolução.

## Formulários

- React Hook Form/Zod quando compatível com padrão existente.
- Validação frontend melhora UX; backend continua autoridade.
- Erro por campo e resumo para leitores de tela.
- Foco no primeiro erro após submit.
- Confirmar ações destrutivas com nome/contexto do recurso.
- Datas/horas exibem timezone e formato pt-BR sem perder Instant.
- Não usar placeholder como label.

## TanStack Query

- Query keys sempre incluem tenant e parâmetros relevantes.
- Criar factories por domínio em vez de strings soltas quando o fluxo crescer.
- Mutation invalida coleção, detalhe e agregados afetados.
- Troca de organização remove/invalida dados do tenant anterior.
- Paginação conserva metadados; não usar `size=5000`.
- Raw fetch excepcional, como download, deve compartilhar auth/error/refresh seguro.
- Não copiar server state para Zustand.

## Zustand

- Uma action controla instalação/remoção de sessão.
- Timer local é projeção do estado servidor, não autoridade financeira.
- Intervals possuem lifecycle/cleanup.
- Use seletores específicos para evitar rerenders de store inteiro.
- Não persistir access token em storage web.

## Responsividade

Testar ao menos:

- 360/390 px mobile.
- 768 px tablet.
- 1024/1440 px desktop.

Padrões:

- Timesheet: agenda/cards mobile ou scroll com primeiro campo sticky e indicação.
- Kanban: scroll horizontal intencional ou colunas empilhadas com navegação clara.
- Tabelas: colunas prioritárias, cards ou overflow acessível.
- Dialogs: viewport mobile, teclado virtual e safe areas.
- Topbar/sidebar: foco e fechamento previsíveis.

## DnD acessível

Kanban/reorder deve suportar:

- Mouse, touch e teclado.
- Handle identificável.
- Instruções para screen reader.
- Anúncio de posição/coluna após movimento.
- Foco preservado.
- Menu alternativo “Mover para”.
- Optimistic update com rollback.
- `prefers-reduced-motion`.

Nunca use apenas eventos HTML5 desktop para uma feature central.

## Gantt e gráficos

- Lazy load por rota/componente pesado.
- Texto alternativo/tabela com os mesmos dados.
- Cores não podem ser o único indicador.
- Tooltip acessível por teclado quando possível.
- Gantt precisa alternativa de lista, zoom e sticky labels.
- Skeleton evita layout shift.

## Timer UX

- Exibir estado sincronizando/erro sem perder ação do usuário.
- Stop/pause idempotente e desabilitado durante mutation.
- Drift é reconciliado com servidor.
- Timer aberto aparece globalmente e na tarefa.
- Não anunciar cada segundo a screen reader; anunciar mudanças de estado.
- Reload e troca de org têm comportamento explícito.

## Linguagem

- UI em pt-BR consistente.
- Preferir termos do produto: organização, projeto, atividade/tarefa, registro de tempo, faturável.
- Erro deve dizer o que ocorreu e a próxima ação.
- Não exibir stack, código HTTP cru ou mensagens internas.

## Performance

- Rotas permanecem lazy.
- Recharts/Motion ficam fora do chunk inicial quando possível.
- Medir bundle com ferramenta apropriada e definir budget.
- Debounce/cancelamento em busca.
- Virtualização somente para volume comprovado.
- Evitar `useMemo/useCallback` sem necessidade/padrão do projeto.

## WCAG 2.2 AA

Checklist mínimo:

- Navegação completa por teclado.
- Ordem de foco e focus visible.
- Dialog focus trap e retorno de foco.
- Labels, nomes acessíveis e mensagens associadas.
- Contraste e estados não dependentes apenas de cor.
- Reduced motion.
- Targets touch adequados.
- Headings/landmarks corretos.
- Axe automatizado mais teste manual.

## Definição de pronto

- Estados assíncronos completos.
- Desktop/mobile validados.
- Teclado e screen reader no fluxo central.
- Cache não mostra outro tenant nem dados stale após mutation.
- Falha de rede/conflito preserva dados e oferece recuperação.
- Build, Vitest/component tests e E2E crítico passam.
