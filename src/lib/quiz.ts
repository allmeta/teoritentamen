export type Question = {
  id: string
  category: string
  text: string
  options: string[]
  answer: number // index into options
  explanation: string
  image?: string // path under /public, e.g. /skilt/202.svg
  images?: string[] // hovedskilt + underskilt, vises over hverandre
  source?: string // URL to the rule (lovdata etc.)
  make?: () => Question // regnespørsmål: lager en ny variant med nye tall
}

export type Mode = 'eksamen' | 'ovelse' | 'skilt'

export type Attempt = {
  name: string
  date: string // ISO
  mode: Mode
  correct: number
  total: number
  seconds: number
}

export const TEST_SIZE = 45
export const PASS_MIN = 38

export const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Round-robin over shuffled categories so every category is represented as evenly as the bank allows.
// Regnespørsmål får nye tall ved hver trekning.
export const pickQuestions = (bank: Question[], size = TEST_SIZE): Question[] =>
  pickRaw(bank, size).map((q) => (q.make ? q.make() : q))

const pickRaw = (bank: Question[], size: number): Question[] => {
  const byCat = new Map<string, Question[]>()
  for (const q of shuffle(bank)) byCat.set(q.category, [...(byCat.get(q.category) ?? []), q])
  const pools = shuffle([...byCat.values()])
  const picked: Question[] = []
  while (picked.length < size && pools.some((p) => p.length)) {
    for (const p of pools) if (p.length && picked.length < size) picked.push(p.pop()!)
  }
  return shuffle(picked)
}

// Shuffle answer options, keeping `answer` pointing at the right one.
export const shuffleOptions = (q: Question): Question => {
  const order = shuffle(q.options.map((_, i) => i))
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) }
}

export const passed = (a: Pick<Attempt, 'correct' | 'total'>) =>
  a.correct >= Math.ceil((PASS_MIN / TEST_SIZE) * a.total)

// Skiltpugging: `step` teller besvarte skilt totalt, `seen` er skilt du har besvart. Per skilt du har bommet på:
// n = antall feil (maks 5, riktig svar −1) og at = step da du sist bommet.
export type Misses = { step: number; m: Record<string, { n: number; at: number }>; seen: Record<string, 1> }

// Som Ankis læringssteg: en feil krever minst 2 riktige gjenhentinger før skiltet regnes som lært (n ≥ 2).
// Hver gjenhenting (riktig eller feil) starter ventetiden på nytt, så repetisjonene kommer med lik avstand
// (Karpicke & Roediger 2007: utsatt første gjenhenting og lik avstand gir best langtidshukommelse).
export const learn = (s: Misses, id: string, ok: boolean): Misses => {
  const m = { ...s.m }
  const n = ok ? (m[id]?.n ?? 0) - 1 : Math.min(5, Math.max(2, (m[id]?.n ?? 0) + 1))
  if (n <= 0) delete m[id]
  else m[id] = { n, at: s.step }
  return { step: s.step + 1, m, seen: { ...s.seen, [id]: 1 } }
}

// Vekt: aldri sett 4, sett og kan 0,1 (kommer sjelden før nesten alt er sett).
// Skilt du har bommet på regnes som andel av resten av poolen, så de kommer tilbake uansett hvor mange nye som er igjen:
// 0 de 2 første spørsmålene etter feilen, så gradvis opp til 10 % av resten per feil fra 10 spørsmål etter
// (≈ 9 % sjanse per kort med én feil, ≈ 23 % med tre).
export const UNSEEN_WEIGHT = 4
export const KNOWN_WEIGHT = 0.1
const MISS_SHARE = 0.1
const ramp = (s: Misses, id: string) => {
  const gap = s.step - s.m[id].at
  return gap <= 2 ? 0 : Math.min(1, (gap - 2) / 8)
}

export const nextFrom = (pool: Question[], s: Misses, recent: string[], rnd = Math.random): Question => {
  const fresh = pool.filter((q) => !recent.includes(q.id))
  const src = fresh.length ? fresh : pool
  const base = src.reduce((sum, q) => sum + (s.m[q.id] ? 0 : s.seen[q.id] ? KNOWN_WEIGHT : UNSEEN_WEIGHT), 0)
  const w = src.map((q) =>
    s.m[q.id] ? base * MISS_SHARE * s.m[q.id].n * ramp(s, q.id) : s.seen[q.id] ? KNOWN_WEIGHT : UNSEEN_WEIGHT)
  const total = w.reduce((a, b) => a + b, 0)
  if (!total) return src[Math.floor(rnd() * src.length)]
  let r = rnd() * total
  for (const [i, q] of src.entries()) if ((r -= w[i]) < 0) return q
  return src[src.length - 1]
}

const MISS_KEY = 'teoritentamen.skiltfeil'
export const loadMisses = (): Misses => {
  try {
    const raw = JSON.parse(localStorage.getItem(MISS_KEY) ?? 'null')
    const seenFrom = (m: Misses['m']) => Object.fromEntries(Object.keys(m).map((id) => [id, 1 as const]))
    if (raw?.m) return { ...raw, seen: raw.seen ?? seenFrom(raw.m) }
    // Eldre format { id: antall }: behold feilene, regn dem som gamle.
    const m: Misses['m'] = {}
    for (const [id, n] of Object.entries(raw ?? {})) if (typeof n === 'number') m[id] = { n, at: -10 }
    return { step: 0, m, seen: seenFrom(m) }
  } catch { return { step: 0, m: {}, seen: {} } }
}
export const saveMisses = (m: Misses) => {
  try { localStorage.setItem(MISS_KEY, JSON.stringify(m)) } catch {}
}

const KEY = 'teoritentamen.attempts'

export const loadAttempts = (): Attempt[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export const saveAttempt = (a: Attempt): Attempt[] => {
  const all = [a, ...loadAttempts()]
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {}
  return all
}

export const highscores = (all: Attempt[], n = 10) =>
  [...all].sort((a, b) => b.correct / b.total - a.correct / a.total || a.seconds - b.seconds).slice(0, n)
