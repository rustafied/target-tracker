import { z } from "zod";

export const opticSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().optional(),
  magnification: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type OpticFormData = z.infer<typeof opticSchema>;

