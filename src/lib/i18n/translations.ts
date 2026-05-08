/**
 * Diccionario de traducción centralizado para la UI — Español e Inglés.
 *
 * Organización:
 * - Cada namespace (transport, prompt, tracks, tabs, page, config) agrupa claves relacionadas
 * - Las claves son paths dot-notated (ej: 'config.cat.scratch.1')
 * - El diccionario es tipado: TranslationKey union valida las claves en tiempo de compilación
 *
 * Sistema de idiomas:
 * - Idioma del motor de audio (Strudel): independiente (inglés nativo)
 * - Idioma del system prompt LLM: siempre inglés (máximo rendimiento)
 * - Idioma del prompt del usuario: sin restricción — el LLM lo procesa en cualquier idioma
 * - Idioma de la UI: ES / EN — detectado desde navigator.language con fallback a ES
 *
 * Política de traducción:
 * - No traducir: código Strudel, nombres de instrumentos (kick, snare, hihat...), teclas de teclado
 * - Traducir todo: tooltips, labels, placeholders, feedback, mensajes de error
 *
 * @see TASK-13 Multiidioma UI — ES / EN con detección del navegador y selector discreto
 * @see nlmusic-spec.md Sección 10 (Adaptaciones Geográficas)
 */

export type Language = 'es' | 'en'

const translations = {
  es: {
    // Transport
    'transport.audioError': 'Motor de audio no disponible. Recarga la página o prueba otro navegador.',
    'transport.audioErrorBadge': '✕ Error',
    'transport.audioReady': '● Listo',
    'transport.audioInit': '○ Iniciando…',
    'transport.play': 'Play',
    'transport.stop': 'Stop',
    'transport.barLabel': 'Compás',

    // Prompt
    'prompt.placeholder': 'Ej: kick 909 en 4x4 techno oscuro, añade snare en los tiempos 2 y 4…',
    'prompt.audioDisabled': 'Motor de audio no disponible — recarga la página',
    'prompt.retry': 'Reintentar',
    'prompt.submit': 'Enviar prompt',
    'prompt.newLine': 'nueva línea',

    // Tracks
    'tracks.counterLabel': 'Pistas',
    'tracks.empty': 'Describe tu patrón abajo para empezar',
    'tracks.codeEditedWarning': 'Editado manualmente — el grid puede no reflejar el código actual',
    'tracks.deleteAriaLabel': 'Eliminar pista',

    // Tabs
    'tabs.sequencer': 'Secuenciador',
    'tabs.strudel': 'Código Strudel',
    'tabs.config': 'Configuración',

    // Page error banner
    'page.audioErrorTitle': 'Motor de audio no disponible',
    'page.audioErrorHint': 'Recarga la página o prueba con otro navegador.',
    'page.reload': 'Recargar',

    // Config — System Status
    'config.systemStatus': 'Estado del sistema',
    'config.audioEngine': 'Motor de audio',
    'config.audioReady': '● Listo',
    'config.audioNotStarted': '○ No iniciado',
    'config.currentBpm': 'BPM actual',
    'config.activeTracks': 'Pistas activas',

    // Config — Prompt Guide
    'config.promptGuide': 'Guía de prompts',
    'config.cat.scratch': 'Crear desde cero',
    'config.cat.scratch.1': 'Un kick 909 en 4x4 techno a 138 BPM',
    'config.cat.scratch.2': 'Drum and bass con amen break, snappy y rápido',
    'config.cat.scratch.3': 'Patrón minimalista, solo hi-hat y bombo suaves',
    'config.cat.modify': 'Modificar pistas existentes',
    'config.cat.modify.1': 'Hazlo más oscuro y lento',
    'config.cat.modify.2': 'Añade un clap en el tiempo 3',
    'config.cat.modify.3': 'En la pista 1, quita los golpes de la segunda mitad',
    'config.cat.style': 'Referencia de estilo',
    'config.cat.style.1': 'Algo entre Aphex Twin y minimal techno',
    'config.cat.style.2': 'Al estilo Burial, percusivo y atmosférico',
    'config.cat.style.3': 'Ritmo afrobeat con mucho groove',
    'config.cat.remove': 'Eliminar',
    'config.cat.remove.1': 'Elimina el hi-hat',
    'config.cat.remove.2': 'Quita todas las pistas y empieza con solo un bombo',

    // Config — Keyboard Shortcuts
    'config.shortcuts': 'Atajos de teclado',
    'config.shortcutSend': 'Enviar prompt',
    'config.shortcutNewLine': 'Nueva línea en el prompt',

    // Config — Editor Preferences
    'config.editorPrefs': 'Preferencias del editor de código',
    'config.editorLabel': 'Editor',
    'config.editorAdvanced': 'Avanzado (CodeMirror)',
    'config.editorSimple': 'Simple (textarea)',
    'config.highlighting': 'Highlighting de sintaxis',
    'config.hapVisualization': 'Visualización haps',
    'config.apiKeyPlaceholder': 'Configuración de API key — disponible en v1+',
    'step.toggleLabel': 'Alternar paso',
    'editor.syntaxError': 'Error de sintaxis',
    'editor.runtimeError': 'Error de sintaxis en el código',
    'editor.placeholder': 'Escribe código Strudel aquí...',
    'editor.editableLabel': 'Código Strudel editable',
    'track.muteLabel': 'Silenciar pista',
    'track.soloLabel': 'Solo pista',
    'bpm.incrementLabel': 'Aumentar BPM',
    'bpm.decrementLabel': 'Disminuir BPM',
  },

  en: {
    // Transport
    'transport.audioError': 'Audio engine unavailable. Reload the page or try another browser.',
    'transport.audioErrorBadge': '✕ Error',
    'transport.audioReady': '● Ready',
    'transport.audioInit': '○ Initializing…',
    'transport.play': 'Play',
    'transport.stop': 'Stop',
    'transport.barLabel': 'Bar',

    // Prompt
    'prompt.placeholder': 'E.g.: 909 kick in 4x4 dark techno, add snare on beats 2 and 4…',
    'prompt.audioDisabled': 'Audio engine unavailable — reload the page',
    'prompt.retry': 'Retry',
    'prompt.submit': 'Send prompt',
    'prompt.newLine': 'new line',

    // Tracks
    'tracks.counterLabel': 'Tracks',
    'tracks.empty': 'Describe your pattern below to get started',
    'tracks.codeEditedWarning': 'Manually edited — the grid may not reflect the current code',
    'tracks.deleteAriaLabel': 'Delete track',

    // Tabs
    'tabs.sequencer': 'Sequencer',
    'tabs.strudel': 'Strudel Code',
    'tabs.config': 'Settings',

    // Page error banner
    'page.audioErrorTitle': 'Audio engine unavailable',
    'page.audioErrorHint': 'Reload the page or try another browser.',
    'page.reload': 'Reload',

    // Config — System Status
    'config.systemStatus': 'System status',
    'config.audioEngine': 'Audio engine',
    'config.audioReady': '● Ready',
    'config.audioNotStarted': '○ Not started',
    'config.currentBpm': 'Current BPM',
    'config.activeTracks': 'Active tracks',

    // Config — Prompt Guide
    'config.promptGuide': 'Prompt guide',
    'config.cat.scratch': 'Start from scratch',
    'config.cat.scratch.1': 'A 909 kick in 4x4 techno at 138 BPM',
    'config.cat.scratch.2': 'Drum and bass with amen break, snappy and fast',
    'config.cat.scratch.3': 'Minimalist pattern, soft hi-hat and kick only',
    'config.cat.modify': 'Modify existing tracks',
    'config.cat.modify.1': 'Make it darker and slower',
    'config.cat.modify.2': 'Add a clap on beat 3',
    'config.cat.modify.3': 'On track 1, remove hits from the second half',
    'config.cat.style': 'Style reference',
    'config.cat.style.1': 'Something between Aphex Twin and minimal techno',
    'config.cat.style.2': 'Burial style, percussive and atmospheric',
    'config.cat.style.3': 'Afrobeat rhythm with a lot of groove',
    'config.cat.remove': 'Remove',
    'config.cat.remove.1': 'Remove the hi-hat',
    'config.cat.remove.2': 'Remove all tracks and start with just a kick',

    // Config — Keyboard Shortcuts
    'config.shortcuts': 'Keyboard shortcuts',
    'config.shortcutSend': 'Send prompt',
    'config.shortcutNewLine': 'New line in prompt',

    // Config — Editor Preferences
    'config.editorPrefs': 'Code editor preferences',
    'config.editorLabel': 'Editor',
    'config.editorAdvanced': 'Advanced (CodeMirror)',
    'config.editorSimple': 'Simple (textarea)',
    'config.highlighting': 'Syntax highlighting',
    'config.hapVisualization': 'Hap visualization',
    'config.apiKeyPlaceholder': 'API key settings — available in v1+',
    'step.toggleLabel': 'Toggle step',
    'editor.syntaxError': 'Syntax error',
    'editor.runtimeError': 'Syntax error in code',
    'editor.placeholder': 'Write Strudel code here...',
    'editor.editableLabel': 'Editable Strudel code',
    'track.muteLabel': 'Mute track',
    'track.soloLabel': 'Solo track',
    'bpm.incrementLabel': 'Increase BPM',
    'bpm.decrementLabel': 'Decrease BPM',
  },
} as const

export type TranslationKey = keyof typeof translations.es

export { translations }
