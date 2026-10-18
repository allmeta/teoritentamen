import { createEffect, createMemo, createSignal, For, Match, onCleanup, Show, Switch } from 'solid-js'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/utils'
import {
  type Attempt, type Mode, type Question,
  PASS_MIN, TEST_SIZE, highscores, learn, loadAttempts, loadMisses, nextFrom, passed, pickQuestions, saveAttempt,
  saveMisses, shuffleOptions,
} from '~/lib/quiz'
import { questions as bank } from '~/data/questions'

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' })
// Situation photos (driver's view) fill the card; sign drawings stay small.
const imgClass = (src: string) =>
  src.startsWith('/situasjon/') ? 'w-full rounded-lg' : 'mx-auto max-h-48 object-contain'
const NAME_KEY = 'teoritentamen.name'
const readName = () => { try { return localStorage.getItem(NAME_KEY) ?? '' } catch { return '' } }

// Pågående prøve, så den kan fortsettes etter reload/lukket fane.
const SAVE_KEY = 'teoritentamen.pagaende'
type Saved = { qs: Question[]; answers: (number | null)[]; checked: boolean[]; idx: number; mode: Mode; started: number }
const readSaved = (): Saved | undefined => {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')
    return s?.qs?.length && s.answers?.length === s.qs.length ? s : undefined
  } catch { return undefined }
}
const clearSaved = () => { try { localStorage.removeItem(SAVE_KEY) } catch {} }

export default function App() {
  const [view, setView] = createSignal<'home' | 'quiz' | 'result'>('home')
  const [attempts, setAttempts] = createSignal<Attempt[]>(loadAttempts())
  const [name, setName] = createSignal(readName())
  const [mode, setMode] = createSignal<Mode>('eksamen')
  const practice = () => mode() !== 'eksamen' // øving og skiltpugging viser fasit underveis
  const endless = () => mode() === 'skilt' // skiltpugging har ingen fast lengde
  const [qs, setQs] = createSignal<Question[]>([])
  const [answers, setAnswers] = createSignal<(number | undefined)[]>([])
  const [checked, setChecked] = createSignal<boolean[]>([])
  const [idx, setIdx] = createSignal(0)
  const [started, setStarted] = createSignal(0)
  const [now, setNow] = createSignal(Date.now())
  const [last, setLast] = createSignal<Attempt>()

  const timer = setInterval(() => setNow(Date.now()), 1000)
  onCleanup(() => clearInterval(timer))
  const elapsed = () => Math.max(0, Math.floor((now() - started()) / 1000))

  const saved = readSaved()
  if (saved) {
    setMode(saved.mode)
    setQs(saved.qs)
    setAnswers(saved.answers.map((a) => a ?? undefined))
    setChecked(saved.checked)
    setIdx(saved.idx)
    setStarted(saved.started)
    setView('quiz')
  }
  createEffect(() => {
    if (view() !== 'quiz') return
    const s: Saved = { qs: qs(), answers: answers().map((a) => a ?? null), checked: checked(), idx: idx(), mode: mode(), started: started() }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)) } catch {}
  })

  // Skiltpugging: skilt du bommer på lagres og kommer oftere igjen, også i senere økter.
  const signPool = bank.filter((x) => x.category === 'Skilt')
  const [misses, setMisses] = createSignal(loadMisses())
  const nextSign = () => shuffleOptions(nextFrom(signPool, misses(), qs().slice(-3).map((x) => x.id)))
  const learnAt = (i: number) => {
    const x = qs()[i]
    const m = learn(misses(), x.id, answers()[i] === x.answer)
    setMisses(m)
    saveMisses(m)
  }

  const q = () => qs()[idx()]
  const correctCount = createMemo(() => qs().filter((x, i) => answers()[i] === x.answer).length)
  const answeredCount = () => answers().filter((a) => a !== undefined).length

  const start = () => {
    try { localStorage.setItem(NAME_KEY, name()) } catch {}
    const picked = endless() ? [nextSign()] : pickQuestions(bank).map(shuffleOptions)
    setQs(picked)
    setAnswers(picked.map(() => undefined))
    setChecked(picked.map(() => false))
    setIdx(0)
    setStarted(Date.now())
    setNow(Date.now())
    setView('quiz')
    scrollTo(0, 0)
  }

  const choose = (i: number) => {
    if (checked()[idx()]) return
    setAnswers((a) => a.map((v, j) => (j === idx() ? i : v)))
  }
  // I skiltpugging betyr dette «snu kortet».
  const check = () => setChecked((c) => c.map((v, j) => (j === idx() ? true : v)))
  // Skiltpugging: egen vurdering etter at kortet er snudd. Lagres som riktig svar eller -1, læres, og neste kort vises.
  const grade = (ok: boolean) => {
    if (!checked()[idx()] || answers()[idx()] !== undefined) return
    setAnswers((a) => a.map((v, j) => (j === idx() ? (ok ? q().answer : -1) : v)))
    learnAt(idx())
    go(1)
  }

  // Hurtigtaster: a–d velg · j/k/↑/↓ flytt valg · h/l/←/→, N/p og n forrige/neste · s/i sjekk svar
  const move = (d: number) => {
    const cur = answers()[idx()], n = q().options.length
    choose(cur === undefined ? (d > 0 ? 0 : n - 1) : Math.min(n - 1, Math.max(0, cur + d)))
  }
  const go = (d: number) => {
    if (endless() && d > 0 && idx() === qs().length - 1) {
      setQs([...qs(), nextSign()])
      setAnswers([...answers(), undefined])
      setChecked([...checked(), false])
    }
    setIdx((i) => Math.min(qs().length - 1, Math.max(0, i + d)))
  }
  const onKey = (e: KeyboardEvent) => {
    if (view() !== 'quiz' || e.ctrlKey || e.metaKey || e.altKey) return
    if ((e.target as HTMLElement).closest('input, textarea')) return
    if (endless()) {
      // Kort: mellomrom/Enter/j snur · 1/h/← kunne ikke · 2/l/→ kunne det
      if (!checked()[idx()] && [' ', 'Enter', 'j', 'ArrowDown', 's', 'i'].includes(e.key)) check()
      else if (checked()[idx()] && ['1', 'h', 'ArrowLeft'].includes(e.key)) grade(false)
      else if (checked()[idx()] && ['2', 'l', 'ArrowRight'].includes(e.key)) grade(true)
      else return
      e.preventDefault()
      return
    }
    const opt = 'abcde'.indexOf(e.key)
    if (opt >= 0 && opt < q().options.length) choose(opt)
    else if (e.key === 'j' || e.key === 'ArrowDown') move(1)
    else if (e.key === 'k' || e.key === 'ArrowUp') move(-1)
    else if (e.key === 'l' || e.key === 'ArrowRight' || e.key === 'n') go(1)
    else if (e.key === 'h' || e.key === 'ArrowLeft' || e.key === 'N' || e.key === 'p') go(-1)
    else if (e.key === 's' || e.key === 'i') {
      if (practice() && answers()[idx()] !== undefined) check()
    } else return
    e.preventDefault()
  }
  window.addEventListener('keydown', onKey)
  onCleanup(() => window.removeEventListener('keydown', onKey))

  const finish = () => {
    const unanswered = qs().length - answeredCount()
    if (!endless() && unanswered && !confirm(`Du har ${unanswered} ubesvarte spørsmål. Levere likevel?`)) return
    const a: Attempt = {
      name: name().trim() || 'Anonym', date: new Date().toISOString(), mode: mode(),
      correct: correctCount(), total: endless() ? answeredCount() : qs().length,
      seconds: Math.round((Date.now() - started()) / 1000),
    }
    clearSaved()
    setAttempts(saveAttempt(a))
    setLast(a)
    setView('result')
    scrollTo(0, 0)
  }

  const optionClass = (i: number, reveal: boolean, chosen: number | undefined, answer: number) =>
    cn(
      'w-full text-left rounded-lg border px-4 py-3 transition-colors flex gap-3 items-start',
      !reveal && chosen === i && 'border-primary bg-accent ring-2 ring-primary/30',
      !reveal && chosen !== i && 'hover:bg-accent cursor-pointer',
      reveal && i === answer && 'border-success bg-success/15',
      reveal && chosen === i && i !== answer && 'border-destructive bg-destructive/15',
    )

  return (
    <main class="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <Switch>
        <Match when={view() === 'home'}>
          <header class="mb-8">
            <h1 class="text-3xl font-bold tracking-tight">Teoriprøven klasse B</h1>
            <p class="mt-2 text-muted-foreground">
              Øv til teoriprøven for personbil. {TEST_SIZE} spørsmål fra alle kategorier — du må ha minst{' '}
              {PASS_MIN} riktige for å bestå, som på den ekte prøven hos Statens vegvesen.
            </p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Ny prøve</CardTitle>
              <CardDescription>Spørsmålsbanken har {bank.length} spørsmål.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-5">
              <label class="block">
                <span class="text-sm font-medium">Navn (vises i highscore)</span>
                <input
                  class="mt-1.5 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={name()} onInput={(e) => setName(e.currentTarget.value)} placeholder="Anonym" maxLength={30}
                />
              </label>
              <fieldset>
                <legend class="text-sm font-medium mb-1.5">Modus</legend>
                <div class="grid gap-2 sm:grid-cols-3">
                  <For each={[
                    { id: 'eksamen' as Mode, title: 'Eksamensmodus', desc: 'Som den ekte prøven. Fasit vises når du leverer.' },
                    { id: 'ovelse' as Mode, title: 'Øvingsmodus', desc: 'Sjekk svaret og se forklaring underveis.' },
                    { id: 'skilt' as Mode, title: 'Skiltpugging', desc: `Flashcards med alle ${signPool.length} skilt. Nye skilt og skilt du ikke kunne, kommer oftere.` },
                  ]}>
                    {(m) => (
                      <label class={cn('rounded-lg border p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/30')}>
                        <input type="radio" name="mode" class="sr-only" checked={mode() === m.id} onChange={() => setMode(m.id)} />
                        <div class="font-medium">{m.title}</div>
                        <div class="text-sm text-muted-foreground">{m.desc}</div>
                      </label>
                    )}
                  </For>
                </div>
              </fieldset>
            </CardContent>
            <CardFooter>
              <Button size="lg" class="w-full sm:w-auto" onClick={start}>Start prøve</Button>
            </CardFooter>
          </Card>

          <div class="mt-8 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Highscore</CardTitle></CardHeader>
              <CardContent>
                <Show when={attempts().length} fallback={<p class="text-sm text-muted-foreground">Ingen prøver ennå.</p>}>
                  <ol class="space-y-2 text-sm">
                    <For each={highscores(attempts().filter((a) => a.mode !== 'skilt'))}>
                      {(a, i) => (
                        <li class="flex items-center gap-3">
                          <span class="w-5 text-muted-foreground tabular-nums">{i() + 1}.</span>
                          <span class="flex-1 truncate font-medium">{a.name}</span>
                          <span class="tabular-nums">{a.correct}/{a.total}</span>
                          <span class="w-12 text-right text-muted-foreground tabular-nums">{fmtTime(a.seconds)}</span>
                        </li>
                      )}
                    </For>
                  </ol>
                </Show>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Historikk</CardTitle></CardHeader>
              <CardContent>
                <Show when={attempts().length} fallback={<p class="text-sm text-muted-foreground">Ingen prøver ennå.</p>}>
                  <ul class="space-y-2 text-sm max-h-80 overflow-y-auto">
                    <For each={attempts()}>
                      {(a) => (
                        <li class="flex items-center gap-2">
                          <span class="flex-1 truncate">
                            <span class="font-medium">{a.name}</span>{' '}
                            <span class="text-muted-foreground">{fmtDate(a.date)}</span>
                          </span>
                          <span class="tabular-nums">{a.correct}/{a.total}</span>
                          <Show when={a.mode !== 'skilt'} fallback={<Badge variant="secondary">Skilt</Badge>}>
                            <Badge variant={passed(a) ? 'success' : 'error'}>{passed(a) ? 'Bestått' : 'Ikke bestått'}</Badge>
                          </Show>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </CardContent>
            </Card>
          </div>
        </Match>

        <Match when={view() === 'quiz' && q()}>
          {(_) => {
            const reveal = () => practice() && checked()[idx()]
            return (
              <div class="space-y-4">
                <Show when={endless()}>
                  <div class="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>Kort {answeredCount() + 1} · kunne {correctCount()} av {answeredCount()}</span>
                    <span>{Object.keys(misses().seen).length} av {signPool.length} sett · {Object.keys(misses().m).length} å øve mer på</span>
                  </div>
                  <Card>
                    <CardContent class="pt-6 space-y-6">
                      <img src={q().image} alt="" class="mx-auto h-56 w-full object-contain" />
                      <Show
                        when={checked()[idx()]}
                        fallback={<p class="text-center text-muted-foreground">Hva betyr skiltet? Svar for deg selv, og snu kortet.</p>}
                      >
                        <div class="text-center space-y-2">
                          <p class="text-2xl font-semibold">{q().options[q().answer]}</p>
                          <p class="text-sm text-muted-foreground">
                            {/* "Skilt 829 Navn (underskilt). Tekst" → "Skilt 829 · underskilt. Tekst" uten å gjenta navnet */}
                            {q().explanation.replace(/^Skilt (\S+) .*?\(([^)]+)\)\./, 'Skilt $1 · $2.')}{' '}
                            <Show when={q().source}><a href={q().source} target="_blank" rel="noreferrer" class="underline">Kilde</a></Show>
                          </p>
                        </div>
                      </Show>
                    </CardContent>
                    <CardFooter class="justify-center gap-3">
                      <Show when={checked()[idx()]} fallback={<Button size="lg" onClick={check}>Vis svar</Button>}>
                        <Button size="lg" variant="destructive" onClick={() => grade(false)}>Kunne ikke</Button>
                        <Button size="lg" class="bg-success text-white hover:bg-success/90" onClick={() => grade(true)}>Kunne det</Button>
                      </Show>
                    </CardFooter>
                  </Card>
                  <p class="hidden sm:block text-center text-xs text-muted-foreground">
                    Hurtigtaster: <kbd>Mellomrom</kbd>/<kbd>J</kbd> snu · <kbd>1</kbd>/<kbd>H</kbd>/← kunne ikke · <kbd>2</kbd>/<kbd>L</kbd>/→ kunne det
                  </p>
                  <div class="flex justify-end">
                    <Button variant="outline" onClick={finish}>Avslutt</Button>
                  </div>
                </Show>
                <Show when={!endless()}>
                <div class="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Spørsmål {idx() + 1} av {qs().length}</span>
                  <span class="tabular-nums">⏱ {fmtTime(elapsed())}</span>
                </div>
                <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div class="h-full bg-primary transition-all" style={{ width: `${(answeredCount() / qs().length) * 100}%` }} />
                </div>

                <Card>
                  <CardHeader>
                    <Badge variant="secondary" class="w-fit">{q().category}</Badge>
                    <CardTitle class="text-xl leading-snug">{q().text}</CardTitle>
                  </CardHeader>
                  <CardContent class="space-y-4">
                    <Show when={q().image}>
                      <img src={q().image} alt="" class={imgClass(q().image!)} />
                    </Show>
                    <div class="space-y-2" role="radiogroup">
                      <For each={q().options}>
                        {(opt, i) => (
                          <button
                            type="button" role="radio" aria-checked={answers()[idx()] === i()}
                            class={optionClass(i(), !!reveal(), answers()[idx()], q().answer)}
                            onClick={() => choose(i())}
                          >
                            <span class="font-semibold text-muted-foreground">{'ABCDE'[i()]}</span>
                            <span>{opt}</span>
                          </button>
                        )}
                      </For>
                    </div>
                    <Show when={reveal()}>
                      <div class={cn('rounded-lg p-4 text-sm', answers()[idx()] === q().answer ? 'bg-success/10' : 'bg-destructive/10')}>
                        <p class="font-semibold mb-1">{answers()[idx()] === q().answer ? 'Riktig!' : 'Feil svar'}</p>
                        <p>{q().explanation}</p>
                        <Show when={q().source}>
                          <a href={q().source} target="_blank" rel="noreferrer" class="mt-2 inline-block underline text-muted-foreground">Kilde</a>
                        </Show>
                      </div>
                    </Show>
                  </CardContent>
                  <CardFooter class="justify-between gap-2">
                    <Button variant="outline" disabled={idx() === 0} onClick={() => setIdx(idx() - 1)}>Forrige</Button>
                    <div class="flex gap-2">
                      <Show when={practice() && !checked()[idx()]}>
                        <Button variant="secondary" disabled={answers()[idx()] === undefined} onClick={check}>Sjekk svar</Button>
                      </Show>
                      <Show
                        when={idx() < qs().length - 1}
                        fallback={<Button onClick={finish}>Lever prøven</Button>}
                      >
                        <Button onClick={() => go(1)}>Neste</Button>
                      </Show>
                    </div>
                  </CardFooter>
                </Card>

                <nav class="flex flex-wrap gap-1.5" aria-label="Gå til spørsmål">
                  <For each={qs()}>
                    {(x, i) => (
                      <button
                        type="button"
                        class={cn(
                          'size-8 rounded-md border text-xs tabular-nums cursor-pointer',
                          i() === idx() && 'ring-2 ring-primary',
                          answers()[i()] !== undefined && !(practice() && checked()[i()]) && 'bg-primary text-primary-foreground',
                          practice() && checked()[i()] && (answers()[i()] === x.answer ? 'bg-success text-white' : 'bg-destructive text-white'),
                        )}
                        onClick={() => setIdx(i())}
                      >{i() + 1}</button>
                    )}
                  </For>
                </nav>
                <p class="hidden sm:block text-xs text-muted-foreground">
                  Hurtigtaster: <kbd>A</kbd>–<kbd>D</kbd> velg · <kbd>J</kbd>/<kbd>K</kbd> eller ↑/↓ flytt valg ·{' '}
                  <kbd>H</kbd>/<kbd>L</kbd>, ←/→, <kbd>P</kbd>/<kbd>N</kbd> eller <kbd>Shift+N</kbd> forrige/neste
                  <Show when={practice()}> · <kbd>S</kbd>/<kbd>I</kbd> sjekk svar</Show>
                </p>
                <div class="flex justify-between">
                  <Button variant="ghost" onClick={() => { if (confirm('Avbryte prøven? Resultatet lagres ikke.')) { clearSaved(); setView('home') } }}>Avbryt</Button>
                  <Button variant="outline" onClick={finish}>Lever prøven</Button>
                </div>
                </Show>
              </div>
            )
          }}
        </Match>

        <Match when={view() === 'result' && last()}>
          {(a) => (
            <div class="space-y-6">
              <Card class={cn('border-2', passed(a()) ? 'border-success' : 'border-destructive')}>
                <CardHeader class="items-center text-center">
                  <CardTitle class="text-3xl">{a().mode === 'skilt' ? 'Skiltpugging' : passed(a()) ? 'Bestått!' : 'Ikke bestått'}</CardTitle>
                  <CardDescription class="text-base">
                    <Show when={a().mode === 'skilt'} fallback={<>{a().correct} av {a().total} riktige · {a().total - a().correct} feil · {fmtTime(a().seconds)}</>}>
                      Kunne {a().correct} av {a().total} kort · {a().total - a().correct} å øve mer på
                    </Show>
                  </CardDescription>
                  <Show when={a().mode !== 'skilt'}>
                    <p class="text-sm text-muted-foreground">Krav: minst {PASS_MIN} riktige (maks {TEST_SIZE - PASS_MIN} feil)</p>
                  </Show>
                </CardHeader>
                <CardFooter class="justify-center gap-2">
                  <Button onClick={start}>Ny prøve</Button>
                  <Button variant="outline" onClick={() => setView('home')}>Til forsiden</Button>
                </CardFooter>
              </Card>

              <h2 class="text-xl font-semibold">{a().mode === 'skilt' ? 'Kort du ikke kunne' : 'Gjennomgang'}</h2>
              <For each={qs()}>
                {(x, i) => {
                  const chosen = answers()[i()]
                  const ok = chosen === x.answer
                  if (a().mode === 'skilt' && chosen !== -1) return null
                  return (
                    <Card>
                      <CardHeader>
                        <div class="flex gap-2">
                          <Badge variant={ok ? 'success' : 'error'}>{ok ? 'Riktig' : chosen === undefined ? 'Ubesvart' : chosen === -1 ? 'Kunne ikke' : 'Feil'}</Badge>
                          <Badge variant="secondary">{x.category}</Badge>
                        </div>
                        <CardTitle class="text-base leading-snug">{i() + 1}. {x.text}</CardTitle>
                      </CardHeader>
                      <CardContent class="space-y-3">
                        <Show when={x.image}><img src={x.image} alt="" class={imgClass(x.image!)} /></Show>
                        <Show when={a().mode === 'skilt'}><p class="font-semibold">{x.options[x.answer]}</p></Show>
                        <div class="space-y-1.5" hidden={a().mode === 'skilt'}>
                          <For each={x.options}>
                            {(opt, j) => (
                              <div class={optionClass(j(), true, chosen, x.answer)}>
                                <span class="font-semibold text-muted-foreground">{'ABCDE'[j()]}</span>
                                <span>{opt}</span>
                              </div>
                            )}
                          </For>
                        </div>
                        <p class="text-sm text-muted-foreground">
                          {x.explanation}{' '}
                          <Show when={x.source}><a href={x.source} target="_blank" rel="noreferrer" class="underline">Kilde</a></Show>
                        </p>
                      </CardContent>
                    </Card>
                  )
                }}
              </For>
            </div>
          )}
        </Match>
      </Switch>
      <footer class="mt-12 text-xs text-muted-foreground">
        Situasjonsbilder: Statens vegvesen (Vegbilder), <a class="underline" href="https://data.norge.no/nlod/no/2.0">NLOD</a>. Skilt: Wikimedia Commons og Lovdata.
      </footer>
    </main>
  )
}
