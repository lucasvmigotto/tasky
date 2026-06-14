import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/core/api/apiClient'
import { useOrgContext } from '@/core/org/OrgContext'
import type {
  OrganizationResponse,
  CreateOrganizationRequest,
  DepartmentResponse,
  CreateDepartmentRequest,
  TeamResponse,
  CreateTeamRequest,
  MembershipResponse,
  InviteRequest,
  UpdateMembershipSettingsRequest,
  ProjectResponse,
  CreateProjectRequest,
  LabelResponse,
  CreateLabelRequest,
  ActivityResponse,
  CreateActivityRequest,
  ActivityQueryParams,
  UUID,
} from '@/core/api/types'

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

export function useTeams(deptId: UUID | null) {
  return useQuery({
    queryKey: ['teams', deptId],
    queryFn: () => apiClient.get<TeamResponse[]>(`/departments/${deptId}/teams`),
    enabled: !!deptId,
  })
}

export function useCreateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deptId, data }: { deptId: UUID; data: CreateTeamRequest }) =>
      apiClient.post<TeamResponse>(`/departments/${deptId}/teams`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
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
      apiClient.post<MembershipResponse>(`/organizations/${orgId}/memberships/invite`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships'] }),
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

export function useLabels(orgId: UUID | null) {
  return useQuery({
    queryKey: ['labels', orgId],
    queryFn: () => apiClient.get<LabelResponse[]>(`/organizations/${orgId}/labels`),
    enabled: !!orgId,
  })
}

export function useCreateLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: UUID; data: CreateLabelRequest }) =>
      apiClient.post<LabelResponse>(`/organizations/${orgId}/labels`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labels'] }),
  })
}

export function useDeleteLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, labelId }: { orgId: UUID; labelId: UUID }) =>
      apiClient.delete(`/organizations/${orgId}/labels/${labelId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labels'] }),
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
  }

  return useQuery({
    queryKey: ['activities', 'query', params],
    queryFn: () => apiClient.get<ActivityResponse[]>(`/activities?${searchParams!.toString()}`),
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
