import { resolveActor } from '@/server/auth/actor'
import { handle, ok, requireSameOrigin } from '@/server/http'
import { WorkService } from '@/server/services/work-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  return handle(async (requestId) =>
    ok(
      await new WorkService().trash(
        await resolveActor(requestId, request.headers),
      ),
      200,
      requestId,
    ),
  )
}

export function POST(request: Request) {
  return handle(async (requestId) => {
    requireSameOrigin(request)
    return ok(
      await new WorkService().archive(
        await resolveActor(requestId, request.headers),
        await request.json(),
      ),
      200,
      requestId,
    )
  })
}
