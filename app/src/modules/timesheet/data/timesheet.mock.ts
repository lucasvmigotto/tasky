export interface TimesheetEntry {
  id: string
  projectId: string
  date: string
  hours: number
  description: string
  startTime: string | null
  endTime: string | null
}

function getWeekdayDate(dayOffset: number): string {
  const now = new Date()
  const currentDay = now.getDay()
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
  const d = new Date(now)
  d.setDate(d.getDate() + mondayOffset + dayOffset)
  return d.toISOString().split('T')[0]
}

const dates = Array.from({ length: 7 }, (_, i) => getWeekdayDate(i))

export const demoTimesheetEntries: TimesheetEntry[] = [
  // TaskY Web App
  { id: 'e-001', projectId: 'proj-001', date: dates[0], hours: 2.5, description: 'Reunião de alinhamento sprint', startTime: '08:00', endTime: '10:30', },
  { id: 'e-002', projectId: 'proj-001', date: dates[0], hours: 3.5, description: 'Implementação autenticação OAuth2', startTime: '10:45', endTime: '14:15', },
  { id: 'e-003', projectId: 'proj-001', date: dates[1], hours: 4.0, description: 'Code review e refatoração', startTime: '09:00', endTime: '13:00', },
  { id: 'e-004', projectId: 'proj-001', date: dates[1], hours: 4.0, description: 'Testes de integração', startTime: '14:00', endTime: '18:00', },
  { id: 'e-005', projectId: 'proj-001', date: dates[2], hours: 3.5, description: 'Correção bug sessão expirada', startTime: '08:00', endTime: '11:30', },
  { id: 'e-006', projectId: 'proj-001', date: dates[2], hours: 4.0, description: 'Daily + desenvolvimento dashboard', startTime: '13:00', endTime: '17:00', },
  { id: 'e-007', projectId: 'proj-001', date: dates[3], hours: 2.5, description: 'Documentação API REST', startTime: '09:00', endTime: '11:30', },
  { id: 'e-008', projectId: 'proj-001', date: dates[3], hours: 4.0, description: 'Pair programming feature labels', startTime: '13:00', endTime: '17:00', },
  { id: 'e-009', projectId: 'proj-001', date: dates[4], hours: 4.5, description: 'Deploy staging + hotfix', startTime: '08:00', endTime: '12:30', },

  // TaskY Mobile
  { id: 'e-010', projectId: 'proj-002', date: dates[1], hours: 3.5, description: 'Setup Firebase Cloud Messaging', startTime: '14:00', endTime: '17:30', },
  { id: 'e-011', projectId: 'proj-002', date: dates[3], hours: 2.0, description: 'Prototipagem navegação app', startTime: '13:00', endTime: '15:00', },

  // Design System
  { id: 'e-012', projectId: 'proj-003', date: dates[2], hours: 3.0, description: 'Atualização tokens de cores', startTime: '08:00', endTime: '11:00', },
  { id: 'e-013', projectId: 'proj-003', date: dates[3], hours: 1.75, description: 'Documentar componentes Storybook', startTime: '15:15', endTime: '17:00', },

  // Landing Pages
  { id: 'e-014', projectId: 'proj-004', date: dates[3], hours: 4.0, description: 'Landing page produto - seção preços', startTime: '08:00', endTime: '12:00', },
  { id: 'e-015', projectId: 'proj-004', date: dates[4], hours: 1.0, description: 'Configurar Google Analytics 4', startTime: '13:00', endTime: '14:00', },
]
