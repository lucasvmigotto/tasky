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
  return role === 'admin'
}

export function canManageDepartment(role: Role): boolean {
  return role === 'admin' || role === 'manager'
}

export function canCreateProject(role: Role): boolean {
  return role === 'admin' || role === 'manager'
}

export function canInviteRole(inviterRole: Role, targetRole: Role): boolean {
  if (inviterRole === 'admin') return true
  if (inviterRole === 'manager') return targetRole !== 'admin'
  if (inviterRole === 'leader') return targetRole === 'employee' || targetRole === 'leader'
  return false
}

export function canCreateActivityFor(creatorRole: Role, targetRole: Role): boolean {
  if (creatorRole === 'admin') return targetRole !== 'admin'
  if (creatorRole === 'manager') return targetRole === 'leader' || targetRole === 'employee'
  if (creatorRole === 'leader') return targetRole === 'employee'
  return false
}

export function canManageLabels(role: Role): boolean {
  return role === 'admin' || role === 'manager' || role === 'leader'
}

export function canViewAdmin(role: Role): boolean {
  return role === 'admin' || role === 'manager'
}

export function canEditActivity(role: Role): boolean {
  return role === 'admin' || role === 'manager' || role === 'leader'
}
