// tidycoder status band: a Claude Code mod by nem25
//
// Draws one row in the band above the prompt:
//   ◆ Opus 5.5 · high │ ctx ███░░░░░ 90k/1M │ $1.24 │ 5h ████▋░░░ 58% ↻4:40pm │ 7d ███▎░░░░ 41% ↻Sat
// On a narrow screen it wraps into two rows: model + ctx + cost, then 5h + 7d.
// Steps aside while a survey holds the band.

// ---------- settings ----------
const CELLS = 8 // width of each bar, in characters
const COLOURS = {
  green: '#1D9E75',
  amber: '#EF9F27',
  red: '#E24B4A',
  track: '#3C3C3C',
  accent: '#378ADD',
}

// ---------- state shared between hooks ----------
let model = null // e.g. "Opus 5.5"
let effort = null // e.g. "high"

// ---------- helpers ----------
const isNum = (x) => typeof x === 'number' && Number.isFinite(x)

function tier(pct) {
  if (pct >= 80) return COLOURS.red
  if (pct >= 50) return COLOURS.amber
  return COLOURS.green
}

// "claude-opus-5-5" (a turn.step id) or "Claude Opus 5.5" (/model's name) → "Opus 5.5"
function prettyModel(m) {
  if (!m) return null
  const id = m.match(/^claude-([a-z]+)-(\d+)(?:-(\d+))?/i)
  if (id) {
    const family = id[1][0].toUpperCase() + id[1].slice(1)
    // a third part of 3+ digits is a date stamp, not a minor version
    return family + ' ' + id[2] + (id[3] && id[3].length < 3 ? '.' + id[3] : '')
  }
  return m.replace(/^Claude\s+/i, '')
}

// A level ("high"), or a number on internal builds
const prettyEffort = (x) => (x === undefined || x === null || x === '' ? null : String(x))

function shortTokens(n) {
  if (!isNum(n)) return '–'
  if (n >= 1_000_000) return (Math.round(n / 100_000) / 10).toString().replace(/\.0$/, '') + 'M'
  if (n >= 1000) return Math.round(n / 1000) + 'k'
  return String(Math.round(n))
}

// resetsAt is an ISO 8601 timestamp
function resetLabel(iso) {
  const ms = iso ? Date.parse(iso) : NaN
  if (Number.isNaN(ms)) return ''
  const d = new Date(ms)
  if (ms - Date.now() < 24 * 3600 * 1000) {
    const h = d.getHours() % 12 || 12
    const m = String(d.getMinutes()).padStart(2, '0')
    return '↻' + h + ':' + m + (d.getHours() < 12 ? 'am' : 'pm')
  }
  return '↻' + d.toLocaleDateString('en-GB', { weekday: 'short' })
}

// ---------- drawing ----------
// A segment is a list of pieces: { text, color?, bg?, dim? }

const PARTIALS = ' ▏▎▍▌▋▊▉' // eighth blocks, for smoother bars

function barPieces(pct) {
  const p = Math.max(0, Math.min(100, pct))
  const colour = tier(p)
  const eighths = Math.round((p / 100) * CELLS * 8)
  const full = Math.floor(eighths / 8)
  const rem = eighths % 8
  const pieces = []
  if (full) pieces.push({ text: '█'.repeat(full), color: colour })
  let used = full
  if (rem && used < CELLS) {
    pieces.push({ text: PARTIALS[rem], color: colour, bg: COLOURS.track })
    used += 1
  }
  if (used < CELLS) pieces.push({ text: '█'.repeat(CELLS - used), color: COLOURS.track })
  return pieces
}

function modelSegment() {
  const s = [{ text: '◆ ' + (model || 'Claude'), color: COLOURS.accent }]
  if (effort) s.push({ text: ' · ' + effort, dim: true })
  return s
}

// context: { tokens?, window, percent? }, percent being 0–100
function contextSegment(ctx) {
  const s = [{ text: 'ctx ', dim: true }]
  let pct = ctx && ctx.percent
  if (!isNum(pct) && ctx && isNum(ctx.tokens) && ctx.window > 0) {
    pct = (ctx.tokens / ctx.window) * 100
  }
  if (!isNum(pct)) {
    s.push(...barPieces(0), { text: ' –', dim: true })
    return s
  }
  s.push(...barPieces(pct))
  if (isNum(ctx.tokens)) {
    s.push({ text: ' ' + shortTokens(ctx.tokens) }, { text: '/' + shortTokens(ctx.window), dim: true })
  } else {
    s.push({ text: ' ' + Math.round(pct) + '%' })
  }
  return s
}

// limit: { kind, percentUsed (0–100), resetsAt? }
function limitSegment(name, limit) {
  // A limit with no usage may be absent from the data; still show it at 0%
  const p = limit && isNum(limit.percentUsed) ? limit.percentUsed : 0
  const s = [{ text: name + ' ', dim: true }, ...barPieces(p), { text: ' ' + Math.round(p) + '%' }]
  const r = limit && resetLabel(limit.resetsAt)
  if (r) s.push({ text: ' ' + r, dim: true })
  return s
}

// cost: { usd }
function costSegment(cost) {
  if (!cost || !isNum(cost.usd)) return null
  return [{ text: '$' + cost.usd.toFixed(2), color: COLOURS.accent }]
}

const SEP = { text: ' │ ', dim: true }
const width = (seg) => seg.reduce((n, p) => n + [...p.text].length, 0)

function joinRow(segments) {
  const out = []
  segments.forEach((seg, i) => {
    if (i) out.push(SEP)
    out.push(...seg)
  })
  return out
}

// Decide one row or two, based on the band's width
export function layout(segments, columns) {
  const top = segments.slice(0, 3).filter(Boolean)
  const bottom = segments.slice(3).filter(Boolean)
  const one = joinRow([...top, ...bottom])
  if (!bottom.length) return [one]
  // The frame takes 2 columns and the leading space 1
  if (isNum(columns) && width(one) <= columns - 3) return [one]
  return [joinRow(top), joinRow(bottom)]
}

function render(Box, Text, rows) {
  // A rounded frame keeps the mod visually apart from the chat above
  return Box({
    flexDirection: 'column',
    borderStyle: 'round',
    children: rows.map((pieces, r) =>
      Box({
        key: 'row-' + r,
        flexDirection: 'row',
        children: [{ text: ' ' }, ...pieces].map((p) => {
          const props = { children: [p.text], wrap: 'truncate' }
          if (p.color) props.color = p.color
          if (p.bg) props.backgroundColor = p.bg
          if (p.dim) props.dimColor = true
          return Text(props)
        }),
      }),
    ),
  })
}

// ---------- hooks ----------
export function register(on, options) {
  // The "Show status band" option (plugin.json userConfig). When it's off,
  // register no hooks at all: the mod is inert and the band takes no space.
  // Changing the option reloads the module, so this runs again.
  if (options && options.showStatusBand === false) return

  // Pick up the current model and effort when the mod loads
  on('session.start', async ($, e, next) => {
    try {
      model = prettyModel(await $.session.model()) || model
    } catch {}
    try {
      // The session's effort level, as Claude Code exports it to hooks and Bash
      effort = prettyEffort(await $.env.get('CLAUDE_EFFORT')) || effort
    } catch {}
    // Keep reset times fresh even when nothing else changes
    $.clock.every(60_000, () => $.ui.invalidate('ui.render'))
    $.ui.invalidate('ui.render')
    return next(e)
  })

  // Each request to the model carries the model and effort in use,
  // so a /model or /effort change shows up on the next request.
  // Subagents (e.agentId set) run their own model, so only the main loop counts.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) return yield* next(e)
    const m = prettyModel(e.model)
    const ef = prettyEffort(e.effort)
    if ((m && m !== model) || (ef && ef !== effort)) {
      model = m || model
      effort = ef || effort
      $.ui.invalidate('ui.render')
    }
    return yield* next(e)
  })

  // Fires after each turn, and when a plan limit's percent changes
  on('session.measure', async ($, e, next) => {
    $.ui.invalidate('ui.render')
    return next(e)
  })

  // The band above the prompt
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // A survey holds the band while it's open: step aside until it's answered
    if (e.props.hasSurvey) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const others = await next(e) // keep anything other mods draw here

    let usage = null
    try {
      usage = await $.session.usage()
    } catch {}
    if (!model) {
      try {
        model = prettyModel(await $.session.model())
      } catch {}
    }

    const limits = (usage && usage.rateLimits) || []
    const segments = [
      modelSegment(),
      contextSegment(usage && usage.context),
      costSegment(usage && usage.cost),
      limitSegment('5h', limits.find((l) => l.kind === 'five_hour')),
      limitSegment('7d', limits.find((l) => l.kind === 'seven_day')),
    ]
    // bodyColumns already leaves out the engine's [-] marker
    const mine = render(Box, Text, layout(segments, e.props.bodyColumns))

    return others ? Box({ flexDirection: 'column', children: [others, mine] }) : mine
  })
}
