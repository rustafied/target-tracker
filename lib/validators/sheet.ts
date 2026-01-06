import { z } from "zod";

export const sheetSchema = z.object({
  rangeSessionId: z.string().min(1, "Session is required").optional(), // Optional for updates
  firearmId: z.string().min(1, "Firearm is required"),
  caliberId: z.string().min(1, "Caliber is required"),
  opticId: z.string().min(1, "Optic is required"),
  distanceYards: z.coerce.number().positive("Distance must be positive"),
  sheetLabel: z.string().optional(),
  notes: z.string().optional(),
  targetTemplateId: z.string().optional(), // Optional - will use default if not provided
});

export type SheetFormData = z.infer<typeof sheetSchema>;

