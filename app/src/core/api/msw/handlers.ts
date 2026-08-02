import { http, HttpResponse } from 'msw'
import type { ActivityResponse, LabelResponse, ProjectResponse, MembershipResponse, MembershipInvitationResponse, OrganizationResponse, DepartmentResponse, TeamResponse, PaginatedResponse, TimeEntryResponse, ReportDetailedRow } from '@/core/api/types'

const mockActivities: ActivityResponse[] = [
  { id: 'act-1', projectId: 'proj-1', parentActivityId: null, title: 'Setup CI', description: null, weight: 3, startDatetime: new Date().toISOString(), endDatetime: new Date(Date.now() + 86400000).toISOString(), status: 'TODO', taskType: 'TASK', priority: 'NORMAL', dueDate: null, position: 1000, completedAt: null, estimatedSeconds: 7200, createdBy: 'mem-1', assignedTo: 'mem-2', labelIds: ['label-1'], parentIds: [], checklistTotal: 2, checklistCompleted: 1, createdAt: new Date().toISOString(), version: 1 },
]

const mockTimeEntries: TimeEntryResponse[] = [
  { id: 'te-1', organizationId: 'org-1', membershipId: 'mem-1', userId: 'user-1', projectId: 'proj-1', activityId: null, description: 'Implemented auth', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString(), durationSeconds: 3600, pausedSeconds: 0, pausedAt: null, approvalStatus: 'DRAFT', submittedAt: null, approvedAt: null, approvedBy: null, rejectionComment: null, billingRateSnapshot: 120, costRateSnapshot: 60, billable: false, tags: [], createdAt: new Date().toISOString() },
]

export const handlers = [
  http.get('/api/v1/organizations', () => {
    return HttpResponse.json<OrganizationResponse[]>([
      { id: 'org-1', name: 'Test Org', slug: 'test-org', timezone: 'America/Sao_Paulo', workWeekStartsOn: 1, createdAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/organizations/:orgId/departments', () => {
    return HttpResponse.json<DepartmentResponse[]>([
      { id: 'dept-1', organizationId: 'org-1', name: 'Engineering', createdAt: new Date().toISOString() },
      { id: 'dept-2', organizationId: 'org-1', name: 'Design', createdAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/departments/:deptId/teams', ({ params }) => {
    const departmentId = String(params.deptId)
    return HttpResponse.json<TeamResponse[]>(departmentId === 'dept-1' ? [
      { id: 'team-1', departmentId, name: 'Backend', createdAt: new Date().toISOString() },
      { id: 'team-2', departmentId, name: 'Frontend', createdAt: new Date().toISOString() },
    ] : [
      { id: 'team-3', departmentId, name: 'Design', createdAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/organizations/:orgId/memberships', () => {
    return HttpResponse.json<MembershipResponse[]>([
      { id: 'mem-1', userId: 'user-1', email: 'admin@test.com', username: 'admin#test1234', role: 'admin', customUsername: null, maxDailyWorkMinutes: 480, primaryDepartmentId: null, primaryTeamId: null, timezone: null, createdAt: new Date().toISOString() },
      { id: 'mem-2', userId: 'user-2', email: 'emp@test.com', username: 'emp#test5678', role: 'employee', customUsername: null, maxDailyWorkMinutes: 480, primaryDepartmentId: 'dept-1', primaryTeamId: 'team-1', timezone: null, createdAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/organizations/:orgId/memberships/invitations', () => {
    return HttpResponse.json<MembershipInvitationResponse[]>([])
  }),

  http.get('/api/v1/organizations/:orgId/projects', () => {
    return HttpResponse.json<ProjectResponse[]>([
      { id: 'proj-1', departmentId: 'dept-1', name: 'TaskY', description: 'Main project', managerMembershipId: 'mem-1', clientId: null, hourlyRate: null, estimatedSeconds: 28800, budgetSeconds: 36000, budgetAmount: 5000, isActive: true, createdAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/projects/:projectId', () => {
    return HttpResponse.json<ProjectResponse>({ id: 'proj-1', departmentId: 'dept-1', name: 'TaskY', description: 'Main project', managerMembershipId: 'mem-1', clientId: null, hourlyRate: null, estimatedSeconds: 28800, budgetSeconds: 36000, budgetAmount: 5000, isActive: true, createdAt: new Date().toISOString() })
  }),

  http.get('/api/v1/projects/:projectId/assignments', () => {
    return HttpResponse.json([
      { id: 'asg-1', projectId: 'proj-1', membershipId: 'mem-2', assignedAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/projects/:projectId/cross-department-access', () => {
    return HttpResponse.json([])
  }),

  http.get('/api/v1/organizations/:orgId/labels', () => {
    return HttpResponse.json<LabelResponse[]>([
      { id: 'label-1', slug: 'urgent', displayName: 'Urgent', isSystem: true, createdBy: null, createdAt: new Date().toISOString() },
      { id: 'label-2', slug: 'feature', displayName: 'Feature', isSystem: true, createdBy: null, createdAt: new Date().toISOString() },
      { id: 'label-3', slug: 'custom', displayName: 'Custom Label', isSystem: false, createdBy: 'mem-1', createdAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/projects/:projectId/activities', () => {
    return HttpResponse.json<ActivityResponse[]>(mockActivities)
  }),

  http.get('/api/v1/activities/:activityId', ({ params }) => {
    const activity = mockActivities.find((a) => a.id === params.activityId)
    if (!activity) return HttpResponse.json({ detail: 'Activity not found' }, { status: 404 })
    return HttpResponse.json<ActivityResponse>(activity)
  }),

  http.get('/api/v1/activities/:activityId/comments', ({ params }) => {
    return HttpResponse.json([
      { id: 'comment-1', activityId: String(params.activityId), authorMembershipId: 'mem-1', authorName: 'admin#test1234', content: 'Comentário de exemplo', deleted: false, canDelete: true, mentions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ])
  }),

  http.post('/api/v1/activities/:activityId/comments', async ({ params, request }) => {
    const body = (await request.json()) as { content: string }
    return HttpResponse.json({ id: `comment-${Date.now()}`, activityId: String(params.activityId), authorMembershipId: 'mem-1', authorName: 'admin#test1234', content: body.content, deleted: false, canDelete: true, mentions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { status: 201 })
  }),

  http.delete('/api/v1/activities/:activityId/comments/:commentId', () => {
    return HttpResponse.json(null, { status: 204 })
  }),

  http.get('/api/v1/activities/:activityId/feed', ({ params }) => {
    return HttpResponse.json([
      { id: 'event-1', type: 'COMMENT_CREATED', actorMembershipId: 'mem-1', actorDisplayName: 'admin#test1234', actorAvatarUrl: null, commentId: 'comment-1', commentContent: 'Comentário de exemplo', commentDeleted: false, canDelete: true, mentions: [], oldValue: null, newValue: null, createdAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/activities/:activityId/mention-candidates', () => {
    return HttpResponse.json([
      { membershipId: 'mem-2', displayName: 'Ana Silva', avatarUrl: null },
      { membershipId: 'mem-3', displayName: 'Carlos Souza', avatarUrl: null },
    ])
  }),

  http.get('/api/v1/activities/:activityId/attachments', ({ params }) => {
    return HttpResponse.json([
      { id: 'att-1', activityId: String(params.activityId), uploadedByMembershipId: 'mem-1', uploadedByName: 'admin#test1234', fileName: 'briefing.pdf', contentType: 'application/pdf', sizeBytes: 1024, url: 'https://example.com/briefing.pdf', createdAt: new Date().toISOString() },
    ])
  }),

  http.post('/api/v1/activities/:activityId/attachments', async ({ params, request }) => {
    const body = (await request.json()) as { fileName: string; contentType: string; sizeBytes: number; url: string }
    return HttpResponse.json({ id: `att-${Date.now()}`, activityId: String(params.activityId), uploadedByMembershipId: 'mem-1', uploadedByName: 'admin#test1234', ...body, createdAt: new Date().toISOString() }, { status: 201 })
  }),

  http.delete('/api/v1/activities/:activityId/attachments/:attachmentId', () => {
    return HttpResponse.json(null, { status: 204 })
  }),

  http.get('/api/v1/activities', () => {
    const page: PaginatedResponse<ActivityResponse> = {
      content: mockActivities,
      totalElements: mockActivities.length,
      totalPages: 1,
      size: 1000,
      number: 0,
    }
    return HttpResponse.json<PaginatedResponse<ActivityResponse>>(page)
  }),

  http.get('/api/v1/search', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q') ?? ''
    return HttpResponse.json(q.length >= 2 ? [
      { type: 'project', id: 'proj-1', title: 'TaskY', subtitle: 'Projeto', url: '/projects/proj-1' },
      { type: 'activity', id: 'act-1', title: 'Setup CI', subtitle: 'Atividade', url: '/activities/act-1' },
    ] : [])
  }),

  http.get('/api/v1/notifications', () => {
    return HttpResponse.json([
      { id: 'notif-1', type: 'INFO', title: 'Bem-vindo ao TaskY', body: 'Seu workspace está pronto.', resourceType: null, resourceId: null, readAt: null, createdAt: new Date().toISOString() },
    ])
  }),

  http.get('/api/v1/notifications/unread-count', () => {
    return HttpResponse.json({ count: 1 })
  }),

  http.patch('/api/v1/notifications/:id/read', ({ params }) => {
    return HttpResponse.json({ id: String(params.id), type: 'INFO', title: 'Lida', body: null, resourceType: null, resourceId: null, readAt: new Date().toISOString(), createdAt: new Date().toISOString() })
  }),

  http.patch('/api/v1/notifications/read-all', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/v1/notifications/preferences', () => {
    return HttpResponse.json({
      preferences: [
        { type: 'ACTIVITY_DUE_SOON', enabled: true },
        { type: 'ACTIVITY_OVERDUE', enabled: true },
        { type: 'OPEN_TIMER', enabled: true },
        { type: 'TIME_ENTRY_PENDING_APPROVAL', enabled: true },
      ],
    })
  }),

  http.put('/api/v1/notifications/preferences', async ({ request }) => {
    const body = (await request.json()) as { preferences: Array<{ type: string; enabled: boolean }> }
    return HttpResponse.json({ preferences: body.preferences })
  }),

  http.get('/api/v1/time-entries', () => {
    const page: PaginatedResponse<TimeEntryResponse> = {
      content: mockTimeEntries,
      totalElements: mockTimeEntries.length,
      totalPages: 1,
      size: 1000,
      number: 0,
    }
    return HttpResponse.json<PaginatedResponse<TimeEntryResponse>>(page)
  }),

  http.get('/api/v1/time-entries/org', () => {
    const page: PaginatedResponse<TimeEntryResponse> = {
      content: mockTimeEntries,
      totalElements: mockTimeEntries.length,
      totalPages: 1,
      size: 1000,
      number: 0,
    }
    return HttpResponse.json<PaginatedResponse<TimeEntryResponse>>(page)
  }),

  http.get('/api/v1/reports/summary', () => {
    return HttpResponse.json({
      weeklyHours: [
        { day: 'Seg', hours: 0 },
        { day: 'Ter', hours: 0 },
        { day: 'Qua', hours: 0 },
        { day: 'Qui', hours: 0 },
        { day: 'Sex', hours: 0 },
        { day: 'Sab', hours: 0 },
        { day: 'Dom', hours: 0 },
      ],
      projectHours: [{ project: 'TaskY', hours: 1 }],
      memberProductivity: [{ name: 'Admin', hours: 1, activities: 1 }],
      labelDistribution: [],
      dailyAverage: 1,
      totalHours: 1,
      totalActivities: 1,
    })
  }),

  http.get('/api/v1/reports/detailed', () => {
    const page: PaginatedResponse<ReportDetailedRow> = {
      content: [
        {
          id: 'row-1',
          projectName: 'TaskY',
          memberName: 'admin#test1234',
          description: 'Implementação de autenticação',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString(),
          hours: 1,
          approvalStatus: 'APPROVED',
          revenue: 120,
          cost: 60,
          margin: 60,
          billable: true,
          tags: ['dev'],
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 100,
      number: 0,
    }
    return HttpResponse.json<PaginatedResponse<ReportDetailedRow>>(page)
  }),

  http.get('/api/v1/reports/financials/projects', () => {
    return HttpResponse.json([
      { projectId: 'proj-1', projectName: 'TaskY', estimatedSeconds: 28800, actualApprovedSeconds: 7200, actualNotApprovedSeconds: 0, remainingSeconds: 21600, progressPercent: 25, budgetSeconds: 36000, budgetAmount: 5000, cost: 120, revenue: 240, margin: 120 },
    ])
  }),

  http.get('/api/v1/reports/financials/members', () => {
    return HttpResponse.json([
      { membershipId: 'mem-1', memberName: 'Admin', estimatedSeconds: 28800, actualApprovedSeconds: 7200, actualNotApprovedSeconds: 0, remainingSeconds: 21600, progressPercent: 25, cost: 120, revenue: 240, margin: 120 },
    ])
  }),

  http.get('/api/v1/reports/financials/activities', () => {
    return HttpResponse.json([
      { activityId: 'act-1', activityTitle: 'Setup CI', estimatedSeconds: 7200, actualApprovedSeconds: 3600, actualNotApprovedSeconds: 0, remainingSeconds: 3600, progressPercent: 50, cost: 60, revenue: 120, margin: 60 },
    ])
  }),

  http.get('/api/v1/reports/financials/departments', () => {
    return HttpResponse.json([
      { departmentId: 'dept-1', departmentName: 'Engineering', estimatedSeconds: 28800, actualApprovedSeconds: 7200, actualNotApprovedSeconds: 0, remainingSeconds: 21600, progressPercent: 25, cost: 120, revenue: 240, margin: 120 },
    ])
  }),

  http.get('/api/v1/reports/financials/teams', () => {
    return HttpResponse.json([
      { teamId: 'team-1', teamName: 'Backend', estimatedSeconds: 14400, actualApprovedSeconds: 3600, actualNotApprovedSeconds: 0, remainingSeconds: 10800, progressPercent: 25, cost: 60, revenue: 120, margin: 60 },
    ])
  }),

  http.get('/api/v1/reports/financials/clients', () => {
    return HttpResponse.json([])
  }),

  http.get('/api/v1/reports/groupings/approval', () => {
    return HttpResponse.json([
      { approvalStatus: 'APPROVED', seconds: 7200, entries: 1 },
      { approvalStatus: 'DRAFT', seconds: 3600, entries: 2 },
    ])
  }),

  http.get('/api/v1/reports/groupings/billable', () => {
    return HttpResponse.json([
      { billable: true, seconds: 7200, entries: 1 },
      { billable: false, seconds: 3600, entries: 2 },
    ])
  }),

  http.get('/api/v1/reports/saved', () => {
    return HttpResponse.json([
      { id: 'report-1', name: 'Relatório semanal', description: 'Horas da semana', params: { from: '2026-08-01' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1 },
    ])
  }),

  http.post('/api/v1/reports/saved', async ({ request }) => {
    const body = (await request.json()) as { name: string; description?: string; params?: Record<string, unknown> }
    return HttpResponse.json({ id: `report-${Date.now()}`, name: body.name, description: body.description ?? null, params: body.params ?? {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1 }, { status: 201 })
  }),

  http.get('/api/v1/reports/exports', () => {
    return HttpResponse.json({ id: 'job-1', status: 'DONE', format: 'csv', downloadUrl: '/api/v1/reports/exports/job-1/download', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString() }, { status: 202 })
  }),

  http.get('/api/v1/reports/exports/:jobId', () => {
    return HttpResponse.json({ id: 'job-1', status: 'DONE', format: 'csv', downloadUrl: '/api/v1/reports/exports/job-1/download', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString() })
  }),

  http.get('/api/v1/reports/exports/:jobId/download', () => {
    return new HttpResponse('projeto,horas\nTaskY,1\n', {
      status: 200,
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=tasky-report.csv' },
    })
  }),

  http.post('/api/v1/projects/:projectId/activities/reorder', async ({ request }) => {
    const body = (await request.json()) as { activityIds: string[] }
    const reordered = body.activityIds
      .map((id) => mockActivities.find((a) => a.id === id))
      .filter((a): a is ActivityResponse => !!a)
    return HttpResponse.json<ActivityResponse[]>(reordered.length > 0 ? reordered : mockActivities)
  }),

  http.get('/api/v1/timesheets/periods', () => {
    return HttpResponse.json([
      { id: 'period-1', organizationId: 'org-1', membershipId: 'mem-1', periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 604800000).toISOString(), status: 'DRAFT', submittedAt: null, approvedAt: null, approvedBy: null, rejectionComment: null, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ])
  }),

  http.post('/api/v1/timesheets/periods', async ({ request }) => {
    const body = (await request.json()) as { periodStart: string }
    return HttpResponse.json({ id: `period-${Date.now()}`, organizationId: 'org-1', membershipId: 'mem-1', periodStart: body.periodStart, periodEnd: new Date(Date.parse(body.periodStart) + 604800000).toISOString(), status: 'DRAFT', submittedAt: null, approvedAt: null, approvedBy: null, rejectionComment: null, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { status: 201 })
  }),

  http.post('/api/v1/timesheets/periods/:periodId/submit', ({ params }) => {
    return HttpResponse.json({ id: String(params.periodId), organizationId: 'org-1', membershipId: 'mem-1', periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 604800000).toISOString(), status: 'SUBMITTED', submittedAt: new Date().toISOString(), approvedAt: null, approvedBy: null, rejectionComment: null, version: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  }),

  http.post('/api/v1/timesheets/periods/:periodId/reopen', ({ params }) => {
    return HttpResponse.json({ id: String(params.periodId), organizationId: 'org-1', membershipId: 'mem-1', periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 604800000).toISOString(), status: 'DRAFT', submittedAt: null, approvedAt: null, approvedBy: null, rejectionComment: null, version: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  }),

  http.post('/api/v1/timesheets/periods/approve', async ({ request }) => {
    const body = (await request.json()) as { periodIds: string[] }
    return HttpResponse.json(body.periodIds.map((id) => ({ id, organizationId: 'org-1', membershipId: 'mem-1', periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 604800000).toISOString(), status: 'APPROVED', submittedAt: new Date().toISOString(), approvedAt: new Date().toISOString(), approvedBy: 'mem-1', rejectionComment: null, version: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })))
  }),

  http.post('/api/v1/timesheets/periods/reject', async ({ request }) => {
    const body = (await request.json()) as { periodIds: string[]; comment: string }
    return HttpResponse.json(body.periodIds.map((id) => ({ id, organizationId: 'org-1', membershipId: 'mem-1', periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 604800000).toISOString(), status: 'REJECTED', submittedAt: new Date().toISOString(), approvedAt: null, approvedBy: null, rejectionComment: body.comment, version: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })))
  }),

  http.post('/api/v1/timesheets/periods/:periodId/close', ({ params }) => {
    return HttpResponse.json({ id: String(params.periodId), organizationId: 'org-1', membershipId: 'mem-1', periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 604800000).toISOString(), status: 'LOCKED', submittedAt: new Date().toISOString(), approvedAt: null, approvedBy: null, rejectionComment: null, version: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  }),

  http.get('/api/v1/timesheets/periods/approval-queue', () => {
    return HttpResponse.json([
      { id: 'period-2', organizationId: 'org-1', membershipId: 'mem-2', ownerUsername: 'emp#test5678', ownerDisplayName: 'Ana Silva', periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 604800000).toISOString(), submittedAt: new Date().toISOString(), version: 1, totalSeconds: 28800, billableSeconds: 14400, entryCount: 8 },
      { id: 'period-3', organizationId: 'org-1', membershipId: 'mem-3', ownerUsername: 'emp2#test9012', ownerDisplayName: 'Carlos Souza', periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 604800000).toISOString(), submittedAt: new Date().toISOString(), version: 1, totalSeconds: 21600, billableSeconds: 21600, entryCount: 6 },
    ])
  }),

  http.get('/api/v1/capacity/members', () => {
    return HttpResponse.json([
      { membershipId: 'mem-1', displayName: 'Admin', from: new Date().toISOString(), to: new Date(Date.now() + 604800000).toISOString(), availableSeconds: 28800, plannedSeconds: 21600, actualSeconds: 7200, remainingCapacitySeconds: 7200, utilization: 75, overloadSeconds: 0 },
      { membershipId: 'mem-2', displayName: 'Ana Silva', from: new Date().toISOString(), to: new Date(Date.now() + 604800000).toISOString(), availableSeconds: 28800, plannedSeconds: 36000, actualSeconds: 14400, remainingCapacitySeconds: 0, utilization: 125, overloadSeconds: 7200 },
    ])
  }),

  http.get('/api/v1/capacity/schedules', () => {
    return HttpResponse.json([
      { id: 'schedule-1', name: 'Padrão', description: 'Jornada padrão', isDefault: true, days: [{ id: 'day-1', dayOfWeek: 1, isWorkDay: true, startTime: '09:00', endTime: '18:00' }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ])
  }),

  http.post('/api/v1/capacity/schedules', async ({ request }) => {
    const body = (await request.json()) as { name: string; description?: string; isDefault?: boolean; days?: unknown[] }
    return HttpResponse.json({ id: `schedule-${Date.now()}`, name: body.name, description: body.description ?? null, isDefault: body.isDefault ?? false, days: body.days ?? [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { status: 201 })
  }),

  http.get('/api/v1/capacity/holidays', () => {
    return HttpResponse.json([
      { id: 'holiday-1', name: 'Ano Novo', holidayDate: '2026-01-01', isRecurringYearly: true, createdAt: new Date().toISOString() },
    ])
  }),

  http.post('/api/v1/capacity/holidays', async ({ request }) => {
    const body = (await request.json()) as { name: string; holidayDate: string; isRecurringYearly?: boolean }
    return HttpResponse.json({ id: `holiday-${Date.now()}`, name: body.name, holidayDate: body.holidayDate, isRecurringYearly: body.isRecurringYearly ?? false, createdAt: new Date().toISOString() }, { status: 201 })
  }),

  http.get('/api/v1/capacity/leave', () => {
    return HttpResponse.json([
      { id: 'leave-1', membershipId: 'mem-2', leaveType: 'VACATION', status: 'APPROVED', startDate: '2026-09-01', endDate: '2026-09-10', note: null, createdAt: new Date().toISOString() },
    ])
  }),

  http.post('/api/v1/capacity/leave', async ({ request }) => {
    const body = (await request.json()) as { membershipId?: string; leaveType?: string; startDate: string; endDate: string; status?: string; note?: string }
    return HttpResponse.json({ id: `leave-${Date.now()}`, membershipId: body.membershipId ?? 'mem-1', leaveType: body.leaveType ?? 'OTHER', status: body.status ?? 'REQUESTED', startDate: body.startDate, endDate: body.endDate, note: body.note ?? null, createdAt: new Date().toISOString() }, { status: 201 })
  }),

  http.post('/api/v1/time-entries', async ({ request }) => {
    const body = (await request.json()) as { projectId?: string }
    const entry: TimeEntryResponse = {
      id: `te-${Date.now()}`,
      organizationId: 'org-1',
      membershipId: 'mem-1',
      userId: 'user-1',
      projectId: body.projectId ?? null,
      activityId: null,
      description: null,
      startTime: new Date().toISOString(),
      endTime: null,
      durationSeconds: null,
      pausedSeconds: 0,
      pausedAt: null,
      approvalStatus: 'DRAFT',
      submittedAt: null,
      approvedAt: null,
      approvedBy: null,
      rejectionComment: null,
      billingRateSnapshot: null,
      costRateSnapshot: null,
      billable: false,
      tags: [],
      createdAt: new Date().toISOString(),
    }
    mockTimeEntries.unshift(entry)
    return HttpResponse.json<TimeEntryResponse>(entry, { status: 201 })
  }),

  http.post('/api/v1/time-entries/manual', async ({ request }) => {
    const body = (await request.json()) as Partial<TimeEntryResponse>
    const start = body.startTime ?? new Date().toISOString()
    const end = body.endTime ?? new Date(Date.parse(start) + 3600000).toISOString()
    const entry: TimeEntryResponse = {
      id: `te-${Date.now()}`,
      organizationId: 'org-1',
      membershipId: 'mem-1',
      userId: 'user-1',
      projectId: body.projectId ?? null,
      activityId: body.activityId ?? null,
      description: body.description ?? null,
      startTime: start,
      endTime: end,
      durationSeconds: Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 1000)),
      pausedSeconds: 0,
      pausedAt: null,
      approvalStatus: 'DRAFT',
      submittedAt: null,
      approvedAt: null,
      approvedBy: null,
      rejectionComment: null,
      billingRateSnapshot: null,
      costRateSnapshot: null,
      billable: body.billable ?? false,
      tags: body.tags ?? [],
      createdAt: new Date().toISOString(),
    }
    mockTimeEntries.unshift(entry)
    return HttpResponse.json<TimeEntryResponse>(entry, { status: 201 })
  }),

  http.patch('/api/v1/time-entries/:entryId/stop', () => {
    return HttpResponse.json<TimeEntryResponse>({ ...mockTimeEntries[0], endTime: new Date().toISOString(), durationSeconds: 3600, pausedAt: null })
  }),

  http.patch('/api/v1/time-entries/:entryId/pause', () => {
    return HttpResponse.json<TimeEntryResponse>({ ...mockTimeEntries[0], pausedAt: new Date().toISOString() })
  }),

  http.patch('/api/v1/time-entries/:entryId/resume', () => {
    return HttpResponse.json<TimeEntryResponse>({ ...mockTimeEntries[0], pausedSeconds: mockTimeEntries[0].pausedSeconds + 60, pausedAt: null })
  }),

  http.put('/api/v1/time-entries/:entryId', async ({ request }) => {
    const body = (await request.json()) as { startTime?: string; endTime?: string }
    return HttpResponse.json<TimeEntryResponse>({ ...mockTimeEntries[0], ...body })
  }),

  http.delete('/api/v1/time-entries/:entryId', () => {
    return HttpResponse.json(null, { status: 204 })
  }),

  http.post('/api/v1/auth/google', () => {
    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: { id: 'user-1', email: 'admin@test.com', username: 'admin#test1234', displayName: 'Admin', avatarUrl: null },
      organizations: [{ id: 'org-1', name: 'Test Org', slug: 'test-org', role: 'admin', timezone: 'America/Sao_Paulo', workWeekStartsOn: 1 }],
    })
  }),

  http.post('/api/v1/auth/refresh', () => {
    return HttpResponse.json({
      token: 'mock-refreshed-token',
      user: { id: 'user-1', email: 'admin@test.com', username: 'admin#test1234', displayName: 'Admin', avatarUrl: null },
      organizations: [{ id: 'org-1', name: 'Test Org', slug: 'test-org', role: 'admin', timezone: 'America/Sao_Paulo', workWeekStartsOn: 1 }],
      activeOrganizationId: 'org-1',
    })
  }),

  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({
      id: 'user-1',
      email: 'admin@test.com',
      username: 'admin#test1234',
      activeOrganizationId: 'org-1',
      role: 'admin',
    })
  }),

  http.post('/api/v1/auth/logout', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]
