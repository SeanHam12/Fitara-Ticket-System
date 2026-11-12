import { z } from 'zod'
import { validGitHubUrl } from '@/lib/github-url'
export const ticketType = z.enum(['bug', 'feature', 'task', 'improvement'])
export const priority = z.enum(['p1', 'p2', 'p3', 'p4'])
const assignees = z
  .array(z.uuid())
  .refine(
    (ids) => new Set(ids).size === ids.length,
    'An assignee may appear only once.',
  )
const fields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().max(50000).default(''),
  type: ticketType,
  priority,
  statusId: z.string().uuid(),
  assigneeMembershipIds: assignees.default([]),
  labelIds: z.array(z.string().uuid()).max(20).default([]),
  dueDate: z.iso.date().nullable().optional(),
  blocked: z.boolean().optional(),
  acceptanceCriteria: z.string().max(20000).default(''),
  comments: z.string().max(20000).default(''),
  subtasks: z.string().max(20000).default(''),
  dependencies: z.string().max(20000).default(''),
  attachments: z.string().max(20000).default(''),
  githubDevelopment: z.string().max(20000).default(''),
  githubUrl: z
    .union([z.literal(''), z.url()])
    .nullable()
    .optional()
    .transform((value) => value || null)
    .refine(
      (value) => value === null || validGitHubUrl(value),
      'Enter a valid GitHub repository, issue, or pull request URL.',
    ),
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
export const trashTicketsSchema = z
  .object({
    ticketIds: z.array(z.string().uuid()).min(1).max(200).optional(),
    all: z.literal(true).optional(),
    expectedCount: z.number().int().nonnegative(),
  })
  .strict()
  .refine((value) => Boolean(value.all) !== Boolean(value.ticketIds), {
    message: 'Choose ticket IDs or all tickets, not both.',
  })
export const restoreTicketsSchema = z
  .object({ ticketIds: z.array(z.string().uuid()).min(1).max(200) })
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
