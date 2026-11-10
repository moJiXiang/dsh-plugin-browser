import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { IconGlobeOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { BrowserPanel } from './panel.tsx'
import { ScreenshotToolView } from './tool-card.tsx'
import { browserElementSource, insertElementRef, watchComposerClear } from './element-refs.ts'

const TAB_ID = 'dsh-plugin-browser'
const TAB_KIND = 'browser'

export const inject = ['slots', 'sidebarRightTabs', 'sidebarRight', 'conversation', 'sessions', 'inputTriggers']

interface FooterActionProps extends PropsRuntime<'sidebar.footer.action'> {
  open: () => void
}

// Verbatim metrics of the settings trigger row (ui-settings-general
// SettingsRoot: triggerRow wrapper + trigger button + rail variants), renamed
// to dsh-browser-* classes so the two sidebar-foot rows align exactly without
// touching another plugin's runtime.
const FOOTER_STYLES = `
.dsh-browser-footrow {
  flex: none; align-items: center; gap: 8px;
  width: calc(100% + 4px); margin: 4px -2px; display: flex;
}
.dsh-browser-footrow.dsh-browser-railrow { width: 36px; margin: 8px 0 10px; }
.dsh-browser-footbtn {
  box-sizing: border-box; cursor: pointer; width: auto; min-width: 0;
  height: 42px; color: var(--dsw-alias-label-primary, inherit);
  background: 0 0; border: none; border-radius: 12px;
  flex: 1; align-items: center; gap: 8px; margin: 0;
  padding: 0 10px 0 8px; font-family: inherit; font-size: 14px; line-height: 22px;
  display: flex; overflow: hidden; text-align: left;
}
.dsh-browser-footbtn:hover {
  background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 8%, transparent));
}
.dsh-browser-footbtn:focus-visible {
  outline: 2px solid var(--dsw-alias-border-focus, color-mix(in srgb, currentColor 35%, transparent));
  outline-offset: -2px;
}
.dsh-browser-footbtn.dsh-browser-rail {
  border-radius: 50%; flex: none; justify-content: center; gap: 0;
  width: 36px; height: 36px; margin: 0; padding: 0;
}
.dsh-browser-footlabel { white-space: nowrap; overflow: hidden; }
`

function FooterButton(props: FooterActionProps): React.ReactNode {
  return (
    <div className={props.wide ? 'dsh-browser-footrow' : 'dsh-browser-footrow dsh-browser-railrow'}>
      <style>{FOOTER_STYLES}</style>
      <button
        type="button"
        className={props.wide ? 'dsh-browser-footbtn' : 'dsh-browser-footbtn dsh-browser-rail'}
        onClick={() => props.open()}
        title="浏览器：打开内置浏览器面板"
        aria-label="浏览器"
      >
        <IconGlobeOutlineRegular size={props.wide ? 16 : 18} />
        {props.wide ? <span className="dsh-browser-footlabel">浏览器</span> : null}
      </button>
    </div>
  )
}

export function apply(ctx: ClientContext): void {
  // The 元素N reference source: codecs picked chips into model text at submit.
  ctx.effect(() => ctx.inputTriggers.registerSource(browserElementSource()), 'dsh-plugin-browser: element trigger source')

  // Stage 1: the tab type (page type opened by kind; no resource patterns).
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: TAB_ID,
    kind: TAB_KIND,
    priority: 'extension',
    title: () => '浏览器',
    guide: [{
      id: 'browser',
      order: 10,
      title: () => '浏览器',
      description: () => '打开内置浏览器，选择页面元素附加到输入框',
    }],
  }), 'dsh-plugin-browser: tab type')

  // Stage 2: the tab body under the definition's id, session-scoped.
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () =>
    ctx.slots.register({
      name: 'sidebar.right.pane.tab',
      key: TAB_ID,
      inject: (sessionId: string) => ({
        insertElement: (pick: Parameters<typeof insertElementRef>[2]) =>
          insertElementRef(ctx, sessionId, pick),
        watchComposer: () => watchComposerClear(ctx, sessionId),
      }),
    }, BrowserPanel),
  ), 'dsh-plugin-browser: tab body')

  // Entry point beside Settings at the sidebar foot.
  ctx.effect(() => ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register({
      name: 'sidebar.footer.action',
      id: 'dsh-plugin-browser-open',
      order: 10,
      inject: () => ({
        open: () => ctx.sidebarRight.openTab(TAB_KIND),
      }),
    }, FooterButton),
  ), 'dsh-plugin-browser: footer action')

  // Chat card: render browser_screenshot results as the durable image.
  ctx.effect(() => ctx.slots.inject('tool.call.toolview', () =>
    ctx.slots.register({
      name: 'tool.call.toolview',
      key: 'browser_screenshot',
    }, ScreenshotToolView),
  ), 'dsh-plugin-browser: screenshot tool card')
}
