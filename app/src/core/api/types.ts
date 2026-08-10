import type { Role } from '@/core/auth/permissions'

export type FibonacciWeight = 1 | 2 | 3 | 5 | 8 | 13
export type ActivityStatus = 'TODO' | 'IN_PROGRESS' | 'IN_TESTING' | 'DONE' | 'BLOCKED' | 'CANCELED'
export type ActivityTaskType = 'TASK' | 'BUG' | 'IMPROVEMENT' | 'SUPPORT' | 'MEETING' | 'MILESTONE'
export type ActivityPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY'
export type RequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type RequestStatus = 'NEW' | 'TRIAGE' | 'PLANNED' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELED'

export const FIBONACCI_WEIGHTS: FibonacciWeight[] = [1, 2, 3, 5, 8, 13]

export function isValidFibonacciWeight(w: number): w is FibonacciWeight {
  return FIBONACCI_WEIGHTS.includes(w as FibonacciWeight)
}

export type UUID = string
export type ISO8601 = string

export type SettingValueType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'SECRET'

export interface SettingValue {
  key: string
  label: string
  description: string
  valueType: SettingValueType
  options: string[] | null
  min: number | null
  max: number | null
  value: string | null
  isSet: boolean
  isOverride: boolean
}

export interface SettingsGroup {
  name: string
  settings: SettingValue[]
}

export interface SettingsResponse {
  scope: 'GLOBAL' | 'ORGANIZATION'
  orgId: UUID | null
  groups: SettingsGroup[]
}

export interface UpdateSettingPayload {
  value?: string
  clear?: boolean
}

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
  timezone: string
  workWeekStartsOn: number
  createdAt: ISO8601
}

export interface Department {
  id: UUID
  organizationId: UUID
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
  primaryDepartmentId: UUID | null
  timezone: string | null
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

export interface Activity {
  id: UUID
  projectId: UUID
  parentActivityId: UUID | null
  title: string
  description: string | null
  weight: FibonacciWeight
  startDatetime: ISO8601
  endDatetime: ISO8601
  status: ActivityStatus
  taskType: ActivityTaskType
  priority: ActivityPriority
  dueDate: ISO8601 | null
  position: number
  completedAt: ISO8601 | null
  estimatedSeconds: number
  createdBy: UUID
  assignedTo: UUID
  parentIds: UUID[]
  createdAt: ISO8601
  version: number
}

export interface ActivityChecklistItem {
  id: UUID
  activityId: UUID
  title: string
  completed: boolean
  position: number
  completedBy: UUID | null
  completedAt: ISO8601 | null
  createdAt: ISO8601
}

export interface ActivityDependency {
  id: UUID
  parentActivityId: UUID
  childActivityId: UUID
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
  timezone: string
  workWeekStartsOn: number
  role: Role
}

export interface AuthResponse {
  token: string
  user: UserInfo
  organizations: OrgInfo[]
}

export interface AuthRefreshResponse {
  token: string
  user: UserInfo
  organizations: OrgInfo[]
  activeOrganizationId: UUID | null
}

export interface ApiKeyResponse {
  token: string
  expiresAt: ISO8601
}

export interface CreateOrganizationRequest {
  name: string
  slug: string
  timezone?: string
}

export interface OrganizationResponse {
  id: UUID
  name: string
  slug: string
  timezone: string
  workWeekStartsOn: number
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

export interface MemberTypeResponse {
  id: UUID
  departmentId: UUID
  name: string
  isActive: boolean
  createdAt: ISO8601
  updatedAt: ISO8601
}

export interface CreateMemberTypeRequest {
  name: string
  isActive?: boolean
}

export interface InviteRequest {
  email: string
  role: Role
  departmentIds?: UUID[]
  memberTypeIds?: UUID[]
}

export interface UpdateMembershipSettingsRequest {
  customUsername?: string
  maxDailyWorkMinutes?: number
  timezone?: string
  memberTypeIds?: UUID[]
}

export interface MembershipResponse {
  id: UUID
  userId: UUID
  email: string
  username: string
  role: Role
  customUsername: string | null
  maxDailyWorkMinutes: number
  primaryDepartmentId: UUID | null
  memberTypes?: Array<{ id: UUID; name: string }>
  timezone: string | null
  createdAt: ISO8601
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'

export interface MembershipInvitationResponse {
  id: UUID
  email: string
  role: Role
  primaryDepartmentId: UUID | null
  status: InvitationStatus
  invitedAt: ISO8601 | null
  expiresAt: ISO8601 | null
  acceptedAt: ISO8601 | null
  revokedAt: ISO8601 | null
}

export interface SectorOverviewResponse {
  role: Role
  departments: Array<{ id: UUID; name: string }>
  members: Array<{
    id: UUID
    displayName: string
    role: Role
    departmentId: UUID | null
    openActivities: number
    estimatedSeconds: number
  }>
  projects: Array<{ id: UUID; departmentId: UUID; name: string; active: boolean }>
  activityCounts: Record<ActivityStatus, number>
  queue: Array<{
    id: UUID
    projectId: UUID
    projectName: string
    title: string
    status: ActivityStatus
    priority: ActivityPriority
    dueDate: ISO8601 | null
    assignedTo: UUID
    assigneeName: string
  }>
}

export interface CreateProjectRequest {
  name: string
  description?: string
  color?: string
  managerMembershipId?: UUID
  hourlyRate?: number
  estimatedSeconds?: number
  budgetSeconds?: number
  budgetAmount?: number
}

export interface ProjectResponse {
  id: UUID
  departmentId: UUID
  name: string
  description: string | null
  color?: string
  managerMembershipId: UUID | null
  hourlyRate: number | null
  estimatedSeconds: number
  budgetSeconds: number | null
  budgetAmount: number | null
  isActive: boolean
  createdAt: ISO8601
}

export interface CreateActivityRequest {
  title: string
  description?: string
  weight: FibonacciWeight
  startDatetime: ISO8601
  endDatetime: ISO8601
  assignedToMembershipId: UUID
  parentActivityId?: UUID
  estimatedSeconds?: number
  parentActivityIds?: UUID[]
  taskType?: ActivityTaskType
  priority?: ActivityPriority
  dueDate?: ISO8601
  assigneeMembershipIds?: UUID[]
}

export interface AddDependencyRequest {
  parentActivityId: UUID
}

export interface ActivityResponse {
  id: UUID
  projectId: UUID
  parentActivityId: UUID | null
  title: string
  description: string | null
  weight: FibonacciWeight
  startDatetime: ISO8601
  endDatetime: ISO8601
  status: ActivityStatus
  taskType: ActivityTaskType
  priority: ActivityPriority
  dueDate: ISO8601 | null
  position: number
  completedAt: ISO8601 | null
  estimatedSeconds: number
  createdBy: UUID
  assignedTo: UUID
  assigneeIds: UUID[]
  parentIds: UUID[]
  checklistTotal: number
  checklistCompleted: number
  createdAt: ISO8601
  version: number
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

export interface UpdateProjectRequest {
  name?: string
  description?: string
  color?: string
  managerMembershipId?: UUID
  hourlyRate?: number
  estimatedSeconds?: number
  budgetSeconds?: number
  budgetAmount?: number
  isActive?: boolean
}

export interface ProjectAssignmentResponse {
  id: UUID
  projectId: UUID
  membershipId: UUID
  assignedAt: ISO8601
}

export interface CrossDepartmentAccessResponse {
  id: UUID
  projectId: UUID
  departmentId: UUID
  grantedBy: UUID
  grantedAt: ISO8601
}

export interface UpdateActivityRequest {
  title?: string
  description?: string
  weight?: FibonacciWeight
  startDatetime?: ISO8601
  endDatetime?: ISO8601
  assignedToMembershipId?: UUID
  parentActivityId?: UUID
  estimatedSeconds?: number
  status?: ActivityStatus
  position?: number
  taskType?: ActivityTaskType
  priority?: ActivityPriority
  dueDate?: ISO8601
  expectedVersion?: number
  assigneeMembershipIds?: UUID[]
}

export interface ActivityRecurrenceResponse {
  id: UUID
  frequency: RecurrenceFrequency
  interval: number
  timezone: string
  nextOccurrence: ISO8601
  active: boolean
}

export interface ActivityTemplateResponse {
  id: UUID
  projectId: UUID
  name: string
  version: number
  title: string
  description: string | null
  weight: FibonacciWeight
  durationSeconds: number
  estimatedSeconds: number
  assignedToMembershipId: UUID
  recurrence: ActivityRecurrenceResponse | null
  createdAt: ISO8601
}

export interface CreateActivityTemplateRequest {
  templateId?: UUID
  name: string
  recurrence?: {
    frequency: RecurrenceFrequency
    interval: number
    timezone: string
    nextOccurrence: ISO8601
  }
}

export interface GeneratedActivityResponse {
  id: UUID
  projectId: UUID
  startDatetime: ISO8601
  endDatetime: ISO8601
}

export interface MoveActivityRequest {
  status?: ActivityStatus
  columnId?: UUID
  position?: number
  expectedVersion?: number
}

export interface ProjectColumn {
  id: UUID
  projectId: UUID
  name: string
  position: number
  color: string
  lifecycleStatus: ActivityStatus
}

export interface CreateProjectColumnRequest {
  name: string
  color?: string
  lifecycleStatus: ActivityStatus
}

export interface ReorderActivitiesRequest {
  status: ActivityStatus
  activityIds: UUID[]
}

export interface ActivityMention {
  membershipId: UUID
  displayName: string
  avatarUrl: string | null
}

export interface ActivityCommentResponse {
  id: UUID
  activityId: UUID
  authorMembershipId: UUID
  authorName: string
  content: string
  deleted: boolean
  canDelete: boolean
  mentions: ActivityMention[]
  createdAt: ISO8601
  updatedAt: ISO8601
}

export interface CreateActivityCommentRequest {
  content: string
  mentionMembershipIds?: UUID[]
}

export type ActivityFeedEventType =
  | 'COMMENT_CREATED'
  | 'COMMENT_DELETED'
  | 'ASSIGNEE_CHANGED'
  | 'STATUS_CHANGED'
  | 'DUE_DATE_CHANGED'

export interface ActivityFeedItem {
  id: UUID
  type: ActivityFeedEventType
  actorMembershipId: UUID | null
  actorDisplayName: string | null
  actorAvatarUrl: string | null
  commentId: UUID | null
  commentContent: string | null
  commentDeleted: boolean
  canDelete: boolean
  mentions: ActivityMention[]
  oldValue: string | null
  newValue: string | null
  createdAt: ISO8601
}

export interface MentionCandidate {
  membershipId: UUID
  displayName: string
  avatarUrl: string | null
}

export interface ActivityAttachmentResponse {
  id: UUID
  activityId: UUID
  uploadedByMembershipId: UUID
  uploadedByName: string
  fileName: string
  contentType: string
  sizeBytes: number
  url: string
  createdAt: ISO8601
}

export interface CreateActivityAttachmentRequest {
  fileName: string
  contentType: string
  sizeBytes: number
  url?: string
  storedFileId?: UUID
}

export interface StoredFileResponse {
  id: UUID
  fileName: string
  contentType: string
  sizeBytes: number
  url: string
}

export interface DocumentResponse {
  id: UUID
  organizationId: UUID
  projectId: UUID | null
  requestId: UUID | null
  activityId: UUID | null
  title: string
  slug: string
  contentMd: string
  status: string
  authorMembershipId: UUID
  authorName: string
  version: number
  attachmentCount: number
  createdAt: ISO8601
  updatedAt: ISO8601
}

export interface DocumentVersionResponse {
  id: UUID
  versionNo: number
  contentMd: string
  changelog: string | null
  createdByMembershipId: UUID
  createdAt: ISO8601
}

export interface DocumentAttachmentResponse {
  id: UUID
  fileName: string
  contentType: string
  sizeBytes: number
  url: string | null
  uploadedByMembershipId: UUID
  createdAt: ISO8601
}

export interface CreateDocumentRequest {
  projectId?: UUID
  requestId?: UUID
  activityId?: UUID
  title: string
  contentMd?: string
}

export interface UpdateDocumentRequest {
  title?: string
  contentMd?: string
  changelog?: string
}

export interface ChangeRoleRequest {
  role: Role
  departmentId?: UUID
  memberTypeIds?: UUID[]
}

export interface TimeEntryResponse {
  id: UUID
  organizationId: UUID
  membershipId: UUID
  userId: UUID
  projectId: UUID | null
  activityId: UUID | null
  description: string | null
  glpiTicketId?: string | null
  startTime: ISO8601
  endTime: ISO8601 | null
  durationSeconds: number | null
  pausedSeconds: number
  pausedAt: ISO8601 | null
  approvalStatus: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'LOCKED'
  submittedAt: ISO8601 | null
  approvedAt: ISO8601 | null
  approvedBy: UUID | null
  rejectionComment: string | null
  billingRateSnapshot: number | null
  costRateSnapshot: number | null
  billable: boolean
  createdAt: ISO8601
}

export interface ManualTimeEntryRequest {
  startTime: ISO8601
  endTime: ISO8601
  projectId?: UUID
  activityId?: UUID
  description?: string
  glpiTicketId?: string
  billable?: boolean
}

export interface StartTimeEntryRequest {
  projectId?: UUID
  activityId?: UUID
  description?: string
  glpiTicketId?: string
  billable?: boolean
}

export interface UpdateTimeEntryRequest {
  projectId?: UUID
  activityId?: UUID
  description?: string
  glpiTicketId?: string
  startTime?: ISO8601
  endTime?: ISO8601
  billable?: boolean
}

export interface TimeEntryQueryParams {
  from?: ISO8601
  to?: ISO8601
  projectId?: UUID
  membershipId?: UUID
  page?: number
  size?: number
}

export interface ReportWeeklyHoursPoint {
  day: string
  hours: number
}

export interface ReportProjectHoursPoint {
  projectId: UUID
  project: string
  color?: string
  hours: number
}

export interface ReportMemberProductivityPoint {
  name: string
  hours: number
  activities: number
}

export interface ReportSummaryResponse {
  weeklyHours: ReportWeeklyHoursPoint[]
  projectHours: ReportProjectHoursPoint[]
  memberProductivity: ReportMemberProductivityPoint[]
  dailyAverage: number
  totalHours: number
  totalActivities: number
  billableHours: number
  nonBillableHours: number
  estimatedSeconds: number
  actualSeconds: number
  remainingSeconds: number
  progressPercent: number
  revenue: number
  cost: number
  margin: number
}

export interface ReportDetailedRow {
  id: UUID
  projectId?: UUID | null
  projectName: string
  projectColor?: string
  glpiTicketId?: string | null
  memberName: string
  description: string | null
  startTime: ISO8601
  endTime: ISO8601 | null
  hours: number
  approvalStatus: string
  revenue: number
  cost: number
  margin: number
  billable: boolean
}

export interface ReportQueryParams {
  from?: ISO8601
  to?: ISO8601
  projectId?: UUID
  membershipId?: UUID
  departmentId?: UUID
}

export interface SwitchOrgResponse {
  token: string
  org: OrgInfo
}

export interface WorkloadMemberResponse {
  membershipId: UUID
  name: string
  capacitySeconds: number
  estimatedSeconds: number
  actualSeconds: number
  utilizationPercent: number
}

export interface ExportJobResponse {
  id: UUID
  status: string
  format: string
  downloadUrl: string
  createdAt: ISO8601
  expiresAt: ISO8601
}

export type TimesheetPeriodStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'LOCKED'

export interface TimesheetPeriodResponse {
  id: UUID
  organizationId: UUID
  membershipId: UUID
  periodStart: ISO8601
  periodEnd: ISO8601
  status: TimesheetPeriodStatus
  submittedAt: ISO8601 | null
  approvedAt: ISO8601 | null
  approvedBy: UUID | null
  rejectionComment: string | null
  version: number
  createdAt: ISO8601
  updatedAt: ISO8601
}

export interface TimesheetPeriodQueueItem {
  id: UUID
  organizationId: UUID
  membershipId: UUID
  ownerUsername: string
  ownerDisplayName: string
  periodStart: ISO8601
  periodEnd: ISO8601
  submittedAt: ISO8601
  version: number
  totalSeconds: number
  billableSeconds: number
  entryCount: number
}

export interface TimesheetPeriodQueryParams {
  from?: ISO8601
  to?: ISO8601
}

export interface CreateTimesheetPeriodRequest {
  periodStart: ISO8601
}

export interface ApproveTimesheetPeriodsRequest {
  periodIds: UUID[]
}

export interface RejectTimesheetPeriodsRequest {
  periodIds: UUID[]
  comment: string
}

export type LeaveType = 'VACATION' | 'SICK' | 'PARENTAL' | 'UNPAID' | 'OTHER'
export type LeaveStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED'

export interface MemberCapacityResponse {
  membershipId: UUID
  displayName: string
  from: ISO8601
  to: ISO8601
  availableSeconds: number
  plannedSeconds: number
  actualSeconds: number
  remainingCapacitySeconds: number
  utilization: number
  overloadSeconds: number
}

export interface WorkScheduleDayResponse {
  id: UUID
  dayOfWeek: number
  isWorkDay: boolean
  startTime: string | null
  endTime: string | null
}

export interface WorkScheduleResponse {
  id: UUID
  name: string
  description: string | null
  isDefault: boolean
  days: WorkScheduleDayResponse[]
  createdAt: ISO8601
  updatedAt: ISO8601
}

export interface MembershipWorkScheduleResponse {
  id: UUID
  membershipId: UUID
  scheduleId: UUID
  effectiveFrom: string
  effectiveTo: string | null
  createdAt: ISO8601
}

export interface OrganizationHolidayResponse {
  id: UUID
  name: string
  holidayDate: string
  isRecurringYearly: boolean
  createdAt: ISO8601
}

export interface MembershipLeavePeriodResponse {
  id: UUID
  membershipId: UUID
  leaveType: LeaveType
  status: LeaveStatus
  startDate: string
  endDate: string
  note: string | null
  createdAt: ISO8601
}

export interface WorkScheduleDayRequest {
  dayOfWeek: number
  isWorkDay?: boolean
  startTime?: string
  endTime?: string
}

export interface CreateWorkScheduleRequest {
  name: string
  description?: string
  isDefault?: boolean
  days?: WorkScheduleDayRequest[]
}

export interface UpdateWorkScheduleRequest {
  name: string
  description?: string
  isDefault?: boolean
  days?: WorkScheduleDayRequest[]
}

export interface AssignWorkScheduleRequest {
  scheduleId: UUID
  effectiveFrom: string
  effectiveTo?: string
}

export interface CreateOrganizationHolidayRequest {
  name: string
  holidayDate: string
  isRecurringYearly?: boolean
}

export interface CreateMembershipLeaveRequest {
  membershipId?: UUID
  leaveType?: LeaveType
  startDate: string
  endDate: string
  status?: LeaveStatus
  note?: string
}

export interface UpdateMembershipLeaveRequest {
  leaveType?: LeaveType
  startDate?: string
  endDate?: string
  status?: LeaveStatus
  note?: string
}

export interface CapacityMembersQueryParams {
  from?: ISO8601
  to?: ISO8601
}

export interface ProjectFinancialResponse {
  projectId: UUID
  projectName: string
  estimatedSeconds: number
  actualApprovedSeconds: number
  actualNotApprovedSeconds: number
  remainingSeconds: number
  progressPercent: number
  budgetSeconds: number | null
  budgetAmount: number | null
  cost: number
  revenue: number
  margin: number
}

export interface MemberFinancialResponse {
  membershipId: UUID
  memberName: string
  estimatedSeconds: number
  actualApprovedSeconds: number
  actualNotApprovedSeconds: number
  remainingSeconds: number
  progressPercent: number
  cost: number
  revenue: number
  margin: number
}

export interface ActivityFinancialResponse {
  activityId: UUID
  activityTitle: string
  estimatedSeconds: number
  actualApprovedSeconds: number
  actualNotApprovedSeconds: number
  remainingSeconds: number
  progressPercent: number
  cost: number
  revenue: number
  margin: number
}

export interface DepartmentFinancialResponse {
  departmentId: UUID
  departmentName: string
  estimatedSeconds: number
  actualApprovedSeconds: number
  actualNotApprovedSeconds: number
  remainingSeconds: number
  progressPercent: number
  cost: number
  revenue: number
  margin: number
}

export interface ApprovalGroupResponse {
  approvalStatus: string
  seconds: number
  entries: number
}

export interface BillableGroupResponse {
  billable: boolean
  seconds: number
  entries: number
}

export interface SavedReportResponse {
  id: UUID
  name: string
  description: string | null
  params: Record<string, unknown>
  createdAt: ISO8601
  updatedAt: ISO8601
  version: number
}

export interface CreateSavedReportRequest {
  name: string
  description?: string
  params?: Record<string, unknown>
}

export interface SearchResultResponse {
  type: 'project' | 'activity' | 'member'
  id: UUID
  title: string
  subtitle: string
  url: string
}

export interface NotificationResponse {
  id: UUID
  type: string
  title: string
  body: string | null
  resourceType: string | null
  resourceId: UUID | null
  readAt: ISO8601 | null
  createdAt: ISO8601
}

export type NotificationPreferenceType =
  | 'ACTIVITY_DUE_SOON'
  | 'ACTIVITY_OVERDUE'
  | 'OPEN_TIMER'
  | 'TIME_ENTRY_PENDING_APPROVAL'

export interface NotificationPreferenceValue {
  type: NotificationPreferenceType
  enabled: boolean
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferenceValue[]
}

export interface UpdateNotificationPreferencesRequest {
  preferences: NotificationPreferenceValue[]
}

export interface InternalRequest {
  id: UUID
  organizationId: UUID
  requestKey: string
  glpiTicketId: string | null
  title: string
  description: string | null
  priority: RequestPriority
  status: RequestStatus
  requesterMembershipId: UUID
  requestingDepartmentId: UUID | null
  responsibleDepartmentId: UUID | null
  assigneeMembershipId: UUID | null
  assigneeMembershipIds: UUID[]
  desiredDueDate: ISO8601 | null
  projectId: UUID | null
  activityId: UUID | null
  completedAt: ISO8601 | null
  canceledAt: ISO8601 | null
  createdAt: ISO8601
  updatedAt: ISO8601
}

export interface CreateInternalRequest {
  title: string
  description?: string
  glpiTicketId?: string
  priority?: RequestPriority
  requestingDepartmentId?: UUID
  responsibleDepartmentId?: UUID
  desiredDueDate?: ISO8601
  assigneeMembershipIds?: UUID[]
}

export interface UpdateInternalRequest {
  title?: string
  description?: string
  glpiTicketId?: string
  priority?: RequestPriority
  responsibleDepartmentId?: UUID
  assigneeMembershipId?: UUID
  assigneeMembershipIds?: UUID[]
  desiredDueDate?: ISO8601
}

export interface RequestTaskItem {
  title: string
  description?: string
  priority?: ActivityPriority
  weight?: number
  estimatedSeconds?: number
  dueDate?: ISO8601
  assigneeMembershipIds?: UUID[]
}

export interface CreateRequestTasksPayload {
  items: RequestTaskItem[]
}

export interface InternalRequestQueryParams {
  status?: RequestStatus
  priority?: RequestPriority
  assigneeId?: UUID
  responsibleDepartmentId?: UUID
  mine?: boolean
  page?: number
  size?: number
}

export interface RequestComment {
  id: UUID
  requestId: UUID
  authorMembershipId: UUID
  content: string
  createdAt: ISO8601
}
