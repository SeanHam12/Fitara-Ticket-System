import { auth } from '@/server/auth/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { WorkspaceSettings } from '@/components/workspace-settings'

export default async function WorkspaceSettingsPage() {
  if (!(await auth.api.getSession({ headers: await headers() })))
    redirect('/login')
  return <WorkspaceSettings />
}
