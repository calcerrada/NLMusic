import type { Track, TrackJSON, PatternDelta } from "@lib/types";

export interface ApplyDeltaResult {
  next: TrackJSON;
  warnings: string[];
}

/**
 * Aplica un delta de operaciones al patrón actual de forma inmutable.
 * Devuelve el siguiente TrackJSON y cualquier aviso que la UI debe mostrar.
 *
 * @see BR-004 Añadir no destruye pistas existentes
 * @see BR-005 Referencias a pistas inexistentes → warning, no error
 * @see BR-006 Máximo 5 pistas tras aplicar el delta
 * @see BR-001 El audio sigue sonando; Strudel actualiza en el siguiente ciclo
 */
export function applyDelta(current: TrackJSON, delta: PatternDelta): ApplyDeltaResult {
  const warnings: string[] = [];
  let tracks: Track[] = [...current.tracks];
  const bpm = delta.bpm ?? current.bpm;

  for (const op of delta.operations) {
    if (op.type === "add") {
      // BR-006: rechazar si ya hay 5 pistas
      if (tracks.length >= 5) {
        warnings.push(
          `No se puede añadir '${op.track.name}': límite de 5 pistas alcanzado (BR-006). Elimina una pista primero.`
        );
      } else {
        // BR-004: secuencial, añadir al final
        tracks = [...tracks, op.track];
      }
    } else if (op.type === "update") {
      const exists = tracks.some((t) => t.id === op.id);
      if (!exists) {
        // BR-005: referencia a pista inexistente → warning, no fail
        warnings.push(`Pista '${op.id}' no encontrada — operación de actualización ignorada.`);
      } else {
        tracks = tracks.map((t) => (t.id === op.id ? { ...t, ...op.patch } : t));
      }
    } else if (op.type === "remove") {
      const exists = tracks.some((t) => t.id === op.id);
      if (!exists) {
        // BR-005
        warnings.push(`Pista '${op.id}' no encontrada — operación de eliminación ignorada.`);
      } else {
        tracks = tracks.filter((t) => t.id !== op.id);
      }
    } else if (op.type === "replace") {
      if (op.tracks.length > 5) {
        warnings.push(
          `Reemplazo propuso ${op.tracks.length} pistas; se mantuvieron 5 (BR-006).`
        );
      }
      tracks = op.tracks.slice(0, 5);
    }
  }

  return {
    next: { bpm, tracks },
    warnings,
  };
}
