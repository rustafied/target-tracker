import { z } from "zod";

export const sessionSchema = z.object({
  date: z.coerce.date(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export type SessionFormData = z.infer<typeof sessionSchema>;

