import { describe, it, expect } from 'vitest'
import { canInviteRole, canCreateActivityFor, canManageOrganization, canViewMySector } from './permissions'

describe('canInviteRole', () => {
  it('admin can invite everyone', () => {
    expect(canInviteRole('admin', 'admin')).toBe(true)
    expect(canInviteRole('admin', 'manager')).toBe(true)
    expect(canInviteRole('admin', 'employee')).toBe(true)
  })

  it('manager cannot invite admin or manager', () => {
    expect(canInviteRole('manager', 'admin')).toBe(false)
    expect(canInviteRole('manager', 'manager')).toBe(false)
  })

  it('manager can invite employee', () => {
    expect(canInviteRole('manager', 'employee')).toBe(true)
  })

  it('employee cannot invite anyone', () => {
    expect(canInviteRole('employee', 'admin')).toBe(false)
    expect(canInviteRole('employee', 'manager')).toBe(false)
    expect(canInviteRole('employee', 'employee')).toBe(false)
  })
})

describe('canCreateActivityFor', () => {
  it('admin can create activity for anyone except admin', () => {
    expect(canCreateActivityFor('admin', 'manager')).toBe(true)
    expect(canCreateActivityFor('admin', 'employee')).toBe(true)
    expect(canCreateActivityFor('admin', 'admin')).toBe(false)
  })

  it('manager can create activity for employee only', () => {
    expect(canCreateActivityFor('manager', 'employee')).toBe(true)
    expect(canCreateActivityFor('manager', 'admin')).toBe(false)
    expect(canCreateActivityFor('manager', 'manager')).toBe(false)
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
    expect(canManageOrganization('employee')).toBe(false)
  })
})

describe('canViewMySector', () => {
  it('is available to sector roles but not organization administrators', () => {
    expect(canViewMySector('manager')).toBe(true)
    expect(canViewMySector('employee')).toBe(true)
    expect(canViewMySector('admin')).toBe(false)
  })
})
