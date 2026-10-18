import type { Question } from '../lib/quiz.ts'

// Regnespørsmål med nye tall for hver prøve. `make` lager en ny variant; App kaller den ved trekning.
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const ms = (kmt: number) => kmt / 3.6
const meter = (x: number) => `Ca. ${x} meter`
const TR13 = 'https://lovdata.no/forskrift/1986-03-21-747/§13'

// Riktig svar + de tre første feilsvarene som er unike og ulike riktig svar.
const numOptions = (right: number, wrong: number[], fmt = meter) => {
  const w = [...new Set(wrong.map(Math.round))].filter((x) => x > 0 && x !== right).slice(0, 3)
  return { options: [right, ...w].map(fmt), answer: 0 }
}

type Make = () => Question
const t = (make: Make): Question => ({ ...make(), make })

export const regne: Question[] = [
  t(() => {
    const v = pick([30, 40, 50, 60, 70, 80, 90, 100, 110]), s = pick([1, 1.5, 2])
    const d = Math.round(ms(v) * s)
    return {
      id: 'fart-27', category: 'Fart og plassering',
      text: `Du kjører i ${v} km/t og har en reaksjonstid på ${String(s).replace('.', ',')} sekund${s === 1 ? '' : 'er'}. Omtrent hvor lang er reaksjonslengden?`,
      ...numOptions(d, [d * 2, d / 2, v * s, v / 10 * s, d * 3]),
      explanation: `${v} km/t er ${String(Math.round(ms(v) * 10) / 10).replace('.', ',')} meter per sekund (${v} ÷ 3,6). På ${String(s).replace('.', ',')} sekund${s === 1 ? '' : 'er'} kjører bilen ca. ${d} meter før du begynner å bremse.`,
      source: TR13,
    }
  }),
  t(() => {
    const v = pick([50, 60, 70, 80, 90, 100]), s = pick([2, 3, 4])
    const d = Math.round(ms(v) * s)
    return {
      id: 'trafikanter-29', category: 'Fører og andre trafikanter',
      text: `Du kjører i ${v} km/t og ser ned på telefonen i ${s} sekunder. Omtrent hvor langt kjører du uten å se på vegen?`,
      ...numOptions(d, [d / 2, d * 2, v * s / 10, d / s, d * 3]),
      explanation: `${v} km/t er ca. ${Math.round(ms(v))} meter i sekundet (${v} ÷ 3,6), så ${s} sekunder gir ca. ${d} meter i blinde. Derfor er bruk av håndholdt mobiltelefon under kjøring forbudt (mobilforskriften).`,
      source: 'https://lovdata.no/forskrift/1999-12-17-1309/§2',
    }
  }),
  t(() => {
    const [v1, k] = pick([[30, 2], [40, 2], [50, 2], [30, 3]] as const)
    const words: Record<number, string> = { 2: 'dobbelt', 3: 'tre ganger', 4: 'fire ganger', 6: 'seks ganger', 8: 'åtte ganger', 9: 'ni ganger', 27: '27 ganger' }
    const right = k * k, wrong = k === 2 ? [2, 8, 3] : [3, 6, 27]
    return {
      id: 'fart-26', category: 'Fart og plassering',
      text: `Du øker farten fra ${v1} til ${v1 * k} km/t. Omtrent hvor mye lengre blir bremselengden med samme veggrep?`,
      options: [right, ...wrong].map((x) => `${words[x][0].toUpperCase()}${words[x].slice(1)} så lang`), answer: 0,
      explanation: `Bremselengden øker med kvadratet av farten. ${k} ganger så høy fart gir derfor ${k} × ${k} = ${right} ganger så lang bremselengde, med samme veggrep.`,
      source: TR13,
    }
  }),
  t(() => {
    // Bremselengde ≈ v² / (254 · μ), μ = 0,8 (tørr asfalt). Spørsmålet gir startverdien, så μ trenger ikke kunnes.
    const [v1, v2] = pick([[40, 80], [50, 100], [30, 60], [30, 90], [40, 60], [60, 90]] as const)
    const l1 = Math.round((v1 * v1) / (254 * 0.8)), r = (v2 / v1) ** 2, l2 = Math.round(l1 * r)
    return {
      id: 'fart-31', category: 'Fart og plassering',
      text: `I ${v1} km/t er bremselengden ca. ${l1} meter. Omtrent hvor lang blir den i ${v2} km/t med samme veggrep?`,
      ...numOptions(l2, [l1 * (v2 / v1), l1 + (v2 - v1), l2 * 2, l1 * 2, l2 / 2]),
      explanation: `Bremselengden øker med kvadratet av farten: (${v2} ÷ ${v1})² = ${String(Math.round(r * 100) / 100).replace('.', ',')}. ${l1} × ${String(Math.round(r * 100) / 100).replace('.', ',')} ≈ ${l2} meter.`,
      source: TR13,
    }
  }),
  t(() => {
    const v = pick([50, 60, 70, 80, 90]), react = Math.round(ms(v)), brake = Math.round((v * v) / (254 * 0.8))
    return {
      id: 'fart-32', category: 'Fart og plassering',
      text: `Du kjører i ${v} km/t. Reaksjonstiden er ett sekund, og bremselengden er ca. ${brake} meter. Omtrent hvor lang er stopplengden?`,
      ...numOptions(react + brake, [brake, react, brake - react, brake * 2, react + brake * 2]),
      explanation: `Stopplengden er reaksjonslengden pluss bremselengden. På ett sekund kjører du ca. ${react} meter (${v} ÷ 3,6), så stopplengden blir ${react} + ${brake} ≈ ${react + brake} meter.`,
      source: TR13,
    }
  }),
  t(() => {
    const v = pick([50, 60, 70, 80, 90, 100, 110]), d = Math.round(ms(v) * 3)
    return {
      id: 'fart-33', category: 'Fart og plassering',
      text: `Du kjører i ${v} km/t og følger tresekundersregelen. Omtrent hvor mange meter er det til bilen foran?`,
      ...numOptions(d, [d / 3, d * 2, v * 3 / 10, v / 2, d * 3]),
      explanation: `${v} km/t er ca. ${String(Math.round(ms(v) * 10) / 10).replace('.', ',')} meter i sekundet (${v} ÷ 3,6). Tre sekunder gir ca. ${d} meter. Trygg Trafikk anbefaler minst 3 sekunders avstand.`,
      source: 'https://www.tryggtrafikk.no/artikler/pressemelding/kjor-pent-i-pasken/',
    }
  }),
]
