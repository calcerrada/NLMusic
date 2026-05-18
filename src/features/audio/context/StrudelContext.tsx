'use client';

import { createContext, useContext } from 'react';
import { useStrudel, type UseStrudelResult } from '../hooks/useStrudel';

export const StrudelContext = createContext<UseStrudelResult | null>(null);

/**
 * Crea una unica instancia de useStrudel para el arbol y evita prop drilling entre features.
 * Centraliza isReady/initError para que UI y transporte reaccionen de forma consistente.
 * @see EC-010
 */
export function StrudelProvider({ children }: { children: React.ReactNode }) {
  const strudel = useStrudel();
  return (
    <StrudelContext.Provider value={strudel}>
      {children}
    </StrudelContext.Provider>
  );
}

/**
 * Obtiene el runtime compartido de Strudel y falla rapido fuera del provider.
 * Evita estados de audio ambiguos cuando un consumidor queda desacoplado del arbol principal.
 * @see BR-001
 */
export function useStrudelContext(): UseStrudelResult {
  const ctx = useContext(StrudelContext);
  if (!ctx) throw new Error('useStrudelContext must be inside StrudelProvider');
  return ctx;
}
