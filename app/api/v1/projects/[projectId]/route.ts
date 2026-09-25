import { resolveDemoActor } from '@/server/auth/demo-actor'
import { handle, ok } from '@/server/http'
import { WorkService } from '@/server/services/work-service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET(
  _r: Request,
  c: { params: Promise<{ projectId: string }> },
) {
  return handle(async (id) => {
    const actor = await resolveDemoActor(id)
    return ok(
      await new WorkService().project(actor, (await c.params).projectId),
      200,
      id,
    )
  })
}
