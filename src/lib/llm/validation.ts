import { z } from "zod";

const stepSchema = z.union([z.literal(0), z.literal(1)]);

const trackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sample: z.string().min(1).optional(),
  steps: z.array(stepSchema).length(16),
  volume: z.number().min(0).max(1),
  muted: z.boolean(),
  solo: z.boolean()
});

export const trackJsonSchema = z.object({
  bpm: z.number().int().min(60).max(220),
  // BR-006: el contrato validado nunca acepta más de 5 pistas.
  tracks: z.array(trackSchema).min(1).max(5),
  strudelCode: z.string().optional()
});

export type ParsedTrackJSON = z.infer<typeof trackJsonSchema>;

/**
 * Valida la respuesta cruda del LLM contra el schema del dominio.
 * Cualquier desviación del contrato se trata aguas arriba como error uniforme.
 *
 * @param input - Payload devuelto por el provider LLM.
 * @returns Patrón validado listo para compilar a Strudel.
 * @see BR-002 El LLM debe cumplir el schema definido
 * @see BR-006 Máximo 5 pistas por patrón
 */
export function validateTrackJson(input: unknown): ParsedTrackJSON {
  return trackJsonSchema.parse(input);
}
