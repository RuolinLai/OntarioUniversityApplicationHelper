// Runs one adapter on a saved HTML file and prints the result.
// Usage: node scraper/tools/try-adapter.js <waterloo|toronto|western> <file.html> [url]
import { readFileSync } from 'node:fs'
import { buildProgram } from '../normalize.js'

const [universityId, file, url = 'https://example.com/page'] = process.argv.slice(2)
const adapter = await import(`../universities/${universityId}.js`)
const raws = adapter.parseProgram(readFileSync(file, 'utf8'), url)
if (raws.length === 0) console.log('(not a program page)')
for (const raw of raws) {
  const p = buildProgram(raw, universityId, 'today')
  console.log(JSON.stringify({ ...p, description: p.description.slice(0, 60) }, null, 2))
}
