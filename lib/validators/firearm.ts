import { z } from "zod";

export const firearmSchema = z.object({
  name: z.string().min(1, "Name is required"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  defaultCaliberId: z.string().optional(),
  defaultDistanceYards: z.number().positive().optional().or(z.undefined()),
  caliberIds: z.array(z.string()).optional().default([]),
  opticIds: z.array(z.string()).optional().default([]),
  color: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type FirearmFormData = z.infer<typeof firearmSchema>;

