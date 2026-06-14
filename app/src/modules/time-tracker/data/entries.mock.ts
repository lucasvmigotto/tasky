import type { TimeEntry } from '@/core/types/models'

function getISODateFromOffset(dayOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  return d.toISOString().split('T')[0]
}

const today = getISODateFromOffset(0)
const mon = getISODateFromOffset(1 - new Date().getDay())
  || getISODateFromOffset(-(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1))

function weekdayDate(day: number): string {
  const d = new Date()
  const currentDay = d.getDay()
  const diff = day - (currentDay === 0 ? 7 : currentDay)
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

const monday = weekdayDate(1)
const tuesday = weekdayDate(2)
const wednesday = weekdayDate(3)
const thursday = weekdayDate(4)
const friday = weekdayDate(5)

export const demoTimeEntries: TimeEntry[] = [
  {
    id: 'entry-001',
    projectId: 'proj-001',
    projectName: 'TaskY Web App',
    title: 'Implementar autenticacao OAuth2',
    description: 'Configuracao inicial dos providers OAuth para Google e GitHub',
    startTime: `${monday}T08:00:00.000Z`,
    endTime: `${monday}T10:30:00.000Z`,
    duration: 9000,
    date: monday,
    labelIds: ['lbl-sys-003', 'lbl-cst-002'],
  },
  {
    id: 'entry-002',
    projectId: 'proj-001',
    projectName: 'TaskY Web App',
    title: 'Code review PR #234',
    description: 'Revisao do PR de refatoracao do modulo de tarefas',
    startTime: `${monday}T10:45:00.000Z`,
    endTime: `${monday}T12:00:00.000Z`,
    duration: 4500,
    date: monday,
    labelIds: ['lbl-sys-005'],
  },
  {
    id: 'entry-003',
    projectId: 'proj-001',
    projectName: 'TaskY Web App',
    title: 'Corrigir bug de sessao expirada',
    description: 'Investigacao e correcao do problema de refresh token',
    startTime: `${monday}T13:00:00.000Z`,
    endTime: `${monday}T14:30:00.000Z`,
    duration: 5400,
    date: monday,
    labelIds: ['lbl-sys-004', 'lbl-cst-004'],
  },
  {
    id: 'entry-004',
    projectId: 'proj-001',
    projectName: 'TaskY Web App',
    title: 'Daily standup',
    description: 'Reuniao diaria de alinhamento da equipe Frontend',
    startTime: `${tuesday}T09:00:00.000Z`,
    endTime: `${tuesday}T09:15:00.000Z`,
    duration: 900,
    date: tuesday,
    labelIds: ['lbl-sys-005'],
  },
  {
    id: 'entry-005',
    projectId: 'proj-001',
    projectName: 'TaskY Web App',
    title: 'Implementar autenticacao OAuth2',
    description: 'Implementacao do fluxo de callback e armazenamento de tokens',
    startTime: `${tuesday}T09:15:00.000Z`,
    endTime: `${tuesday}T13:00:00.000Z`,
    duration: 13500,
    date: tuesday,
    labelIds: ['lbl-sys-003', 'lbl-cst-002'],
  },
  {
    id: 'entry-006',
    projectId: 'proj-002',
    projectName: 'TaskY Mobile',
    title: 'Configurar push notifications',
    description: 'Setup inicial do Firebase Cloud Messaging no projeto React Native',
    startTime: `${tuesday}T14:00:00.000Z`,
    endTime: `${tuesday}T17:30:00.000Z`,
    duration: 12600,
    date: tuesday,
    labelIds: ['lbl-sys-003', 'lbl-cst-001'],
  },
  {
    id: 'entry-007',
    projectId: 'proj-003',
    projectName: 'Design System',
    title: 'Atualizar tokens de cores',
    description: 'Criacao dos novos tokens e substituicao nos componentes base',
    startTime: `${wednesday}T08:00:00.000Z`,
    endTime: `${wednesday}T11:00:00.000Z`,
    duration: 10800,
    date: wednesday,
    labelIds: ['lbl-sys-005', 'lbl-cst-003'],
  },
  {
    id: 'entry-008',
    projectId: 'proj-001',
    projectName: 'TaskY Web App',
    title: 'Criar pipeline de CI/CD',
    description: 'Configuracao do workflow de build e testes no GitHub Actions',
    startTime: `${wednesday}T11:15:00.000Z`,
    endTime: `${wednesday}T12:30:00.000Z`,
    duration: 4500,
    date: wednesday,
    labelIds: ['lbl-sys-003', 'lbl-cst-005'],
  },
  {
    id: 'entry-009',
    projectId: 'proj-001',
    projectName: 'TaskY Web App',
    title: 'Revisar PRs da sprint atual',
    description: 'Review de 4 PRs abertos da sprint',
    startTime: `${wednesday}T13:30:00.000Z`,
    endTime: `${wednesday}T16:00:00.000Z`,
    duration: 9000,
    date: wednesday,
    labelIds: ['lbl-sys-005', 'lbl-cst-002'],
  },
  {
    id: 'entry-010',
    projectId: 'proj-004',
    projectName: 'Landing Pages',
    title: 'Criar landing page de produto',
    description: 'Desenvolvimento da secao de precos e FAQ',
    startTime: `${thursday}T08:00:00.000Z`,
    endTime: `${thursday}T12:00:00.000Z`,
    duration: 14400,
    date: thursday,
    labelIds: ['lbl-sys-003', 'lbl-cst-002'],
  },
  {
    id: 'entry-011',
    projectId: 'proj-002',
    projectName: 'TaskY Mobile',
    title: 'Prototipar navegacao do app',
    description: 'Refinamento do prototipo apos feedback do time de design',
    startTime: `${thursday}T13:00:00.000Z`,
    endTime: `${thursday}T15:00:00.000Z`,
    duration: 7200,
    date: thursday,
    labelIds: ['lbl-sys-003', 'lbl-cst-003'],
  },
  {
    id: 'entry-012',
    projectId: 'proj-003',
    projectName: 'Design System',
    title: 'Documentar componentes no Storybook',
    description: 'Criacao de historias para botoes, inputs e modais',
    startTime: `${thursday}T15:15:00.000Z`,
    endTime: `${thursday}T17:00:00.000Z`,
    duration: 6300,
    date: thursday,
    labelIds: ['lbl-sys-002', 'lbl-cst-006'],
  },
  {
    id: 'entry-013',
    projectId: 'proj-001',
    projectName: 'TaskY Web App',
    title: 'Daily standup',
    description: 'Reuniao diaria de alinhamento da equipe Frontend',
    startTime: `${friday}T09:00:00.000Z`,
    endTime: `${friday}T09:15:00.000Z`,
    duration: 900,
    date: friday,
    labelIds: ['lbl-sys-005'],
  },
  {
    id: 'entry-014',
    projectId: 'proj-001',
    projectName: 'TaskY Web App',
    title: 'Implementar autenticacao OAuth2',
    description: 'Testes de integracao e ajustes finais no fluxo OAuth',
    startTime: `${friday}T09:15:00.000Z`,
    endTime: `${friday}T12:00:00.000Z`,
    duration: 9900,
    date: friday,
    labelIds: ['lbl-sys-003', 'lbl-cst-002'],
  },
  {
    id: 'entry-015',
    projectId: 'proj-004',
    projectName: 'Landing Pages',
    title: 'Configurar Google Analytics 4',
    description: 'Criacao de eventos personalizados e dashboards no GA4',
    startTime: `${friday}T13:00:00.000Z`,
    endTime: `${friday}T14:00:00.000Z`,
    duration: 3600,
    date: friday,
    labelIds: ['lbl-sys-005', 'lbl-cst-001'],
  },
]
