import type { Team } from '@/core/types/models'

export const demoTeams: Team[] = [
  {
    id: 'team-001',
    departmentId: 'dept-001',
    name: 'Frontend',
    createdAt: '2024-01-15T08:00:00.000Z',
  },
  {
    id: 'team-002',
    departmentId: 'dept-001',
    name: 'Backend',
    createdAt: '2024-01-15T08:30:00.000Z',
  },
  {
    id: 'team-003',
    departmentId: 'dept-001',
    name: 'DevOps',
    createdAt: '2024-01-20T10:00:00.000Z',
  },
  {
    id: 'team-004',
    departmentId: 'dept-002',
    name: 'UI/UX',
    createdAt: '2024-01-22T09:00:00.000Z',
  },
  {
    id: 'team-005',
    departmentId: 'dept-002',
    name: 'Brand',
    createdAt: '2024-02-01T11:00:00.000Z',
  },
  {
    id: 'team-006',
    departmentId: 'dept-003',
    name: 'Growth',
    createdAt: '2024-02-05T14:00:00.000Z',
  },
]
