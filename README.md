# Teoriprøven klasse B

Øvingsside for teoriprøven til førerkort klasse B. 45 spørsmål per prøve, trukket jevnt fra Statens vegvesens sju temaer; minst 38 riktige for å bestå. Highscore og historikk lagres i localStorage.

```sh
pnpm install
pnpm dev                 # http://localhost:5173
pnpm build               # statisk SPA i dist/ (Vercel oppdager Vite automatisk)
node src/lib/quiz.test.ts
```

- Spørsmål: `src/data/questions/<kategori>.json` (typen `Question` i `src/lib/quiz.ts`)
- Skiltbilder: `public/skilt/` (Wikimedia Commons, public domain)
- Kilder: `research/kilder/` (fulltekst fra lovdata.no), verifiseringslogg per spørsmål i `research/verifisering/`
