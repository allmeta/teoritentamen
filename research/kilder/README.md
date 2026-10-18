# Originalkilder

Fulltekst hentet 2026-10-18. Lovtekster fra lovdata.no, nettkilder i `web/` (rå HTML/PDF + tekst).

## Lover og forskrifter

| Fil | Regelverk |
|---|---|
| 1965-06-18-4.txt | Vegtrafikkloven (vtl) |
| 1961-02-03.txt | Bilansvarslova (trafikkforsikring, § 15) |
| 1986-03-21-747.txt | Trafikkreglene (TR) |
| 2005-10-07-1219.txt | Skiltforskriften |
| 1990-01-25-92.txt | Forskrift om bruk av kjøretøy (bruksforskriften) |
| 2004-01-19-298.txt | Førerkortforskriften (inkl. helsekrav, vedlegg 1) – kapittelvis |
| 2004-10-01-1339.txt | Trafikkopplæringsforskriften (øvelseskjøring, trafikalt grunnkurs) – kapittelvis |
| 2003-09-19-1164.txt | Forskrift om prikkbelastning |
| 1999-12-17-1309.txt | Forskrift om forbud mot håndholdt mobiltelefon |
| 1979-09-21-7.txt | Forskrift om personlig verneutstyr (bilbelte, barnesikring) |
| 2022-06-28-1233.txt | Bilforskriften (kap. 11, tilhenger) |
| 1994-10-04-918.txt | Kjøretøyforskriften (kap. 1, 3, 4) – kapittelvis |

## Læreplan og veiledning (`laereplan/`)

- `hb-v851-2016.pdf/.txt` – Håndbok V851 Læreplan førerkortklasse B, B kode 96 og BE (2016, CC BY-NC-ND, via NVA/Sikt).
- `endringslogg_klasse_b_og_be.pdf/.txt` – endringer i gjeldende V851:2026 (gjelder fra 1.2.2026; bare justeringer, bl.a. nye mål om førerstøttesystemer). Selve 2026-utgaven finnes kun i Vegnorm-leseren (kryptert PDF).
- `veiledning-klasse-b-2018.pdf/.txt` – Statens vegvesen: «Førerkortklasse B – opplæring, øvingskjøring og mengdetrening» (2018).

Den kommersielle læreboka «Veien til førerkortet» (Trafikkforlaget) er ikke fritt tilgjengelig og er ikke brukt.

## Situasjonsbilder (`../situasjonsbilder/`)

Bilder sett fra førerplass i `public/situasjon/` er hentet fra Statens vegvesens Vegbilder (NLOD), funnet via NVDB-skiltpunkt. Én JSON per bilde med skilt, vegreferanse og tidspunkt.

## Vekting i skiltpugging (`web/`)

- Karpicke & Roediger (2007), *Expanding retrieval practice promotes short-term retention, but equally spaced retrieval enhances long-term retention* (`gwern.net_…2007-karpicke.pdf`): utsatt første gjenhenting og lik avstand (5–5–5) slo økende avstand (1–5–9) etter 2 dager.
- Anki-dokumentasjonen, Learning/Relearning Steps (`docs.ankiweb.net_deck-options.html`): feilede kort må gjennom flere steg før de regnes som lært.
- FSRS-oppsummering (`domenic.me_fsrs`): modell over dager med mål om 90 % husking – for tung for økt-basert pugging.

## Nettkilder (`web/`)

Lærebok-/praksisfakta som ikke står i lovtekst: NAF (varsellamper, glatt føre, motorveg), Trygg Trafikk (avstand, sommerkjøring), USN (blending), NHI (HLR, varseltrekant på legemidler), Statens vegvesen (tunnelsikkerhet, salting, førerstøttesystemer), SNL (blindsone), Hella (bremsevæske), Kia og Tesla brukerhåndbøker på norsk (lufttrykk, servostyring, kjetting, ABS).
Sider som blokkerte curl (403) er hentet med nettleser (Playwright) og lagret som tekst.
