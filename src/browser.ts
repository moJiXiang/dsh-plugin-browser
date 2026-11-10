import type { Browser, BrowserContext, CDPSession, Page } from 'playwright'
import { fileURLToPath } from 'node:url'
import { existsSync, mkdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import path from 'node:path'
import { PICKER_SCRIPT } from './picker-script.ts'
import type { Config } from './config.ts'

/**
 * Playwright is loaded on first use, never at module import: the plugin manager
 * enables a bundle right after `pnpm add`, and importing playwright while pnpm
 * is still relinking it throws — an error Node then caches for that module URL
 * for the life of the host process, so the plugin can never activate again
 * without a restart.
 */
const requireFromHere = createRequire(import.meta.url)
let playwrightModule: typeof import('playwright') | undefined
function playwright(): typeof import('playwright') {
  playwrightModule ??= requireFromHere('playwright') as typeof import('playwright')
  return playwrightModule
}

/**
 * Chromium needs libnspr4/libnss3, which may be absent on minimal WSL setups
 * where the user cannot sudo. When this plugin ships a .chromium-deps tree
 * (debs unpacked via `dpkg -x`), inject it through LD_LIBRARY_PATH so the
 * browser process finds them without touching system state.
 */
const LOCAL_DEPS_DIR = fileURLToPath(new URL('../.chromium-deps/usr/lib/x86_64-linux-gnu/', import.meta.url))

function launchEnv(): Record<string, string> {
  if (!existsSync(LOCAL_DEPS_DIR)) return { ...process.env } as Record<string, string>
  const existing = process.env.LD_LIBRARY_PATH
  return {
    ...process.env,
    LD_LIBRARY_PATH: existing ? `${LOCAL_DEPS_DIR}:${existing}` : LOCAL_DEPS_DIR,
  } as Record<string, string>
}

export interface BrowserStatus {
  url: string
  title: string
  viewport: { width: number; height: number }
}

export interface ElementPick extends Record<string, unknown> {
  tag: string
  id: string
  classes: string
  role: string
  ariaLabel: string
  name: string
  placeholder: string
  href: string
  type: string
  text: string
  selector: string
  outerHTML: string
  rect: { x: number; y: number; width: number; height: number; docX: number; docY: number }
  scrollX: number
  scrollY: number
  viewport: { width: number; height: number }
  url: string
  title: string
}

type Listener<T> = (value: T) => void

const MAX_OUTLINE_ENTRIES = 200
const IDX_ATTR = 'data-dsh-browser-idx'

/** Owns the Playwright browser, screencast fan-out, input dispatch, and the pick pipeline. */
export class BrowserController {
  private readonly config: Config
  private browser?: Browser
  private context?: BrowserContext
  private page?: Page
  private cdp?: CDPSession
  /** Directory whose DevToolsActivePort file names the debugging port. */
  private userDataDir?: string
  private pickEnabled = false
  private screencastActive = false
  private subscriberCount = 0
  private starting?: Promise<void>
  private cdpFrameHandler?: (frame: { data?: string; sessionId?: string }) => void
  private readonly frameListeners = new Set<Listener<string>>()
  private readonly pickListeners = new Set<Listener<ElementPick>>()
  private readonly statusListeners = new Set<Listener<BrowserStatus>>()
  private readonly logger = console
  private lastWheelStatusPush = 0
  private wheelPushTimer?: ReturnType<typeof setTimeout>
  /** Device pixel ratio reported by the panel (window.devicePixelRatio). */
  private dpr = 1
  /** The emulation parameters last applied to the CDP session. */
  private appliedViewport = { width: 1280, height: 800, dpr: 1 }

  constructor(config: Config) {
    this.config = config
    this.appliedViewport = {
      width: config.viewport?.width ?? 1280,
      height: config.viewport?.height ?? 800,
      dpr: 1,
    }
  }

  async dispose(): Promise<void> {
    try {
      await this.browser?.close()
      await this.context?.close()
    } catch (error) {
      this.logger.warn('[dsh-plugin-browser] browser close failed', error)
    }
    this.browser = undefined
    this.context = undefined
    this.page = undefined
    this.cdp = undefined
    this.screencastActive = false
  }

  /** Liveness across launch modes: regular launch keeps `browser`, persistent context only keeps `context`. */
  private alive(): boolean {
    if (!this.page || this.page.isClosed()) return false
    if (this.browser) return this.browser.isConnected()
    return this.context?.browser()?.isConnected() ?? false
  }

  onFrame(listener: Listener<string>): () => void {
    this.frameListeners.add(listener)
    return () => this.frameListeners.delete(listener)
  }

  onPick(listener: Listener<ElementPick>): () => void {
    this.pickListeners.add(listener)
    return () => this.pickListeners.delete(listener)
  }

  onStatus(listener: Listener<BrowserStatus>): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  /** Idempotently launch (or attach) and prepare the page. Safe to call per request. */
  async ensure(): Promise<Page> {
    if (this.alive()) return this.page as Page
    if (this.starting) return this.starting.then(() => this.requirePage())
    this.starting = this.start().finally(() => {
      this.starting = undefined
    })
    await this.starting
    return this.requirePage()
  }

  private requirePage(): Page {
    if (!this.page) throw new Error('browser page unavailable')
    return this.page
  }

  private async start(): Promise<void> {
    const viewport = { width: this.appliedViewport.width, height: this.appliedViewport.height }
    if (this.config.cdpEndpoint) {
      this.browser = await playwright().chromium.connectOverCDP(this.config.cdpEndpoint)
      this.context = this.browser.contexts()[0] ?? await this.browser.newContext({ viewport })
      this.page = await this.context.newPage()
    } else {
      // Persistent profile: HTTP cache/cookies/localStorage survive restarts,
      // which is what makes repeat page loads fast.
      const userDataDir = this.config.userDataDir
        ?? path.join(homedir(), '.cache', 'dsh-plugin-browser', 'profile')
      mkdirSync(userDataDir, { recursive: true })
      this.userDataDir = userDataDir
      // A loopback DevTools endpoint: the browser serves its own inspector UI,
      // which is what the panel's 控制台 button redirects to. Port 0 lets the OS
      // pick one; the chosen port is published in <userDataDir>/DevToolsActivePort.
      const debugArgs = ['--remote-debugging-port=0']
      const base = {
        headless: this.config.headless ?? true,
        executablePath: this.config.executablePath,
        env: launchEnv(),
        viewport,
        deviceScaleFactor: 1,
        args: [...(this.gpuArgs() ?? []), ...debugArgs],
      }
      try {
        this.context = await playwright().chromium.launchPersistentContext(userDataDir, base)
      } catch (error) {
        // GPU flags can break launches on exotic setups — retry without them.
        this.logger.warn('[dsh-plugin-browser] launch with GPU flags failed; retrying without', error)
        this.context = await playwright().chromium.launchPersistentContext(userDataDir, { ...base, args: debugArgs })
      }
      // launchPersistentContext opens with one page; the context owns the
      // browser lifecycle, so `browser` stays unset here.
      this.page = this.context.pages()[0] ?? await this.context.newPage()
    }
    await this.page.setViewportSize(viewport)
    // One binding per context; it survives navigations.
    await this.page.exposeBinding('__dshBrowserPickReport', (_source, payload: unknown) => {
      void this.handlePick(payload as Record<string, unknown>)
    })
    this.page.on('framenavigated', (frame) => {
      if (frame !== this.page?.mainFrame()) return
      if (this.pickEnabled) void this.applyPicker(true)
      void this.pushStatus()
    })
    this.page.on('close', () => {
      this.page = undefined
      this.cdp = undefined
      this.screencastActive = false
    })
    this.logger.info('[dsh-plugin-browser] chromium ready')
  }

  /**
   * GPU flags: headless Chromium on WSL2 often ignores them (SwiftShader
   * fallback), but when the paravirtualized GPU is present they enable real
   * compositing. 'auto' = only with /dev/dxg present.
   */
  private gpuArgs(): string[] | undefined {
    const mode = this.config.hardwareAcceleration ?? 'auto'
    if (mode === 'off') return undefined
    if (mode === 'auto' && !existsSync('/dev/dxg')) return undefined
    return ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']
  }

  private async handlePick(payload: Record<string, unknown>): Promise<void> {
    const page = this.page
    if (!page) return
    try {
      const pick = {
        ...(payload as unknown as ElementPick),
        url: page.url(),
        title: await page.title().catch(() => ''),
      }
      for (const listener of this.pickListeners) {
        try {
          listener(pick)
        } catch (error) {
          this.logger.warn('[dsh-plugin-browser] pick listener failed', error)
        }
      }
    } catch (error) {
      this.logger.warn('[dsh-plugin-browser] pick handling failed', error)
    }
  }

  async status(): Promise<BrowserStatus> {
    if (!this.alive()) {
      return {
        url: '',
        title: '',
        viewport: { width: this.appliedViewport.width, height: this.appliedViewport.height },
      }
    }
    return {
      url: this.page?.url() ?? '',
      title: await this.page?.title().catch(() => '') ?? '',
      viewport: { width: this.appliedViewport.width, height: this.appliedViewport.height },
    }
  }

  async pushStatus(): Promise<void> {
    try {
      const current = await this.status()
      for (const listener of this.statusListeners) {
        try {
          listener(current)
        } catch (error) {
          this.logger.warn('[dsh-plugin-browser] status listener failed', error)
        }
      }
    } catch (error) {
      this.logger.warn('[dsh-plugin-browser] status push failed', error)
    }
  }

  /** Screencast runs only while at least one SSE subscriber watches the panel. */
  async setSubscriberCount(delta: number): Promise<void> {
    this.subscriberCount = Math.max(0, this.subscriberCount + delta)
    if (this.subscriberCount === 0) {
      await this.stopScreencast()
      return
    }
    try {
      await this.ensure()
      if (this.screencastActive) return
      await this.startScreencast()
    } catch (error) {
      // Never escape: a dead page/session must downgrade to "no frames"
      // (retry on the next subscriber), not take the host down.
      this.logger.warn('[dsh-plugin-browser] screencast unavailable; will retry on next subscribe', error)
      this.cdp = undefined
      this.screencastActive = false
    }
  }

  private async startScreencast(): Promise<void> {
    const page = this.requirePage()
    // A CDP target can transiently detach (resize/navigation racing the
    // attach in headless shells) — retry on a FRESH session before giving
    // up; the caller downgrades to "no frames" after the last attempt.
    let lastError: unknown
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.attachScreencastSession(page)
        this.screencastActive = true
        return
      } catch (error) {
        lastError = error
        this.cdp = undefined
        this.cdpFrameHandler = undefined
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250))
      }
    }
    throw lastError
  }

  private async attachScreencastSession(page: Page): Promise<void> {
    // Reuse the ONE shared CDP session (it also owns device-metrics
    // emulation — detaching it would drop the override). The retry loop
    // clears `cdp` on failure; ensureCdp then re-creates the session and
    // re-applies the stored emulation before use.
    const session = await this.ensureCdp()
    const onFrame = (frame: { data?: string; sessionId?: string }) => {
      if (frame.data) {
        for (const listener of this.frameListeners) {
          try {
            listener(frame.data)
          } catch (error) {
            this.logger.warn('[dsh-plugin-browser] frame listener failed', error)
          }
        }
      }
      if (frame.sessionId) {
        const frameSessionId = frame.sessionId
        void session.send('Page.screencastFrameAck', {
          sessionId: frameSessionId as unknown as number,
        }).catch(() => undefined)
      }
    }
    session.on('Page.screencastFrame', onFrame as never)
    this.cdpFrameHandler = onFrame
    await session.send('Page.startScreencast', {
      format: 'jpeg',
      quality: this.config.jpegQuality ?? 80,
      maxWidth: 2560,
      maxHeight: 2560,
      everyNthFrame: 1,
    })
  }

  private async stopScreencast(): Promise<void> {
    if (!this.screencastActive) return
    try {
      if (this.cdp) {
        if (this.cdpFrameHandler) {
          this.cdp.removeListener('Page.screencastFrame', this.cdpFrameHandler as never)
          this.cdpFrameHandler = undefined
        }
        await this.cdp.send('Page.stopScreencast').catch(() => undefined)
      }
    } finally {
      this.screencastActive = false
    }
  }

  async setPickEnabled(enabled: boolean): Promise<void> {
    this.pickEnabled = enabled
    await this.applyPicker(enabled)
  }

  private async applyPicker(enabled: boolean): Promise<void> {
    if (!this.alive()) return
    const page = this.requirePage()
    try {
      if (enabled) {
        await page.evaluate(PICKER_SCRIPT)
      } else {
        await page.evaluate(`window.__dshBrowserPicker && window.__dshBrowserPicker.setEnabled(false)`)
      }
    } catch (error) {
      this.logger.warn('[dsh-plugin-browser] picker injection failed', error)
    }
  }

  async goto(url: string): Promise<BrowserStatus> {
    const page = await this.ensure()
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) {
      url = `https://${url}`
    }
    await page.goto(url, { waitUntil: 'load', timeout: this.config.navigationTimeoutMs ?? 30_000 })
    if (this.pickEnabled) await this.applyPicker(true)
    const current = await this.status()
    await this.pushStatus()
    return current
  }

  async goBack(): Promise<void> {
    const page = await this.ensure()
    await page.goBack({ timeout: this.config.navigationTimeoutMs ?? 30_000 }).catch(() => undefined)
    if (this.pickEnabled) await this.applyPicker(true)
    await this.pushStatus()
  }

  async goForward(): Promise<void> {
    const page = await this.ensure()
    await page.goForward({ timeout: this.config.navigationTimeoutMs ?? 30_000 }).catch(() => undefined)
    if (this.pickEnabled) await this.applyPicker(true)
    await this.pushStatus()
  }

  async reload(): Promise<void> {
    const page = await this.ensure()
    await page.reload({ timeout: this.config.navigationTimeoutMs ?? 30_000 })
    if (this.pickEnabled) await this.applyPicker(true)
    await this.pushStatus()
  }

  /** Match the controlled page to the panel's CSS box and pixel density via
   * CDP device-metrics emulation — applied live, no relaunch. Input events
   * and screencast frames both live in CSS pixels (the panel self-calibrates
   * from frame size), so no dpr scaling applies to coordinates. */
  async resize(width: number, height: number, dpr?: number): Promise<void> {
    if (dpr !== undefined) this.dpr = Math.min(3, Math.max(1, Number.isFinite(dpr) ? dpr : 1))
    const page = await this.ensure()
    const w = Math.round(Math.min(2000, Math.max(240, width)))
    const h = Math.round(Math.min(3000, Math.max(200, height)))
    const applied = this.appliedViewport
    if (Math.abs(applied.width - w) < 2 && Math.abs(applied.height - h) < 2 && Math.abs(applied.dpr - this.dpr) < 0.01) return
    const cdp = await this.ensureCdp()
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor: this.dpr,
      mobile: false,
    })
    this.appliedViewport = { width: w, height: h, dpr: this.dpr }
    await this.pushStatus()
  }

  /**
   * The one CDP session per page: hosts BOTH device-metrics emulation and
   * screencast. Re-created on page close; a fresh session re-applies the
   * stored emulation before use.
   */
  private async ensureCdp(): Promise<CDPSession> {
    if (this.cdp) return this.cdp
    const page = this.requirePage()
    const session = await page.context().newCDPSession(page)
    this.cdp = session
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: this.appliedViewport.width,
      height: this.appliedViewport.height,
      deviceScaleFactor: this.dpr,
      mobile: false,
    }).catch(() => undefined)
    return session
  }

  /** Trailing-edge throttled status push — bursts (trackpad wheels, moves)
   * collapse into one push, and the FINAL state always lands. */
  private scheduleStatusPush(): void {
    if (this.wheelPushTimer) return
    const elapsed = Date.now() - this.lastWheelStatusPush
    if (elapsed > 600) {
      this.lastWheelStatusPush = Date.now()
      void this.pushStatus()
      return
    }
    this.wheelPushTimer = setTimeout(() => {
      this.wheelPushTimer = undefined
      this.lastWheelStatusPush = Date.now()
      void this.pushStatus()
    }, 700 - elapsed)
  }

  async mouse(kind: 'move' | 'click' | 'dblclick', x: number, y: number): Promise<void> {
    const page = await this.ensure()
    if (kind === 'move') {
      await page.mouse.move(x, y)
      return
    }
    if (kind === 'dblclick') await page.mouse.dblclick(x, y)
    else await page.mouse.click(x, y, { delay: 30 })
    this.scheduleStatusPush()
  }

  /** Wheel at an explicit page position: the virtual cursor may be stale or
   * sitting outside an inner scrollable, so move first, then scroll. Status
   * pushes are trailing-edge throttled — never lose the final state. */
  async wheel(x: number, y: number, dx: number, dy: number): Promise<void> {
    const page = await this.ensure()
    await page.mouse.move(x, y)
    await page.mouse.wheel(dx, dy)
    this.scheduleStatusPush()
  }

  async pressKey(key: string): Promise<void> {
    const page = await this.ensure()
    await page.keyboard.press(key)
  }

  async typeText(text: string): Promise<void> {
    const page = await this.ensure()
    await page.keyboard.type(text)
  }

  /**
   * Annotate visible interactive elements with sequential indices and return a
   * text outline. The model clicks/types by index via the attribute selector.
   */
  async snapshotOutline(): Promise<{ url: string; title: string; count: number; outline: string }> {
    const page = await this.ensure()
    const outline = await page.evaluate(({ attr, max }) => {
      document.querySelectorAll(`[${attr}]`).forEach((el) => el.removeAttribute(attr))
      const selector = 'a, button, input, textarea, select, [role], [onclick], [contenteditable], label, summary, h1, h2, h3, h4, h5, h6'
      const lines: string[] = []
      let index = 0
      for (const el of Array.from(document.querySelectorAll(selector))) {
        if (index >= max) break
        const style = window.getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        const rect = el.getBoundingClientRect()
        if (rect.width < 2 || rect.height < 2) continue
        index += 1
        el.setAttribute(attr, String(index))
        const tag = el.tagName.toLowerCase()
        const role = el.getAttribute('role') || ''
        const text = ((el as HTMLElement).innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('value') || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120)
        const label = [
          `<${tag}${role ? ` role=${role}` : ''}>`,
          text ? JSON.stringify(text) : '',
        ].filter(Boolean).join(' ')
        lines.push(`[${index}] ${label}`)
      }
      return { lines, count: index }
    }, { attr: IDX_ATTR, max: MAX_OUTLINE_ENTRIES })
    return {
      url: page.url(),
      title: await page.title().catch(() => ''),
      count: outline.count,
      outline: outline.lines.join('\n'),
    }
  }

  async clickByIndex(idx: number): Promise<BrowserStatus> {
    const page = await this.ensure()
    await page.locator(`[${IDX_ATTR}="${idx}"]`).first().click({ timeout: 5000 })
    await page.waitForLoadState('load', { timeout: 5000 }).catch(() => undefined)
    if (this.pickEnabled) await this.applyPicker(true)
    const current = await this.status()
    await this.pushStatus()
    return current
  }

  async typeByIndex(idx: number, text: string, submit?: boolean): Promise<BrowserStatus> {
    const page = await this.ensure()
    const locator = page.locator(`[${IDX_ATTR}="${idx}"]`).first()
    await locator.fill(text, { timeout: 5000 })
    if (submit) await locator.press('Enter', { timeout: 5000 })
    const current = await this.status()
    await this.pushStatus()
    return current
  }

  async screenshot(): Promise<{ base64: string; width: number; height: number }> {
    const page = await this.ensure()
    const buffer = await page.screenshot({
      type: 'jpeg',
      quality: this.config.jpegQuality ?? 80,
      fullPage: false,
    })
    return { base64: buffer.toString('base64'), width: this.appliedViewport.width, height: this.appliedViewport.height }
  }

  /**
   * URL of Chromium's own DevTools frontend, pointed at the controlled page.
   * The browser serves that UI on the loopback debugging port it publishes in
   * DevToolsActivePort, so the panel only needs to redirect there — no extra
   * app, and the frontend talks to the page over the same origin.
   */
  async devtoolsUrl(): Promise<string> {
    const page = await this.ensure()
    const { host, port } = await this.devtoolsEndpoint()
    const base = `http://${host}:${port}`
    const response = await fetch(`${base}/json/list`, { signal: AbortSignal.timeout(5_000) })
    if (!response.ok) throw new Error(`调试端点返回 HTTP ${response.status}`)
    const targets = await response.json() as Array<{ type?: string; url?: string; webSocketDebuggerUrl?: string }>
    const current = page.url()
    const target = targets.find((item) => item.type === 'page' && item.url === current)
      ?? targets.find((item) => item.type === 'page')
      ?? targets[0]
    if (!target?.webSocketDebuggerUrl) throw new Error('没有可调试的页面目标')
    const targetPath = new URL(target.webSocketDebuggerUrl).pathname
    return `${base}/devtools/inspector.html?ws=${host}:${port}${targetPath}`
  }

  /** Loopback host:port of the debugging endpoint: the attach URL, or the launch port file. */
  private async devtoolsEndpoint(): Promise<{ host: string; port: number }> {
    if (this.config.cdpEndpoint) {
      const url = new URL(this.config.cdpEndpoint)
      const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80))
      return { host: url.hostname || '127.0.0.1', port }
    }
    const file = this.userDataDir ? path.join(this.userDataDir, 'DevToolsActivePort') : undefined
    if (!file) throw new Error('浏览器尚未启动')
    let lastError: unknown
    // The port file appears as the browser binds its endpoint; the first read
    // can race a just-started launch.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        const port = (await readFile(file, 'utf8')).split('\n')[0]?.trim()
        if (port && /^\d+$/.test(port)) return { host: '127.0.0.1', port: Number(port) }
      } catch (error) {
        lastError = error
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw new Error(`读不到 Chromium 调试端口：${lastError instanceof Error ? lastError.message : String(lastError)}`)
  }
}
