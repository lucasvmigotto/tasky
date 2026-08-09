import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, getAccessToken } from '@/core/api/apiClient'
import { useAuthStore } from '@/core/auth/authStore'
import type {
  OrganizationResponse,
  CreateOrganizationRequest,
  DepartmentResponse,
  CreateDepartmentRequest,
  MemberTypeResponse,
  CreateMemberTypeRequest,
  MembershipResponse,
  MembershipInvitationResponse,
  InviteRequest,
  UpdateMembershipSettingsRequest,
  ProjectResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectAssignmentResponse,
  CrossDepartmentAccessResponse,
  ActivityResponse,
  CreateActivityRequest,
  UpdateActivityRequest,
  MoveActivityRequest,
  ActivityCommentResponse,
  CreateActivityCommentRequest,
  ActivityAttachmentResponse,
  CreateActivityAttachmentRequest,
  ActivityChecklistItem,
  ActivityQueryParams,
  ActivityTemplateResponse,
  CreateActivityTemplateRequest,
  GeneratedActivityResponse,
  PaginatedResponse,
  TimeEntryResponse,
  StartTimeEntryRequest,
  ManualTimeEntryRequest,
  UpdateTimeEntryRequest,
  TimeEntryQueryParams,
  ChangeRoleRequest,
  ReportSummaryResponse,
  ReportDetailedRow,
  ReportQueryParams,
  WorkloadMemberResponse,
  ExportJobResponse,
  SearchResultResponse,
  NotificationResponse,
  NotificationPreferencesResponse,
  UpdateNotificationPreferencesRequest,
  ActivityFeedItem,
  MentionCandidate,
  SwitchOrgResponse,
  InternalRequest,
  CreateInternalRequest,
  UpdateInternalRequest,
  InternalRequestQueryParams,
  RequestComment,
  SectorOverviewResponse,
  UUID,
  ReorderActivitiesRequest,
  TimesheetPeriodResponse,
  TimesheetPeriodQueueItem,
  TimesheetPeriodQueryParams,
  CreateTimesheetPeriodRequest,
  ApproveTimesheetPeriodsRequest,
  RejectTimesheetPeriodsRequest,
  MemberCapacityResponse,
  CapacityMembersQueryParams,
  WorkScheduleResponse,
  CreateWorkScheduleRequest,
  UpdateWorkScheduleRequest,
  WorkScheduleDayRequest,
  AssignWorkScheduleRequest,
  OrganizationHolidayResponse,
  CreateOrganizationHolidayRequest,
  MembershipLeavePeriodResponse,
  CreateMembershipLeaveRequest,
  UpdateMembershipLeaveRequest,
  MembershipWorkScheduleResponse,
  ProjectFinancialResponse,
  MemberFinancialResponse,
  ActivityFinancialResponse,
  DepartmentFinancialResponse,
  ApprovalGroupResponse,
  BillableGroupResponse,
  SavedReportResponse,
  CreateSavedReportRequest,
} from '@/core/api/types'

const DEFAULT_ACTIVITY_PAGE_SIZE = 500

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiClient.get<OrganizationResponse[]>('/organizations'),
  })
}

export function useCreateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOrganizationRequest) =>
      apiClient.post<OrganizationResponse>('/organizations', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] }),
  })
}

export function useDepartments(orgId: UUID | null) {
  return useQuery({
    queryKey: ['departments', orgId],
    queryFn: () => apiClient.get<DepartmentResponse[]>(`/organizations/${orgId}/departments`),
    enabled: !!orgId,
  })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: UUID; data: CreateDepartmentRequest }) =>
      apiClient.post<DepartmentResponse>(`/organizations/${orgId}/departments`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  })
}

export function useMemberships(orgId: UUID | null) {
  return useQuery({
    queryKey: ['memberships', orgId],
    queryFn: () => apiClient.get<MembershipResponse[]>(`/organizations/${orgId}/memberships`),
    enabled: !!orgId,
  })
}

export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: UUID; data: InviteRequest }) =>
      apiClient.post<MembershipInvitationResponse>(`/organizations/${orgId}/memberships/invite`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['memberships'] })
      void qc.invalidateQueries({ queryKey: ['membership-invitations'] })
    },
  })
}

export function useDepartmentMemberTypes(deptId: UUID | null) {
  return useQuery({
    queryKey: ['member-types', deptId],
    queryFn: () => apiClient.get<MemberTypeResponse[]>(`/departments/${deptId}/member-types`),
    enabled: !!deptId,
  })
}

export function useCreateMemberType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deptId, data }: { deptId: UUID; data: CreateMemberTypeRequest }) =>
      apiClient.post<MemberTypeResponse>(`/departments/${deptId}/member-types`, data),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['member-types', variables.deptId] }),
  })
}

export function useUpdateMemberType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deptId, memberTypeId, data }: { deptId: UUID; memberTypeId: UUID; data: Partial<CreateMemberTypeRequest> }) =>
      apiClient.put<MemberTypeResponse>(`/departments/${deptId}/member-types/${memberTypeId}`, data),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['member-types', variables.deptId] }),
  })
}

export function useDeleteMemberType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deptId, memberTypeId }: { deptId: UUID; memberTypeId: UUID }) =>
      apiClient.delete(`/departments/${deptId}/member-types/${memberTypeId}`),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['member-types', variables.deptId] })
      void qc.invalidateQueries({ queryKey: ['memberships'] })
    },
  })
}

export function useMembershipInvitations(orgId: UUID | null) {
  return useQuery({
    queryKey: ['membership-invitations', orgId],
    queryFn: () => apiClient.get<MembershipInvitationResponse[]>(`/organizations/${orgId}/memberships/invitations`),
    enabled: !!orgId,
  })
}

export function useRevokeMembershipInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, membershipId }: { orgId: UUID; membershipId: UUID }) =>
      apiClient.patch<void>(`/organizations/${orgId}/memberships/${membershipId}/revoke-invitation`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['membership-invitations'] }),
  })
}

export function useUpdateMembershipSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, membershipId, data }: { orgId: UUID; membershipId: UUID; data: UpdateMembershipSettingsRequest }) =>
      apiClient.put<MembershipResponse>(`/organizations/${orgId}/memberships/${membershipId}/settings`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships'] }),
  })
}

export function useProjects(orgId: UUID | null) {
  return useQuery({
    queryKey: ['projects', orgId],
    queryFn: () => apiClient.get<ProjectResponse[]>(`/organizations/${orgId}/projects`),
    enabled: !!orgId,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deptId, data }: { deptId: UUID; data: CreateProjectRequest }) =>
      apiClient.post<ProjectResponse>(`/departments/${deptId}/projects`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useAssignMemberToProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, membershipId }: { projectId: UUID; membershipId: UUID }) =>
      apiClient.post(`/projects/${projectId}/assignments`, { membershipId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-assignments'] }),
  })
}

export function useRemoveMemberFromProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, membershipId }: { projectId: UUID; membershipId: UUID }) =>
      apiClient.delete(`/projects/${projectId}/assignments/${membershipId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-assignments'] }),
  })
}

export function useGrantCrossDepartmentAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, departmentId }: { projectId: UUID; departmentId: UUID }) =>
      apiClient.post(`/projects/${projectId}/cross-department-access`, { departmentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useActivities(projectId: UUID | null) {
  return useQuery({
    queryKey: ['activities', projectId],
    queryFn: () => apiClient.get<ActivityResponse[]>(`/projects/${projectId}/activities`),
    enabled: !!projectId,
  })
}

export function useActivityQuery(params: ActivityQueryParams | null) {
  const searchParams = params ? new URLSearchParams() : null
  if (params && searchParams) {
    if (params.from) searchParams.set('from', params.from)
    if (params.to) searchParams.set('to', params.to)
    if (params.assignedTo) searchParams.set('assignedTo', params.assignedTo)
    if (params.projectId) searchParams.set('projectId', params.projectId)
    searchParams.set('size', String(DEFAULT_ACTIVITY_PAGE_SIZE))
  }

  return useQuery({
    queryKey: ['activities', 'query', params],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<ActivityResponse>>(`/activities?${searchParams!.toString()}`)
      return res.content
    },
    enabled: !!params,
  })
}

export function useActivity(activityId: UUID | null) {
  return useQuery({
    queryKey: ['activities', activityId],
    queryFn: () => apiClient.get<ActivityResponse>(`/activities/${activityId}`),
    enabled: !!activityId,
  })
}

export function useCreateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: UUID; data: CreateActivityRequest }) =>
      apiClient.post<ActivityResponse>(`/projects/${projectId}/activities`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  })
}

export function useDeleteActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (activityId: UUID) => apiClient.delete(`/activities/${activityId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  })
}

export function useAddDependency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ childId, parentId }: { childId: UUID; parentId: UUID }) =>
      apiClient.post(`/activities/${childId}/dependencies`, { parentActivityId: parentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  })
}

export function useRemoveDependency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ childId, parentId }: { childId: UUID; parentId: UUID }) =>
      apiClient.delete(`/activities/${childId}/dependencies/${parentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  })
}

export function useProject(projectId: UUID | null) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.get<ProjectResponse>(`/projects/${projectId}`),
    enabled: !!projectId,
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: UUID; data: UpdateProjectRequest }) =>
      apiClient.put<ProjectResponse>(`/projects/${projectId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project'] })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (projectId: UUID) => apiClient.delete(`/projects/${projectId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useProjectAssignments(projectId: UUID | null) {
  return useQuery({
    queryKey: ['project-assignments', projectId],
    queryFn: () => apiClient.get<ProjectAssignmentResponse[]>(`/projects/${projectId}/assignments`),
    enabled: !!projectId,
  })
}

export function useCrossDepartmentAccess(projectId: UUID | null) {
  return useQuery({
    queryKey: ['cross-dept-access', projectId],
    queryFn: () => apiClient.get<CrossDepartmentAccessResponse[]>(`/projects/${projectId}/cross-department-access`),
    enabled: !!projectId,
  })
}

export function useRemoveCrossDepartmentAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, departmentId }: { projectId: UUID; departmentId: UUID }) =>
      apiClient.delete(`/projects/${projectId}/cross-department-access/${departmentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cross-dept-access'] }),
  })
}

export function useUpdateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, data }: { activityId: UUID; data: UpdateActivityRequest }) =>
      apiClient.put<ActivityResponse>(`/activities/${activityId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, deptId, name }: { orgId: UUID; deptId: UUID; name: string }) =>
      apiClient.put<DepartmentResponse>(`/organizations/${orgId}/departments/${deptId}`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  })
}

export function useDeleteDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, deptId }: { orgId: UUID; deptId: UUID }) =>
      apiClient.delete(`/organizations/${orgId}/departments/${deptId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, membershipId }: { orgId: UUID; membershipId: UUID }) =>
      apiClient.delete(`/organizations/${orgId}/memberships/${membershipId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships'] }),
  })
}

export function useChangeMembershipRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, membershipId, data }: { orgId: UUID; membershipId: UUID; data: ChangeRoleRequest }) =>
      apiClient.patch<MembershipResponse>(`/organizations/${orgId}/memberships/${membershipId}/role`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships'] }),
  })
}

export function useTimeEntries(params: TimeEntryQueryParams | null) {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  const searchParams = params ? new URLSearchParams() : null
  if (params && searchParams) {
    if (params.from) searchParams.set('from', params.from)
    if (params.to) searchParams.set('to', params.to)
    if (params.projectId) searchParams.set('projectId', params.projectId)
    if (params.membershipId) searchParams.set('membershipId', params.membershipId)
    if (params.page != null) searchParams.set('page', String(params.page))
    if (params.size != null) searchParams.set('size', String(params.size))
  }
  return useQuery({
    queryKey: ['time-entries', orgId, params],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<TimeEntryResponse>>(`/time-entries?${searchParams!.toString()}`)
      return res.content
    },
    enabled: !!orgId && !!params,
  })
}

export function useTimeEntriesOrg(params: TimeEntryQueryParams | null) {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  const searchParams = params ? new URLSearchParams() : null
  if (params && searchParams) {
    if (params.from) searchParams.set('from', params.from)
    if (params.to) searchParams.set('to', params.to)
    if (params.page != null) searchParams.set('page', String(params.page))
    if (params.size != null) searchParams.set('size', String(params.size))
  }
  return useQuery({
    queryKey: ['time-entries', orgId, 'org', params],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<TimeEntryResponse>>(`/time-entries/org?${searchParams!.toString()}`)
      return res.content
    },
    enabled: !!orgId && !!params,
  })
}

export function useRunningTimeEntry() {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  return useQuery({
    queryKey: ['time-entries', orgId, 'running'],
    queryFn: () => apiClient.get<TimeEntryResponse | null>('/time-entries/running'),
    enabled: !!orgId,
    retry: false,
  })
}

export function useStartTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: StartTimeEntryRequest) => apiClient.post<TimeEntryResponse>('/time-entries', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

export function useSectorOverview() {
  const organizationId = useAuthStore((state) => state.activeOrg?.id ?? null)
  return useQuery({
    queryKey: ['sector-overview', organizationId],
    queryFn: () => apiClient.get<SectorOverviewResponse>('/me/sector'),
    enabled: Boolean(organizationId),
  })
}

export function useActivityTemplates(projectId: UUID | null) {
  return useQuery({
    queryKey: ['activity-templates', projectId],
    queryFn: () => apiClient.get<ActivityTemplateResponse[]>(`/projects/${projectId}/activity-templates`),
    enabled: !!projectId,
  })
}

export function useCreateActivityTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, data }: { activityId: UUID; data: CreateActivityTemplateRequest }) =>
      apiClient.post<ActivityTemplateResponse>(`/activities/${activityId}/templates`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activity-templates'] }),
  })
}

export function useActivityTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ templateId, occurrenceAt }: { templateId: UUID; occurrenceAt: string }) =>
      apiClient.post<GeneratedActivityResponse>(`/activity-templates/${templateId}/use`, { occurrenceAt }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  })
}

export function useMoveActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, data }: { activityId: UUID; data: MoveActivityRequest }) =>
      apiClient.patch<ActivityResponse>(`/activities/${activityId}/move`, data),
    onMutate: async ({ activityId, data }) => {
      await qc.cancelQueries({ queryKey: ['activities'] })
      const previous = qc.getQueriesData({ queryKey: ['activities'] })

      const optimisticActivity = (current: ActivityResponse): ActivityResponse => {
        if (current.id !== activityId) return current
        const leavingDone = current.status === 'DONE' && data.status !== 'DONE'
        const enteringDone = current.status !== 'DONE' && data.status === 'DONE'
        return {
          ...current,
          status: data.status,
          position: data.position ?? current.position,
          completedAt: enteringDone
            ? (current.completedAt ?? new Date().toISOString())
            : leavingDone
              ? null
              : current.completedAt,
        }
      }

      qc.setQueriesData<ActivityResponse[] | ActivityResponse>({ queryKey: ['activities'] }, (current) => {
        if (!current) return current
        if (Array.isArray(current)) {
          return current.map((item) => (item.id === activityId ? optimisticActivity(item) : item))
        }
        return optimisticActivity(current)
      })

      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (!context?.previous) return
      for (const [queryKey, data] of context.previous) {
        qc.setQueryData(queryKey, data)
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  })
}

export function useReorderActivities() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: UUID; data: ReorderActivitiesRequest }) =>
      apiClient.post<ActivityResponse[]>(`/projects/${projectId}/activities/reorder`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  })
}

export function useActivityComments(activityId: UUID | null) {
  return useQuery({
    queryKey: ['activity-comments', activityId],
    queryFn: () => apiClient.get<ActivityCommentResponse[]>(`/activities/${activityId}/comments`),
    enabled: !!activityId,
  })
}

export function useActivityFeed(activityId: UUID | null) {
  return useQuery({
    queryKey: ['activity-feed', activityId],
    queryFn: () => apiClient.get<ActivityFeedItem[]>(`/activities/${activityId}/feed?limit=50`),
    enabled: !!activityId,
    refetchInterval: 30_000,
  })
}

export function useMentionCandidates(activityId: UUID | null, query: string) {
  return useQuery({
    queryKey: ['activity-mention-candidates', activityId, query],
    queryFn: () =>
      apiClient.get<MentionCandidate[]>(
        `/activities/${activityId}/mention-candidates?q=${encodeURIComponent(query)}`,
      ),
    enabled: !!activityId && query.trim().length >= 1,
  })
}

export function useCreateActivityComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, data }: { activityId: UUID; data: CreateActivityCommentRequest }) =>
      apiClient.post<ActivityCommentResponse>(`/activities/${activityId}/comments`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['activity-comments', vars.activityId] })
      qc.invalidateQueries({ queryKey: ['activity-feed', vars.activityId] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDeleteActivityComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, commentId }: { activityId: UUID; commentId: UUID }) =>
      apiClient.delete(`/activities/${activityId}/comments/${commentId}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['activity-comments', vars.activityId] })
      qc.invalidateQueries({ queryKey: ['activity-feed', vars.activityId] })
    },
  })
}

export function useActivityAttachments(activityId: UUID | null) {
  return useQuery({
    queryKey: ['activity-attachments', activityId],
    queryFn: () => apiClient.get<ActivityAttachmentResponse[]>(`/activities/${activityId}/attachments`),
    enabled: !!activityId,
  })
}

export function useCreateActivityAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, data }: { activityId: UUID; data: CreateActivityAttachmentRequest }) =>
      apiClient.post<ActivityAttachmentResponse>(`/activities/${activityId}/attachments`, data),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['activity-attachments', vars.activityId] }),
  })
}

export function useDeleteActivityAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, attachmentId }: { activityId: UUID; attachmentId: UUID }) =>
      apiClient.delete(`/activities/${activityId}/attachments/${attachmentId}`),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['activity-attachments', vars.activityId] }),
  })
}

export function useCreateManualTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ManualTimeEntryRequest) => apiClient.post<TimeEntryResponse>('/time-entries/manual', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

export function useStopTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: UUID) => apiClient.patch<TimeEntryResponse>(`/time-entries/${entryId}/stop`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

export function useSubmitTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: UUID) => apiClient.patch<TimeEntryResponse>(`/time-entries/${entryId}/submit`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

export function useApproveTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: UUID) => apiClient.patch<TimeEntryResponse>(`/time-entries/${entryId}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

export function useRejectTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, comment }: { entryId: UUID; comment?: string }) =>
      apiClient.patch<TimeEntryResponse>(`/time-entries/${entryId}/reject`, { comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

export function usePauseTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: UUID) => apiClient.patch<TimeEntryResponse>(`/time-entries/${entryId}/pause`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

export function useResumeTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: UUID) => apiClient.patch<TimeEntryResponse>(`/time-entries/${entryId}/resume`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

export function useUpdateTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: UUID; data: UpdateTimeEntryRequest }) =>
      apiClient.put<TimeEntryResponse>(`/time-entries/${entryId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: UUID) => apiClient.delete(`/time-entries/${entryId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

export function useTimesheetPeriods(params: TimesheetPeriodQueryParams | null) {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  const searchParams = params ? new URLSearchParams() : null
  if (params && searchParams) {
    if (params.from) searchParams.set('from', params.from)
    if (params.to) searchParams.set('to', params.to)
  }
  return useQuery({
    queryKey: ['timesheets', 'periods', orgId, params],
    queryFn: () =>
      apiClient.get<TimesheetPeriodResponse[]>(`/timesheets/periods${searchParams ? `?${searchParams.toString()}` : ''}`),
    enabled: !!orgId,
  })
}

export function useCreateTimesheetPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTimesheetPeriodRequest) =>
      apiClient.post<TimesheetPeriodResponse>('/timesheets/periods', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheets', 'periods'] }),
  })
}

export function useSubmitTimesheetPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (periodId: UUID) => apiClient.post<TimesheetPeriodResponse>(`/timesheets/periods/${periodId}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheets', 'periods'] })
      qc.invalidateQueries({ queryKey: ['timesheets', 'approval-queue'] })
    },
  })
}

export function useReopenTimesheetPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (periodId: UUID) => apiClient.post<TimesheetPeriodResponse>(`/timesheets/periods/${periodId}/reopen`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheets', 'periods'] })
      qc.invalidateQueries({ queryKey: ['timesheets', 'approval-queue'] })
    },
  })
}

export function useApproveTimesheetPeriods() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ApproveTimesheetPeriodsRequest) =>
      apiClient.post<TimesheetPeriodResponse[]>('/timesheets/periods/approve', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheets', 'periods'] })
      qc.invalidateQueries({ queryKey: ['timesheets', 'approval-queue'] })
    },
  })
}

export function useRejectTimesheetPeriods() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RejectTimesheetPeriodsRequest) =>
      apiClient.post<TimesheetPeriodResponse[]>('/timesheets/periods/reject', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheets', 'periods'] })
      qc.invalidateQueries({ queryKey: ['timesheets', 'approval-queue'] })
    },
  })
}

export function useCloseTimesheetPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (periodId: UUID) => apiClient.post<TimesheetPeriodResponse>(`/timesheets/periods/${periodId}/close`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheets', 'periods'] })
      qc.invalidateQueries({ queryKey: ['timesheets', 'approval-queue'] })
    },
  })
}

export function useTimesheetApprovalQueue() {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  return useQuery({
    queryKey: ['timesheets', 'approval-queue', orgId],
    queryFn: () => apiClient.get<TimesheetPeriodQueueItem[]>('/timesheets/periods/approval-queue'),
    enabled: !!orgId,
    refetchInterval: 30_000,
  })
}

export function useCapacityMembers(params: CapacityMembersQueryParams | null) {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  const searchParams = params ? new URLSearchParams() : null
  if (params && searchParams) {
    if (params.from) searchParams.set('from', params.from)
    if (params.to) searchParams.set('to', params.to)
  }
  return useQuery({
    queryKey: ['capacity', 'members', orgId, params],
    queryFn: () =>
      apiClient.get<MemberCapacityResponse[]>(`/capacity/members${searchParams ? `?${searchParams.toString()}` : ''}`),
    enabled: !!orgId,
  })
}

export function useWorkSchedules() {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  return useQuery({
    queryKey: ['capacity', 'schedules', orgId],
    queryFn: () => apiClient.get<WorkScheduleResponse[]>('/capacity/schedules'),
    enabled: !!orgId,
  })
}

export function useCreateWorkSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWorkScheduleRequest) => apiClient.post<WorkScheduleResponse>('/capacity/schedules', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['capacity', 'schedules'] }),
  })
}

export function useUpdateWorkSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: UUID; data: UpdateWorkScheduleRequest }) =>
      apiClient.put<WorkScheduleResponse>(`/capacity/schedules/${scheduleId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['capacity', 'schedules'] }),
  })
}

export function useDeleteWorkSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (scheduleId: UUID) => apiClient.delete(`/capacity/schedules/${scheduleId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['capacity', 'schedules'] }),
  })
}

export function useHolidays(params: { from?: string; to?: string } | null) {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  const searchParams = params ? new URLSearchParams() : null
  if (params && searchParams) {
    if (params.from) searchParams.set('from', params.from)
    if (params.to) searchParams.set('to', params.to)
  }
  return useQuery({
    queryKey: ['capacity', 'holidays', orgId, params],
    queryFn: () =>
      apiClient.get<OrganizationHolidayResponse[]>(`/capacity/holidays${searchParams ? `?${searchParams.toString()}` : ''}`),
    enabled: !!orgId,
  })
}

export function useCreateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOrganizationHolidayRequest) => apiClient.post<OrganizationHolidayResponse>('/capacity/holidays', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['capacity', 'holidays'] }),
  })
}

export function useDeleteHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (holidayId: UUID) => apiClient.delete(`/capacity/holidays/${holidayId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['capacity', 'holidays'] }),
  })
}

export function useLeave(membershipId: UUID | null) {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  const searchParams = membershipId ? `?membershipId=${membershipId}` : ''
  return useQuery({
    queryKey: ['capacity', 'leave', orgId, membershipId],
    queryFn: () => apiClient.get<MembershipLeavePeriodResponse[]>(`/capacity/leave${searchParams}`),
    enabled: !!orgId,
  })
}

export function useCreateLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMembershipLeaveRequest) => apiClient.post<MembershipLeavePeriodResponse>('/capacity/leave', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['capacity', 'leave'] }),
  })
}

export function useUpdateLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ leaveId, data }: { leaveId: UUID; data: UpdateMembershipLeaveRequest }) =>
      apiClient.put<MembershipLeavePeriodResponse>(`/capacity/leave/${leaveId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['capacity', 'leave'] }),
  })
}

export function useDeleteLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (leaveId: UUID) => apiClient.delete(`/capacity/leave/${leaveId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['capacity', 'leave'] }),
  })
}

export function useMembershipSchedules(membershipId: UUID | null) {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  return useQuery({
    queryKey: ['capacity', 'members', membershipId, 'schedules'],
    queryFn: () => apiClient.get<MembershipWorkScheduleResponse[]>(`/capacity/members/${membershipId}/schedules`),
    enabled: !!orgId && !!membershipId,
  })
}

export function useAssignSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ membershipId, data }: { membershipId: UUID; data: AssignWorkScheduleRequest }) =>
      apiClient.post<MembershipWorkScheduleResponse>(`/capacity/members/${membershipId}/schedules`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['capacity', 'members'] }),
  })
}

export function useRemovePlacement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ membershipId, placementId }: { membershipId: UUID; placementId: UUID }) =>
      apiClient.delete(`/capacity/members/${membershipId}/schedules/${placementId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['capacity', 'members'] }),
  })
}

export function useReportSummary(params: ReportQueryParams | null) {
  const searchParams = params ? new URLSearchParams() : null
  if (params && searchParams) {
    if (params.from) searchParams.set('from', params.from)
    if (params.to) searchParams.set('to', params.to)
    if (params.projectId) searchParams.set('projectId', params.projectId)
    if (params.membershipId) searchParams.set('membershipId', params.membershipId)
    if (params.departmentId) searchParams.set('departmentId', params.departmentId)
  }
  return useQuery({
    queryKey: ['reports', 'summary', params],
    queryFn: () => apiClient.get<ReportSummaryResponse>(`/reports/summary${searchParams ? `?${searchParams.toString()}` : ''}`),
    enabled: params != null,
  })
}

export function useReportDetailed(params: ReportQueryParams | null) {
  const searchParams = params ? new URLSearchParams() : null
  if (params && searchParams) {
    if (params.from) searchParams.set('from', params.from)
    if (params.to) searchParams.set('to', params.to)
    if (params.projectId) searchParams.set('projectId', params.projectId)
    if (params.membershipId) searchParams.set('membershipId', params.membershipId)
    if (params.departmentId) searchParams.set('departmentId', params.departmentId)
    searchParams.set('size', '500')
  }
  return useQuery({
    queryKey: ['reports', 'detailed', params],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<ReportDetailedRow>>(
        `/reports/detailed${searchParams ? `?${searchParams.toString()}` : ''}`,
      )
      return res.content
    },
    enabled: params != null,
  })
}

export function useReportWorkload(params: ReportQueryParams | null) {
  const searchParams = params ? new URLSearchParams() : null
  if (params && searchParams) {
    if (params.from) searchParams.set('from', params.from)
    if (params.to) searchParams.set('to', params.to)
  }
  return useQuery({
    queryKey: ['reports', 'workload', params],
    queryFn: () => apiClient.get<WorkloadMemberResponse[]>(`/reports/workload${searchParams ? `?${searchParams.toString()}` : ''}`),
    enabled: params != null,
  })
}

export function useCreateReportExportJob() {
  return useMutation({
    mutationFn: (format: string) => apiClient.get<ExportJobResponse>(`/reports/exports?format=${encodeURIComponent(format)}`),
  })
}

function reportFilterSearchParams(params: ReportQueryParams | null): string {
  const searchParams = new URLSearchParams()
  if (params?.from) searchParams.set('from', params.from)
  if (params?.to) searchParams.set('to', params.to)
  if (params?.projectId) searchParams.set('projectId', params.projectId)
  if (params?.membershipId) searchParams.set('membershipId', params.membershipId)
  if (params?.departmentId) searchParams.set('departmentId', params.departmentId)
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}

export function useReportProjectFinancials(params: ReportQueryParams | null) {
  return useQuery({
    queryKey: ['reports', 'financials', 'projects', params],
    queryFn: () => apiClient.get<ProjectFinancialResponse[]>(`/reports/financials/projects${reportFilterSearchParams(params)}`),
    enabled: params != null,
  })
}

export function useReportMemberFinancials(params: ReportQueryParams | null) {
  return useQuery({
    queryKey: ['reports', 'financials', 'members', params],
    queryFn: () => apiClient.get<MemberFinancialResponse[]>(`/reports/financials/members${reportFilterSearchParams(params)}`),
    enabled: params != null,
  })
}

export function useReportActivityFinancials(params: ReportQueryParams | null) {
  return useQuery({
    queryKey: ['reports', 'financials', 'activities', params],
    queryFn: () => apiClient.get<ActivityFinancialResponse[]>(`/reports/financials/activities${reportFilterSearchParams(params)}`),
    enabled: params != null,
  })
}

export function useReportDepartmentFinancials(params: ReportQueryParams | null) {
  return useQuery({
    queryKey: ['reports', 'financials', 'departments', params],
    queryFn: () => apiClient.get<DepartmentFinancialResponse[]>(`/reports/financials/departments${reportFilterSearchParams(params)}`),
    enabled: params != null,
  })
}

export function useReportApprovalGrouping(params: ReportQueryParams | null) {
  return useQuery({
    queryKey: ['reports', 'groupings', 'approval', params],
    queryFn: () => apiClient.get<ApprovalGroupResponse[]>(`/reports/groupings/approval${reportFilterSearchParams(params)}`),
    enabled: params != null,
  })
}

export function useReportBillableGrouping(params: ReportQueryParams | null) {
  return useQuery({
    queryKey: ['reports', 'groupings', 'billable', params],
    queryFn: () => apiClient.get<BillableGroupResponse[]>(`/reports/groupings/billable${reportFilterSearchParams(params)}`),
    enabled: params != null,
  })
}

export function useSavedReports() {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  return useQuery({
    queryKey: ['reports', 'saved', orgId],
    queryFn: () => apiClient.get<SavedReportResponse[]>('/reports/saved'),
    enabled: !!orgId,
  })
}

export function useCreateSavedReport() {
  const qc = useQueryClient()
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  return useMutation({
    mutationFn: (data: CreateSavedReportRequest) => apiClient.post<SavedReportResponse>('/reports/saved', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', 'saved', orgId] }),
  })
}

export function useExportJob(jobId: UUID | null) {
  return useQuery({
    queryKey: ['reports', 'exports', jobId],
    queryFn: () => apiClient.get<ExportJobResponse>(`/reports/exports/${jobId}`),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'PENDING' || status === 'PROCESSING' ? 4000 : false
    },
  })
}

export async function downloadExportJobCsv(jobId: UUID) {
  const response = await fetch(`/api/v1/reports/exports/${jobId}/download`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  })
  if (!response.ok) throw new Error('Falha ao baixar o relatório exportado')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tasky-report.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function useGlobalSearch(query: string) {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  return useQuery({
    queryKey: ['search', orgId, query],
    queryFn: () => apiClient.get<SearchResultResponse[]>(`/search?q=${encodeURIComponent(query)}`),
    enabled: !!orgId && query.trim().length >= 2,
  })
}

export function useNotifications() {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  return useQuery({
    queryKey: ['notifications', orgId],
    queryFn: () => apiClient.get<NotificationResponse[]>('/notifications'),
    enabled: !!orgId,
    refetchInterval: 30_000,
  })
}

export function useUnreadNotificationCount() {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  return useQuery({
    queryKey: ['notifications', orgId, 'unread-count'],
    queryFn: () => apiClient.get<{ count: number }>('/notifications/unread-count'),
    enabled: !!orgId,
    refetchInterval: 30_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  return useMutation({
    mutationFn: (id: UUID) => apiClient.patch<NotificationResponse>(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', orgId] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  return useMutation({
    mutationFn: () => apiClient.patch<void>('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', orgId] })
    },
  })
}

export function useNotificationPreferences() {
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  return useQuery({
    queryKey: ['notification-preferences', orgId],
    queryFn: () => apiClient.get<NotificationPreferencesResponse>('/notifications/preferences'),
    enabled: !!orgId,
  })
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient()
  const orgId = useAuthStore((state) => state.activeOrg?.id ?? null)
  return useMutation({
    mutationFn: (data: UpdateNotificationPreferencesRequest) =>
      apiClient.put<NotificationPreferencesResponse>('/notifications/preferences', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-preferences', orgId] })
    },
  })
}

export async function downloadReportCsv(params: ReportQueryParams | null) {
  const searchParams = new URLSearchParams()
  if (params?.from) searchParams.set('from', params.from)
  if (params?.to) searchParams.set('to', params.to)
  if (params?.projectId) searchParams.set('projectId', params.projectId)
  if (params?.membershipId) searchParams.set('membershipId', params.membershipId)
  if (params?.departmentId) searchParams.set('departmentId', params.departmentId)
  const qs = searchParams.toString()
  const response = await fetch(`/api/v1/reports/export${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  })
  if (!response.ok) throw new Error('Falha ao exportar relatório')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tasky-report.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function useSwitchOrg() {
  return useMutation({
    mutationFn: (orgId: UUID) => apiClient.post<SwitchOrgResponse>('/auth/switch-org', { orgId }),
  })
}

export function useRequests(params: InternalRequestQueryParams | null) {
  return useQuery({
    queryKey: ['requests', params],
    queryFn: () => {
      const search = new URLSearchParams()
      if (params?.status) search.set('status', params.status)
      if (params?.priority) search.set('priority', params.priority)
      if (params?.assigneeId) search.set('assigneeId', params.assigneeId)
      if (params?.responsibleDepartmentId) search.set('responsibleDepartmentId', params.responsibleDepartmentId)
      if (params?.mine) search.set('mine', 'true')
      if (params?.page != null) search.set('page', String(params.page))
      if (params?.size != null) search.set('size', String(params.size))
      const qs = search.toString()
      return apiClient.get<PaginatedResponse<InternalRequest>>(`/requests${qs ? `?${qs}` : ''}`)
    },
    enabled: !!params,
  })
}

export function useRequest(requestId: UUID | null) {
  return useQuery({
    queryKey: ['request', requestId],
    queryFn: () => apiClient.get<InternalRequest>(`/requests/${requestId}`),
    enabled: !!requestId,
  })
}

export function useCreateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInternalRequest) => apiClient.post<InternalRequest>('/requests', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] })
    },
  })
}

export function useUpdateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: UUID; data: UpdateInternalRequest }) =>
      apiClient.put<InternalRequest>(`/requests/${requestId}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['request', vars.requestId] })
    },
  })
}

export function useChangeRequestStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, status }: { requestId: UUID; status: InternalRequest['status'] }) =>
      apiClient.patch<InternalRequest>(`/requests/${requestId}/status`, { status }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['request', vars.requestId] })
    },
  })
}

export function useAssignRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, assigneeMembershipId }: { requestId: UUID; assigneeMembershipId: UUID | null }) =>
      apiClient.patch<InternalRequest>(`/requests/${requestId}/assign`, { assigneeMembershipId }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['request', vars.requestId] })
    },
  })
}

export function useConvertRequestToProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, name, description }: { requestId: UUID; name?: string; description?: string }) =>
      apiClient.post<InternalRequest>(`/requests/${requestId}/convert-to-project`, { name, description }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['request', vars.requestId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useLinkRequestProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, projectId }: { requestId: UUID; projectId: UUID }) =>
      apiClient.patch<InternalRequest>(`/requests/${requestId}/link-project`, { projectId }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['request', vars.requestId] })
    },
  })
}

export function useDeleteRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requestId: UUID) => apiClient.delete(`/requests/${requestId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  })
}

export function useRequestComments(requestId: UUID | null) {
  return useQuery({
    queryKey: ['request-comments', requestId],
    queryFn: () => apiClient.get<RequestComment[]>(`/requests/${requestId}/comments`),
    enabled: !!requestId,
  })
}

export function useAddRequestComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, content }: { requestId: UUID; content: string }) =>
      apiClient.post<RequestComment>(`/requests/${requestId}/comments`, { content }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['request-comments', vars.requestId] }),
  })
}

export function useDeleteRequestComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, commentId }: { requestId: UUID; commentId: UUID }) =>
      apiClient.delete(`/requests/${requestId}/comments/${commentId}`),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['request-comments', vars.requestId] }),
  })
}

export function useLinkRequestActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, activityId }: { requestId: UUID; activityId: UUID }) =>
      apiClient.patch<InternalRequest>(`/requests/${requestId}/link-activity`, { activityId }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['request', vars.requestId] })
    },
  })
}

export function useActivityChecklist(activityId: UUID | null) {
  return useQuery({
    queryKey: ['activity-checklist', activityId],
    queryFn: () => apiClient.get<ActivityChecklistItem[]>(`/activities/${activityId}/checklist`),
    enabled: !!activityId,
  })
}

export function useAddActivityChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, title }: { activityId: UUID; title: string }) =>
      apiClient.post<ActivityChecklistItem>(`/activities/${activityId}/checklist`, { title }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['activity-checklist', vars.activityId] })
      qc.invalidateQueries({ queryKey: ['activities'] })
    },
  })
}

export function useToggleActivityChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, itemId }: { activityId: UUID; itemId: UUID }) =>
      apiClient.patch<ActivityChecklistItem>(`/activities/${activityId}/checklist/${itemId}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['activity-checklist', vars.activityId] })
      qc.invalidateQueries({ queryKey: ['activities'] })
    },
  })
}

export function useDeleteActivityChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, itemId }: { activityId: UUID; itemId: UUID }) =>
      apiClient.delete(`/activities/${activityId}/checklist/${itemId}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['activity-checklist', vars.activityId] })
      qc.invalidateQueries({ queryKey: ['activities'] })
    },
  })
}
