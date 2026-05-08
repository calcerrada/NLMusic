'use client';

import { useTranslation } from '@lib/i18n';
import type { TranslationKey } from '@lib/i18n';

interface PromptGuideProps {
  onExampleClick: (text: string) => void;
}

/**
 * Catalogo curado de prompts por intencion musical para acelerar iteraciones.
 * El click delega en el contenedor para reutilizar una sola ruta de insercion.
 */
const CATEGORY_KEYS: { labelKey: TranslationKey; exampleKeys: TranslationKey[] }[] = [
  {
    labelKey: 'config.cat.scratch',
    exampleKeys: ['config.cat.scratch.1', 'config.cat.scratch.2', 'config.cat.scratch.3'],
  },
  {
    labelKey: 'config.cat.modify',
    exampleKeys: ['config.cat.modify.1', 'config.cat.modify.2', 'config.cat.modify.3'],
  },
  {
    labelKey: 'config.cat.style',
    exampleKeys: ['config.cat.style.1', 'config.cat.style.2', 'config.cat.style.3'],
  },
  {
    labelKey: 'config.cat.remove',
    exampleKeys: ['config.cat.remove.1', 'config.cat.remove.2'],
  },
];

/**
 * Guia interactiva de prompts reutilizable desde la pestaña de configuracion.
 * No envia prompts: solo emite la seleccion para que el flujo principal decida.
 *
 * @see BR-010 Seleccionar ejemplo no debe invocar al LLM automaticamente
 */
export function PromptGuide({ onExampleClick }: PromptGuideProps) {
  const t = useTranslation();
  return (
    <section>
      <h2 className="mb-3 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {t('config.promptGuide')}
      </h2>
      <div className="flex flex-col gap-4">
        {CATEGORY_KEYS.map((cat) => {
          const label = t(cat.labelKey);
          return (
            <div key={cat.labelKey}>
              <p className="mb-2 text-[11px] text-[var(--text-dim)]">{label}</p>
              <div className="flex flex-col gap-1">
                {cat.exampleKeys.map((exKey) => {
                  const ex = t(exKey);
                  return (
                    <button
                      key={exKey}
                      type="button"
                      onClick={() => onExampleClick(ex)}
                      className="rounded-[6px] border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-left font-[JetBrains_Mono,monospace] text-[11px] text-[var(--cyan)] transition-colors hover:border-[var(--border-active)] hover:bg-[color-mix(in_srgb,var(--cyan)_6%,transparent)]"
                    >
                      &ldquo;{ex}&rdquo;
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
