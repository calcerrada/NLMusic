'use client'

import { useSessionStore } from '@store/sessionStore'
import { translations, type TranslationKey } from './translations'

/**
 * Hook de traducción que selecciona strings de UI en el idioma actual.
 *
 * Lee el idioma del store (persistido en localStorage) y retorna una función
 * que traduce claves tipadas al idioma seleccionado. El cambio de idioma
 * causa un rerender inmediato sin recargar la página.
 *
 * Uso: `const t = useTranslation(); return <p>{t('prompt.placeholder')}</p>`
 *
 * @returns Función que acepta una TranslationKey y retorna el string traducido
 *          en el idioma actual (es | en). Si la clave no existe, retorna la
 *          misma clave como fallback (nunca undefined).
 * @see TASK-13 Multiidioma UI — ES / EN con detección automática del navegador
 */
export function useTranslation() {
  const language = useSessionStore((s) => s.language)
  return (key: TranslationKey): string => translations[language][key]
}
