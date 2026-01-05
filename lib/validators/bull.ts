import { z } from "zod";

export const shotPositionSchema = z.object({
  x: z.number().min(0).max(200),
  y: z.number().min(0).max(200),
  score: z.number().int().min(0).max(5),
});

export const bullSchema = z.object({
  targetSheetId: z.string().min(1, "Target sheet is required"),
  bullIndex: z.number().int().min(1).max(6),
  score5Count: z.number().int().min(0).max(100).default(0),
  score4Count: z.number().int().min(0).max(100).default(0),
  score3Count: z.number().int().min(0).max(100).default(0),
  score2Count: z.number().int().min(0).max(100).default(0),
  score1Count: z.number().int().min(0).max(100).default(0),
  score0Count: z.number().int().min(0).max(100).default(0),
  shotPositions: z.array(shotPositionSchema).optional(),
});

export type ShotPosition = z.infer<typeof shotPositionSchema>;
export type BullFormData = z.infer<typeof bullSchema>;

