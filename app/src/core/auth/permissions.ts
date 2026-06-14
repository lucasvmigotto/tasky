export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  LEADER: 'leader',
  EMPLOYEE: 'employee',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 4,
  manager: 3,
  leader: 2,
  employee: 1,
}

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0)
}

export function canManageOrganization(role: Role): boolean {
  return hasMinRole(role, 'admin')
}

export function canManageDepartment(role: Role): boolean {
  return hasMinRole(role, 'manager')
}

export function canCreateProject(role: Role): boolean {
  return hasMinRole(role, 'manager')
}

export function canInviteMembers(role: Role): boolean {
  return hasMinRole(role, 'admin')
}

export function canManageLabels(role: Role): boolean {
  return hasMinRole(role, 'leader')
}

export function canViewAdmin(role: Role): boolean {
  return hasMinRole(role, 'manager')
}

export function canEditActivity(role: Role): boolean {
  return hasMinRole(role, 'leader')
}
