import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { AddUserForm } from './add-user-form'

afterEach(() => vi.unstubAllGlobals())

it('keeps entered fields after duplicate username and failed requests', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'That username is already in use.' }),
    })
    .mockRejectedValueOnce(new Error('Network unavailable'))
  vi.stubGlobal('fetch', fetchMock)
  render(<AddUserForm localDemo onCreated={vi.fn()} onCancel={vi.fn()} />)
  await userEvent.type(screen.getByLabelText('Username'), 'taylor')
  await userEvent.type(screen.getByLabelText('Name'), 'Taylor Kim')
  await userEvent.type(screen.getByLabelText('Function'), 'Design')
  await userEvent.click(screen.getByRole('button', { name: 'Create user' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('already in use')
  expect(screen.getByLabelText('Name')).toHaveValue('Taylor Kim')
  await userEvent.click(screen.getByRole('button', { name: 'Create user' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Network unavailable',
  )
  expect(screen.getByLabelText('Function')).toHaveValue('Design')
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('shows a server validation message without clearing the form', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: false,
      json: async () => ({
        detail: 'Check the highlighted fields.',
        errors: { username: ['This username is reserved.'] },
      }),
    })),
  )
  render(<AddUserForm localDemo onCreated={vi.fn()} />)
  await userEvent.type(screen.getByLabelText('Username'), 'admin')
  await userEvent.type(screen.getByLabelText('Name'), 'Admin Person')
  await userEvent.type(screen.getByLabelText('Function'), 'IT')
  await userEvent.click(screen.getByRole('button', { name: 'Create user' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'This username is reserved.',
  )
  expect(screen.getByLabelText('Name')).toHaveValue('Admin Person')
})
