# Backup e Restore TaskY

## Escopo

Os scripts fornecem backup logico manual (`pg_dump` plain SQL) para a stack Compose. Eles nao constituem, sozinhos, continuidade de producao.

Metas iniciais ainda nao comprovadas:

- RPO desejado: 24h para ambiente interno.
- RTO desejado: 4h para restore manual validado.

Nao ha evidencia automatizada de que essas metas foram atingidas.

## Credenciais

Os dois scripts aceitam as mesmas variaveis:

| Variavel | Padrao local | Uso |
|---|---|---|
| `DB_CONTAINER` | `tasky-db` | Container PostgreSQL |
| `API_CONTAINER` | `tasky-api` | Guard de seguranca do restore |
| `POSTGRES_DB` | `tasky` | Database de origem/destino |
| `POSTGRES_USER` | `tasky` | Usuario PostgreSQL |
| `POSTGRES_PASSWORD` | `tasky` | Senha PostgreSQL |
| `BACKUP_DIR` | `backups` | Diretorio de saida do backup |

Passe credenciais pelo ambiente/secret store. Nao coloque senhas na linha de comando, no repositorio ou no nome do arquivo.

## Backup

```bash
scripts/backup-postgres.sh
```

O script grava primeiro arquivos temporarios, verifica que `pg_dump` produziu conteudo, comprime, executa `gzip -t` e so entao publica `backups/<database>-YYYYmmdd-HHMMSS.sql.gz`. Uma falha de `pg_dump` nao e mascarada pelo `gzip`.

Exemplo com configuracao explicita:

```bash
DB_CONTAINER=my-postgres POSTGRES_DB=tasky POSTGRES_USER=backup_user \
POSTGRES_PASSWORD='from-secret-store' BACKUP_DIR=/secure/backups \
scripts/backup-postgres.sh
```

## Restore

1. Pare escritores e a API: `docker compose stop api`.
2. Confirme as variaveis de container/database/usuario.
3. Execute o restore e digite a frase solicitada.

```bash
scripts/restore-postgres.sh backups/tasky-YYYYmmdd-HHMMSS.sql.gz
```

Antes de alterar o destino, o script:

- valida integridade gzip e assinatura de dump plain PostgreSQL;
- restaura todo o arquivo em database temporario isolado com `ON_ERROR_STOP`;
- exige pelo menos uma tabela no schema `public`;
- remove o database temporario;
- recusa databases de sistema e recusa executar enquanto `API_CONTAINER` estiver ativo;
- exige a confirmacao exata `RESTORE <POSTGRES_DB>`.

Automacao nao interativa deve fornecer a mesma frase deliberadamente:

```bash
CONFIRM_RESTORE='RESTORE tasky' scripts/restore-postgres.sh backups/tasky-YYYYmmdd-HHMMSS.sql.gz
```

O restore do destino e destrutivo: recria o schema `public`. Mantenha um backup anterior separado e valide login, migrations, contagens e fluxos criticos antes de reabrir a API.

## Limitacoes Atuais

- Sem agendamento, retencao automatica ou alerta de falha.
- Sem criptografia pelo script; protecao depende do filesystem/storage externo.
- Sem copia off-host ou segregacao de dominio de falha.
- Sem WAL archive/PITR; o RPO fica limitado ao ultimo dump.
- Sem teste mensal automatizado nem evidencia historica de restores.
- Sem dump de objetos externos; URLs de anexos nao representam backup do arquivo apontado.
- Restore validado temporariamente reduz risco de dump invalido, mas nao torna a troca do schema atomica.

Para producao, implantar backups gerenciados/criptografados, PITR, retencao, copia externa, monitoramento e exercicio periodico documentado.
