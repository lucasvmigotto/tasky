import type { Role } from '@/core/auth/permissions'

export interface User {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  isActive: boolean
}

export interface Organization {
  id: string
  name: string
  slug: string
  createdAt: string
}

export interface Department {
  id: string
  organizationId: string
  name: string
  createdAt: string
}

export interface Team {
  id: string
  departmentId: string
  name: string
  createdAt: string
}

export interface Project {
  id: string
  departmentId: string
  name: string
  description: string | null
  managerMembershipId: string
  isActive: boolean
  createdAt: string
}

export interface Membership {
  id: string
  userId: string
  email: string
  username: string
  role: Role
  customUsername: string | null
  maxDailyWorkMinutes: number
  createdAt: string
}

export interface Label {
  id: string
  slug: string
  displayName: string
  isSystem: boolean
  createdBy: string | null
  createdAt: string
}

export interface Activity {
  id: string
  projectId: string
  title: string
  description: string | null
  weight: number
  startDatetime: string
  endDatetime: string
  createdBy: string
  assignedTo: string
  labelIds: string[]
  parentIds: string[]
  createdAt: string
}

export type FibonacciWeight = 1 | 2 | 3 | 5 | 8 | 13

export interface TimeEntry {
  id: string
  projectId: string
  projectName: string
  title: string
  description: string
  startTime: string
  endTime: string | null
  duration: number
  date: string
  labelIds: string[]
}

export type NavItem = {
  label: string
  href: string
  icon: string
  roles?: Role[]
  children?: NavItem[]
}
