// Find Vegbilder (NLOD) images a short distance before specific NVDB sign points.
// Usage: node scenes.mjs <outdir> <signPrefix> [maxHits]
import fs from 'node:fs'

const [outdir, prefix, maxHitsArg] = process.argv.slice(2)
const maxHits = Number(maxHitsArg ?? 4)
const H = { 'X-Client': 'teoritentamen-dev', Accept: 'application/json' }
const AREAS = { // EPSG:25833 bboxes
  oslo: [258000, 6644000, 268000, 6656000],
  trondheim: [266000, 7034000, 274000, 7044000],
  bergen: [-36000, 6726000, -26000, 6736000],
  hamar: [288000, 6740000, 300000, 6752000],
  stavanger: [-46000, 6566000, -36000, 6576000],
  tromso: [648000, 7728000, 656000, 7736000],
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function signs(bbox) {
  const out = []
  let url = `https://nvdbapiles.atlas.vegvesen.no/vegobjekter/api/v4/vegobjekter/96?kartutsnitt=${bbox.join(',')}&srid=5973&inkluder=egenskaper,geometri&antall=1000`
  for (let page = 0; page < 8 && url; page++) {
    const j = await fetch(url, { headers: H }).then((r) => r.json()).catch((e) => (console.error('nvdb', e.message), {}))
    for (const o of j.objekter ?? []) {
      const nr = o.egenskaper?.find((e) => e.id === 5530)?.verdi ?? ''
      const m = o.geometri?.wkt?.match(/POINT Z? ?\(([-\d.]+) ([-\d.]+)/)
      if (m && nr.startsWith(prefix)) out.push({ id: o.id, nr, x: +m[1], y: +m[2] })
    }
    url = j.metadata?.neste?.href && j.metadata.returnert > 0 ? j.metadata.neste.href : null
  }
  return out
}

async function images(x, y, r = 60) {
  const res = []
  for (const year of [2025, 2024, 2023]) {
    const url = `https://ogckart-sn1.atlas.vegvesen.no/vegbilder_1_0/ows?service=WFS&version=2.0.0&request=GetFeature&typenames=vegbilder_1_0:Vegbilder_${year}&count=200&srsname=EPSG:25833&outputformat=application/json&bbox=${x - r},${y - r},${x + r},${y + r},EPSG:25833`
    const j = await fetch(url).then((r) => r.json()).catch(() => ({}))
    for (const f of j.features ?? []) if (f.properties.BILDETYPE === 'Planar') res.push(f)
    if (res.length) break
  }
  return res
}

fs.mkdirSync(outdir, { recursive: true })
let hits = 0
for (const [area, bbox] of Object.entries(AREAS)) {
  if (hits >= maxHits) break
  const cand = (await signs(bbox)).sort(() => Math.random() - 0.5).slice(0, 12)
  for (const s of cand) {
    if (hits >= maxHits) break
    const best = (await images(s.x, s.y))
      .map((f) => {
        const [ix, iy] = f.geometry.coordinates
        const dx = s.x - ix, dy = s.y - iy, d = Math.hypot(dx, dy)
        const bearing = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
        const off = Math.abs(((bearing - f.properties.RETNING + 540) % 360) - 180)
        return { f, d, off }
      })
      .filter((c) => c.d > 15 && c.d < 45 && c.off < 20)
      .sort((a, b) => Math.abs(a.d - 28) - Math.abs(b.d - 28))[0]
    if (!best) continue
    const name = `${prefix}-${area}-${s.id}`
    const img = await fetch(best.f.properties.URL).catch(() => null)
    if (!img?.ok) continue
    fs.writeFileSync(`${outdir}/${name}.jpg`, Buffer.from(await img.arrayBuffer()))
    const p = best.f.properties
    fs.writeFileSync(`${outdir}/${name}.json`, JSON.stringify({
      sign: s.nr, nvdbId: s.id, area, distance_m: Math.round(best.d), offset_deg: Math.round(best.off),
      taken: p.TIDSPUNKT, road: `${p.VEGKATEGORI}${p.VEGSTATUS}${p.VEGNUMMER} S${p.STREKNING}D${p.DELSTREKNING} m${Math.round(p.METER)}`,
      license: 'NLOD 2.0 – Statens vegvesen (Vegbilder)',
    }, null, 2))
    console.log('hit', name, s.nr, Math.round(best.d) + 'm')
    hits++
    await sleep(300)
  }
}
console.log('done', prefix, hits)
