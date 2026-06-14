import { http, HttpResponse } from 'msw'
import type { ActivityResponse, LabelResponse, ProjectResponse, MembershipResponse, OrganizationResponse, DepartmentResponse, TeamResponse } from '@/core/api/types'

export const handlers = [
  http.get('/api/v1/organizations', () => {
    return HttpResponse.json<OrganizationResponse[]>([
      { id: 'org-1', name: 'Test Org', slug: 'test-org', createdAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/organizations/:orgId/departments', () => {
    return HttpResponse.json<DepartmentResponse[]>([
      { id: 'dept-1', organizationId: 'org-1', name: 'Engineering', createdAt: new Date().toISOString() },
      { id: 'dept-2', organizationId: 'org-1', name: 'Design', createdAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/departments/:deptId/teams', () => {
    return HttpResponse.json<TeamResponse[]>([
      { id: 'team-1', departmentId: 'dept-1', name: 'Backend', createdAt: new Date().toISOString() },
      { id: 'team-2', departmentId: 'dept-1', name: 'Frontend', createdAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/organizations/:orgId/memberships', () => {
    return HttpResponse.json<MembershipResponse[]>([
      { id: 'mem-1', userId: 'user-1', email: 'admin@test.com', username: 'admin#test1234', role: 'admin', customUsername: null, maxDailyWorkMinutes: 480, createdAt: new Date().toISOString() },
      { id: 'mem-2', userId: 'user-2', email: 'emp@test.com', username: 'emp#test5678', role: 'employee', customUsername: null, maxDailyWorkMinutes: 480, createdAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/organizations/:orgId/projects', () => {
    return HttpResponse.json<ProjectResponse[]>([
      { id: 'proj-1', departmentId: 'dept-1', name: 'TaskY', description: 'Main project', managerMembershipId: 'mem-1', isActive: true, createdAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/organizations/:orgId/labels', () => {
    return HttpResponse.json<LabelResponse[]>([
      { id: 'label-1', slug: 'urgent', displayName: 'Urgent', isSystem: true, createdBy: null, createdAt: new Date().toISOString() },
      { id: 'label-2', slug: 'feature', displayName: 'Feature', isSystem: true, createdBy: null, createdAt: new Date().toISOString() },
      { id: 'label-3', slug: 'custom', displayName: 'Custom Label', isSystem: false, createdBy: 'mem-1', createdAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/projects/:projectId/activities', () => {
    return HttpResponse.json<ActivityResponse[]>([
      { id: 'act-1', projectId: 'proj-1', title: 'Setup CI', description: null, weight: 3, startDatetime: new Date().toISOString(), endDatetime: new Date(Date.now() + 86400000).toISOString(), createdBy: 'mem-1', assignedTo: 'mem-2', labelIds: ['label-1'], parentIds: [], createdAt: new Date().toISOString() },
    ])
  }),

  http.post('/api/v1/auth/google', () => {
    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: { id: 'user-1', email: 'admin@test.com', username: 'admin#test1234', displayName: 'Admin', avatarUrl: null },
      organizations: [{ id: 'org-1', name: 'Test Org', slug: 'test-org', role: 'admin' }],
    })
  }),
]
