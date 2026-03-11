'use client';

import { createContext, useContext } from 'react';
import type { AgeMode } from '@/lib/kids/age-mode';

const AgeModeContext = createContext<AgeMode>('standard');

export function AgeModeProvider({
  mode,
  children
}: {
  mode: AgeMode;
  children: React.ReactNode;
}) {
  return <AgeModeContext.Provider value={mode}>{children}</AgeModeContext.Provider>;
}

export function useAgeMode(): AgeMode {
  return useContext(AgeModeContext);
}
