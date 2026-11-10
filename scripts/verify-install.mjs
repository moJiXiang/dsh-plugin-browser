#!/usr/bin/env node
/**
 * Reproduce a real plugin install and prove it cannot shadow the host.
 *
 * A DSH profile installs bundles with pnpm using `nodeLinker: hoisted` and
 * `autoInstallPeers: false`. Anything this package declares as a regular
 * dependency therefore lands in the profile root — where typert-loader resolves
 * each plugin's TYPERT manifest with `createRequire(profileDir)`. A second
 * `@deepseek-ai/dsh-llm` there is what aborted startup ("parameter codec has no
 * create() factory"), so this check fails as soon as any `@deepseek-ai/dsh*` or
 * `@deepseek-ai/cordis*` package appears in the scratch install.
 *
 * Usage: node scripts/verify-install.mjs [--keep]
 */
import { execSync } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const keep = process.argv.includes('--keep')
const root = fileURLToPath(new URL('..', import.meta.url))
const workspace = await mkdtemp(join(tmpdir(), 'dsh-plugin-install-'))

/** Quote one argument for cmd.exe / POSIX sh without going through shell+args. */
const quote = (value) => `"${String(value).replaceAll('"', '""')}"`
const run = (line, cwd) =>
  execSync(line, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

try {
  const packed = run(`npm pack --pack-destination ${quote(workspace)}`, root)
    .trim()
    .split(/\r?\n/)
    .at(-1)
  if (!packed?.endsWith('.tgz')) throw new Error(`unexpected npm pack output: ${packed}`)

  await writeFile(
    join(workspace, 'package.json'),
    `${JSON.stringify(
      { name: 'dsh-plugin-install-check', private: true, dependencies: { 'dsh-plugin-browser': `file:./${packed}` } },
      null,
      2,
    )}\n`,
  )
  await writeFile(
    join(workspace, 'pnpm-workspace.yaml'),
    'packages:\n  - .\nnodeLinker: hoisted\nautoInstallPeers: false\n',
  )

  run('pnpm install --ignore-scripts --reporter=silent', workspace)

  const own = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).name
  const scoped = await readdir(join(workspace, 'node_modules', '@deepseek-ai')).catch(() => [])
  const flat = await readdir(join(workspace, 'node_modules'))
  const offenders = [
    ...scoped.filter((name) => name.startsWith('dsh') || name.startsWith('cordis')).map((name) => `@deepseek-ai/${name}`),
    ...flat.filter((name) => name.startsWith('dsh-') && name !== own),
  ]

  if (!scoped.includes('schemastery')) {
    throw new Error(`install layout is not representative: @deepseek-ai/schemastery missing (got ${scoped.join(', ') || 'nothing'})`)
  }
  if (offenders.length > 0) {
    console.error(`host packages were hoisted into the profile: ${offenders.join(', ')}`)
    console.error('declare them in peerDependencies instead — see npm run check:compat')
    process.exit(1)
  }

  console.log(`install check: ${packed} -> @deepseek-ai/{${scoped.join(', ')}}, no dsh/cordis copy hoisted`)
} finally {
  if (keep) console.log(`kept ${workspace}`)
  else await rm(workspace, { recursive: true, force: true })
}
