import { resolveDemoActor } from '@/server/auth/demo-actor'
import { handle, ok } from '@/server/http'
import { WorkService } from '@/server/services/work-service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET() {
  return handle(async (id) => {
    const actor = await resolveDemoActor(id)
    return ok(await new WorkService().projects(actor), 200, id)
  })
}
