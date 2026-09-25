import { auth } from '@/server/auth/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ProjectsManager } from '@/components/projects-manager'

export default async function ProjectsPage() {
  if (!(await auth.api.getSession({ headers: await headers() })))
    redirect('/login')
  return <ProjectsManager />
}
