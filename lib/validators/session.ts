import { z } from "zod";

export const sessionSchema = z.object({
  date: z.string().transform((str) => new Date(str)),
  location: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type SessionFormData = z.infer<typeof sessionSchema>;

