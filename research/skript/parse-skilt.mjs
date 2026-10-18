// Parse skiltforskriften (Lovdata HTML) into [{nr, name, meaning, images, para}]
// Usage: node parse-skilt.mjs <html> <out.json>
import fs from 'node:fs'
const [src, out] = process.argv.slice(2)
const html = fs.readFileSync(src, 'utf8')
const strip = (s) => s.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))

// Track § headings by position.
const paras = [...html.matchAll(/§ (\d+)\.\s*([^<]{3,80})</g)].map((m) => ({ pos: m.index, nr: +m[1], title: m[2].trim() }))
const paraAt = (pos) => paras.filter((p) => p.pos < pos).at(-1)

const signs = []
for (const m of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
  const row = m[1]
  const imgs = [...row.matchAll(/src="(\/static\/SF\/sf-20051007-1219-[^"?]+\.(?:gif|png|jpg))/g)].map((x) => x[1])
  if (!imgs.length) continue
  const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => strip(c[1]).trim())
  const text = cells.filter((c) => !/^[\d.\s(Eks.)]*$/.test(c) && !c.includes('.gif')).join('\n')
  // A text cell can hold several signs: lines starting with "NNN(.N) Name"
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  let cur
  for (const l of lines) {
    const h = l.match(/^(\d{3,4}(?:\.[\dA-Z]+)?)\s+(\D.{1,90})$/)
    if (h && !/[.:]$/.test(h[2]) && h[2].split(' ').length <= 10) {
      cur = { nr: h[1], name: h[2].trim(), meaning: [], images: imgs, para: paraAt(m.index)?.nr }
      signs.push(cur)
    } else if (cur) cur.meaning.push(l)
  }
}
for (const s of signs) s.meaning = s.meaning.join(' ')
fs.writeFileSync(out, JSON.stringify(signs, null, 1))
const byGroup = {}
for (const s of signs) byGroup[s.nr[0] + (s.nr.length > 3 && !s.nr.includes('.') ? 'xxx' : 'xx')] = (byGroup[s.nr[0] + (s.nr.length > 3 && !s.nr.includes('.') ? 'xxx' : 'xx')] ?? 0) + 1
console.log(signs.length, byGroup)
