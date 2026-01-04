import { z } from "zod";

export const bullSchema = z.object({
  targetSheetId: z.string().min(1, "Target sheet is required"),
  bullIndex: z.number().int().min(1).max(6),
  score5Count: z.number().int().min(0).max(10).default(0),
  score4Count: z.number().int().min(0).max(10).default(0),
  score3Count: z.number().int().min(0).max(10).default(0),
  score2Count: z.number().int().min(0).max(10).default(0),
  score1Count: z.number().int().min(0).max(10).default(0),
  score0Count: z.number().int().min(0).max(10).default(0),
});

export type BullFormData = z.infer<typeof bullSchema>;

