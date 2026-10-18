import type { Question } from '~/lib/quiz'

// One JSON file per category in ./questions/, each an array of Question.
const files = import.meta.glob<Question[]>('./questions/*.json', { eager: true, import: 'default' })
export const questions: Question[] = Object.values(files).flat()
