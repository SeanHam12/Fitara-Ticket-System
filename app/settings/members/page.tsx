import { auth } from '@/server/auth/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { MembersManager } from '@/components/members-manager'

export default async function MembersPage() {
  if (!(await auth.api.getSession({ headers: await headers() })))
    redirect('/login')
  return <MembersManager />
}
