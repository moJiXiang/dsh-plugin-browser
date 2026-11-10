import { spawn } from 'node:child_process'

/**
 * Open a URL in the OS default browser.
 *
 * The DSH desktop renderer denies `window.open`, so the panel cannot pop a
 * DevTools window itself; the host process opens it instead — no shell is
 * involved, so URLs carrying `&` or `?` reach the opener verbatim.
 */
export function openExternal(url: string): Promise<void> {
  const [command, args] = process.platform === 'win32'
    ? (['rundll32.exe', ['url.dll,FileProtocolHandler', url]] as const)
    : process.platform === 'darwin'
      ? (['open', [url]] as const)
      : (['xdg-open', [url]] as const)
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { detached: true, stdio: 'ignore', windowsHide: true })
    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
  })
}
