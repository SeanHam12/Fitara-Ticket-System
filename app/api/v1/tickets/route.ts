import { resolveDemoActor } from '@/server/auth/demo-actor'
import { handle, ok } from '@/server/http'
import { ticketFiltersSchema } from '@/server/services/schemas'
import { WorkService } from '@/server/services/work-service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET(r: Request) {
  return handle(async (id) => {
    const actor = await resolveDemoActor(id)
    const q = Object.fromEntries(new URL(r.url).searchParams)
    return ok(
      await new WorkService().tickets(actor, ticketFiltersSchema.parse(q)),
      200,
      id,
    )
  })
}
export function POST(r: Request) {
  return handle(async (id) => {
    const actor = await resolveDemoActor(id)
    return ok(await new WorkService().create(actor, await r.json()), 201, id)
  })
}
