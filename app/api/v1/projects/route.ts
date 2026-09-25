import { resolveActor } from '@/server/auth/actor'
import { handle, ok } from '@/server/http'
import { WorkService } from '@/server/services/work-service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET(r: Request) {
  return handle(async (id) => {
    const actor = await resolveActor(id, r.headers)
    const includeArchived =
      new URL(r.url).searchParams.get('includeArchived') === 'true'
    return ok(await new WorkService().projects(actor, includeArchived), 200, id)
  })
}
export function POST(r: Request) {
  return handle(async (id) => {
    const actor = await resolveActor(id, r.headers)
    return ok(
      await new WorkService().createProject(actor, await r.json()),
      201,
      id,
    )
  })
}
