'use client';

import { useTranslation } from '@lib/i18n';

/**
 * Referencia visible de shortcuts del PromptBox para reducir errores de envio.
 * Refuerza el contrato Enter/Shift+Enter de la interaccion principal.
 *
 * @see BR-010 El envio de prompt requiere accion explicita del usuario
 */
export function KeyboardShortcuts() {
  const t = useTranslation();
  return (
    <section>
      <h2 className="mb-3 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {t('config.shortcuts')}
      </h2>
      <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface2)] px-4 py-3 flex flex-col gap-2">
        <ShortcutRow keys={['Enter']} description={t('config.shortcutSend')} />
        <ShortcutRow keys={['Shift', 'Enter']} description={t('config.shortcutNewLine')} />
      </div>
    </section>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[12px] text-[var(--text-dim)]">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={key} className="flex items-center gap-1">
            {i > 0 && <span className="text-[10px] text-[var(--text-muted)]">+</span>}
            <kbd className="rounded-[4px] border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 font-[JetBrains_Mono,monospace] text-[10px] text-[var(--text-dim)]">
              {key}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  );
}
