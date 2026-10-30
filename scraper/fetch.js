// Polite HTTP fetching for the scraper:
//  - identifies itself with a clear User-Agent
//  - obeys robots.txt
//  - waits between requests to the same website
//  - caches pages on disk so re-running during development doesn't hit the sites again
//  - retries once on server errors

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseRobots, isAllowed } from './robots.js'

export const USER_AGENT =
  'OntarioUHelper/1.0 (+https://github.com/RuolinLai/OntarioUniversityApplicationHelper; student project, weekly crawl)'

const DELAY_MS = 1500
const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), '.cache')
const CACHE_MAX_AGE_MS = 6 * 24 * 60 * 60 * 1000 // a bit less than a week, so each weekly run refetches

const robotsByHost = new Map()
const lastRequestByHost = new Map()

export class BlockedError extends Error {}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitTurn(host) {
  const last = lastRequestByHost.get(host) ?? 0
  const wait = last + DELAY_MS - Date.now()
  lastRequestByHost.set(host, Math.max(Date.now(), last + DELAY_MS))
  if (wait > 0) await sleep(wait)
}

async function rawFetch(url) {
  const host = new URL(url).host
  for (let attempt = 1; ; attempt++) {
    await waitTurn(host)
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    })
    if (res.status >= 500 && attempt < 2) continue
    return res
  }
}

async function robotsFor(url) {
  const { origin } = new URL(url)
  if (!robotsByHost.has(origin)) {
    // Following RFC 9309: a 4xx response means there are no rules (crawling allowed);
    // a 5xx response means the site is unavailable, so assume everything is disallowed.
    const res = await rawFetch(`${origin}/robots.txt`)
    if (res.ok) robotsByHost.set(origin, parseRobots(await res.text()))
    else if (res.status >= 500) robotsByHost.set(origin, parseRobots('User-agent: *\nDisallow: /'))
    else robotsByHost.set(origin, parseRobots(''))
  }
  return robotsByHost.get(origin)
}

function cachePath(url) {
  return join(CACHE_DIR, createHash('sha1').update(url).digest('hex') + '.html')
}

async function readCache(url) {
  try {
    const path = cachePath(url)
    if (Date.now() - (await stat(path)).mtimeMs > CACHE_MAX_AGE_MS) return null
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

export function isBotChallenge(html) {
  return html.length < 20_000 && /document\.cookie\s*=/.test(html) && /location\.reload/.test(html)
}

/**
 * Fetches a page's HTML. Throws BlockedError if robots.txt forbids it or the
 * site refuses us (we never try to get around that), and Error for other failures.
 */
export async function fetchPage(url, { useCache = true } = {}) {
  if (useCache) {
    const cached = await readCache(url)
    if (cached != null) return cached
  }

  const { pathname, search } = new URL(url)
  if (!isAllowed(await robotsFor(url), USER_AGENT, pathname + search)) {
    throw new BlockedError(`robots.txt disallows ${url}`)
  }

  const res = await rawFetch(url)
  if (res.status === 401 || res.status === 403 || res.status === 429) {
    throw new BlockedError(`${res.status} from ${url}`)
  }
  if (!res.ok) throw new Error(`${res.status} from ${url}`)

  const html = await res.text()
  // Some sites answer bots with a JavaScript challenge page instead of the real content.
  // That's the site saying "no automated access", so we stop rather than try to solve it.
  if (isBotChallenge(html)) throw new BlockedError(`bot challenge page from ${url}`)
  if (useCache) {
    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(cachePath(url), html)
  }
  return html
}
