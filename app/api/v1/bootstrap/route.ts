import { resolveActor } from '@/server/auth/actor'
import { handle, ok } from '@/server/http'
import { WorkService } from '@/server/services/work-service'
import { isLocalDemoRequest } from '@/server/auth/dev-login-bypass'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET(r: Request) {
  return handle(async (id) => {
    const actor = await resolveActor(id, r.headers, {
      allowPasswordChangeRequired: true,
    })
    return ok(
      {
        actor: {
          id: actor.userId,
          name: actor.name,
          membershipId: actor.membershipId,
          role: actor.role,
          passwordChangeRequired: actor.passwordChangeRequired,
          localDemoUserCreation: isLocalDemoRequest(r),
        },
        ...(await new WorkService().bootstrap(actor)),
      },
      200,
      id,
    )
  })
}
