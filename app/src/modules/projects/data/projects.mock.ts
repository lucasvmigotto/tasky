import type { Project } from '@/core/types/models'

export const demoProjects: Project[] = [
  {
    id: 'proj-001',
    departmentId: 'dept-001',
    name: 'TaskY Web App',
    description: 'Plataforma web principal do TaskY para gestao de tarefas e equipes',
    managerMembershipId: 'memb-002',
    isActive: true,
    createdAt: '2024-01-20T08:00:00.000Z',
  },
  {
    id: 'proj-002',
    departmentId: 'dept-001',
    name: 'TaskY Mobile',
    description: 'Aplicativo mobile iOS e Android para acompanhamento de tarefas em campo',
    managerMembershipId: 'memb-002',
    isActive: true,
    createdAt: '2024-02-10T09:00:00.000Z',
  },
  {
    id: 'proj-003',
    departmentId: 'dept-002',
    name: 'Design System',
    description: 'Sistema de design e biblioteca de componentes compartilhados do TaskY',
    managerMembershipId: 'memb-003',
    isActive: true,
    createdAt: '2024-02-15T10:00:00.000Z',
  },
  {
    id: 'proj-004',
    departmentId: 'dept-003',
    name: 'Landing Pages',
    description: 'Paginas de captacao e conversao para divulgacao do produto',
    managerMembershipId: 'memb-003',
    isActive: true,
    createdAt: '2024-03-01T11:00:00.000Z',
  },
  {
    id: 'proj-005',
    departmentId: 'dept-001',
    name: 'Legacy Migration',
    description: 'Migracao do sistema legado para a nova arquitetura de microsservicos',
    managerMembershipId: 'memb-002',
    isActive: false,
    createdAt: '2024-01-25T08:00:00.000Z',
  },
  {
    id: 'proj-006',
    departmentId: 'dept-002',
    name: 'Inteligência Artificial',
    description: 'Integracao de recursos de IA para recomendacoes e automacao',
    managerMembershipId: 'memb-003',
    isActive: true,
    createdAt: '2024-04-10T08:00:00.000Z',
  },
  {
    id: 'proj-007',
    departmentId: 'dept-003',
    name: 'Site Institucional',
    description: 'Novo site corporativo com blog e area do cliente',
    managerMembershipId: 'memb-004',
    isActive: true,
    createdAt: '2024-05-01T09:00:00.000Z',
  },
  {
    id: 'proj-008',
    departmentId: 'dept-001',
    name: 'API Gateway',
    description: 'Gateway unificado para APIs internas e externas',
    managerMembershipId: 'memb-002',
    isActive: true,
    createdAt: '2024-06-15T10:00:00.000Z',
  },
]

export interface ProjectAssignment {
  projectId: string
  membershipIds: string[]
}

export const demoProjectAssignments: ProjectAssignment[] = [
  {
    projectId: 'proj-001',
    membershipIds: ['memb-002', 'memb-004', 'memb-006', 'memb-007'],
  },
  {
    projectId: 'proj-002',
    membershipIds: ['memb-002', 'memb-005', 'memb-006', 'memb-008'],
  },
  {
    projectId: 'proj-003',
    membershipIds: ['memb-003', 'memb-005', 'memb-007'],
  },
  {
    projectId: 'proj-004',
    membershipIds: ['memb-003', 'memb-004', 'memb-008'],
  },
  {
    projectId: 'proj-005',
    membershipIds: ['memb-002', 'memb-004', 'memb-008'],
  },
  {
    projectId: 'proj-006',
    membershipIds: ['memb-003', 'memb-005', 'memb-007'],
  },
  {
    projectId: 'proj-007',
    membershipIds: ['memb-004', 'memb-006', 'memb-008'],
  },
  {
    projectId: 'proj-008',
    membershipIds: ['memb-002', 'memb-005', 'memb-006'],
  },
]
