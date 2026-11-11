import { describe, expect, it } from 'vitest'
import { requireSameOrigin } from './http'

describe('mutation origin protection', () => {
  it('accepts the same origin and host', () => {
    expect(() =>
      requireSameOrigin(
        new Request('http://localhost:3000/api', {
          headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
        }),
      ),
    ).not.toThrow()
  })
  it('rejects a missing or foreign origin', () => {
    expect(() =>
      requireSameOrigin(
        new Request('http://localhost:3000/api', {
          headers: { origin: 'https://evil.example', host: 'localhost:3000' },
        }),
      ),
    ).toThrow(/Fitara Work origin/)
  })
})
