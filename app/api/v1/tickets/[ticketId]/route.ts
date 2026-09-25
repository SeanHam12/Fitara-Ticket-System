import { resolveDemoActor } from '@/server/auth/demo-actor'
import { handle, ok } from '@/server/http'
import { WorkService } from '@/server/services/work-service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET(_r: Request, c: { params: Promise<{ ticketId: string }> }) {
  return handle(async (id) => {
    const actor = await resolveDemoActor(id)
    return ok(
      await new WorkService().ticket(actor, (await c.params).ticketId),
      200,
      id,
    )
  })
}
export function PATCH(
  r: Request,
  c: { params: Promise<{ ticketId: string }> },
) {
  return handle(async (id) => {
    const actor = await resolveDemoActor(id)
    return ok(
      await new WorkService().update(
        actor,
        (await c.params).ticketId,
        await r.json(),
      ),
      200,
      id,
    )
  })
}
