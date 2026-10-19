// Generate one question per sign in skiltforskriften (§ 4–20), with images.
// Usage: node gen-skilt.mjs <skilt.json> <commons-no-signs.json> <projectRoot>
import fs from 'node:fs'
const [signsFile, commonsFile, root] = process.argv.slice(2)
const signs = JSON.parse(fs.readFileSync(signsFile, 'utf8'))
const commons = JSON.parse(fs.readFileSync(commonsFile, 'utf8'))
const PARA = { 1: 4, 2: 6, 3: 8, 4: 10, 5: 12, 6: 14, 7: 16, 8: 18, 9: 20 }
const KIND = { 1: 'fareskilt', 2: 'vikeplikt- og forkjørsskilt', 3: 'forbudsskilt', 4: 'påbudsskilt', 5: 'opplysningsskilt', 6: 'serviceskilt', 7: 'vegvisningsskilt', 8: 'underskilt', 9: 'markeringsskilt' }
const H = { 'User-Agent': 'teoritentamen-dev/1.0' }
const imgDir = `${root}/public/skilt/alle`
fs.mkdirSync(imgDir, { recursive: true })

// Varianter med navn som "for kjøretøy" får hovedskiltets navn foran (318 står bare som overskrift i forskriften).
const PARENT = { 318: 'Totalvektgrense' }
for (const s of signs) {
  const base = s.nr.split('.')[0]
  if (/^[a-zæøå]/.test(s.name)) s.name = `${signs.find((p) => p.nr === base)?.name ?? PARENT[base]} ${s.name}`
}
// Hovedskilt med egne varianter har samme bilde som første variant – ta det ut så svaret blir entydig.
const hasVariants = new Set(signs.filter((s) => s.nr.includes('.')).map((s) => s.nr.split('.')[0]))
const usable0 = signs.filter((s) => !(hasVariants.has(s.nr) && !s.nr.includes('.')))
const usable = usable0.filter((s) => s.nr.length <= 3 || s.nr.includes('.') ? true : false)
  .filter((s) => /^[1-9]/.test(s.nr) && s.nr.split('.')[0].length === 3 && !/Eksemp/i.test(s.name) && s.nr[0] !== '8') // underskilt pugges i kombinasjon (skiltkombo.json)

// Unique names per group (same name = same answer, keep first)
const seen = new Set()
const list = usable.filter((s) => { const k = s.nr[0] + '|' + s.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })

const commonsFor = (nr) => {
  const ok = commons.filter((c) => !/-FYG|_FYG/i.test(c.name))
  return ok.find((c) => c.name === `NO_road_sign_${nr}.svg`)
    ?? ok.find((c) => c.name === `NO_road_sign_${nr}.1.svg`)
    ?? ok.find((c) => c.name.startsWith(`NO_road_sign_${nr}.`) && c.name.endsWith('.svg'))
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const out = []
let svg = 0, gif = 0
for (const [i, s] of list.entries()) {
  const g = s.nr[0]
  const file = s.nr.replace(/[^\w.-]/g, '_')
  let image
  const c = process.env.NO_COMMONS ? (fs.existsSync(`${imgDir}/${file}.svg`) ? { url: null } : null) : commonsFor(s.nr)
  if (c) {
    const p = `${imgDir}/${file}.svg`
    if (!fs.existsSync(p)) {
      for (let t = 0; t < 5; t++) {
        const r = await fetch(c.url, { headers: H }).catch(() => null); await sleep(1200)
        if (r?.ok) { fs.writeFileSync(p, Buffer.from(await r.arrayBuffer())); break }
        if (r && r.status !== 429) break
        await sleep(15000 * (t + 1))
      }
    }
    if (fs.existsSync(p)) { image = `/skilt/alle/${file}.svg`; svg++ }
  }
  if (!image) {
    const src = s.images[0], ext = src.split('.').pop()
    const p = `${imgDir}/${file}.${ext}`
    if (!fs.existsSync(p)) {
      const r = await fetch('https://lovdata.no' + src, { headers: H }).catch(() => null); await sleep(250)
      if (r?.ok) fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()))
    }
    if (fs.existsSync(p)) { image = `/skilt/alle/${file}.${ext}`; gif++ }
  }
  if (!image) { console.error('no image', s.nr); continue }

  const r = rnd(i + 7)
  const pool = list.filter((o) => o.nr[0] === g && o.name !== s.name)
  const distractors = []
  while (distractors.length < 3 && pool.length) distractors.push(pool.splice(Math.floor(r() * pool.length), 1)[0].name)
  if (distractors.length < 3) { console.error('few distractors', s.nr); continue }

  const text = g === '1' ? 'Hva varsler dette skiltet?' : g === '8' ? 'Hva betyr dette underskiltet?' : 'Hva betyr dette skiltet?'
  const explanation = `Skilt ${s.nr} ${s.name} (${KIND[g]}).${s.meaning ? ' ' + s.meaning : ''}`
  out.push({
    id: `skiltpugg-${s.nr}`, category: 'Skilt', text,
    options: [s.name, ...distractors], answer: 0, explanation,
    source: `https://lovdata.no/forskrift/2005-10-07-1219/§${PARA[g]}`, image,
  })
}
fs.writeFileSync(`${root}/src/data/questions/skilt.json`, '[\n' + out.map((q) => '  ' + JSON.stringify(q)).join(',\n') + '\n]\n')
console.log('questions', out.length, 'svg', svg, 'gif', gif)
