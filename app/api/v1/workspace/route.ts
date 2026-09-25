import { resolveActor } from '@/server/auth/actor'
import { handle, ok } from '@/server/http'
import { WorkspaceService } from '@/server/services/workspace-service'

export const runtime = 'nodejs'

export function GET(request: Request) {
  return handle(async (requestId) =>
    ok(
      await new WorkspaceService().get(
        await resolveActor(requestId, request.headers),
      ),
      200,
      requestId,
    ),
  )
}

export function PATCH(request: Request) {
  return handle(async (requestId) =>
    ok(
      await new WorkspaceService().update(
        await resolveActor(requestId, request.headers),
        await request.json(),
      ),
      200,
      requestId,
    ),
  )
}
