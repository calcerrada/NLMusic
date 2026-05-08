'use client';

import { useSessionStore } from '@store/sessionStore';
import type { EditorMode } from '@store/sessionStore';
import { useTranslation } from '@lib/i18n';

/**
 * Superficie de configuracion del editor Strudel con aplicacion inmediata.
 * Todas las preferencias viven en store persistido para mantener continuidad entre sesiones.
 */
export function EditorPreferences() {
  const t = useTranslation();
  const editorMode = useSessionStore((s) => s.editorMode);
  const highlightingEnabled = useSessionStore((s) => s.highlightingEnabled);
  const hapVisualizationEnabled = useSessionStore((s) => s.hapVisualizationEnabled);
  const setEditorMode = useSessionStore((s) => s.setEditorMode);
  const setHighlightingEnabled = useSessionStore((s) => s.setHighlightingEnabled);
  const setHapVisualizationEnabled = useSessionStore((s) => s.setHapVisualizationEnabled);

  return (
    <section>
      <h2 className="mb-3 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {t('config.editorPrefs')}
      </h2>
      <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface2)] px-4 py-3 flex flex-col gap-4">
        {/* Editor mode toggle */}
        <PrefRow label={t('config.editorLabel')}>
          <SegmentedControl
            options={[
              { value: 'advanced', label: t('config.editorAdvanced') },
              { value: 'simple', label: t('config.editorSimple') },
            ]}
            value={editorMode}
            onChange={(v) => setEditorMode(v as EditorMode)}
          />
        </PrefRow>

        {/* Highlighting toggle */}
        <PrefRow label={t('config.highlighting')}>
          <Toggle value={highlightingEnabled} onChange={setHighlightingEnabled} />
        </PrefRow>

        {/* Hap visualization — solo visible en modo avanzado */}
        {editorMode === 'advanced' && (
          <PrefRow label={t('config.hapVisualization')}>
            <Toggle value={hapVisualizationEnabled} onChange={setHapVisualizationEnabled} />
          </PrefRow>
        )}
      </div>

      {/* Espacio reservado para formulario de API key en v1+ */}
      <div className="mt-4 rounded-[8px] border border-dashed border-[var(--border)] px-4 py-3">
        <p className="text-[11px] text-[var(--text-muted)]">
          {t('config.apiKeyPlaceholder')}
        </p>
      </div>
    </section>
  );
}

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[12px] text-[var(--text-dim)]">{label}</span>
      {children}
    </div>
  );
}

/**
 * Toggle accesible basado en role switch para estado booleano persistente.
 */
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={[
        'relative h-5 w-9 rounded-full border transition-colors',
        value
          ? 'border-[var(--border-active)] bg-[color-mix(in_srgb,var(--cyan)_20%,transparent)]'
          : 'border-[var(--border)] bg-[var(--surface)]',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 h-4 w-4 rounded-full transition-transform',
          value ? 'translate-x-4 bg-[var(--cyan)]' : 'translate-x-0.5 bg-[var(--text-muted)]',
        ].join(' ')}
      />
    </button>
  );
}

/**
 * Selector segmentado para modos excluyentes del editor.
 */
function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-[6px] border border-[var(--border)] overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            'px-3 py-1.5 text-[10px] transition-colors',
            value === opt.value
              ? 'bg-[color-mix(in_srgb,var(--cyan)_10%,transparent)] text-[var(--cyan)]'
              : 'bg-transparent text-[var(--text-dim)] hover:text-[var(--text)]',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
