import { resolveActor } from '@/server/auth/actor'
import { handle, ok, requireSameOrigin } from '@/server/http'
import { WorkService } from '@/server/services/work-service'

export const runtime = 'nodejs'

export function POST(request: Request) {
  return handle(async (requestId) => {
    requireSameOrigin(request)
    return ok(
      await new WorkService().restore(
        await resolveActor(requestId, request.headers),
        await request.json(),
      ),
      200,
      requestId,
    )
  })
}
