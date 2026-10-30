import { load } from 'cheerio'
import { readFileSync } from 'fs'
const [file, heading] = process.argv.slice(2)
const $ = load(readFileSync(file, 'utf8'))
$('script,style,noscript').remove()
console.log('TITLE:', $('h1').first().text().trim())
$('h2,h3,h4').each((_, el) => {
  const t = $(el).text().trim()
  if (heading && !t.toLowerCase().includes(heading.toLowerCase())) return
  console.log('\n=== <' + el.tagName + ' class=' + ($(el).attr('class')||'') + '> ' + t + '  | parent:', el.parent.tagName, $(el.parent).attr('class'))
  let n = $(el).next(); let i = 0
  while (n.length && i < 8 && !/^h[1-4]$/.test(n[0].tagName)) { console.log('  <'+n[0].tagName+'>', n.text().replace(/\s+/g,' ').trim().slice(0,400)); n = n.next(); i++ }
})
