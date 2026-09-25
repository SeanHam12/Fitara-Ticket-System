import { z } from 'zod'
export const ticketType = z.enum(['bug', 'feature', 'task', 'improvement'])
export const priority = z.enum(['p1', 'p2', 'p3', 'p4'])
const fields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().max(50000).default(''),
  type: ticketType,
  priority,
  statusId: z.string().uuid(),
  assigneeMembershipId: z.string().uuid().nullable().optional(),
  labelIds: z.array(z.string().uuid()).max(20).default([]),
  dueDate: z.iso.date().nullable().optional(),
  blocked: z.boolean().optional(),
}
export const createTicketSchema = z
  .object({ projectId: z.string().uuid(), ...fields })
  .strict()
export const updateTicketSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    ...Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, v.optional()]),
    ),
  })
  .strict()
export const moveTicketSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    statusId: z.string().uuid(),
    beforeTicketId: z.string().uuid().nullable().optional(),
  })
  .strict()
export const ticketFiltersSchema = z.object({
  projectId: z.string().uuid().optional(),
  statusId: z.string().uuid().optional(),
  priority: priority.optional(),
  assignee: z.string().uuid().optional(),
  onlyMine: z.coerce.boolean().optional(),
  search: z.string().trim().max(200).optional(),
  sort: z.enum(['updated', 'priority', 'identifier']).default('updated'),
})
export const createProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    key: z
      .string()
      .trim()
      .toUpperCase()
      .min(2)
      .max(10)
      .regex(/^[A-Z][A-Z0-9]+$/),
    description: z.string().max(5000).default(''),
  })
  .strict()
export const updateProjectSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().max(5000).optional(),
    archived: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.archived !== undefined,
  )
