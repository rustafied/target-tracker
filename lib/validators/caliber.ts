import { z } from "zod";

export const caliberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  shortCode: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CaliberFormData = z.infer<typeof caliberSchema>;

