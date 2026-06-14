import type { Role } from '@/core/auth/permissions'

export type FibonacciWeight = 1 | 2 | 3 | 5 | 8 | 13

export const FIBONACCI_WEIGHTS: FibonacciWeight[] = [1, 2, 3, 5, 8, 13]

export function isValidFibonacciWeight(w: number): w is FibonacciWeight {
  return FIBONACCI_WEIGHTS.includes(w as FibonacciWeight)
}

export type UUID = string
export type ISO8601 = string

export interface User {
  id: UUID
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  isActive: boolean
  createdAt: ISO8601
  updatedAt: ISO8601
}

export interface Organization {
  id: UUID
  name: string
  slug: string
  createdAt: ISO8601
}

export interface Department {
  id: UUID
  organizationId: UUID
  name: string
  createdAt: ISO8601
}

export interface Team {
  id: UUID
  departmentId: UUID
  name: string
  createdAt: ISO8601
}

export interface Membership {
  id: UUID
  userId: UUID
  email: string
  username: string
  role: Role
  customUsername: string | null
  maxDailyWorkMinutes: number
  createdAt: ISO8601
}

export interface Project {
  id: UUID
  departmentId: UUID
  name: string
  description: string | null
  managerMembershipId: UUID
  isActive: boolean
  createdAt: ISO8601
}

export interface ProjectAssignment {
  id: UUID
  projectId: UUID
  membershipId: UUID
  assignedAt: ISO8601
}

export interface CrossDepartmentProjectAccess {
  id: UUID
  projectId: UUID
  departmentId: UUID
  grantedBy: UUID
  grantedAt: ISO8601
}

export interface Label {
  id: UUID
  slug: string
  displayName: string
  isSystem: boolean
  createdBy: UUID | null
  createdAt: ISO8601
}

export interface Activity {
  id: UUID
  projectId: UUID
  title: string
  description: string | null
  weight: FibonacciWeight
  startDatetime: ISO8601
  endDatetime: ISO8601
  createdBy: UUID
  assignedTo: UUID
  labelIds: UUID[]
  parentIds: UUID[]
  createdAt: ISO8601
}

export interface ActivityDependency {
  id: UUID
  parentActivityId: UUID
  childActivityId: UUID
}

export interface TimeEntry {
  id: UUID
  projectId: UUID
  projectName: string
  title: string
  description: string
  startTime: ISO8601
  endTime: ISO8601 | null
  duration: number
  date: string
  labelIds: UUID[]
}

export interface NavItem {
  label: string
  href: string
  icon: string
  roles?: Role[]
  children?: NavItem[]
}

export interface UserInfo {
  id: UUID
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

export interface OrgInfo {
  id: UUID
  name: string
  slug: string
  role: Role
}

export interface AuthResponse {
  token: string
  user: UserInfo
  organizations: OrgInfo[]
}

export interface AuthRefreshResponse {
  token: string
}

export interface ApiKeyResponse {
  token: string
  expiresAt: ISO8601
}

export interface CreateOrganizationRequest {
  name: string
  slug: string
}

export interface OrganizationResponse {
  id: UUID
  name: string
  slug: string
  createdAt: ISO8601
}

export interface CreateDepartmentRequest {
  name: string
}

export interface DepartmentResponse {
  id: UUID
  organizationId: UUID
  name: string
  createdAt: ISO8601
}

export interface CreateTeamRequest {
  name: string
}

export interface TeamResponse {
  id: UUID
  departmentId: UUID
  name: string
  createdAt: ISO8601
}

export interface InviteRequest {
  email: string
  role: Role
  departmentIds?: UUID[]
  teamIds?: UUID[]
}

export interface UpdateMembershipSettingsRequest {
  customUsername?: string
  maxDailyWorkMinutes?: number
}

export interface MembershipResponse {
  id: UUID
  userId: UUID
  email: string
  username: string
  role: Role
  customUsername: string | null
  maxDailyWorkMinutes: number
  createdAt: ISO8601
}

export interface CreateProjectRequest {
  name: string
  description?: string
  managerMembershipId: UUID
}

export interface ProjectResponse {
  id: UUID
  departmentId: UUID
  name: string
  description: string | null
  managerMembershipId: UUID
  isActive: boolean
  createdAt: ISO8601
}

export interface CreateLabelRequest {
  slug: string
  displayName: string
}

export interface LabelResponse {
  id: UUID
  slug: string
  displayName: string
  isSystem: boolean
  createdBy: UUID | null
  createdAt: ISO8601
}

export interface CreateActivityRequest {
  title: string
  description?: string
  weight: FibonacciWeight
  startDatetime: ISO8601
  endDatetime: ISO8601
  assignedToMembershipId: UUID
  labelIds?: UUID[]
  parentActivityIds?: UUID[]
}

export interface AddDependencyRequest {
  parentActivityId: UUID
}

export interface ActivityResponse {
  id: UUID
  projectId: UUID
  title: string
  description: string | null
  weight: FibonacciWeight
  startDatetime: ISO8601
  endDatetime: ISO8601
  createdBy: UUID
  assignedTo: UUID
  labelIds: UUID[]
  parentIds: UUID[]
  createdAt: ISO8601
}

export interface ApiErrorResponse {
  type: string
  title: string
  status: number
  detail: string
}

export interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface ActivityQueryParams {
  from?: ISO8601
  to?: ISO8601
  assignedTo?: UUID
  projectId?: UUID
}
