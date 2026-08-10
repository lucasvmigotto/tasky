# Limitacoes Operacionais E Funcionais

Este documento evita tratar scaffolding como capacidade entregue.

## Exports

- O relatorio suporta CSV sincrono.
- PDF e XLSX nao sao suportados.
- `GET /api/v1/reports/exports` devolve um link marcado como pronto; nao ha fila, worker, persistencia de job, storage de resultado, retry ou expiracao efetiva. Nao usar esse endpoint como evidencia de export assincrono.
- Exportacoes grandes ainda podem consumir memoria/tempo da requisicao e precisam de limites e observabilidade.

## Anexos

- O modelo atual registra metadata e uma URL fornecida pelo cliente.
- A aplicacao nao recebe nem armazena o binario e nao garante que a URL seja privada, duravel ou pertencente ao tenant.
- Nao ha object storage integrado, URL assinada, allowlist de MIME, verificacao do conteudo, limite de upload aplicado ao arquivo nem antivirus.
- Backup do PostgreSQL preserva somente a metadata/URL, nunca o objeto apontado.

Nao habilitar anexos para dados sensiveis ate existir storage gerenciado, autorizacao de download, validacao de arquivo, malware scan, lifecycle e auditoria.

## Backup E Continuidade

- Os scripts sao dumps logicos manuais da database Compose.
- Nao incluem criptografia, scheduler, retencao, copia externa, PITR/WAL, monitoramento ou restore periodico automatizado.
- Volume Docker nao e backup.
- RPO/RTO em `docs/runbooks/backup-restore.md` sao metas, nao resultados medidos.

## Producao

`docker-compose.production.yml` remove exposicao direta da API/database, mas nao fornece TLS, ingress gerenciado, secret manager, alta disponibilidade, observabilidade, rollout ou rollback. E uma baseline, nao uma plataforma de producao completa.
