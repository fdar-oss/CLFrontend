'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Branch } from '../types';

interface BranchState {
  activeBranch: Branch | null;
  setActiveBranch: (branch: Branch | null) => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      activeBranch: null,
      setActiveBranch: (branch) => set({ activeBranch: branch }),
    }),
    { name: 'coffeelab-branch' },
  ),
);
