import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type {} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'

/** Mirrors the host pick payload (no screenshot — elements travel as chips). */
export interface ElementPick {
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

export const ELEMENT_SOURCE = 'browser-element'

interface StoredElement {
  label: string
  pick: ElementPick
}

const STORE_KEY = 'dsh-plugin-browser:elements'
const elements = new Map<string, StoredElement>()
const lexiconListeners = new Set<() => void>()
let seq = 0

function labelOf(ref: string): string {
  const n = Number(ref.slice('element-'.length))
  return Number.isFinite(n) ? `元素${n}` : ref
}

function persist(): void {
  try {
    const rows = [...elements.entries()].map(([ref, entry]) => ({ ref, ...entry }))
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ seq, rows }))
  } catch {
    // storage full/blocked — chips already inserted keep working via the
    // in-memory map; only a client reload loses them
  }
}

function restore(): void {
  try {
    const raw = sessionStorage.getItem(STORE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as { seq: number; rows: Array<{ ref: string; label: string; pick: ElementPick }> }
    seq = saved.seq ?? 0
    for (const row of saved.rows) elements.set(row.ref, { label: row.label, pick: row.pick })
  } catch {
    // corrupted store — start clean
  }
}

restore()

/** Record one picked element and return its chip identity. */
export function rememberElement(pick: ElementPick): { ref: string; label: string } {
  seq += 1
  const ref = `element-${seq}`
  elements.set(ref, { label: `元素${seq}`, pick })
  persist()
  for (const listener of lexiconListeners) {
    try {
      listener()
    } catch {
      // a broken decoration listener must not break picking
    }
  }
  return { ref, label: `元素${seq}` }
}

/** Model-facing serialization of one element reference. */
export function elementModelText(ref: string): string {
  const entry = elements.get(ref)
  if (!entry) {
    throw new Error(`unknown browser element reference "${ref}" — the panel session that picked it is gone`)
  }
  const p = entry.pick
  const lines = [
    `${entry.label}（在 dsh 浏览器面板中选中的页面元素，页面: ${p.url}${p.title ? ` — ${p.title}` : ''}）：`,
    `- 选择器: ${p.selector}`,
    `- 标签: <${p.tag}${p.id ? ` id="${p.id}"` : ''}${p.classes ? ` class="${p.classes}"` : ''}${p.role ? ` role="${p.role}"` : ''}>`,
    p.ariaLabel ? `- aria-label: ${p.ariaLabel}` : '',
    p.href ? `- href: ${p.href}` : '',
    p.type ? `- type: ${p.type}` : '',
    p.placeholder ? `- placeholder: ${p.placeholder}` : '',
    p.text ? `- 文本: ${JSON.stringify(p.text)}` : '',
    `- outerHTML: ${p.outerHTML}`,
  ]
  return lines.filter(Boolean).join('\n')
}

/** Clear the element registry and restart numbering from 元素1. */
export function resetElements(): void {
  elements.clear()
  seq = 0
  persist()
  for (const listener of lexiconListeners) {
    try {
      listener()
    } catch {
      // decoration listeners must not break the reset
    }
  }
}

/**
 * Watch one session's composer and reset numbering whenever the draft
 * empties while idle — the state a committed send (or a manual clear)
 * leaves behind. Callers own the subscription lifecycle (panel mount).
 */
export function watchComposerClear(ctx: ClientContext, sessionId: string): () => void {
  const binding = ctx.sessions.binding(sessionId as never)
  if (!binding) return () => undefined
  const input = ctx.conversation.input.for(binding.ctx)
  let prevHadContent = false
  return input.state.subscribe(() => {
    const state = input.state.getSnapshot()
    const hadContent = prevHadContent
    prevHadContent = state.draft !== ''
    if (hadContent && state.draft === '' && state.phase === 'plain') resetElements()
  })
}

/** The `@` trigger source backing 元素N chips (menu, decoration, serialization). */
export function browserElementSource(): InputTriggerSource {
  return {
    trigger: '@',
    name: ELEMENT_SOURCE,
    order: 90,
    candidates: async (_session, req) => {
      const rows = [...elements.entries()].reverse()
      return rows
        .map(([ref, entry]) => ({
          name: entry.label,
          description: `<${entry.pick.tag}> ${entry.pick.text.slice(0, 60)}${entry.pick.text.length > 60 ? '…' : ''}`,
          value: ref,
        }))
        .filter((candidate) => candidate.name.includes(req.query))
    },
    onPick: (pick) => {
      const ref = pick.candidate.value
      const entry = ref ? elements.get(ref) : undefined
      if (pick.action !== 'pick' || !ref || !entry) return undefined
      return {
        insert: {
          source: ELEMENT_SOURCE,
          ref,
          label: entry.label,
          clipboardText: entry.label,
          appearance: 'session',
        },
      }
    },
    lexicon: () => [...elements.values()].map((entry) => entry.label),
    subscribeLexicon: (_session, listener) => {
      lexiconListeners.add(listener)
      return () => lexiconListeners.delete(listener)
    },
    codec: {
      clipboardText: (ref) => labelOf(ref),
      serialize: async (ref) => elementModelText(ref),
    },
  }
}

/**
 * Insert one picked element as a native reference chip at the end of the
 * session composer's draft. TokenSpan coordinates live in the editor's
 * DETECT space — every chip counts as one character there — so the anchor is
 * the clipboard-space draft length minus the chips' extra clipboard width.
 * (The public input face exposes no caret offset; end-of-draft is the
 * closest anchor to the cursor.)
 */
export function insertElementRef(ctx: ClientContext, sessionId: string, pick: ElementPick): string {
  const binding = ctx.sessions.binding(sessionId as never)
  if (!binding) throw new Error('session binding unavailable')
  const input = ctx.conversation.input.for(binding.ctx)
  const state = input.state.getSnapshot()
  // Lazy reset for sends/clears that happened while the panel was hidden:
  // an idle empty draft means the previous round is over — numbering restarts.
  if (seq > 0 && state.draft === '' && state.phase === 'plain') resetElements()
  const { ref, label } = rememberElement(pick)
  // `InputState` is published untyped in 0.2.x (SnapshotStore resolves to any),
  // so the chip occurrence shape is spelled out here instead of inferred.
  const chipExtra = state.occurrences.reduce(
    (sum: number, occ: { readonly length: number }) => sum + (occ.length - 1),
    0,
  )
  const at = Math.max(0, state.draft.length - chipExtra)
  const applied = input.insertReference(
    {
      source: ELEMENT_SOURCE,
      ref,
      label,
      clipboardText: label,
      appearance: 'session',
    },
    { start: at, end: at, draftRev: state.draftRev },
  )
  if (!applied) throw new Error('composer refused the reference insert')
  return label
}
