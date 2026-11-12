import { afterEach, describe, expect, it } from 'vitest'
import {
  getDevLoginBypassConfig,
  isLocalDemoRequest,
  isLoopbackHostname,
} from './dev-login-bypass'

const original = { ...process.env }
afterEach(() => {
  process.env = { ...original }
})

describe('local demo access gate', () => {
  it.each(['localhost', '127.0.0.1', '::1'])('accepts loopback %s', (host) => {
    expect(isLoopbackHostname(host)).toBe(true)
  })
  it('fails closed for a shared host', () => {
    Object.assign(process.env, {
      APP_ENV: 'development',
      DEMO_MODE: 'true',
      DEV_LOGIN_BYPASS: 'true',
      BETTER_AUTH_URL: 'https://preview.example.com',
    })
    expect(getDevLoginBypassConfig()).toBeNull()
  })
  it('enables only the explicit loopback development demo', () => {
    Object.assign(process.env, {
      APP_ENV: 'development',
      DEMO_MODE: 'true',
      DEV_LOGIN_BYPASS: 'true',
      BETTER_AUTH_URL: 'http://localhost:3000',
    })
    expect(getDevLoginBypassConfig()).toEqual({ enabled: true })
    expect(
      isLocalDemoRequest(
        new Request('http://localhost:3000/api/v1/memberships'),
      ),
    ).toBe(true)
    expect(
      isLocalDemoRequest(
        new Request('http://preview.example.com/api/v1/memberships'),
      ),
    ).toBe(false)
    expect(
      isLocalDemoRequest(
        new Request('http://localhost:3000/api/v1/memberships', {
          headers: { 'x-forwarded-for': '203.0.113.2' },
        }),
      ),
    ).toBe(false)
    expect(
      isLocalDemoRequest(
        new Request('http://localhost:3000/api/v1/memberships', {
          headers: { 'x-forwarded-host': 'invalid host' },
        }),
      ),
    ).toBe(false)
  })
  it('stays disabled in a production runtime even with demo flags', () => {
    Object.assign(process.env, {
      NODE_ENV: 'production',
      APP_ENV: 'development',
      DEMO_MODE: 'true',
      DEV_LOGIN_BYPASS: 'true',
      BETTER_AUTH_URL: 'http://localhost:3000',
    })
    expect(getDevLoginBypassConfig()).toBeNull()
  })
})
