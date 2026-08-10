# Acessibilidade WCAG 2.2 AA

Checklist minimo para novas telas:

- Todas as acoes acessiveis por teclado.
- Foco visivel em botoes, links e campos.
- `aria-live` para movimentos assinc (Kanban/notificacoes).
- Alternativa tabular para graficos/timeline.
- Labels em inputs e nomes acessiveis em icon buttons.
- Respeitar reduced motion quando animacoes forem relevantes.

Validacao automatizada deve rodar com Testing Library e, quando a dependencia for adicionada ao lock, axe.
