import { z } from "zod/v4";

export const exampleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  createdAt: z.iso.datetime(),
});

export type Example = z.infer<typeof exampleSchema>;
