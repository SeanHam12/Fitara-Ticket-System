import { expect, it } from 'vitest'
import { demoPersonSchema } from './person-schema'

it('accepts only three descriptive demo person fields and normalizes usernames', () => {
  expect(
    demoPersonSchema.parse({
      username: ' Taylor ',
      name: ' Taylor Kim ',
      function: ' Design ',
    }),
  ).toEqual({
    username: 'taylor',
    name: 'Taylor Kim',
    function: 'Design',
  })
  expect(() =>
    demoPersonSchema.parse({
      username: 'taylor',
      name: 'Taylor Kim',
      function: 'Design',
      role: 'owner',
    }),
  ).toThrow()
  expect(() =>
    demoPersonSchema.parse({
      username: 'taylor',
      name: null,
      function: 'Design',
    }),
  ).toThrow()
  expect(() =>
    demoPersonSchema.parse({
      username: 'taylor',
      name: 'Taylor Kim',
      function: '',
    }),
  ).toThrow()
  expect(() =>
    demoPersonSchema.parse({
      username: 'ADMIN',
      name: 'Admin',
      function: 'IT',
    }),
  ).toThrow()
})
