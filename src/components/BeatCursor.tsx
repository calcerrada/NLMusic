'use client';

import { useEffect, useState } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';

/**
 * Componente que muestra el paso activo actualmente en reproducción.
 * En producción, se sincroniza con el reloj de Strudel en tiempo real.
 */
export function BeatCursor() {
  const { bpm } = useSessionStore();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Cada paso del secuenciador representa una negra (1 beat).
    // Por ahora, animación simple: ciclar a través de los 16 pasos
    // En producción, sincronizar con el clock de Strudel

    const msPerStep = 60000 / bpm;
    
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % 16);
    }, msPerStep);

    return () => clearInterval(interval);
  }, [bpm]);

  return (
    <div className="p-2 bg-dark-50 rounded border border-gray-700">
      <div className="flex gap-1">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className={`w-6 h-2 rounded transition-all ${
              i === currentStep
                ? 'bg-yellow-400 shadow-lg shadow-yellow-400'
                : 'bg-gray-700'
            }`}
            title={`Paso ${i + 1}`}
          />
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-2">
        Paso: {currentStep + 1} / 16
      </div>
    </div>
  );
}
