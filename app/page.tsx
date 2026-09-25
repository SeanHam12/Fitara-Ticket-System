import { WorkspaceApp } from '@/components/workspace-app'
import { auth } from '@/server/auth/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
export default async function Page() {
  if (!(await auth.api.getSession({ headers: await headers() })))
    redirect('/login')
  return <WorkspaceApp />
}
