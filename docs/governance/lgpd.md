# LGPD e Governanca de Dados

## Dados pessoais principais

- Usuario: email, username, nome, avatar Google.
- Membership: role, organizacao, preferencias, custo/hora quando configurado.
- Tempo: registros de horas, descricoes, tags e aprovacao.
- Auditoria: actor, recurso, acao e metadados mascarados.

## Direitos do titular

- Exportacao inicial: `GET /api/v1/privacy/me/export`.
- Exclusao/anominizacao: executar via processo operacional enquanto houver dependencias contabeis/auditoria.
- Retencao recomendada: auditoria e horas por 5 anos quando houver uso financeiro; notificacoes por 180 dias.

## Proximos controles

- Legal hold por organizacao.
- Job de expiracao de notificacoes.
- Anonimizacao transacional com trilha de auditoria.

## Limitacoes

- O endpoint de exportacao inicial nao comprova portabilidade completa nem inclui binarios externos.
- Metadata de anexos pode conter URL de terceiro; o TaskY nao controla hoje retencao, exclusao ou backup do objeto apontado.
- Nao ha job implementado para retencao, legal hold ou anonimizacao. Os prazos acima sao recomendacoes, nao enforcement do sistema.
