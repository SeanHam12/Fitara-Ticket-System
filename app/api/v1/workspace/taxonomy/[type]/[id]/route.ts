import { resolveActor } from '@/server/auth/actor'
import { handle, ok } from '@/server/http'
import { WorkspaceService } from '@/server/services/workspace-service'

export const runtime = 'nodejs'

export function DELETE(
  request: Request,
  context: { params: Promise<{ type: string; id: string }> },
) {
  return handle(async (requestId) => {
    const { type, id } = await context.params
    return ok(
      await new WorkspaceService().deleteTaxonomy(
        await resolveActor(requestId, request.headers),
        type,
        id,
      ),
      200,
      requestId,
    )
  })
}
