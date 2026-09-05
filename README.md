# leads.accountera.no

Landingsside for betalt Meta-trafikk: én hovedside med tre hero-varianter, skjema, takkeside med Calendly, «takker nei»-side og personvernside. Innsendte skjema havner i ClickUp-listen «Accountera – leads» innen sekunder, Zapier varsler kunden, og leseren booker samtale på takkesiden.

Bygget etter byggebriefen av 3. september 2026. Vite + React (flersidig, statisk bygg), Netlify Functions, Netlify Blobs.

## Status: hva som er rekonstruert, og hva som må kontrolleres

Leveransen inneholdt rendringene fra runde 1, men verken designsystemets zip («Accountera Design System») eller Claude Design-filen «Accountera Landingsside.dc.html» etter runde 2. Derfor:

- **`src/ds/` er en rekonstruksjon** av designsystemet fra rendringene og briefen: tokens (tre farger, Outfit 100/400/500), `Logo` (vektor generert fra Outfit med opentype.js, E som tre streker), `BrandPattern`, `DiagonalSplit` (36°), `Button`, `Input`/`Select`/`Textarea`, `Notice`, `Card`. Når den ekte zipen foreligger, byttes innholdet i `src/ds/` ut, og komponent-API-ene tilpasses. Sidekoden importerer bare fra `src/ds/index.ts`.
- **Tekstene** i `src/content/site.ts` og `src/shared/form-content.ts` er transkribert ordrett fra rendringene, med runde 2-endringene fra briefen. Feilmeldingene i `errors` (`src/shared/form-content.ts`) er godkjent ord for ord (rettelse fra co-work-chatten, 4. september 2026). To ting gjenstår å kontrollere mot dc.html: valgene i de to nedtrekkene (bare «Fiken», «Bygg, anlegg og håndverk», «Landbruk og skogbruk» og «Energi og kraftproduksjon» er bekreftet) og tittelen i bekreftet tilstand uten tidspunkt.
- Outfit ligger som variabel woff2 i `src/ds/assets/fonts/` (OFL) og serveres fra eget domene med `preload`.

## Struktur

```
index.html, takk.html, takker-nei.html, personvern.html   Inngangspunkter (Vite MPA)
src/pages/{index,takk,takker-nei,personvern}/            Sidene
src/components/                                          Header, Footer, ConsentBar, StickyCta, Page
src/ds/                                                  Designsystem (tokens, styles, komponenter, fonter, logo)
src/content/site.ts                                      Alle tekster utenom skjemaet
src/shared/                                              Delt mellom nettleser og funksjoner: validering, skjematekster, Enhetsregister-matching
src/lib/                                                 Klient: config, sessionStorage, variant/UTM, samtykke, pixel, tellere
netlify/functions/{lead,view,stats}.ts                   Funksjoner
netlify/lib/                                             ClickUp, Zapier, Meta CAPI, Enhetsregisteret, tellere, logg
content/personvern.md                                    Personvernerklæringen (markdown, rendres ved bygg)
tests/                                                   Enhetstester (vitest) og regresjonskontroll (Playwright)
netlify.toml                                             Headere, ruter, funksjoner
```

## Miljøvariabler

Se `.env.example`. Ingen verdier i repoet. I produksjon settes de i Netlify under Site settings → Environment variables.

| Variabel | Hvor den brukes | Uten verdi |
|---|---|---|
| `VITE_CALENDLY_URL` | `/takk` | Takkesiden viser «Kalenderen lastet ikke. Vi ringer deg i stedet.» |
| `VITE_META_PIXEL_ID` | Pixel i nettleseren, etter samtykke | Ingen pixel lastes |
| `VITE_HERO_PHOTO` | Sti til hero-foto, f.eks. `/hero.jpg` i `public/` | Mønsteret vises (produksjon) |
| `VITE_HERO_A_ENABLED` | Sett til `true` for å ta hero-variant A tilbake i rotasjon | `?v=a` faller tilbake til variant C |
| `VITE_PRIVACY_APPROVED` | `/personvern`, sett til `true` når Accountera har godkjent teksten | Utkast-varselet vises øverst på siden |
| `VITE_QUOTE_APPROVED` | Kundesitatet ved skjemaet, sett til `true` når skriftlig «ja» foreligger fra kunden | Sitatfeltet rendres ikke |
| `CLICKUP_TOKEN` | `/api/lead` | Task opprettes ikke; leadet går til Zapier med `taskId: null`, loggen roper |
| `ZAPIER_HOOK_URL` | `/api/lead` | Ingen varsling |
| `META_PIXEL_ID`, `META_CAPI_TOKEN` | `/api/lead`, Conversions API | Ingen CAPI-hendelse |
| `META_TEST_EVENT_CODE` | Valgfri, viser CAPI i Metas Test Events | |
| `STATS_KEY` | `/api/stats` | Endepunktet svarer 503 |
| `CLICKUP_LIST_ID`, `CLICKUP_SPACE_ID` | Valgfri overstyring | Standard: `901525768674` / `90154749971` |
| `SITE_URL` | `event_source_url` mot Meta hvis Origin mangler | |

`VITE_`-variablene bygges inn i nettleserbundelen. De andre finnes bare på serveren.

## Kjøre lokalt

```
npm install
cp .env.example .env        # fyll inn det du har
npx netlify dev             # sider på http://localhost:8888, funksjoner på /api/*
```

`netlify dev` starter Vite (port 5173) og proxyer den, kjører funksjonene og gir en lokal sandkasse for Netlify Blobs. `npm run dev` alene gir bare sidene (uten `/api/*`); rutene `/takk` osv. fungerer også der.

Andre kommandoer:

```
npm run build       # statisk bygg til dist/
npm run preview     # server dist/ på :4173
npm test            # enhetstester (vitest)
npm run typecheck   # tsc for klient og funksjoner
node tests/e2e.cjs  # regresjonskontroll mot :4173 (krever build + preview + Chromium)
```

## Endre ting uten å røre koden

- **Calendly-URL:** `VITE_CALENDLY_URL`. Fargene og `hide_gdpr_banner` legges på automatisk. Arrangementet må ha ett egendefinert spørsmål («Telefonnummer»); telefonen fylles inn som svar `a1`.
- **Sitat:** teksten ligger statisk i `src/content/site.ts` (`testimonial`), ikke i en miljøvariabel. Vises bare når `VITE_QUOTE_APPROVED=true` i Netlify, satt manuelt når skriftlig «ja» foreligger fra kunden. Standard er «false».
- **Foto-modus:** legg bildet i `public/` og sett `VITE_HERO_PHOTO=/hero.jpg`. Tomt = mønster. Aldri plassholder.
- **Hero-variant A:** tatt ut av rotasjon (tillegg til byggebrief 08, 5. september 2026). `VITE_HERO_A_ENABLED=true` henter den tilbake. Av: `?v=a` faller tilbake til variant C i `src/lib/variant.ts`, før noe annet leser variant, så hero, kortrekkefølge, tellere og skjemaets skjulte `v`-felt alle får C.
- **Tekster:** `src/content/site.ts` (sider) og `src/shared/form-content.ts` (skjema, valg, feilmeldinger). Feilmeldingene deles av nettleser og funksjon.
- **Personvernerklæring:** `content/personvern.md`. Sett `VITE_PRIVACY_APPROVED=true` i Netlify når Accountera har godkjent teksten, så forsvinner utkast-varselet uten kodeendring.
- **Utfallslogikk:** `DISQUALIFYING_BRANSJER` i `src/shared/form-content.ts`.

## Ruter og sporing

| Rute | Innhold | Hendelser |
|---|---|---|
| `/?v=a|b|c` | Hovedsiden. Ukjent eller manglende `v` gir `a`. Variant, UTM og `fbclid` lagres i `sessionStorage` og følger skjemaet som skjulte felt | `PageView` (etter samtykke), teller `/api/view?v=` |
| `/takk` | Calendly inline, forhåndsutfylt. Bekreftet tilstand ved `calendly.event_scheduled` | `Lead` én gang med `eventID = leadId` (samme som CAPI), `Schedule`, teller `/api/view?p=takk` |
| `/takker-nei` | Diskvalifisert bransje | Ingen pixel |
| `/personvern` | Markdown | `PageView` (etter samtykke) |

Alle ruter er `noindex` (meta og `X-Robots-Tag`), `robots.txt` avviser alt.

**Samtykke:** valget lagres som `acc_consent` i `localStorage`. Ingen Meta-skript, ingen `fbq`, ingen CAPI før «Godta». På mobil vises samtykkelinjen i stedet for sticky CTA til leseren har valgt.

**Tellere:** `GET /api/stats?key=<STATS_KEY>` (eller header `x-stats-key`) returnerer visninger per dag og side som JSON, uten persondata. Sammen med antall tasks i ClickUp gir det fullføringsgrad på skjemaet.

## Funksjonen `/api/lead`

Rekkefølgen er briefens punkt 6: stille spamavvisning (honningfelle eller under tre sekunder etter `t0`), validering med samme regler og tekster som i nettleseren, utfall fra bransje, oppslag i Enhetsregisteret (3 s tidsavbrudd, blokkerer aldri), ClickUp-task, Zapier → Google Sheet, Meta CAPI ved samtykke, svar `{ leadId, taskId, utfall }`.

**Lead-registeret er et Google Sheet, ikke ClickUp** (avgjørelse 5. september 2026 — Marius valgte Sheet i oppstartsworkshopen, prosjektteksten som sa ClickUp var feil). Det endrer kritikaliteten på de to eksterne kallene:

- **ClickUp er sekundært.** Et arbeidsverktøy, ikke registeret. Task med tagger `vinkel-a|b|c` og `kvalifisert|diskvalifisert|ikke-verifisert` (pluss `duplikat` og `har-byraa|foerer-selv|tidligere-byraa`). Prøves to ganger (`netlify/lib/clickup.ts`), men feiler det likevel, eller mangler `CLICKUP_TOKEN`, stopper det aldri innsendingen. Logges på `warn`-nivå (`lead.clickup_failed`, `lead.clickup_token_missing`), ikke `error`.
- **Zapier → Sheet er kritisk.** Feiler det permanent, mister vi henvendelsen. `postToZapier` (`netlify/lib/zapier.ts`) prøver derfor på nytt én gang. Lykkes ingen av forsøkene, logges det på `error`-nivå (`zapier.failed`, `lead.row_not_written`) med `leadId`, aldri med selve nyttelasten (som har navn, telefon, e-post). Leseren får uansett `200`; innsendingen skal aldri «ryke» på et eksternt kall.

**Nyttelasten til Zapier er en kontrakt** (tillegg til byggebrief 08, 5. september 2026), bygget av `buildSheetPayload` i `netlify/lib/describe.ts`. Nøyaktig disse nøklene, ingen flere, ingen færre:

| Nøkkel | Kilde |
|---|---|
| `timestamp` | ISO 8601, tidspunkt for innsending |
| `navn`, `firma`, `telefon`, `epost`, `melding` | skjemaet, `telefon` som E.164 (`+47…`) |
| `har_regnskapsforer`, `regnskapsprogram`, `bransje` | skjemaet, rå valgtekst |
| `vinkel` | varianten som faktisk ble vist (`a`/`b`/`c`), ikke nødvendigvis den som ble bedt om i URL-en |
| `utm_source`, `utm_campaign`, `utm_content` | annonseparametere |
| `orgnr` | fra Enhetsregisteret, tom streng uten verifisert treff |
| `brreg_treff` | `ja`/`nei` — fikk vi et verifisert treff i det hele tatt |
| `kvalifisert` | `ja`/`nei`/`ikke verifisert` — `nei` ved diskvalifiserende bransje, ellers `ja` med verifisert treff, ellers `ikke verifisert` |
| `clickup_url` | tom streng hvis ClickUp ikke ble brukt |

«Har du regnskapsfører i dag?» måler bare sammensetningen av henvendelser. Den påvirker aldri `utfall`/`kvalifisert`, som fortsatt bare bygger på bransje og Enhetsregisteret (`decideOutcome` i `src/shared/validate.ts`, `buildSheetPayload` i `netlify/lib/describe.ts`).

Loggen inneholder `leadId`, utfall og hvilke steg som lyktes. Aldri navn, telefon eller e-post.

**Miljøvariabler leses ved deploy, ikke ved hvert kall.** En variabel satt eller endret i Netlifys grensesnitt gjelder først etter neste bygg (samme mekanisme som gjør at `VITE_`-variabler krever nytt bygg for å slå inn). Legg til eller endre en variabel, og trigg et nytt bygg (`Deploys` → `Trigger deploy` → `Deploy site`) hvis ingen kodeendring følger med.

Taggene opprettes i spacet ved første kjøring hvis de mangler.

## Sikkerhetsheadere

`netlify.toml` setter en Content-Security-Policy som slipper gjennom akkurat det som trengs: `connect.facebook.net` og `www.facebook.com` (pixel), `assets.calendly.com` og `calendly.com` (kalender), `data.brreg.no`. Legges det til andre tredjeparter, må CSP-en utvides, ellers feiler de stille. Test pixel og Calendly i nettverksfanen etter enhver endring der.

## Testplan og regresjonskontroll

Briefens punkt 15 og 16. `node tests/e2e.cjs` tar skjermbilder av alle ruter og varianter ved 390 og 1440 (`tests/__screenshots__/`) og måler i DOM: bare de tre fargene, brødtekst ≥ 18 px ved 390, Thin ≥ 40 px, sticky CTA skjult ved hero-knapp og skjema, Calendly-høyde, ingen eksterne kall før samtykke, feilfokus. Avvik skrives til `tests/__screenshots__/problems.txt`.

Det som ikke kan testes her og må gjøres før lansering: ekte innsending mot ClickUp og Zapier, Metas Test Events med pixel og CAPI deduplisert på samme `event_id`, Calendly-booking, Facebook-appen på iOS og Android, Lighthouse.
