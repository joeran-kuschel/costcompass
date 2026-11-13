import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The routes use Nitro auto-imports (defineEventHandler, db), which do not exist in the Nuxt test
// environment. Stub them, then import the route file: the handler is what the route exports.
const db = vi.hoisted(() => ({ execute: vi.fn() }))

async function handler(file: 'health' | 'ready') {
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('db', db)
  const route = await import(`../../server/api/${file}.get.ts`)
  return route.default as () => Promise<unknown> | unknown
}

beforeEach(() => {
  vi.resetAllMocks()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GET /api/health', () => {
  it('answers with a small status body', async () => {
    const health = await handler('health')
    expect(await health()).toEqual({ status: 'ok' })
  })
  it('does not query the database', async () => {
    const health = await handler('health')
    await health()
    expect(db.execute).not.toHaveBeenCalled()
  })
})

describe('GET /api/ready', () => {
  it('answers ok when the database answers', async () => {
    db.execute.mockResolvedValueOnce([])
    const ready = await handler('ready')
    expect(await ready()).toEqual({ status: 'ok' })
    expect(db.execute).toHaveBeenCalledTimes(1)
  })
  it('answers 503 when the query fails', async () => {
    db.execute.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:5432'))
    const ready = await handler('ready')
    await expect(ready()).rejects.toMatchObject({ statusCode: 503, statusMessage: 'Database not reachable' })
  })
  it('keeps the error text and the connection string out of the response', async () => {
    db.execute.mockRejectedValueOnce(new Error('password authentication failed for postgresql://costcompass:secret@db:5432/costcompass'))
    const ready = await handler('ready')
    const error = await ready().then(() => undefined, (e: unknown) => e)
    expect(JSON.stringify(error)).not.toMatch(/secret|postgresql|password/)
  })
  it('recovers on the next call once the database is back', async () => {
    db.execute.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce([])
    const ready = await handler('ready')
    await expect(ready()).rejects.toMatchObject({ statusCode: 503 })
    expect(await ready()).toEqual({ status: 'ok' })
  })
})
