import { useCallback, useEffect, useRef, useState } from 'react'
import { MousePointerClick, SquareTerminal } from 'lucide-react'
import {
  IconChevronLeftOutlineRegular,
  IconChevronRightOutlineRegular,
  IconRefreshOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ElementPick } from './element-refs.ts'

interface BrowserStatus {
  url: string
  title: string
  viewport: { width: number; height: number }
}

export interface BrowserPanelInjected {
  /** Insert one picked element as a composer reference chip (元素N). */
  insertElement: (pick: ElementPick) => string
  /** Watch the composer; numbering resets when the draft clears (sent/cleared). */
  watchComposer: () => () => void
}

interface BrowserPanelProps {
  useTabInfo: () => {
    tab: {
      visible: boolean
      active: unknown
      /** Set by the tab host on every open: a link click carries `{ url }`. */
      navigation?: {
        readonly address?: string
        readonly params?: { readonly url?: string } | undefined
        readonly revision?: number
      } | undefined
    }
  }
  insertElement: (pick: ElementPick) => string
  watchComposer: () => () => void
}

/**
 * Ghost icon buttons in the visual language of the shell's collapse-sidebar
 * button: borderless, transparent, tinted hover. `color-mix(currentColor)`
 * adapts to light/dark themes; a tiny namespaced <style> block carries the
 * hover/active states that inline styles cannot express.
 */
const PANEL_STYLES = `
.dsh-browser-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  height: 28px; min-width: 28px; padding: 0; border: none; border-radius: 7px;
  background: transparent; color: inherit; cursor: pointer; flex: none;
  font-size: 12px; line-height: 1;
}
.dsh-browser-btn:hover { background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 10%, transparent)); }
.dsh-browser-btn:active { background: color-mix(in srgb, currentColor 16%, transparent); }
.dsh-browser-btn:focus-visible { outline: 2px solid color-mix(in srgb, currentColor 35%, transparent); outline-offset: -2px; }
.dsh-browser-btn[data-on="1"] {
  color: #3b82f6; font-weight: 600;
  background: color-mix(in srgb, #3b82f6 12%, transparent);
}
.dsh-browser-url {
  flex: 1; min-width: 60px; height: 30px; font-size: 12px; padding: 0 12px;
  border: none; border-radius: 8px; background: color-mix(in srgb, currentColor 6%, transparent);
  color: inherit; text-overflow: ellipsis;
}
.dsh-browser-url:hover { background: color-mix(in srgb, currentColor 9%, transparent); }
.dsh-browser-url:focus { outline: none; background: color-mix(in srgb, currentColor 10%, transparent); }
.dsh-browser-url::placeholder { color: color-mix(in srgb, currentColor 45%, transparent); }
`

async function postCommand(command: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch('/dsh-browser/api/cmd', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(command),
  })
  return await response.json() as Record<string, unknown>
}

export function BrowserPanel(props: BrowserPanelProps): React.ReactNode {
  const { insertElement, watchComposer } = props
  const { tab } = props.useTabInfo()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const scaleRef = useRef({ width: 1280, height: 800 })
  const lastMouseRef = useRef({ x: 640, y: 400 })
  const resizeTimer = useRef<number | undefined>(undefined)
  const noticeTimer = useRef<number | undefined>(undefined)
  const [status, setStatus] = useState<BrowserStatus | null>(null)
  const [connected, setConnected] = useState(false)
  const [picking, setPicking] = useState(false)
  const [notice, setNotice] = useState('')
  const [urlFocused, setUrlFocused] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [consoleUrl, setConsoleUrl] = useState('')
  const [consoleError, setConsoleError] = useState('')

  // Links clicked in chat or the tool cards open this tab with
  // `params: { url }` — the sidebar-right contract dsh's chat uses for the
  // `browser` kind — so every navigation revision with a url navigates here.
  const handledRevision = useRef(-1)
  useEffect(() => {
    const navigation = tab.navigation
    const revision = navigation?.revision ?? 0
    if (revision === handledRevision.current) return
    handledRevision.current = revision
    const url = (navigation?.params as { url?: string } | undefined)?.url
    if (!url) return
    setUrlDraft(url)
    void postCommand({ type: 'navigate', url })
  }, [tab.navigation])

  const flashNotice = useCallback((text: string) => {
    setNotice(text)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 4000)
  }, [])

  /**
   * DevTools is embedded in an iframe pointed at Chromium's own frontend, so the
   * console opens inside the panel. The URL is resolved per open because it
   * carries the debugging port and the current page target.
   */
  const openConsole = useCallback(async () => {
    setConsoleOpen(true)
    setConsoleError('')
    try {
      const response = await fetch('/dsh-browser/api/devtools')
      const payload = await response.json() as { ok?: boolean; url?: string; error?: string }
      if (payload.ok && payload.url) {
        setConsoleUrl(payload.url)
      } else {
        setConsoleError(payload.error ?? '无法解析 DevTools 地址')
      }
    } catch (error) {
      setConsoleError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  /** Fallback: the host opens the same URL in the OS browser (renderer denies window.open). */
  const openConsoleExternally = useCallback(async () => {
    try {
      const response = await fetch('/dsh-browser/api/devtools?external=1')
      const payload = await response.json() as { ok?: boolean; url?: string; error?: string }
      flashNotice(payload.ok
        ? '已在系统默认浏览器打开 DevTools'
        : `打开失败：${payload.error ?? '未知错误'}${payload.url ? `（${payload.url}）` : ''}`)
    } catch (error) {
      flashNotice(`打开失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }, [flashNotice])

  const drawFrame = useCallback((base64: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const image = new Image()
    image.onload = () => {
      if (canvasRef.current !== canvas) return
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      scaleRef.current = { width: image.naturalWidth, height: image.naturalHeight }
      const context = canvas.getContext('2d')
      context?.drawImage(image, 0, 0)
    }
    image.src = `data:image/jpeg;base64,${base64}`
  }, [])

  const handlePick = useCallback((pick: ElementPick) => {
    try {
      const label = insertElement(pick)
      flashNotice(`${label} 已插入输入框，像引用文件一样在句子里引用它`)
    } catch (error) {
      flashNotice(`插入失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }, [insertElement, flashNotice])

  useEffect(() => {
    if (!tab.visible) return undefined
    const source = new EventSource('/dsh-browser/api/stream')
    source.onopen = () => setConnected(true)
    source.onerror = () => setConnected(false)
    source.addEventListener('status', (event) => {
      const next = JSON.parse((event as MessageEvent).data) as BrowserStatus
      setStatus(next)
      if (!urlFocused) setUrlDraft(next.url)
    })
    source.addEventListener('frame', (event) => {
      drawFrame((event as MessageEvent).data as string)
    })
    source.addEventListener('pick', (event) => {
      handlePick(JSON.parse((event as MessageEvent).data) as ElementPick)
    })
    return () => {
      source.close()
      setConnected(false)
    }
  }, [tab.visible, drawFrame, handlePick, urlFocused])

  // Keep the controlled viewport matched to the stage box, so the page fills
  // the panel instead of floating as a small letterboxed window.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    const post = () => {
      const { width, height } = stage.getBoundingClientRect()
      if (width < 40 || height < 40) return
      void postCommand({ type: 'resize', width, height, dpr: window.devicePixelRatio || 1 })
    }
    const observer = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer.current)
      resizeTimer.current = window.setTimeout(post, 250)
    })
    observer.observe(stage)
    const first = window.setTimeout(post, 400)
    return () => {
      observer.disconnect()
      window.clearTimeout(resizeTimer.current)
      window.clearTimeout(first)
    }
  }, [tab.visible])

  // Numbering restarts at 元素1 once the composer empties (send committed
  // or manually cleared); the subscription lives with the panel mount.
  useEffect(() => watchComposer(), [watchComposer])

  // Native non-passive wheel forwarder — the page only scrolls through this.
  // WheelEvent deltas are normalized by deltaMode: many mouse wheels report
  // LINES (≈3 per notch); forwarding that raw as 3px reads as "cannot scroll".
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const scale = scaleRef.current.width / rect.width
      const unit = event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? scaleRef.current.height : 1
      const dx = event.deltaX * unit * scale
      const dy = event.deltaY * unit * scale
      const { x, y } = lastMouseRef.current
      console.debug('[dsh-browser] wheel fwd', { dy, x, y })
      void postCommand({ type: 'input', kind: 'wheel', x, y, dx, dy })
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [tab.visible])

  const toPageCoords = (event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = scaleRef.current.width / rect.width
    const scaleY = scaleRef.current.height / rect.height
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY
    const page = {
      x: Math.min(Math.max(0, x), scaleRef.current.width - 1),
      y: Math.min(Math.max(0, y), scaleRef.current.height - 1),
    }
    lastMouseRef.current = page
    return page
  }

  const togglePick = async () => {
    const next = !picking
    setPicking(next)
    if (next) flashNotice('选择模式：点击页面元素，会以「元素N」引用插入输入框')
    await postCommand({ type: 'pick', enabled: next })
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const forwardedKeys = ['Enter', 'Backspace', 'Delete', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key.length === 1) {
      event.preventDefault()
      void postCommand({ type: 'input', kind: 'type', text: event.key })
      return
    }
    if (forwardedKeys.includes(event.key)) {
      event.preventDefault()
      void postCommand({ type: 'input', kind: 'key', key: event.key })
    }
  }

  const urlValue = !urlFocused && urlDraft.startsWith('data:')
    ? (status?.title || 'data: 内嵌页面')
    : urlDraft

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, fontSize: 12 }}>
      <style>{PANEL_STYLES}</style>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center', padding: '5px 6px', flexWrap: 'nowrap' }}>
        <button
          type="button" className="dsh-browser-btn" title="后退"
          onClick={() => void postCommand({ type: 'back' })}
        >
          <IconChevronLeftOutlineRegular size={14} />
        </button>
        <button
          type="button" className="dsh-browser-btn" title="前进"
          onClick={() => void postCommand({ type: 'forward' })}
        >
          <IconChevronRightOutlineRegular size={14} />
        </button>
        <button
          type="button" className="dsh-browser-btn" title="刷新"
          onClick={() => void postCommand({ type: 'reload' })}
        >
          <IconRefreshOutlineRegular size={14} />
        </button>
        <input
          className="dsh-browser-url"
          value={urlValue}
          placeholder="输入网址后回车"
          spellCheck={false}
          onChange={(event) => setUrlDraft(event.target.value)}
          onFocus={() => {
            setUrlFocused(true)
            setUrlDraft(status?.url ?? urlDraft)
          }}
          onBlur={() => setUrlFocused(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void postCommand({ type: 'navigate', url: urlDraft })
              ;(event.target as HTMLInputElement).blur()
            }
          }}
        />
        <button
          type="button"
          className="dsh-browser-btn"
          data-on={consoleOpen ? '1' : '0'}
          title="在面板里打开控制台（DevTools）"
          aria-label="控制台"
          style={{ padding: '0 8px' }}
          onClick={() => {
            if (consoleOpen) {
              setConsoleOpen(false)
              return
            }
            void openConsole()
          }}
        >
          <SquareTerminal size={14} />
          <span>{consoleOpen ? '关闭控制台' : '控制台'}</span>
        </button>
        <button
          type="button"
          className="dsh-browser-btn"
          data-on={picking ? '1' : '0'}
          title="选择元素，以「元素N」引用插入输入框"
          style={{ padding: '0 8px' }}
          onClick={() => void togglePick()}
        >
          <MousePointerClick size={14} />
          <span>{picking ? '选择中' : '选择元素'}</span>
        </button>
      </div>
      {notice ? (
        <div style={{ margin: '0 6px 4px', padding: '4px 8px', borderRadius: 7, background: 'color-mix(in srgb, currentColor 8%, transparent)', color: 'inherit' }}>
          {notice}
        </div>
      ) : null}
      {consoleOpen ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '2px 6px', fontSize: 11, opacity: 0.8, flex: 'none' }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {consoleError ? `DevTools 打不开：${consoleError}` : 'DevTools · 指向当前页面'}
            </span>
            <button type="button" className="dsh-browser-btn" title="在系统浏览器中打开" style={{ padding: '0 6px' }} onClick={() => void openConsoleExternally()}>
              新窗口
            </button>
            <button type="button" className="dsh-browser-btn" title="关闭控制台" style={{ padding: '0 6px' }} onClick={() => setConsoleOpen(false)}>
              关闭
            </button>
          </div>
          {consoleUrl && !consoleError ? (
            <iframe
              title="DevTools"
              src={consoleUrl}
              style={{ flex: 1, width: '100%', minHeight: 0, border: 'none', display: 'block' }}
            />
          ) : null}
        </div>
      ) : (
      <div
        ref={stageRef}
        style={{ flex: 1, minHeight: 0, display: 'flex', position: 'relative', background: 'color-mix(in srgb, currentColor 5%, transparent)' }}
      >
        <canvas
          ref={canvasRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseMove={(event) => {
            const { x, y } = toPageCoords(event)
            void postCommand({ type: 'input', kind: 'move', x, y })
          }}
          onClick={(event) => {
            const { x, y } = toPageCoords(event)
            void postCommand({ type: 'input', kind: 'click', x, y })
          }}
          onDoubleClick={(event) => {
            const { x, y } = toPageCoords(event)
            void postCommand({ type: 'input', kind: 'dblclick', x, y })
          }}
          style={{
            width: '100%', height: '100%', display: 'block', objectFit: 'contain',
            outline: picking ? '2px solid #3b82f6' : 'none',
            outlineOffset: picking ? '-2px' : undefined,
            cursor: picking ? 'crosshair' : 'default',
          }}
        />
      </div>
      )}
      <div style={{ display: 'flex', gap: 8, padding: '3px 6px', opacity: 0.75, alignItems: 'center' }}>
        <span
          style={{
            width: 7, height: 7, borderRadius: 999, flexShrink: 0,
            background: connected ? '#22c55e' : 'color-mix(in srgb, currentColor 35%, transparent)',
          }}
        />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {status?.url
            ? `${status.title || status.url}`
            : connected ? '浏览器待启动：输入网址或让模型调用 browser_navigate' : '未连接（面板可见时自动连接）'}
        </span>
      </div>
    </div>
  )
}
