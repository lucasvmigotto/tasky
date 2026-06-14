import { describe, it, expect } from 'vitest'
import { canInviteRole, canCreateActivityFor, canManageOrganization, canManageLabels } from './permissions'

describe('canInviteRole', () => {
  it('admin can invite everyone', () => {
    expect(canInviteRole('admin', 'admin')).toBe(true)
    expect(canInviteRole('admin', 'manager')).toBe(true)
    expect(canInviteRole('admin', 'leader')).toBe(true)
    expect(canInviteRole('admin', 'employee')).toBe(true)
  })

  it('manager cannot invite admin', () => {
    expect(canInviteRole('manager', 'admin')).toBe(false)
  })

  it('manager can invite manager, leader, employee', () => {
    expect(canInviteRole('manager', 'manager')).toBe(true)
    expect(canInviteRole('manager', 'leader')).toBe(true)
    expect(canInviteRole('manager', 'employee')).toBe(true)
  })

  it('leader cannot invite admin or manager', () => {
    expect(canInviteRole('leader', 'admin')).toBe(false)
    expect(canInviteRole('leader', 'manager')).toBe(false)
  })

  it('leader can invite leader and employee', () => {
    expect(canInviteRole('leader', 'leader')).toBe(true)
    expect(canInviteRole('leader', 'employee')).toBe(true)
  })

  it('employee cannot invite anyone', () => {
    expect(canInviteRole('employee', 'admin')).toBe(false)
    expect(canInviteRole('employee', 'manager')).toBe(false)
    expect(canInviteRole('employee', 'leader')).toBe(false)
    expect(canInviteRole('employee', 'employee')).toBe(false)
  })
})

describe('canCreateActivityFor', () => {
  it('admin can create activity for anyone except admin', () => {
    expect(canCreateActivityFor('admin', 'manager')).toBe(true)
    expect(canCreateActivityFor('admin', 'leader')).toBe(true)
    expect(canCreateActivityFor('admin', 'employee')).toBe(true)
    expect(canCreateActivityFor('admin', 'admin')).toBe(false)
  })

  it('manager can create activity for leader and employee', () => {
    expect(canCreateActivityFor('manager', 'leader')).toBe(true)
    expect(canCreateActivityFor('manager', 'employee')).toBe(true)
    expect(canCreateActivityFor('manager', 'admin')).toBe(false)
    expect(canCreateActivityFor('manager', 'manager')).toBe(false)
  })

  it('leader can create activity for employee only', () => {
    expect(canCreateActivityFor('leader', 'employee')).toBe(true)
    expect(canCreateActivityFor('leader', 'admin')).toBe(false)
    expect(canCreateActivityFor('leader', 'manager')).toBe(false)
    expect(canCreateActivityFor('leader', 'leader')).toBe(false)
  })

  it('employee cannot create activity for others', () => {
    expect(canCreateActivityFor('employee', 'admin')).toBe(false)
    expect(canCreateActivityFor('employee', 'employee')).toBe(false)
  })
})

describe('canManageOrganization', () => {
  it('returns true only for admin', () => {
    expect(canManageOrganization('admin')).toBe(true)
    expect(canManageOrganization('manager')).toBe(false)
    expect(canManageOrganization('leader')).toBe(false)
    expect(canManageOrganization('employee')).toBe(false)
  })
})

describe('canManageLabels', () => {
  it('returns true for admin, manager, leader', () => {
    expect(canManageLabels('admin')).toBe(true)
    expect(canManageLabels('manager')).toBe(true)
    expect(canManageLabels('leader')).toBe(true)
    expect(canManageLabels('employee')).toBe(false)
  })
})
