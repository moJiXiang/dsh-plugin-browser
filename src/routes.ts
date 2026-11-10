import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { BrowserController, ElementPick } from './browser.ts'
import { openExternal } from './open-external.ts'

const CMD_BODY_LIMIT = 1024 * 1024
const SSE_HEARTBEAT_MS = 15_000

function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  if (!origin) return true
  const host = req.headers.host
  if (!host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > CMD_BODY_LIMIT) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function json(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

/** Client → host commands for the browser panel. */
type PanelCommand =
  | { type: 'ensure' }
  | { type: 'navigate'; url: string }
  | { type: 'back' }
  | { type: 'forward' }
  | { type: 'reload' }
  | { type: 'resize'; width: number; height: number; dpr?: number }
  | { type: 'input'; kind: 'move' | 'click' | 'dblclick'; x: number; y: number }
  | { type: 'input'; kind: 'wheel'; x: number; y: number; dx: number; dy: number }
  | { type: 'input'; kind: 'key'; key: string }
  | { type: 'input'; kind: 'type'; text: string }
  | { type: 'pick'; enabled: boolean }

export function registerRoutes(ctx: Context, browser: BrowserController): void {
  // Screencast + status + pick events to the panel (SSE, long-lived).
  ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-browser/api/stream',
    handler: async (req, res) => {
      if (!sameOrigin(req) || req.method !== 'GET' && req.method !== 'HEAD') {
        json(res, 403, { ok: false, error: 'forbidden' })
        return
      }
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
      })
      const send = (event: string, data: string) => {
        if (!res.writableEnded) res.write(`event: ${event}\ndata: ${data}\n\n`)
      }
      send('status', JSON.stringify(await browser.status()))
      const unsubs = [
        browser.onFrame((b64) => send('frame', b64)),
        browser.onStatus((s) => send('status', JSON.stringify(s))),
        browser.onPick((p: ElementPick) => send('pick', JSON.stringify(p))),
      ]
      const heartbeat = setInterval(() => {
        if (!res.writableEnded) res.write(': ping\n\n')
      }, SSE_HEARTBEAT_MS)
      req.on('close', () => {
        clearInterval(heartbeat)
        for (const unsub of unsubs) unsub()
        void browser.setSubscriberCount(-1)
      })
      // setSubscriberCount never throws (screencast failures downgrade to
      // "no frames" and retry on the next subscribe).
      await browser.setSubscriberCount(1)
    },
  })

  // Console: resolve the DevTools URL for the controlled page. The panel
  // embeds it in an <iframe>: Chromium serves that frontend with no
  // X-Frame-Options, and dsh sets no CSP, so it renders inline. `?external=1`
  // opens the same URL in the OS browser instead — the fallback for a blocked
  // frame, and the only route the desktop renderer can reach (it denies
  // window.open).
  ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-browser/api/devtools',
    handler: async (req, res) => {
      if (!sameOrigin(req) || req.method !== 'GET') {
        json(res, 403, { ok: false, error: 'forbidden' })
        return
      }
      let target: string
      try {
        target = await browser.devtoolsUrl()
      } catch (error) {
        json(res, 503, { ok: false, error: error instanceof Error ? error.message : String(error) })
        return
      }
      if ((req.headers.accept ?? '').includes('text/html')) {
        res.writeHead(302, { location: target, 'cache-control': 'no-store' })
        res.end()
        return
      }
      if (new URL(req.url ?? '/', 'http://dsh.local').searchParams.get('external') !== '1') {
        json(res, 200, { ok: true, url: target })
        return
      }
      try {
        await openExternal(target)
        json(res, 200, { ok: true, url: target, mode: 'external' })
      } catch (error) {
        // Still report the URL: the panel shows it so it can be opened by hand.
        json(res, 200, { ok: false, url: target, error: error instanceof Error ? error.message : String(error) })
      }
    },
  })

  // Panel commands: navigation, input forwarding, pick-mode toggle.
  ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-browser/api/cmd',
    handler: async (req, res) => {
      if (req.method !== 'POST' || !sameOrigin(req)) {
        json(res, 403, { ok: false, error: 'forbidden' })
        return
      }
      let command: PanelCommand
      try {
        command = JSON.parse(await readBody(req)) as PanelCommand
      } catch {
        json(res, 400, { ok: false, error: 'invalid json' })
        return
      }
      try {
        const status = await dispatchCommand(browser, command)
        json(res, 200, { ok: true, status })
      } catch (error) {
        json(res, 200, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
}

async function dispatchCommand(browser: BrowserController, command: PanelCommand): Promise<unknown> {
  switch (command.type) {
    case 'ensure':
      await browser.ensure()
      return await browser.status()
    case 'navigate':
      return await browser.goto(command.url)
    case 'back':
      await browser.goBack()
      return await browser.status()
    case 'forward':
      await browser.goForward()
      return await browser.status()
    case 'reload':
      await browser.reload()
      return await browser.status()
    case 'resize':
      await browser.resize(command.width, command.height, command.dpr)
      return await browser.status()
    case 'input': {
      if (command.kind === 'wheel') await browser.wheel(command.x, command.y, command.dx, command.dy)
      else if (command.kind === 'key') await browser.pressKey(command.key)
      else if (command.kind === 'type') await browser.typeText(command.text)
      else await browser.mouse(command.kind, command.x, command.y)
      return await browser.status()
    }
    case 'pick':
      await browser.setPickEnabled(command.enabled)
      return { pickEnabled: command.enabled }
  }
}
