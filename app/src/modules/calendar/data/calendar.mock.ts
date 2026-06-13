export interface DemoCalendarEvent {
  id: string
  title: string
  projectId: string
  projectName: string
  startDatetime: string
  endDatetime: string
  type: 'activity' | 'meeting' | 'deadline'
}

function getDateInCurrentMonth(day: number): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const year = new Date().getFullYear()
const month = String(new Date().getMonth() + 1).padStart(2, '0')

export const demoCalendarEvents: DemoCalendarEvent[] = [
  {
    id: 'cal-001',
    title: 'Daily Standup - Frontend',
    projectId: 'proj-001',
    projectName: 'TaskY Web App',
    startDatetime: `${getDateInCurrentMonth(3)}T09:00:00.000Z`,
    endDatetime: `${getDateInCurrentMonth(3)}T09:15:00.000Z`,
    type: 'meeting',
  },
  {
    id: 'cal-002',
    title: 'Sprint Review',
    projectId: 'proj-001',
    projectName: 'TaskY Web App',
    startDatetime: `${getDateInCurrentMonth(5)}T14:00:00.000Z`,
    endDatetime: `${getDateInCurrentMonth(5)}T15:30:00.000Z`,
    type: 'meeting',
  },
  {
    id: 'cal-003',
    title: 'Entrega: Autenticacao OAuth2',
    projectId: 'proj-001',
    projectName: 'TaskY Web App',
    startDatetime: `${getDateInCurrentMonth(10)}T17:00:00.000Z`,
    endDatetime: `${getDateInCurrentMonth(10)}T17:00:00.000Z`,
    type: 'deadline',
  },
  {
    id: 'cal-004',
    title: 'Implementar push notifications',
    projectId: 'proj-002',
    projectName: 'TaskY Mobile',
    startDatetime: `${getDateInCurrentMonth(4)}T08:00:00.000Z`,
    endDatetime: `${getDateInCurrentMonth(5)}T17:00:00.000Z`,
    type: 'activity',
  },
  {
    id: 'cal-005',
    title: 'Reuniao de alinhamento Mobile',
    projectId: 'proj-002',
    projectName: 'TaskY Mobile',
    startDatetime: `${getDateInCurrentMonth(7)}T10:00:00.000Z`,
    endDatetime: `${getDateInCurrentMonth(7)}T11:00:00.000Z`,
    type: 'meeting',
  },
  {
    id: 'cal-006',
    title: 'Prototipar navegacao do app',
    projectId: 'proj-002',
    projectName: 'TaskY Mobile',
    startDatetime: `${getDateInCurrentMonth(2)}T08:00:00.000Z`,
    endDatetime: `${getDateInCurrentMonth(4)}T17:00:00.000Z`,
    type: 'activity',
  },
  {
    id: 'cal-007',
    title: 'Apresentacao Design System',
    projectId: 'proj-003',
    projectName: 'Design System',
    startDatetime: `${getDateInCurrentMonth(8)}T15:00:00.000Z`,
    endDatetime: `${getDateInCurrentMonth(8)}T16:00:00.000Z`,
    type: 'meeting',
  },
  {
    id: 'cal-008',
    title: 'Entrega: Tokens de cores',
    projectId: 'proj-003',
    projectName: 'Design System',
    startDatetime: `${getDateInCurrentMonth(8)}T17:00:00.000Z`,
    endDatetime: `${getDateInCurrentMonth(8)}T17:00:00.000Z`,
    type: 'deadline',
  },
  {
    id: 'cal-009',
    title: 'Criar landing page de produto',
    projectId: 'proj-004',
    projectName: 'Landing Pages',
    startDatetime: `${getDateInCurrentMonth(1)}T08:00:00.000Z`,
    endDatetime: `${getDateInCurrentMonth(11)}T17:00:00.000Z`,
    type: 'activity',
  },
  {
    id: 'cal-010',
    title: 'Retrospectiva da Sprint',
    projectId: 'proj-001',
    projectName: 'TaskY Web App',
    startDatetime: `${getDateInCurrentMonth(12)}T16:00:00.000Z`,
    endDatetime: `${getDateInCurrentMonth(12)}T17:00:00.000Z`,
    type: 'meeting',
  },
]
