// Scrapes every supported university and updates src/data/programs.json.
//
// Usage:
//   node scraper/run.js                     all universities
//   node scraper/run.js waterloo western    only these
//   node scraper/run.js --limit 5           first 5 pages per university (dry run, nothing is written)
//   node scraper/run.js --dry-run           scrape and report, but don't write programs.json
//   node scraper/run.js --no-cache          ignore the local page cache

import { readFile, writeFile, appendFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchPage, BlockedError } from './fetch.js'
import { buildProgram } from './normalize.js'
import { validatePrograms, checkUniversity } from './validate.js'
import { adapters } from './universities/index.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PROGRAMS_FILE = join(ROOT, 'src/data/programs.json')
const OVERRIDES_FILE = join(ROOT, 'scraper/overrides.json')
const REPORT_FILE = join(ROOT, 'scraper/last-report.md')

function parseArgs(argv) {
  const opts = { only: [], limit: null, dryRun: false, useCache: true }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--limit') opts.limit = Number(argv[++i])
    else if (a === '--dry-run') opts.dryRun = true
    else if (a === '--no-cache') opts.useCache = false
    else opts.only.push(a)
  }
  if (opts.limit) opts.dryRun = true
  return opts
}

async function scrapeUniversity(adapter, opts, today, log) {
  const get = (url) => fetchPage(url, { useCache: opts.useCache })
  let urls = await adapter.listPrograms(get)
  if (opts.limit) urls = urls.slice(0, opts.limit)
  log(`  ${urls.length} pages to check`)

  const programs = []
  const failures = []
  const blocked = []
  for (const [i, url] of urls.entries()) {
    try {
      const raws = adapter.parseProgram(await get(url), url)
      programs.push(...raws.map((raw) => buildProgram(raw, adapter.id, today)))
    } catch (err) {
      ;(err instanceof BlockedError ? blocked : failures).push({ url, error: err.message })
    }
    if ((i + 1) % 25 === 0) log(`  ...${i + 1}/${urls.length}`)
  }
  return { urls, programs, failures, blocked }
}

const PREREQ_KEYS = ['admissionRange', 'prerequisites', 'supplementary']

function diff(oldList, newList) {
  const oldById = new Map(oldList.map((p) => [p.id, p]))
  const newIds = new Set(newList.map((p) => p.id))
  const added = newList.filter((p) => !oldById.has(p.id))
  const removed = oldList.filter((p) => !newIds.has(p.id))
  const changed = newList
    .filter((p) => oldById.has(p.id))
    .map((p) => ({
      program: p,
      keys: PREREQ_KEYS.filter((k) => JSON.stringify(p[k]) !== JSON.stringify(oldById.get(p.id)[k])),
    }))
    .filter((c) => c.keys.length > 0)
  return { added, removed, changed }
}

function applyOverrides(programs, overrides) {
  return programs
    .map((p) => (overrides[p.id] ? { ...p, ...overrides[p.id] } : p))
    .filter((p) => !p.hidden)
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const today = new Date().toISOString().slice(0, 10)
  const oldPrograms = JSON.parse(await readFile(PROGRAMS_FILE, 'utf8'))
  const overrides = JSON.parse(await readFile(OVERRIDES_FILE, 'utf8'))
  const selected = adapters.filter((a) => opts.only.length === 0 || opts.only.includes(a.id))

  const report = [`# Scraper report — ${today}`, '']
  const log = (line) => console.log(line)
  const replaced = new Map() // universityId -> new programs

  for (const adapter of selected) {
    log(`\n${adapter.id}`)
    const previous = oldPrograms.filter((p) => p.universityId === adapter.id)
    report.push(`## ${adapter.id}`, '')
    try {
      const { urls, programs, failures, blocked } = await scrapeUniversity(adapter, opts, today, log)
      const { valid, invalid } = validatePrograms(programs)
      const check = checkUniversity({ programs: valid, previous, pagesTried: urls.length, pagesFailed: failures.length + blocked.length })

      report.push(`- Pages checked: ${urls.length}, programs found: ${valid.length}`)
      if (blocked.length) report.push(`- Blocked (robots.txt or refused, skipped): ${blocked.length}`)
      for (const f of failures) report.push(`- ⚠️ Failed: ${f.url} — ${f.error}`)
      for (const i of invalid) report.push(`- ⚠️ Invalid: ${i.id} — ${i.reason}`)
      const review = valid.filter((p) => p.needsReview)
      if (review.length) {
        report.push(`- Needs review: ${review.length}`)
        for (const p of review) report.push(`  - ${p.id}: ${p.warnings.join('; ')}`)
      }

      if (check.ok) {
        replaced.set(adapter.id, valid)
        report.push(`- ✅ Updated`)
        log(`  ✅ ${valid.length} programs (${review.length} need review)`)
      } else {
        report.push(`- ❌ Kept previous data: ${check.reasons.join('; ')}`)
        log(`  ❌ kept previous data: ${check.reasons.join('; ')}`)
        process.exitCode = 1
      }
    } catch (err) {
      report.push(`- ❌ Kept previous data: ${err.message}`)
      log(`  ❌ ${err.message}`)
      process.exitCode = 1
    }
    report.push('')
  }

  // Universities that weren't scraped (or failed) keep their old programs.
  const merged = [
    ...oldPrograms.filter((p) => !replaced.has(p.universityId)),
    ...[...replaced.values()].flat().map(({ warnings, ...p }) => p),
  ].sort((a, b) => a.universityId.localeCompare(b.universityId) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
  const finalPrograms = applyOverrides(merged, overrides)

  const { added, removed, changed } = diff(oldPrograms, finalPrograms)
  report.push('## Changes', '', `- Added: ${added.length}`, `- Removed: ${removed.length}`, `- Changed requirements: ${changed.length}`)
  for (const p of removed.filter((p) => p.source !== 'sample')) report.push(`  - removed ${p.id}`)
  for (const c of changed) report.push(`  - ${c.program.id}: ${c.keys.join(', ')}`)
  const reportText = report.join('\n') + '\n'

  if (opts.dryRun) {
    log('\n(dry run — programs.json not written)')
  } else {
    await writeFile(PROGRAMS_FILE, JSON.stringify(finalPrograms, null, 2) + '\n')
    await writeFile(REPORT_FILE, reportText)
    log(`\nWrote ${finalPrograms.length} programs to src/data/programs.json`)
  }
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, reportText)
  log(`Added ${added.length}, removed ${removed.length}, changed ${changed.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
