'use client';

import { useSessionStore } from '@store/sessionStore';

interface PromptGuideProps {
  onExampleClick: (text: string) => void;
}

/**
 * Catalogo curado de prompts por intencion musical para acelerar iteraciones.
 * El click delega en el contenedor para reutilizar una sola ruta de insercion.
 */
const CATEGORIES: { label: string; examples: string[] }[] = [
  {
    label: 'Crear desde cero',
    examples: [
      'Un kick 909 en 4x4 techno a 138 BPM',
      'Drum and bass con amen break, snappy y rápido',
      'Patrón minimalista, solo hi-hat y bombo suaves',
    ],
  },
  {
    label: 'Modificar pistas existentes',
    examples: [
      'Hazlo más oscuro y lento',
      'Añade un clap en el tiempo 3',
      'En la pista 1, quita los golpes de la segunda mitad',
    ],
  },
  {
    label: 'Referencia de estilo',
    examples: [
      'Algo entre Aphex Twin y minimal techno',
      'Al estilo Burial, percusivo y atmosférico',
      'Ritmo afrobeat con mucho groove',
    ],
  },
  {
    label: 'Eliminar',
    examples: [
      'Elimina el hi-hat',
      'Quita todas las pistas y empieza con solo un bombo',
    ],
  },
];

/**
 * Guia interactiva de prompts reutilizable desde la pestaña de configuracion.
 * No envia prompts: solo emite la seleccion para que el flujo principal decida.
 *
 * @see BR-010 Seleccionar ejemplo no debe invocar al LLM automaticamente
 */
export function PromptGuide({ onExampleClick }: PromptGuideProps) {
  return (
    <section>
      <h2 className="mb-3 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
        Guía de prompts
      </h2>
      <div className="flex flex-col gap-4">
        {CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <p className="mb-2 text-[11px] text-[var(--text-dim)]">{cat.label}</p>
            <div className="flex flex-col gap-1">
              {cat.examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => onExampleClick(ex)}
                  className="rounded-[6px] border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-left font-[JetBrains_Mono,monospace] text-[11px] text-[var(--cyan)] transition-colors hover:border-[var(--border-active)] hover:bg-[color-mix(in_srgb,var(--cyan)_6%,transparent)]"
                >
                  &ldquo;{ex}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
