import { z } from "zod";

export const draftSchema = z.object({
  text: z.string(),
});
