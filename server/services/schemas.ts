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
