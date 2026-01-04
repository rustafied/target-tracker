import { z } from "zod";

export const sessionSchema = z.object({
  date: z.string().or(z.date()),
  location: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type SessionFormData = z.infer<typeof sessionSchema>;

