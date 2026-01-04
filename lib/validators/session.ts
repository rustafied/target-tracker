import { z } from "zod";

export const sessionSchema = z.object({
  date: z.string().transform((str) => {
    // Parse date string and set to noon UTC to avoid timezone issues
    const [year, month, day] = str.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  }),
  location: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type SessionFormData = z.infer<typeof sessionSchema>;

