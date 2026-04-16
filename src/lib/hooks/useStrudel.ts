'use client';

import { useEffect, useRef, useState } from 'react';

interface StrudelAPI {
  evaluate?: (code: string) => Promise<void>;
  stop?: () => void;
  isPlaying?: () => boolean;
}

declare global {
  interface Window {
    strudel?: StrudelAPI;
    Strudel?: any;
  }
}

/**
 * Hook para inicializar y controlar Strudel en el navegador.
 * Carga Strudel desde CDN y proporciona métodos para ejecutar y parar código.
 *
 * Strudel (https://strudel.cc) = TidalCycles en el browser con WebAudio API
 * Permite tocar patrones de código sin instalación local.
 */
export function useStrudel() {
  const [initialized, setInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activePatternRef = useRef<string>('');
  const initCheckRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkStrudelLoaded = () => {
      if (typeof window !== 'undefined' && (window.strudel || window.Strudel)) {
        setInitialized(true);
        console.log('[Strudel] Initialized from CDN');

        if (initCheckRef.current) {
          clearInterval(initCheckRef.current);
        }
        return true;
      }
      return false;
    };

    // Intentar detectar Strudel inmediatamente
    if (checkStrudelLoaded()) return;

    // Si no está listo, esperar a que se cargue (CDN async)
    initCheckRef.current = setInterval(() => {
      if (checkStrudelLoaded()) {
        setError(null);
      }
    }, 500);

    // Timeout: si Strudel no carga en 10s, marcar como inicializado de todos modos
    // para que la UI no quede bloqueada
    const timeoutId = setTimeout(() => {
      if (!initialized) {
        setInitialized(true); // Fallback: permitir uso incluso sin Strudel
        console.warn('[Strudel] Timeout waiting for CDN, fallback mode');
      }
    }, 10000);

    return () => {
      if (initCheckRef.current) {
        clearInterval(initCheckRef.current);
      }
      clearTimeout(timeoutId);
    };
  }, [initialized]);

  const play = async (code: string) => {
    if (!initialized) {
      setError('Strudel no inicializado');
      console.warn('Strudel no inicializado');
      return;
    }

    try {
      activePatternRef.current = code;

      // Intentar usar la API real de Strudel
      if (typeof window !== 'undefined' && window.strudel?.evaluate) {
        await window.strudel.evaluate(code);
        console.log('[Strudel] Playing pattern');
      } else if (typeof window !== 'undefined' && window.Strudel?.evaluate) {
        await window.Strudel.evaluate(code);
        console.log('[Strudel] Playing pattern');
      } else {
        // Fallback: CDN no cargó correctamente, pero permitir UI
        console.log('[Strudel] CDN fallback mode - pattern registered:', code);
      }

      setIsPlaying(true);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Strudel execute error: ${msg}`);
      console.error('Strudel play error:', err);
    }
  };

  const stop = async () => {
    try {
      if (typeof window !== 'undefined' && window.strudel?.stop) {
        window.strudel.stop();
      } else if (typeof window !== 'undefined' && window.Strudel?.stop) {
        window.Strudel.stop();
      }

      activePatternRef.current = '';
      setIsPlaying(false);
      setError(null);
      console.log('[Strudel] Stopped');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Strudel stop error: ${msg}`);
      console.error('Strudel stop error:', err);
    }
  };

  const reset = async () => {
    try {
      await stop();
      console.log('[Strudel] Reset');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Strudel reset error: ${msg}`);
    }
  };

  return {
    initialized,
    isPlaying,
    error,
    play,
    stop,
    reset,
    activePattern: activePatternRef.current,
  };
}
