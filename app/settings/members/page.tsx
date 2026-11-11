import { auth } from '@/server/auth/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { MembersManager } from '@/components/members-manager'
import { getDevLoginBypassConfig } from '@/server/auth/dev-login-bypass'

export default async function MembersPage() {
  if (!(await auth.api.getSession({ headers: await headers() })))
    redirect(
      getDevLoginBypassConfig() ? '/login?next=/settings/members' : '/login',
    )
  return <MembersManager />
}
