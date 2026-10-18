// Run: node src/lib/quiz.test.ts
import assert from 'node:assert/strict'
import { pickQuestions, shuffleOptions, passed, learn, nextFrom, type Question } from './quiz.ts'
import { regne } from '../data/regne.ts'

const q = (id: string, category: string): Question => ({
  id, category, text: id, options: ['a', 'b', 'c'], answer: 0, explanation: '',
})
const bank = [
  ...Array.from({ length: 100 }, (_, i) => q(`a${i}`, 'A')),
  ...Array.from({ length: 5 }, (_, i) => q(`b${i}`, 'B')),
  ...Array.from({ length: 30 }, (_, i) => q(`c${i}`, 'C')),
]

const picked = pickQuestions(bank, 45)
assert.equal(picked.length, 45)
assert.equal(new Set(picked.map((x) => x.id)).size, 45, 'no duplicates')
assert.equal(picked.filter((x) => x.category === 'B').length, 5, 'small category fully used')
assert.equal(picked.filter((x) => x.category === 'C').length, 20, 'even spread')
assert.equal(pickQuestions(bank.slice(0, 10), 45).length, 10, 'small bank')

for (let i = 0; i < 50; i++) {
  const s = shuffleOptions({ ...q('x', 'A'), options: ['riktig', 'feil1', 'feil2'] })
  assert.equal(s.options[s.answer], 'riktig')
}

// Regnespørsmål: hver variant har 4 unike alternativer og gyldig fasit, og trekning gir ferdige varianter.
for (const tpl of regne) {
  for (let i = 0; i < 500; i++) {
    const v = tpl.make!()
    assert.equal(v.options.length, 4, `${v.id}: ${v.options}`)
    assert.equal(new Set(v.options).size, 4, `${v.id}: ${v.options}`)
    assert.ok(v.options[v.answer], v.id)
    assert.ok(!/NaN|undefined/.test(v.text + v.explanation + v.options.join()), v.id)
  }
}
assert.ok(pickQuestions(regne, 6).every((x) => !x.make))

// Skiltpugging: læring og vektet trekning
let s = learn({ step: 0, m: {}, seen: {} }, 'x', false)
s = learn(s, 'x', false)
assert.deepEqual(s, { step: 2, m: { x: { n: 2, at: 1 } }, seen: { x: 1 } })
assert.deepEqual(learn(learn(s, 'x', true), 'x', true).m, {}, 'riktig svar fjerner vekten')
assert.equal(learn({ step: 0, m: { x: { n: 5, at: 0 } }, seen: {} }, 'x', false).m.x.n, 5, 'maks 5')
const pool = Array.from({ length: 20 }, (_, i) => q('s' + i, 'Skilt'))
const allSeen = Object.fromEntries(pool.map((p) => [p.id, 1 as const]))
const share = (st: Parameters<typeof nextFrom>[1]) => {
  let hits = 0
  for (let i = 0; i < 3000; i++) if (nextFrom(pool, st, []).id === 's0') hits++
  return hits / 3000
}
assert.equal(share({ step: 2, m: { s0: { n: 1, at: 0 } }, seen: allSeen }), 0, 'kommer ikke rett etter feilen')
const mid = share({ step: 6, m: { s0: { n: 1, at: 0 } }, seen: allSeen }), full = share({ step: 30, m: { s0: { n: 1, at: 0 } }, seen: allSeen })
assert.ok(mid > 0.05 && mid < full, `øker gradvis (${mid} < ${full})`)
assert.ok(full > 0.25 && full < 0.4, `full vekt etter 10 (${full}, forventet 9/28 ≈ 0.32)`)
assert.ok(share({ step: 30, m: { s0: { n: 3, at: 0 } }, seen: allSeen }) > full, 'flere feil gir mer vekt')
for (let i = 0; i < 200; i++) assert.notEqual(nextFrom(pool, { step: 30, m: { s0: { n: 5, at: 0 } }, seen: allSeen }, ['s0']).id, 's0', 'ikke gjenta nylige')
// Nye skilt (aldri sett) vektes høyere enn sett
const seen19 = { step: 30, m: {}, seen: Object.fromEntries(pool.slice(1).map((p) => [p.id, 1 as const])) }
const fresh = share(seen19)
assert.ok(fresh > 0.15 && fresh < 0.22, `aldri sett skilt kommer oftere (${fresh}, forventet 4/23 ≈ 0.17)`)
assert.ok(nextFrom(pool.slice(0, 1), { step: 1, m: { s0: { n: 1, at: 0 } }, seen: allSeen }, []), 'alle vekter 0 gir likevel et spørsmål')

assert.equal(passed({ correct: 38, total: 45 }), true)
assert.equal(passed({ correct: 37, total: 45 }), false)
console.log('ok')
