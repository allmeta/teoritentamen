// Run: node src/lib/quiz.test.ts
import assert from 'node:assert/strict'
import { pickQuestions, shuffleOptions, passed, type Question } from './quiz.ts'

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

assert.equal(passed({ correct: 38, total: 45 }), true)
assert.equal(passed({ correct: 37, total: 45 }), false)
console.log('ok')
