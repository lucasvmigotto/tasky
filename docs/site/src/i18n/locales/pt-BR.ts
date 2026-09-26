import type { DocsContent } from '../types'

export const ptBR: DocsContent = {
  ui: {
    siteName: 'TaskY',
    siteTagline: 'Trabalho, projetos e horas para equipes internas',
    skipToContent: 'Pular para o conteúdo',
    menu: 'Menu',
    close: 'Fechar',
    search: 'Buscar',
    searchPlaceholder: 'Buscar na documentação…',
    searchNoResults: 'Nenhum resultado.',
    language: 'Idioma',
    theme: 'Tema',
    themeDark: 'Escuro',
    themeLight: 'Claro',
    breadcrumbHome: 'Início',
    onThisPage: 'Nesta página',
    version: 'Versão',
    footerNote: 'Documentação gerada a partir do código, testes e especificações do projeto.',
    maturityLabels: {
      implemented: 'Implementado',
      partial: 'Parcialmente implementado',
      planned: 'Planejado',
      unavailable: 'Indisponível',
      upstream: 'Limitação externa',
      na: 'Não aplicável',
    },
    groupLabels: {
      start: 'Começar',
      understand: 'Entender',
      operate: 'Operar',
      status: 'Estado',
    },
    notFoundTitle: 'Página não encontrada',
    notFoundText: 'O endereço acessado não existe nesta documentação.',
    backHome: 'Voltar ao início',
  },
  pages: {
    overview: {
      id: 'overview',
      title: 'Visão geral',
      summary: 'O que é o TaskY, para quem serve e quais capacidades estão realmente implementadas.',
      maturity: 'implemented',
      sections: [
        {
          id: 'what',
          heading: 'O que é o TaskY',
          blocks: [
            {
              kind: 'p',
              text: 'TaskY é uma aplicação web para gestão de trabalho interno: projetos, atividades, demandas entre setores, apontamento de horas e relatórios. A autenticação é feita por provedores OIDC (Google, Microsoft Entra ID ou o provedor mock local de desenvolvimento), e todo dado é isolado por organização (inquilino).',
            },
            {
              kind: 'ul',
              items: [
                'Público: equipes internas — colaboradores, gestores de setor e administradores.',
                'Modelo de implantação: monolito Spring Boot + SPA React, PostgreSQL, Redis (cache opcional) e armazenamento de objetos S3/MinIO.',
                'Idioma da interface: português do Brasil.',
              ],
            },
          ],
        },
        {
          id: 'capabilities',
          heading: 'Capacidades',
          maturity: 'implemented',
          blocks: [
            {
              kind: 'table',
              headers: ['Área', 'O que existe hoje'],
              rows: [
                [
                  'Autenticação',
                  'Login OIDC (code flow com PKCE), JWT curto + refresh rotativo por família, troca de organização, papéis admin/gestor/colaborador.',
                ],
                [
                  'Estrutura',
                  'Organizações, departamentos (setores), membros, tipos de membro, convites com aceite automático no login.',
                ],
                [
                  'Projetos',
                  'Projetos por departamento, colunas canônicas, atribuições de colaboradores, acesso entre departamentos.',
                ],
                [
                  'Atividades',
                  'Atividades com status, prioridade, peso Fibonacci, subtarefas, dependências, comentários, checklists e anexos.',
                ],
                [
                  'Horas',
                  'Timer (iniciar/pausar/retomar/parar), apontamento manual, contabilização, aprovação de apontamento.',
                ],
                [
                  'Planilha de horas',
                  'Períodos semanais com ciclo rascunho → enviado → aprovado/rejeitado → fechado e fila de aprovação.',
                ],
                [
                  'Relatórios',
                  'Resumos e agregações por projeto/dia/membro/setor com exportação CSV, XLSX e PDF.',
                ],
                [
                  'Demandas',
                  'Demandas internas entre setores com chave, prioridade, responsáveis e vínculo ao GLPI.',
                ],
                [
                  'Notificações',
                  'Caixa de notificações, menções, preferências por tipo e lembretes agendados.',
                ],
                [
                  'Governança',
                  'Trilha de auditoria, exportação e exclusão LGPD, configurações globais/por organização/por usuário.',
                ],
              ],
            },
            {
              kind: 'shot',
              src: './screenshots/my-work.png',
              alt: 'Tela "Meu Trabalho" com indicadores de tarefas abertas, horas na semana e fila de execução.',
              caption: 'Tela inicial de trabalho, exibida com dados sintéticos de desenvolvimento.',
            },
            {
              kind: 'shot',
              src: './screenshots/login.png',
              alt: 'Tela de login com os provedores disponíveis e a opção de ambiente local (mock).',
              caption: 'Entrada por provedores OIDC; em desenvolvimento há o provedor mock local.',
            },
          ],
        },
        {
          id: 'maturity',
          heading: 'Como ler os rótulos de estado',
          blocks: [
            {
              kind: 'p',
              text: 'Cada página e seção carrega um rótulo de estado, para nunca confundir intenção (especificação) com comportamento entregue (código).',
            },
            {
              kind: 'ul',
              items: [
                'Implementado — comporta-se assim no código atual, verificado por testes.',
                'Parcialmente implementado — o caminho principal existe, faltam partes conhecidas.',
                'Planejado — especificado, ainda não construído.',
                'Indisponível — não existe e não há plano próximo.',
                'Limitação externa — depende de um provedor ou ambiente fora do controle do projeto.',
                'Não aplicável — a categoria não se aplica a este projeto.',
              ],
            },
          ],
        },
      ],
    },

    'getting-started': {
      id: 'getting-started',
      title: 'Começando',
      summary: 'Como subir o ambiente local, com ou sem o provedor OIDC mock e dados sintéticos.',
      maturity: 'implemented',
      sections: [
        {
          id: 'prereqs',
          heading: 'Pré-requisitos',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Podman (ou Docker) com compose; o projeto assume Podman em primeiro lugar.',
                'Java 25 e Bun — ou apenas os contêineres, que já trazem as versões fixadas.',
                'openssl e, de preferência, mkcert para o certificado local do provedor OIDC.',
              ],
            },
          ],
        },
        {
          id: 'quickstart',
          heading: 'Subir a pilha local',
          blocks: [
            {
              kind: 'code',
              lang: 'bash',
              caption: 'Passo a passo do ambiente de desenvolvimento',
              code: `cp .env.example .env
openssl rand -base64 32   # use a saída como JWT_SECRET no .env
./scripts/gen-mock-tls.sh # certificado TLS do provedor OIDC local
podman compose up -d --build`,
            },
            {
              kind: 'p',
              text: 'A pilha única de desenvolvimento sobe api, app, db (PostgreSQL 18), redis, minio e o mock-oauth2 atrás de um proxy TLS (NGINX). O app fica em http://localhost:5173 e a API em http://localhost:8080.',
            },
          ],
        },
        {
          id: 'seed',
          heading: 'Dados sintéticos de desenvolvimento',
          maturity: 'implemented',
          blocks: [
            {
              kind: 'p',
              text: 'Um semeador opcional cria um conjunto de dados sintético e determinístico na primeira inicialização, útil para desenvolvimento e captura de telas. É idempotente (marcador em app_settings) e nunca roda no perfil de produção.',
            },
            {
              kind: 'code',
              lang: 'bash',
              caption: 'Perfis disponíveis (medium é o padrão)',
              code: `TASKY_SEED_DATA=true TASKY_SEED_PROFILE=medium   # ~25 usuários, ~2k apontamentos
TASKY_SEED_DATA=true TASKY_SEED_PROFILE=large    # ~100 usuários, ~16k apontamentos`,
            },
          ],
        },
        {
          id: 'verify',
          heading: 'Verificações principais',
          blocks: [
            {
              kind: 'code',
              lang: 'bash',
              caption: 'Backend e frontend',
              code: `./gradlew :api:test :api:build --no-daemon
cd app && bun install --frozen-lockfile && bun run lint && bun run test && bun run build`,
            },
            {
              kind: 'p',
              text: 'Convenções: o backend usa Flyway (toda mudança de schema exige nova migration); o frontend usa a API real e MSW apenas para testes automatizados; o inquilino e o papel sempre vêm do JWT, nunca do corpo enviado pelo cliente.',
            },
          ],
        },
      ],
    },

    architecture: {
      id: 'architecture',
      title: 'Arquitetura',
      summary: 'Topologia, estilo de API, dados, cache e limites de implantação.',
      maturity: 'implemented',
      sections: [
        {
          id: 'shape',
          heading: 'Forma do sistema',
          blocks: [
            {
              kind: 'p',
              text: 'Um monolito Spring Boot (Java 25) expõe uma API REST versionada em /api/v1 e serve o SPA React construído. O PostgreSQL 18 é a fonte de verdade; o Redis é cache opcional que falha de forma aberta; o MinIO fornece armazenamento compatível com S3.',
            },
            {
              kind: 'code',
              lang: 'text',
              caption: 'Visão de componentes',
              code: `Navegador ──► app (Nginx/SPA) ──► api (Spring Boot) ──► PostgreSQL
                                        │                 └─► Redis (cache opcional)
                                        └─► MinIO / S3 (arquivos)
      api ──► IdP OIDC (Google / Microsoft / mock local)`,
            },
          ],
        },
        {
          id: 'api-style',
          heading: 'Estilo de API e erros',
          blocks: [
            {
              kind: 'ul',
              items: [
                'REST com JSON; operações agrupadas por recurso, escopadas por organização.',
                'Erros no formato RFC 9457 (ProblemDetail) com um código legível e um traceId.',
                'Concorrência otimista: @Version + expectedVersion resultam em 409 em conflito.',
                'Paginação quando a coleção pode crescer; páginas de relatório limitadas a 500 linhas.',
              ],
            },
          ],
        },
        {
          id: 'consistency',
          heading: 'Consistência e concorrência',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Um único timer em execução por membro: índice único parcial em time_entries.',
                'Sem sobreposição de apontamentos: restrição EXCLUDE sobre o intervalo de tempo.',
                'Rotação de refresh com FAMÍLIA: reuso de token revoga a família inteira (sinal de roubo).',
                'Cache nunca decide segurança; indisponibilidade do Redis apenas deixa mais lento.',
              ],
            },
          ],
        },
        {
          id: 'decisions',
          heading: 'Decisões registradas',
          blocks: [
            {
              kind: 'p',
              text: 'As decisões arquiteturais ficam em docs/adr/ no repositório. Esta documentação resume o estado atual; o registro de decisões guarda o porquê.',
            },
          ],
        },
      ],
    },

    domain: {
      id: 'domain',
      title: 'Modelo de domínio',
      summary: 'Conceitos, invariantes e ciclos de vida do domínio.',
      maturity: 'implemented',
      sections: [
        {
          id: 'concepts',
          heading: 'Conceitos principais',
          blocks: [
            {
              kind: 'table',
              headers: ['Conceito', 'Descrição'],
              rows: [
                ['Organização', 'Inquilino raiz; define fuso horário e dia de início da semana.'],
                [
                  'Membro',
                  'Usuário dentro de uma organização, com papel (admin, gestor, colaborador) e departamento principal.',
                ],
                ['Departamento', 'Setor interno; agrupa projetos e define escopo de visibilidade.'],
                ['Projeto', 'Pertence a um departamento; contém colunas canônicas e atividades.'],
                [
                  'Atividade',
                  'Unidade de trabalho com status, prioridade, peso e responsáveis; pode ter subtarefas e dependências.',
                ],
                ['Apontamento', 'Registro de tempo (timer ou manual) com estado de aprovação.'],
                ['Período', 'Semana canônica da planilha de horas, com ciclo de vida próprio.'],
                ['Demanda', 'Solicitação entre setores, com chave e vínculo opcional ao GLPI.'],
              ],
            },
          ],
        },
        {
          id: 'lifecycles',
          heading: 'Ciclos de vida',
          blocks: [
            {
              kind: 'code',
              lang: 'text',
              caption: 'Período da planilha de horas',
              code: 'DRAFT ──► SUBMITTED ──► APPROVED ──► LOCKED\n   ▲            │\n   └── REJECTED ◄┘',
            },
            {
              kind: 'p',
              text: 'Um período rejeitado volta para rascunho e pode ser reenviado. Apenas administradores reabrem um período bloqueado. Apontamentos em período bloqueado não podem ser alterados.',
            },
            {
              kind: 'code',
              lang: 'text',
              caption: 'Apontamento',
              code: 'DRAFT ──► SUBMITTED ──► APPROVED\n   ▲            │\n   └── REJECTED ◄┘',
            },
          ],
        },
        {
          id: 'invariants',
          heading: 'Invariantes',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Todo comando é escopado por organização; acesso entre inquilinos falha fechado.',
                'Só existe um timer em execução por membro.',
                'Apontamentos de um mesmo membro não se sobrepõem.',
                'O tempo é autoritativo no servidor, nunca no relógio do cliente.',
                'Horas e valores são agregados por SQL (GROUP BY), não em memória.',
              ],
            },
          ],
        },
      ],
    },

    features: {
      id: 'features',
      title: 'Funcionalidades',
      summary: 'O que cada área faz hoje, com evidência no código.',
      maturity: 'implemented',
      sections: [
        {
          id: 'planning',
          heading: 'Planejamento de trabalho',
          blocks: [
            {
              kind: 'p',
              text: 'Projetos agrupam atividades por departamento. Atividades carregam status, prioridade, peso Fibonacci, subtarefas (até 5 níveis), dependências acíclicas, comentários com menções e checklists.',
            },
          ],
        },
        {
          id: 'time',
          heading: 'Apontamento de horas',
          blocks: [
            {
              kind: 'p',
              text: 'O timer tem início, pausa, retomada e parada; o intervalo pausado é descontado. Também há apontamento manual com data e faixa de horário. Cada apontamento guarda instantâneos de tarifa e custo.',
            },
            {
              kind: 'shot',
              src: './screenshots/time-tracker.png',
              alt: 'Tela de registro de tempo com timer rápido e lista de apontamentos.',
              caption: 'Registro de tempo com timer e apontamento manual.',
            },
          ],
        },
        {
          id: 'timesheet',
          heading: 'Planilha de horas e aprovação',
          blocks: [
            {
              kind: 'p',
              text: 'A semana é apresentada em grade, e a barra de período permite abrir, enviar, reabrir e fechar a semana. Gestores e administradores usam a fila de aprovação para aprovar ou rejeitar com justificativa obrigatória.',
            },
            {
              kind: 'shot',
              src: './screenshots/timesheet.png',
              alt: 'Planilha semanal com barra de período e grade de projetos.',
              caption: 'Planilha semanal com a barra de período.',
            },
            {
              kind: 'shot',
              src: './screenshots/approval-queue.png',
              alt: 'Fila de aprovação com semanas pendentes e ações aprovar/rejeitar.',
              caption: 'Fila de aprovação para gestores.',
            },
          ],
        },
        {
          id: 'reports',
          heading: 'Relatórios e exportação',
          blocks: [
            {
              kind: 'p',
              text: 'Resumos e agregações por projeto, dia, membro e setor alimentam gráficos e tabelas, com exportação em CSV (síncrona), XLSX e PDF (assíncronas, via trabalhador em segundo plano).',
            },
            {
              kind: 'shot',
              src: './screenshots/reports.png',
              alt: 'Relatório com cartões de total de horas e gráficos por dia e por projeto.',
              caption: 'Relatório com agregações e exportação.',
            },
          ],
        },
        {
          id: 'more',
          heading: 'Demandas, setores e notificações',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Demandas internas entre setores, com chave sequencial por ano e prioridade.',
                'Visão de setor para gestores: fila, chegadas, carga e atividades recentes.',
                'Notificações com menções, preferências por tipo e lembretes agendados (polling de 30s).',
              ],
            },
          ],
        },
      ],
    },

    'security-privacy': {
      id: 'security-privacy',
      title: 'Segurança e privacidade',
      summary: 'Autenticação, isolamento por inquilino, auditoria e LGPD.',
      maturity: 'implemented',
      sections: [
        {
          id: 'auth',
          heading: 'Autenticação',
          blocks: [
            {
              kind: 'ul',
              items: [
                'OIDC com code flow e PKCE (S256) para Google e Microsoft Entra ID; o mock local usa o mesmo fluxo.',
                'JWT de acesso curto + refresh token em cookie HttpOnly, com rotação por família.',
                'Reuso de refresh revoga a família (detecção de roubo); vida absoluta da família de 30 dias.',
                'Troca de organização emite novo token sem exigir novo login.',
              ],
            },
          ],
        },
        {
          id: 'tenancy',
          heading: 'Isolamento por inquilino',
          blocks: [
            {
              kind: 'p',
              text: 'Toda consulta e todo comando usam a organização do JWT. Acesso entre inquilinos falha fechado, e há testes negativos dedicados para cada endpoint sensível.',
            },
          ],
        },
        {
          id: 'audit-lgpd',
          heading: 'Auditoria e LGPD',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Ações sensíveis (login, sessões, papéis, ciclo da planilha, exportações) são registradas na trilha de auditoria.',
                'Exportação de dados por membro, com base na LGPD, e exclusão administrativa com confirmação.',
                'Uploads tratados como bytes não confiáveis: prefixo aleatório, política de extensão/MIME/tamanho e remoção de metadados de imagem.',
              ],
            },
          ],
        },
      ],
    },

    api: {
      id: 'api',
      title: 'Referência de API',
      summary: 'Contrato OpenAPI e convenções da API REST versionada.',
      maturity: 'implemented',
      sections: [
        {
          id: 'contract',
          heading: 'Contrato',
          blocks: [
            {
              kind: 'p',
              text: 'O contrato canônico é contracts/openapi.yaml, gerado a partir do código (springdoc) e verificado quanto a desvios em relação aos tipos do frontend. No perfil de desenvolvimento a documentação interativa fica em /swagger-ui.html.',
            },
            {
              kind: 'code',
              lang: 'bash',
              caption: 'Verificar desvio de contrato',
              code: 'API_BASE_URL=http://127.0.0.1:8080 ./scripts/check-openapi-contract.sh',
            },
          ],
        },
        {
          id: 'conventions',
          heading: 'Convenções',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Prefixo /api/v1; recursos escopados por organização.',
                'Erros RFC 9457 com código e traceId.',
                'Conflitos de concorrência retornam 409; validação retorna 400.',
                'As operações realmente servidas são a fonte de verdade deste documento; o que está apenas especificado aparece como Planejado.',
              ],
            },
          ],
        },
      ],
    },

    testing: {
      id: 'testing',
      title: 'Testes e qualidade',
      summary: 'Camadas de teste, ambientes e os portões de qualidade.',
      maturity: 'implemented',
      sections: [
        {
          id: 'layers',
          heading: 'Camadas',
          blocks: [
            {
              kind: 'table',
              headers: ['Camada', 'Ferramenta', 'Escopo'],
              rows: [
                ['Backend (unitário)', 'JUnit + Mockito', 'funções puras: matemática de pausa, transições'],
                [
                  'Backend (integração)',
                  'Testcontainers (PostgreSQL)',
                  'concorrência, ciclos de vida, contagem de consultas',
                ],
                ['Frontend (unitário)', 'vitest + MSW', 'stores, hooks, tratamento de corrida'],
                ['Frontend (tipos)', 'tsc --noEmit', 'aplicação inteira'],
                ['Fim a fim', 'Playwright', 'login, planilha, jornada do timer'],
                ['Contrato', 'script vs /api-docs', 'schemas cobertos'],
              ],
            },
          ],
        },
        {
          id: 'gates',
          heading: 'Portões',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Suíte do backend e do frontend devem passar integralmente.',
                'Verificação de contrato sem desvios nos schemas cobertos.',
                'Testes de acessibilidade automatizados (axe) nas páginas principais.',
                'Nunca afrouxar CI ou segurança para “fazer passar”.',
              ],
            },
          ],
        },
      ],
    },

    deployment: {
      id: 'deployment',
      title: 'Implantação',
      summary: 'Empacotamento, ambientes e o que ainda falta para produção.',
      maturity: 'partial',
      sections: [
        {
          id: 'packaging',
          heading: 'Empacotamento',
          blocks: [
            {
              kind: 'ul',
              items: [
                'A API é um jar Spring Boot executável, entregue numa imagem JRE fixada por digest, com usuário não-root.',
                'O frontend é servido por NGINX a partir do build estático, com cabeçalhos de segurança e cache por hash de conteúdo.',
                'Esta documentação é entregue como site estático (Cloudflare R2) e como imagem NGINX multietágio.',
              ],
            },
          ],
        },
        {
          id: 'env',
          heading: 'Ambientes',
          blocks: [
            {
              kind: 'p',
              text: 'O arquivo docker-compose.yml é exclusivamente de desenvolvimento. A produção usa uma abordagem separada, com TLS, gestão de segredos, observabilidade e alta disponibilidade — ainda não fornecidas por este repositório.',
            },
            {
              kind: 'callout',
              tone: 'warning',
              title: 'Ainda não é uma plataforma de produção completa',
              text: 'Não há TLS de borda, ingress gerenciado, gestor de segredos, alta disponibilidade, observabilidade nem rollback automatizado prontos. A compose de produção é uma base, não a plataforma final.',
            },
          ],
        },
        {
          id: 'ops',
          heading: 'Operação',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Backup/restauração: docs/runbooks/backup-restore.md.',
                'Observabilidade e alertas: docs/observability/.',
                'LGPD: docs/governance/lgpd.md.',
                'Acessibilidade: docs/quality/accessibility.md.',
              ],
            },
          ],
        },
      ],
    },

    roadmap: {
      id: 'roadmap',
      title: 'Roadmap',
      summary: 'O que está especificado e ainda não construído.',
      maturity: 'planned',
      sections: [
        {
          id: 'note',
          heading: 'Como ler esta página',
          blocks: [
            {
              kind: 'p',
              text: 'Tudo nesta página é Planejado — especificado, mas ainda não implementado no código. Não trate como comportamento atual.',
            },
          ],
        },
        {
          id: 'planned',
          heading: 'Itens planejados',
          blocks: [
            {
              kind: 'ul',
              items: [
                'Verificação do caminho S3/MinIO fora do compose de desenvolvimento.',
                'Notificações push via service worker + VAPID (eventos já preparados).',
                'Reabertura de período com semântica parcial e registro de decisão.',
                'Busca com ranqueamento de texto completo (trigram/GIN) e buscas salvas.',
                'Retenção/expurgo de auditoria com opção imutável (WORM).',
              ],
            },
          ],
        },
      ],
    },

    limitations: {
      id: 'limitations',
      title: 'Limitações',
      summary: 'O que ainda não está pronto ou é apenas parcial.',
      maturity: 'partial',
      sections: [
        {
          id: 'active',
          heading: 'Limitações ativas',
          blocks: [
            {
              kind: 'table',
              headers: ['Item', 'Estado', 'Observação'],
              rows: [
                ['Verificação de antivírus em uploads', 'Planejado', 'ainda não há varredura de malware.'],
                ['Cobertura fim a fim', 'Parcial', 'a jornada do timer está coberta; outros fluxos não.'],
                ['Backup de objetos', 'Parcial', 'o dump do PostgreSQL não cobre blobs em disco local.'],
                ['Plataforma de produção', 'Parcial', 'sem TLS de borda, HA ou observabilidade empacotadas.'],
              ],
            },
          ],
        },
        {
          id: 'external',
          heading: 'Limitações externas',
          blocks: [
            {
              kind: 'ul',
              items: [
                'A verificação de identidade Google/Microsoft depende dos provedores reais; em desenvolvimento usa-se o mock.',
                'Os provedores OIDC reais exigem HTTPS e clientes registrados; apenas o provedor mock é pré-configurado.',
              ],
            },
          ],
        },
      ],
    },
  },
}
