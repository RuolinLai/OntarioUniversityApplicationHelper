// Minimal robots.txt support: User-agent groups, Allow/Disallow, * and $ wildcards.

export function parseRobots(text) {
  const groups = []
  let current = null
  let lastWasAgent = false

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim()
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i)
    if (!m) continue
    const key = m[1].toLowerCase()
    const value = m[2].trim()

    if (key === 'user-agent') {
      // Consecutive User-agent lines share one group.
      if (!lastWasAgent) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
    } else {
      lastWasAgent = false
      if (!current) continue
      if ((key === 'allow' || key === 'disallow') && value) {
        current.rules.push({ allow: key === 'allow', path: value })
      }
    }
  }
  return groups
}

function patternToRegex(path) {
  const escaped = path.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp('^' + (escaped.endsWith('$') ? escaped : escaped + '.*'))
}

/** Returns true if `agent` may fetch `path` (path includes the query string). */
export function isAllowed(groups, agent, path) {
  const token = agent.toLowerCase()
  const group =
    groups.find((g) => g.agents.some((a) => a !== '*' && token.includes(a))) ?? groups.find((g) => g.agents.includes('*'))
  if (!group) return true

  // The most specific (longest) matching rule wins; Allow wins ties.
  let best = null
  for (const rule of group.rules) {
    if (!patternToRegex(rule.path).test(path)) continue
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) best = rule
  }
  return best ? best.allow : true
}
