import { z } from "zod";

const stepSchema = z.union([z.literal(0), z.literal(1)]);

const trackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sample: z.string().min(1),
  steps: z.array(stepSchema).length(16),
  volume: z.number().min(0).max(1),
  muted: z.boolean(),
  solo: z.boolean()
});

export const trackJsonSchema = z.object({
  bpm: z.number().int().min(60).max(220),
  tracks: z.array(trackSchema).min(1).max(8),
  strudelCode: z.string().optional()
});

export type ParsedTrackJSON = z.infer<typeof trackJsonSchema>;

export function validateTrackJson(input: unknown): ParsedTrackJSON {
  return trackJsonSchema.parse(input);
}
