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

// BR-004: schema de operaciones delta para actualizaciones incrementales
const addOperationSchema = z.object({
  type: z.literal('add'),
  track: trackSchema,
});

const updateOperationSchema = z.object({
  type: z.literal('update'),
  id: z.string().min(1),
  patch: trackSchema.omit({ id: true }).partial(),
});

const removeOperationSchema = z.object({
  type: z.literal('remove'),
  id: z.string().min(1),
});

const replaceOperationSchema = z.object({
  type: z.literal('replace'),
  tracks: z.array(trackSchema),
});

const patternOperationSchema = z.discriminatedUnion('type', [
  addOperationSchema,
  updateOperationSchema,
  removeOperationSchema,
  replaceOperationSchema,
]);

export const patternDeltaSchema = z.object({
  bpm: z.number().int().min(60).max(220).optional(),
  operations: z.array(patternOperationSchema).min(1),
});

export type ParsedPatternDelta = z.infer<typeof patternDeltaSchema>;

/**
 * Valida la respuesta cruda del LLM contra el schema del dominio.
 * @see BR-002 El LLM debe cumplir el schema definido
 * @see BR-006 Máximo 5 pistas por patrón
 */
export function validateTrackJson(input: unknown): ParsedTrackJSON {
  return trackJsonSchema.parse(input);
}

/**
 * Valida un delta de operaciones devuelto por el LLM.
 * @see BR-004 Las pistas se crean de forma secuencial
 */
export function validatePatternDelta(input: unknown): ParsedPatternDelta {
  return patternDeltaSchema.parse(input);
}
