import { z } from 'zod'

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(32)
  .regex(/^[a-z0-9._-]+$/)
  .refine(
    (value) => !['admin', 'api', 'root', 'support', 'system'].includes(value),
    'This username is reserved.',
  )

export const demoPersonSchema = z
  .object({
    username: usernameSchema,
    name: z.string().trim().min(1).max(100),
    function: z.string().trim().min(1).max(100),
  })
  .strict()
