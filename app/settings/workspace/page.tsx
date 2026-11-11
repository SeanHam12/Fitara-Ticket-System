import { auth } from '@/server/auth/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { WorkspaceSettings } from '@/components/workspace-settings'
import { getDevLoginBypassConfig } from '@/server/auth/dev-login-bypass'

export default async function WorkspaceSettingsPage() {
  if (!(await auth.api.getSession({ headers: await headers() })))
    redirect(
      getDevLoginBypassConfig() ? '/login?next=/settings/workspace' : '/login',
    )
  return <WorkspaceSettings />
}
