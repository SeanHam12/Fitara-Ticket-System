import { resolveActor } from '@/server/auth/actor'
import { handle, ok } from '@/server/http'
import { MembershipService } from '@/server/services/membership-service'
import { isLocalDemoRequest } from '@/server/auth/dev-login-bypass'
import { requireSameOrigin } from '@/server/http'
export const runtime = 'nodejs'
export function GET(r: Request) {
  return handle(async (id) =>
    ok(
      await new MembershipService().list(await resolveActor(id, r.headers)),
      200,
      id,
    ),
  )
}
export function POST(r: Request) {
  return handle(async (id) => {
    requireSameOrigin(r)
    return ok(
      await new MembershipService().create(
        await resolveActor(id, r.headers),
        await r.json(),
        isLocalDemoRequest(r),
      ),
      201,
      id,
    )
  })
}
