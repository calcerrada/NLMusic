import { useEffect, useRef, useState } from 'react';

/**
 * Hook para inicializar y controlar Strudel en el navegador.
 * Asume que Strudel está disponible globalmente vía CDN o bundler.
 */
export function useStrudel() {
  const [initialized, setInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const strudel = useRef<any>(null);

  useEffect(() => {
    // Placeholder: en producción cargaríamos Strudel vía CDN o import
    // Para ahora, solo marcamos como inicializado para que la UI no falle
    setInitialized(true);
  }, []);

  const play = async (code: string) => {
    if (!initialized) {
      console.warn('Strudel no inicializado');
      return;
    }
    // TODO: ejecutar código Strudel en el contexto real del browser
    setIsPlaying(true);
  };

  const stop = async () => {
    // TODO: parar reproducción de Strudel
    setIsPlaying(false);
  };

  return {
    initialized,
    isPlaying,
    play,
    stop,
  };
}
