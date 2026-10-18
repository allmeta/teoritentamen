import type { Question } from '~/lib/quiz'
import { regne } from './regne'

// One JSON file per category in ./questions/, each an array of Question. Regnespørsmål ligger i regne.ts.
const files = import.meta.glob<Question[]>('./questions/*.json', { eager: true, import: 'default' })
export const questions: Question[] = [...Object.values(files).flat(), ...regne]
