export type Question = {
  id: string
  category: string
  text: string
  options: string[]
  answer: number // index into options
  explanation: string
  image?: string // path under /public, e.g. /skilt/202.svg
  source?: string // URL to the rule (lovdata etc.)
}

export type Mode = 'eksamen' | 'ovelse'

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
export const pickQuestions = (bank: Question[], size = TEST_SIZE): Question[] => {
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
