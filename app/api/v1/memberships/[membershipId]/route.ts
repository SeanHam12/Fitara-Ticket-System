import { resolveActor } from '@/server/auth/actor'
import { handle, ok, requireSameOrigin } from '@/server/http'
import { MembershipService } from '@/server/services/membership-service'
export const runtime = 'nodejs'
export function GET(
  r: Request,
  c: { params: Promise<{ membershipId: string }> },
) {
  return handle(async (id) =>
    ok(
      await new MembershipService().deletionImpact(
        await resolveActor(id, r.headers),
        (await c.params).membershipId,
      ),
      200,
      id,
    ),
  )
}
export function PATCH(
  r: Request,
  c: { params: Promise<{ membershipId: string }> },
) {
  return handle(async (id) =>
    ok(
      await new MembershipService().update(
        await resolveActor(id, r.headers),
        (await c.params).membershipId,
        await r.json(),
      ),
      200,
      id,
    ),
  )
}

export function DELETE(
  r: Request,
  c: { params: Promise<{ membershipId: string }> },
) {
  return handle(async (id) => {
    requireSameOrigin(r)
    return ok(
      await new MembershipService().delete(
        await resolveActor(id, r.headers),
        (await c.params).membershipId,
        await r.json(),
      ),
      200,
      id,
    )
  })
}
