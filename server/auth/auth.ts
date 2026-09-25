import 'server-only'
import { createAuth } from './config'

export { createAuth }
export const auth = createAuth(false)
