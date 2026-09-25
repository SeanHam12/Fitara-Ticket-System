import { resolveActor } from '@/server/auth/actor'
import { handle, ok } from '@/server/http'
import { WorkspaceService } from '@/server/services/workspace-service'

export const runtime = 'nodejs'

export function POST(request: Request) {
  return handle(async (requestId) =>
    ok(
      await new WorkspaceService().createTaxonomy(
        await resolveActor(requestId, request.headers),
        await request.json(),
      ),
      201,
      requestId,
    ),
  )
}
