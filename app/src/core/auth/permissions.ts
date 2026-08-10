export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 5,
  admin: 4,
  manager: 3,
  employee: 1,
}

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0)
}

export function canManageOrganization(role: Role): boolean {
  return role === 'admin' || role === 'super_admin'
}

export function canManageDepartment(role: Role): boolean {
  return role === 'admin' || role === 'manager' || role === 'super_admin'
}

export function canCreateProject(role: Role): boolean {
  return role === 'admin' || role === 'manager' || role === 'super_admin'
}

export function isSuperAdmin(role: Role): boolean {
  return role === 'super_admin'
}

export function canInviteRole(inviterRole: Role, targetRole: Role): boolean {
  if (targetRole === 'super_admin') return false
  if (inviterRole === 'super_admin' || inviterRole === 'admin') return true
  if (inviterRole === 'manager') return targetRole === 'employee'
  return false
}

export function canCreateActivityFor(creatorRole: Role, targetRole: Role): boolean {
  if (targetRole === 'super_admin') return false
  if (creatorRole === 'super_admin') return true
  if (creatorRole === 'admin') return targetRole !== 'admin'
  if (creatorRole === 'manager') return targetRole === 'employee'
  return false
}

export function canViewAdmin(role: Role): boolean {
  return role === 'admin' || role === 'manager' || role === 'super_admin'
}

export function canEditActivity(role: Role): boolean {
  return role === 'admin' || role === 'manager' || role === 'super_admin'
}

export function canViewMySector(role: Role): boolean {
  return role !== 'admin' && role !== 'super_admin'
}
