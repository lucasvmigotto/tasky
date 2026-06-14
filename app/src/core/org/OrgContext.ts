import { create } from 'zustand'
import type { UUID } from '@/core/api/types'

interface OrgContextState {
  activeOrgId: UUID | null
  activeDeptId: UUID | null
  activeTeamId: UUID | null
  setActiveOrgId: (id: UUID | null) => void
  setActiveDeptId: (id: UUID | null) => void
  setActiveTeamId: (id: UUID | null) => void
}

export const useOrgContext = create<OrgContextState>((set) => ({
  activeOrgId: null,
  activeDeptId: null,
  activeTeamId: null,
  setActiveOrgId: (activeOrgId) => set({ activeOrgId, activeDeptId: null, activeTeamId: null }),
  setActiveDeptId: (activeDeptId) => set({ activeDeptId, activeTeamId: null }),
  setActiveTeamId: (activeTeamId) => set({ activeTeamId }),
}))
