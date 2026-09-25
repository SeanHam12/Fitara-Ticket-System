import { resolveActor } from '@/server/auth/actor'
import { handle, ok } from '@/server/http'
import { WorkService } from '@/server/services/work-service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET(r: Request, c: { params: Promise<{ projectId: string }> }) {
  return handle(async (id) => {
    const actor = await resolveActor(id, r.headers)
    return ok(
      await new WorkService().project(actor, (await c.params).projectId),
      200,
      id,
    )
  })
}
export function PATCH(
  r: Request,
  c: { params: Promise<{ projectId: string }> },
) {
  return handle(async (id) => {
    const actor = await resolveActor(id, r.headers)
    return ok(
      await new WorkService().updateProject(
        actor,
        (await c.params).projectId,
        await r.json(),
      ),
      200,
      id,
    )
  })
}
