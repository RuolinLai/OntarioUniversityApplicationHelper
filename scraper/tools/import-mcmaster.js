// Imports McMaster programs from requirement pages saved in a browser (see scraper/manual/mcmaster.js).
// Reads local files only — it never contacts McMaster.
//
//   node scraper/tools/import-mcmaster.js <folder>            preview: prints what would change
//   node scraper/tools/import-mcmaster.js <folder> --write    replaces McMaster in src/data/programs.json

import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSavedPage } from '../manual/mcmaster.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PROGRAMS_FILE = join(ROOT, 'src/data/programs.json')

const [folder, flag] = process.argv.slice(2)
if (!folder) {
  console.error('Usage: node scraper/tools/import-mcmaster.js <folder with saved .html pages> [--write]')
  process.exit(1)
}

const found = new Map() // id -> { program, warnings, file }
for (const file of (await readdir(folder)).filter((f) => f.toLowerCase().endsWith('.html')).sort()) {
  const path = join(folder, file)
  const saved = (await stat(path)).mtime.toISOString().slice(0, 10)
  const results = parseSavedPage(await readFile(path, 'utf8'), saved)
  console.log(`${file}: ${results.map((r) => r.program.name).join(', ') || '(no programs found — maybe saved before the results loaded)'}`)
  for (const r of results) if (!found.has(r.program.id)) found.set(r.program.id, { ...r, file })
}

const raw = await readFile(PROGRAMS_FILE, 'utf8')
const programs = JSON.parse(raw)
const old = new Map(programs.filter((p) => p.universityId === 'mcmaster').map((p) => [p.id, p]))
const order = Object.keys(programs[0])
const tidy = (p) => Object.fromEntries(order.map((k) => [k, p[k]]))
// Compare without lastSynced, which changes every time the pages are saved.
const same = (a, b) => JSON.stringify({ ...tidy(a), lastSynced: '' }) === JSON.stringify({ ...tidy(b), lastSynced: '' })

console.log(`\n${found.size} programs found.\n`)
for (const { program: p, warnings, file } of found.values()) {
  const status = !old.has(p.id) ? 'NEW' : same(old.get(p.id), p) ? 'same' : 'CHANGED'
  const range = p.admissionRange.low == null ? '—' : `${p.admissionRange.low}${p.admissionRange.high ? `–${p.admissionRange.high}` : '+'}`
  const courses = [...p.prerequisites.required, ...p.prerequisites.choose.map((g) => `${g.count} of ${g.courses.join('/')}`)].join(', ')
  console.log(`[${status}] ${p.name}  (${file})`)
  console.log(`   range ${range} · ${courses || 'no courses'} · ${p.supplementary.required ? p.supplementary.type : 'no supplementary'} · co-op ${p.coop ? 'yes' : 'no'}`)
  for (const d of p.keyDates) console.log(`   ${d.date}  ${d.label}`)
  for (const w of warnings) console.log(`   ⚠ ${w}`)
}
const missing = [...old.keys()].filter((id) => !found.has(id))
if (missing.length) console.log(`\nNot in the saved pages (will be removed): ${missing.join(', ')}`)

if (flag !== '--write') {
  console.log('\nPreview only. Run again with --write to update src/data/programs.json.')
} else {
  const next = [...programs.filter((p) => p.universityId !== 'mcmaster'), ...[...found.values()].map((r) => tidy(r.program))].sort(
    (a, b) => a.universityId.localeCompare(b.universityId) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  )
  await writeFile(PROGRAMS_FILE, JSON.stringify(next, null, raw.match(/\n(\s+)/)[1].length) + (raw.endsWith('\n') ? '\n' : ''))
  console.log(`\nWrote ${PROGRAMS_FILE} (${next.length} programs).`)
}
