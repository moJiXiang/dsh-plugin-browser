#!/usr/bin/env node
/**
 * Assert this package is installable on the *latest* published DeepSeek Harness.
 *
 * Mirrors the runtime rules in @deepseek-ai/dsh-app-boot:
 *  - a plugin's host packages (`@deepseek-ai/dsh*`, `@deepseek-ai/cordis`) must be
 *    peerDependencies, never dependencies — a dependency copy is hoisted into the
 *    profile and resolved by typert-loader ahead of the host's own copy, which is
 *    what aborts DSH startup with "parameter codec has no create() factory";
 *  - every `@deepseek-ai/dsh*` peer range must satisfy the running dsh version
 *    (prereleases included), otherwise the plugin manager refuses to install;
 *  - `dsh.compatibility.dshReleases` must mark the latest release "compatible"
 *    so the plugin market can show it.
 *
 * Usage: node scripts/check-compat.mjs [--dsh-version 0.2.2-rc.1] [--offline]
 */
import { readFile } from 'node:fs/promises'
import semver from 'semver'

const HOST_SCOPE = '@deepseek-ai/'
const HOST_LIBRARIES = new Set(['@deepseek-ai/schemastery', '@deepseek-ai/cosmokit'])

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const args = process.argv.slice(2)
const offline = args.includes('--offline')
const versionFlag = args.indexOf('--dsh-version')
const requested = versionFlag >= 0 ? args[versionFlag + 1] : undefined

/** Latest published runtime version: the release track of the `@deepseek-ai/dsh` CLI. */
async function latestRuntime() {
  if (requested !== undefined) return requested
  if (offline) {
    const declared = Object.keys(pkg.dsh?.compatibility?.dshReleases ?? {})
      .filter((v) => semver.valid(v) !== null)
      .sort(semver.rcompare)
    if (declared.length > 0) return declared[0]
    throw new Error('--offline needs at least one dsh.compatibility.dshReleases entry to read a version from')
  }
  // `latest` of the CLI package tracks the shipped release; other packages of
  // the same line keep a stale tag on an older one, so the launcher is the
  // reference. Read it straight from the registry — no npm child process.
  const response = await fetch('https://registry.npmjs.org/@deepseek-ai%2Fdsh', {
    headers: { accept: 'application/vnd.npm.install-v1+json' },
    signal: AbortSignal.timeout(15_000),
  }).catch((cause) => {
    throw new Error(`cannot read the latest dsh version from npm (${cause.message}); pass --dsh-version <x.y.z> or --offline`)
  })
  if (!response.ok) {
    throw new Error(`cannot read the latest dsh version from npm (HTTP ${response.status}); pass --dsh-version <x.y.z> or --offline`)
  }
  const tags = (await response.json())['dist-tags'] ?? {}
  for (const tag of ['latest', 'next']) {
    const version = tags[tag]
    if (typeof version === 'string' && semver.valid(version) !== null) return version
  }
  throw new Error('the npm metadata for @deepseek-ai/dsh carries no usable dist-tag')
}

const runtime = await latestRuntime()
const problems = []
const notes = []

// 1. Host packages must not be regular dependencies.
for (const section of ['dependencies', 'optionalDependencies']) {
  for (const [name, range] of Object.entries(pkg[section] ?? {})) {
    if (name.startsWith(HOST_SCOPE) && !HOST_LIBRARIES.has(name)) {
      problems.push(
        `${section}.${name}@${range} is a host package — declare it in peerDependencies instead ` +
          `(a dependency copy gets hoisted into the profile and breaks DSH startup)`,
      )
    }
  }
}

// 2. Every @deepseek-ai/dsh* peer must accept the latest runtime.
const peers = Object.entries(pkg.peerDependencies ?? {})
const dshPeers = peers.filter(([name]) => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-'))
if (dshPeers.length === 0) problems.push('peerDependencies declares no @deepseek-ai/dsh* requirement, so the plugin manager cannot check compatibility')
for (const [name, range] of dshPeers) {
  if (!semver.satisfies(runtime, range, { includePrerelease: true })) {
    problems.push(`peerDependencies.${name}@${range} does not accept dsh ${runtime}`)
  }
}

// 3. Every host module the built host bundle imports must be a declared peer,
//    so a real install never needs a package-manager copy of it.
const bundle = await readFile(new URL('../lib/index.js', import.meta.url), 'utf8')
const imported = new Set(
  [...bundle.matchAll(/(?:from\s*|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith(HOST_SCOPE)),
)
for (const specifier of imported) {
  if (HOST_LIBRARIES.has(specifier)) continue
  if (!Object.hasOwn(pkg.peerDependencies ?? {}, specifier)) {
    problems.push(`lib/index.js imports ${specifier} at runtime but it is not a peerDependency`)
  }
  if (Object.hasOwn(pkg.dependencies ?? {}, specifier)) {
    problems.push(`lib/index.js imports ${specifier}, which is declared as a dependency — it must be a peer`)
  }
}
notes.push(`host imports in lib/index.js: ${[...imported].join(', ') || '(none)'}`)

// 4. The latest runtime must be declared compatible for the market listing.
const declared = pkg.dsh?.compatibility?.dshReleases?.[runtime]
if (declared === undefined) {
  problems.push(`dsh.compatibility.dshReleases has no entry for ${runtime} — verify the client bundle on that release, then add "${runtime}": "compatible"`)
} else if (declared !== 'compatible') {
  problems.push(`dsh.compatibility.dshReleases["${runtime}"] is "${declared}", expected "compatible"`)
}

// 5. Node floor, so the install fails loudly instead of at import time.
if (typeof pkg.engines?.node !== 'string' || semver.validRange(pkg.engines.node) === null) {
  problems.push('engines.node must be a valid semver range (dsh requires Node >= 22)')
}

console.log(`dsh-plugin-browser ${pkg.version} vs dsh ${runtime}`)
for (const [name, range] of dshPeers) console.log(`  peer ${name}@${range}  ${semver.satisfies(runtime, range, { includePrerelease: true }) ? 'ok' : 'MISMATCH'}`)
for (const note of notes) console.log(`  ${note}`)
if (problems.length > 0) {
  console.error('\nNot adapted to the latest dsh:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
console.log('  compatible: host packages are peers, peers accept the latest runtime, market metadata present')
