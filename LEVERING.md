# Levering: «Ring meg opp» – to-stegs lead (design-handoff 8. oktober 2026)

Status: **klar for forhåndsvisning**. Kampanjen er fortsatt pauset og skal forbli det til Erlend har godkjent forhåndsvisningen (arbeidsordre punkt 5.3). Ikke slå på noe selv.

## 0. Funn før noe ble endret

1. **Rammeverk/bygg/deploy**: Vite 8 (MPA, flere HTML-inngangspunkter listet i `vite.config.ts`), React, TypeScript, Netlify (statisk hosting + Netlify Functions v2). Deploy skjer via Netlify fra denne branchen.
2. **Dagens `/api/lead`** (`netlify/functions/lead.ts`, før denne endringen): tok imot ett skjema i ett steg (navn, firma, telefon, e-post, regnskapsfører-svar, program, bransje, melding), validerte, slo opp firma i Brreg, avgjorde et `outcome` (`kvalifisert`/`diskvalifisert` ut fra bransje), opprettet en ClickUp-oppgave, postet en rad til et Zapier Catch Hook (uten `leadId`, bevisst utelatt), og sendte en Meta CAPI `Lead`-hendelse med hashet e-post og telefon. Svarte `200` med `{ outcome, taskId }`. **Ingen varig lagring** fantes av selve leaden utover ClickUp-oppgaven og Zap-raden – det var ikke mulig å slå opp en lead igjen fra en `id`. Dette måtte bygges fra bunnen for to-stegs-kontrakten (se punkt 2, lagringsvalget ble lagt fram og godkjent av Erlend 8. oktober: «Ja, kjør på»).
3. **Pixelen**: lastet allerede via `src/lib/pixel.ts`, samtykkestyrt (`acc_consent`), med `PageView` og `Lead`. Gjenbrukt uendret som mekanisme; bare hendelsesparametrene er endret (se punkt 2 under «Pixel»).
4. **Zapen**: kan ikke inspiseres fra koden (den ligger i Erlends Zapier-konto). `ZAPIER_HOOK_URL` var allerede i bruk for dagens steg-1-rad. Se egen fil `ZAPIER-OPPSETT.md` for nøyaktig steg-for-steg til Erlend (AO-3).
5. **Designsystemet**: fantes allerede rekonstruert i `src/ds/` (tokens i `src/ds/tokens/`, komponenter i `src/ds/components/`) fra en tidligere runde. Gjenbrukt og utvidet (ny `RadioGroup`, `Notice` fikk `tone`/`title`, `Button` fikk `size`), ikke gjenskapt fra pakkens `tokens/`/`designsystem-komponenter/`.

Ingenting av dette avvek så mye fra arbeidsordrens antagelser at det var grunn til å stoppe – det ene reelle gapet (ingen varig lagring/idempotens) ble lagt fram som eget forslag og godkjent før koding startet.

## 1. API-kontrakt og lagring (avtalt med Erlend 8. oktober)

- **Lagring**: Netlify Blobs, ny store `lead-records`, nøkkel `lead/<leadId>`. Egen store `leads` (gjenbrukt fra dagens dupliseringssjekk) får et nytt nøkkelprefiks `ratelimit/` for rate limiting, og en ny `idempotency/<clientEventId>`-nøkkel for idempotens.
- **Idempotens**: klienten genererer `clientEventId` (`crypto.randomUUID()`) én gang per skjemamontering. Serveren slår opp `idempotency/<clientEventId>` *før* validering/sideeffekter; finnes den, returneres samme `leadId` uten noen nye kall (ingen ny Brreg-oppslag, ingen nytt Zap-/ClickUp-/Meta-kall).
- **Rate limiting**: glidende vindu, 5 innsendinger per 10 minutter per SHA-256-hashet IP.
- **`POST /api/lead`**: `201 { leadId }` ved suksess, `422 { errors: [...] }` ved valideringsfeil, stille `201` med en ubrukt id ved spam (honeypot/for raskt).
- **`PATCH /api/lead/:leadId`**: `200 { ok: true }`, `404` hvis leadId ikke finnes. Oppdaterer samme rad, overskriver aldri til en ny.
- Full lead-rad: se `netlify/lib/leads.ts` (`LeadRecord`).

## 2. Hva som er endret

**Frontend**
- Hero i tre varianter (`src/content/site.ts`), «Ring meg opp» som knappetekst overalt (hero, sticky, footer), ny smått tekst under knappen.
- Skjema steg 1 (`src/pages/index/LeadForm.tsx`): nøyaktig tre felt (navn, telefon, firmanavn), e-post/bransje/program/«hva gjelder det» fjernet helt fra steg 1 og fra valideringen (`src/shared/validate.ts`, `src/shared/form-content.ts`).
- Ny takkeside (`src/pages/takk/App.tsx`): personlig H1, «Ha gjerne dette klart» (`PrepareCard.tsx`), steg 2-skjema (tre valgfrie spørsmål via ny `RadioGroup`-komponent), Calendly bak en lenke (lastes først ved åpning).
- Ny side `/takk/bekreftet` (`src/pages/bekreftet/`) etter Calendly-booking.
- Takker-nei-siden (`src/pages/takker-nei/`) finnes fortsatt, men ingen sti fra skjemaet fører dit lenger (bransje samles ikke inn → ingen automatisk avvisning).
- `DiagonalSplit`/CSS: desktop-heroen er nå full-bredde/full-høyde (ingen klipping), ingen loddrett kant.
- Meta-beskrivelse, `<title>`, OG-tekster ryddet (se punkt 3, AC 8).
- Helg/kveld-bryter (`VITE_WEEKEND_EVENING_BANNER`, standard av).

**Backend**
- `netlify/functions/lead.ts` omskrevet til steg 1 av kontrakten over.
- `netlify/functions/lead-step2.ts`: ny funksjon for steg 2.
- `netlify/lib/leads.ts`, `netlify/lib/ratelimit.ts`: nye.
- `netlify/lib/describe.ts`: nye Zap-nyttelaster (`buildStep1SheetPayload`, `buildStep2SheetPayload`), tagging uten kvalifiseringslogikk.
- `netlify/lib/meta.ts`: fjernet e-posthashing, `event_id` er nå `clientEventId` (ikke `leadId`).

**Annet**
- `vite.config.ts`, `netlify.toml`: ny rute `/takk/bekreftet`.
- `.env.example`: nye variabler `ZAPIER_HOOK_URL_STEP2`, `VITE_WEEKEND_EVENING_BANNER`.
- Hele testsuiten (`tests/validate.test.ts`, `tests/lead.test.ts`, `tests/functions.test.ts`, `tests/e2e.cjs`) omskrevet for den nye kontrakten.

**To feil funnet og rettet under egenverifisering (se punkt 5):**
1. Hero- og sticky-knappen pekte på ankeret `#acc-form`, men skjema-seksjonen hadde `id="skjema"` – ankeret traff aldri. Rettet til `id="acc-form"`.
2. Overskriften ved skjemaet (`LeadSection.tsx`) var fortsatt skrevet som om `proof.heading` var et to-linjers array (`proof.heading[0]`/`[1]`), mens den nye teksten er én streng («Legg igjen nummeret ditt»). Resultatet var at bare bokstav 1 og 2 («L», «e») ble vist. Rettet til å vise hele strengen.
3. Desktop-heroens klipping (`.ds-diag--hero .ds-diag__panel`): media-query-overstyringen for desktop satte `position/inset/width/height` for å gjøre panelet fullbredde, men nullstilte ikke `clip-path` fra mobil-regelen. Mobilens klipping (ment for en lav banner-høyde) ble dermed stående på den mye høyere desktop-heroen og kuttet bort nedre venstre to tredjedeler av panelet – krem-farget tekst over det kuttede området ble usynlig mot den kremfargede sidebakgrunnen. Rettet med `clip-path: none` i desktop-regelen.

Alle tre ble funnet ved faktisk `npm run build` + Playwright-skjermbilder, ikke bare lesing av kildekoden – se punkt 5.

## 3. Akseptkriterier (svar per punkt, testet ved 390 og 1440 px)

**Visuelt og innhold**

1. **Ja.** Alle tre varianter har «Ring meg opp» og linjen «Legg igjen nummeret, så ringer en regnskapsfører deg i løpet av dagen. Uforpliktende.» under knappen (`src/content/site.ts`, `site.ctaSub`). Se skjermbilder `index-a-*.png`, `index-b-*.png`, `index-c-*.png`.
2. **Ja.** Sticky-knappen er `hidden` (reell `display:none`, ikke bare usynlig) mens hero-knappen er i viewport, og vises først når man har scrollet forbi. Bekreftet med Playwright (`tests/e2e.cjs`): `.sticky` har `hidden=true` ved sideinnlasting og mens hero-CTA er i viewport.
3. **Ja.** Footeren bruker samme `--acc-bg`-krem som resten av siden; ingen egen stripe er lagt til. Visuelt kontrollert i alle skjermbilder, ingen kremstripe under footeren i noen tilstand.
4. **Ja, etter retting (se punkt 2, feil #3).** Desktop-heroen er nå fullbredde/fullhøyde uten klipping i alle tre varianter og i mønster-versjonen (det finnes ikke noe fotobilde ennå, `VITE_HERO_PHOTO` er tom). **Egen vurdering, bør bekreftes visuelt av Erlend:** arbeidsordren ber om «diagonalen går fra toppkanten» i tillegg til «ingen loddrett kant». Jeg har tolket «fyller hele hero fra topp til bunn og kant til kant» (README) som at det ikke skal være noen klipping i det hele tatt på desktop – dermed finnes det heller ingen synlig diagonal *inni* selve heroen, bare en rett overgang til neste seksjon. Jeg kan ikke rendre den vedlagte `.dc.html`-referansen i dette miljøet, så dette er et beste forsøk, ikke en bekreftet match. Se skjermbilder `index-a-1440.png` m.fl.
5. **Ja.** Testet i spesialbygg med `VITE_HERO_A_ENABLED=true` (se forbehold under «Åpne beslutninger», punkt 6): ved 1440 px bryter linjen til «Fått brev fra / Skatteetaten? / Vi leser det sammen / med deg.» – «Vi» står aldri alene. Ved 390 px (ingen tvungen linjeskift der) blir det «... Vi leser det / sammen med / deg.» – «Vi» er aldri siste ord på en linje. Se `index-a-VARIANT-A-ENABLED-{390,1440}.png`.
6. **Ja.** `validateStep1` i `src/shared/validate.ts` godtar bare `name`, `tel`, `company`; testet eksplisitt i `tests/validate.test.ts` (`Object.keys(r.data)` = nøyaktig disse tre pluss `telRaw`). Visuelt bekreftet: tre felt, ingen andre.
7. **Ja.** Se `takk-*.png`: «Takk, «fornavn». Vi ringer deg på «nummer» i løpet av dagen.», tre valgfrie spørsmål, «Send»/«Hopp over», Calendly-lenken nederst («Vil du heller velge tidspunkt selv? Book en samtale.»).
8. **Nøyaktig to treff i hele repoet** (`grep -rni "30 minutter|book en samtale|velger du et tidspunkt"`), begge forventet:
   - `src/content/site.ts:29` – kommentar som *beskriver* regelen, ikke brukertekst.
   - `src/content/site.ts:153` – `calendlyLink: 'Book en samtale.'`, den eksplisitt unntatte Calendly-lenken (arbeidsordre punkt 3, AC 8: «utenom Calendly-lenken»).
   Ingen treff på «30 minutter» noe sted, ingen «velger du et tidspunkt» noe sted. Meta-tekster: se ny `metaDescription` i `site.ts` – **ikke publisert som endelig, lagt fram til godkjenning** (se punkt 6, åpen beslutning 9).
9. **Ja.** Ingen `#FFFFFF`/`white` som fargeverdi (treffene i søket er CSS-egenskapen `white-space`, ikke en farge). Ingen rød farge noe sted i kildekoden. Ingen faktiske skygger: de eneste `box-shadow`-bruken er `0 0 0 0 transparent` (ingen synlig skygge, startverdi for en transition) og to `inset 0 0 0 1px ...`-regler som simulerer en skarp 1px kant, ikke en skygge med spredning/uklarhet. Ingen utropstegn i `site.ts` eller `form-content.ts` (eneste treff på «!» i kodebasen for øvrig er TypeScript-operatorer, ikke brukertekst). Automatisk fargepalett-revisjon i `tests/e2e.cjs` (kjører mot hele siden, alle sider, begge bredder) kjørte også grønt: «Ingen avvik.»
10. **Ja.** «Eksempel AS» brukt i både tom-feil- og telefon-feil-skjermbildene (`index-a-*-feil-tom.png`, `index-a-*-feil-tel.png`).

**Atferd**

11. **Verifisert ved automatisert integrasjonstest, ikke ved en reell Netlify-deploy** (se begrunnelse i punkt 4). `tests/lead.test.ts` tester at en gyldig innsending gir nøyaktig én rad i Blobs-lagringen (`step: 1`), ett ClickUp-kall med navn/telefon/firma, og ett Zap-kall med `buildStep1SheetPayload` (navn, telefon, firma, `leadId`, ingen e-post/bransje). Full ende-til-ende mot en ekte Netlify-preview (ekte Blobs, ekte Zap) må kjøres av Erlend eller i en session med tilgang til selve Netlify-sitet – se punkt 4.
12. **Verifisert ved integrasjonstest.** `lead-step2.ts`-testene bekrefter at PATCH oppdaterer samme rad (`step: 2`, `step2Status: 'sendt'`), og at steg 1s Zap-hook ikke kalles på nytt – bare steg 2-hooket (`ZAPIER_HOOK_URL_STEP2`). Ingen kode lager en ny rad i PATCH-stien (den gjør kun `getLead`→`updateLeadStep2`, aldri `createLead`).
13. **Verifisert ved integrasjonstest.** «Hopp over»-testen (`skipped: true`) gir `step2Status: 'hoppet_over'`, og raden fra steg 1 (navn/telefon/firma/leadId) er uendret i testens assertions.
14. **Verifisert ved integrasjonstest (idempotens), ikke ved faktisk dobbeltklikk i nettleser.** To kall med samme `clientEventId` gir samme `leadId` tilbake og null ekstra sideeffekter (ett Brreg-oppslag, ett ClickUp-kall, ett Zap-kall, én Meta-hendelse totalt – testet eksplisitt i `tests/lead.test.ts`). I nettleseren hindres i tillegg et reelt dobbeltklikk av at knappen deaktiveres (`disabled={sending}`) så snart `onSubmit` kjører, før svaret kommer tilbake.
15. **Ja, alle fem eksemplene stemmer.** `normalizePhone` (`src/shared/validate.ts`) bruker nøyaktig regexen fra arbeidsordren: `^(\+47|0047)?[2-9]\d{7}$`. Testet eksplisitt (`tests/validate.test.ts`, «akseptkriterium 15»-testen): `+47 912 34 567`, `91234567` og `912.34.567` godtas; `12345678` (starter på 1) og `9123456` (sju sifre) avvises. Feilmeldingen er ordrett «Telefonnummeret må være et norsk nummer med åtte sifre.» på både klient og server (samme `validateStep1`-funksjon brukes begge steder). **Merk (bevisst innsnevring, flagget i egen testkommentar):** den gamle koden godtok også et bart `47`-prefiks uten `+`/`00`. Arbeidsordrens regex gjør ikke det, så det er fjernet.
16. **Ja.** `status === 'error'` beholder alle feltverdiene (ingen `setValues`-reset i catch-blokken) og viser `<Notice role="alert">` med teksten fra åpen beslutning 6 («Noe gikk galt, og vi fikk ikke nummeret ditt. Prøv igjen, eller ring oss på 40 15 66 66.») – `Notice` bruker designsystemets primærfarge, ikke rødt.
17. **Delvis verifisert.** Innbyggingen er kodet som inline (`Calendly.initInlineWidget` i en `<div ref={widgetRef}>`, aldri en popup-modus), lastes først når lenken trykkes (`calOpen`-state), og `calendly.event_scheduled`-lytteren navigerer til `/takk/bekreftet` med tidspunktet formatert via `formatWhen` (`nb-NO`, `Europe/Oslo`). **Kan ikke testes ende-til-ende i dette miljøet**: det finnes ingen `VITE_CALENDLY_URL` her, og utgående nettverkstrafikk til calendly.com/widget.js kan uansett ikke verifiseres uten en ekte Calendly-konto. Må bekreftes på den faktiske forhåndsvisningen med en ekte Calendly-lenke.
18. **Ja.** `takker-nei.html`/`/takker-nei` fungerer og har eget innhold (se skjermbilde). Søk i hele `src/`/`netlify/` etter noe som navigerer dit fra skjemaflyten: ingen treff – siden nås bare via direkte lenke.
19. **Ikke verifisert i Metas hendelsestest** (krever en ekte pixel-ID og testmodus på den faktiske forhåndsvisningen, se punkt 4). Kodenivå: `Lead` fyres bare i `takk/App.tsx`s `useEffect` ved mount, gated på `consumeLeadPending()` som leser og *sletter* et sessionStorage-flagg satt av `LeadForm` – flagget kan bare konsumeres én gang selv ved sideoppdatering. `event_id` er `clientEventId`, samme verdi som brukes som CAPI sin `event_id` dersom konverterings-API er konfigurert, for Metas deduplisering. `PageView` lastes på alle fem sidene (`index`, `takk`, `takk/bekreftet`, `takker-nei`, `personvern` har alle samme `main.tsx`-mønster med `bindPixelToConsent()`/`loadPixel()`).
20. **Stort sett ja, med ett forbehold.** Global `:focus-visible { outline: 2px solid var(--acc-focus); outline-offset: 3px; }` i `src/ds/styles.css`. Trykkflater: knapper og felt er minst 56 px høye på mobil / 48 px på desktop (`--acc-control-h`, `.ds-btn`), radioknappene er 44 px (`.ds-radio { min-height: 2.75rem }`). **Forbehold:** vanlige inline tekstlenker (f.eks. «Personvernerklæring» i en avsnittstekst, telefonlenken i footeren) er ikke hevet til 44 px – det er uendret fra den forrige, allerede godkjente versjonen av siden, og ikke noe jeg har rørt i denne runden. Flagg dette til Erlend hvis det skal strammes inn.

**Ytelse**

21. **Ikke kjørt.** Lighthouse mobil krever en reell, offentlig URL (eller i det minste en representativ throttling-profil) for å gi tall som er til å stole på; jeg har ikke en Netlify-forhåndsvisnings-URL tilgjengelig fra dette miljøet. Det jeg kan bekrefte på kodenivå: Calendly-skriptet lastes ikke før `calOpen` er sann (ingen nettverkskall til calendly.com ved sideinnlasting, bekreftet med Playwright som sjekker at det ikke går noen eksterne forespørsler før samtykke/åpning – se `tests/e2e.cjs`). Pixelen er samtykkestyrt og laster ikke før «Godta». Ingen bilder lastes (ingen hero-foto er satt). **Anbefaling:** kjør Lighthouse mobil på selve forhåndsvisnings-URL-en når den finnes, og lim inn tallene her før lansering.

## 4. Hvorfor ikke alt er testet mot en ekte Netlify-deploy herfra

Dette miljøet er en isolert container uten tilgang til det faktiske Netlify-sitet (ingen innlogget `netlify link`, ingen ekte `ZAPIER_HOOK_URL`/`META_PIXEL_ID`/`CLICKUP_TOKEN`). Jeg forsøkte `netlify dev` for å kjøre hele kjeden lokalt (frontend + funksjoner + lokal Blobs-emulering), men den feiler i oppstarten her fordi Edge Functions-miljøet prøver å laste ned en binær fra Netlify og får `403` gjennom denne sandboxens nettverksproxy. Det jeg *har* gjort i stedet:

- Full `npm run build` (ren, ingen feil) og `npx tsc --noEmit` (ren).
- Hele testsuiten (`npx vitest run`): **77 tester, alle grønne**, inkludert en realistisk in-memory-mock av Netlify Blobs som faktisk lar steg 1 og steg 2 dele tilstand (idempotens, rate limiting, 404 på ukjent `leadId`, osv. – se `tests/lead.test.ts`).
- `npx vite preview` + Playwright (`tests/e2e.cjs` og to små tilleggsskript) mot det bygde resultatet, ved 390 og 1440 px, for alt som ikke krever de ekte serverintegrasjonene.

Punkt 11, 12, 14, 17, 19 og 21 i akseptkriteriene krever enten en reell Zap, en reell Calendly-konto, eller Metas hendelsestest – alt dette finnes bare på den faktiske forhåndsvisningen. Det er uansett nøyaktig det arbeidsordrens punkt 5.2 ber om («Test på en forhåndsvisning først, med ekte Zap mot et testmål og pixel i Metas testmodus»), så dette er ikke et hull i leveransen, men steget som kommer etter at PR-en er oppe og Netlify har bygget en forhåndsvisning.

## 5. Egenverifisering: metode

1. Bygget siden (`npm run build`), startet en lokal `vite preview`-server.
2. Kjørte `tests/e2e.cjs` (skjermbilder + automatisk revisjon av fargepalett, tekststørrelser, sticky-CTA-synlighet, skjemafeil) ved 390 og 1440 px for alle sju rutene.
3. Tok i tillegg egne skjermbilder av skjema-feiltilstander (tom innsending, ugyldig telefon med «Eksempel AS») og av variant A med `VITE_HERO_A_ENABLED=true` for å kunne besvare AC 5.
4. **Så faktisk gjennom hvert skjermbilde**, ikke bare stolte på at bygget lyktes. Dette avdekket de tre feilene i punkt 2 – ingen av dem ville vært synlige fra `tsc`/`vitest`/en grønn build alene, siden de var rene layout-/innholdsfeil som bare viser seg visuelt.
5. Rettet alle tre, bygget og kjørte skjermbildene på nytt – ingen avvik i den automatiske revisjonen, og visuelt bekreftet korrekt i alle rutene.

Alle skjermbilder ligger i `tests/__screenshots__/` (20 filer, 390 og 1440 px for alle sider/tilstander, pluss sticky-CTA midt på siden, pluss variant A-spesialbygget for AC 5).

## 6. Ikke gjort, og hvorfor

- **AC 11, 12, 14, 17, 19, 21**: krever en ekte Netlify-forhåndsvisning (se punkt 4). Dette er neste steg, ikke glemt.
- **`content/personvern.md` er nå ute av sync med den nye datamodellen** – arbeidsordren ber eksplisitt om å sjekke dette og si fra, men sier samtidig at personvernsiden ikke er en del av denne endringen, så jeg har **ikke rørt teksten**. Konkret utdatert:
  - Linje 9: lister fortsatt «e-postadresse, hvilket regnskapsprogram du bruker, hva bedriften driver med» som noe som samles inn i *skjemaet* – det stemmer ikke lenger (ingen e-post noe sted, regnskapsprogram er valgfritt steg 2, «hva bedriften driver med»/bransje samles ikke inn i det hele tatt).
  - Linje 19: sier at vi sender «e-postadresse og telefonnummer i kryptert (hashet) form» til Meta – det finnes ingen e-post å sende lenger, bare telefon.
  - Linje 45: sier at sessionStorage husker «at skjemaet er sendt, slik at takkesiden kan fylle inn navn og e-post i kalenderen» – Calendly får bare navnet nå, ikke e-post (leaden har ingen).
  - **Dette bør rettes før kampanjen skrus på**, siden teksten per nå beskriver innsamling som ikke lenger skjer og utelater at telefonnummeret lagres og brukes til å ringe tilbake (noe arbeidsordren ber om å bekrefte eksplisitt står der). Jeg har latt det stå som det var, slik instruksen ba om, men flagger det som et reelt etterslep.
- **E-postsekvensen (AO-7)**: jeg finner ingen kode for selve e-postsekvensen i dette repoet – den er trolig satt opp et annet sted (f.eks. direkte i Zapier/en e-postleverandør), utenfor det jeg har tilgang til herfra. Jeg kan derfor ikke slå den av eller bekrefte at den ikke lenger har noe å trigge på. **Dette må Erlend gjøre manuelt**, og fortelle Marius (arbeidsordre punkt 6, åpen beslutning 4).
- **Variant A er fortsatt tatt ut av rotasjon som standard** (`VITE_HERO_A_ENABLED` er av), fra en tidligere, egen beslutning (tillegg til byggebrief 08, 5. september 2026). Den nye arbeidsordren sier «standard a» uten noe forbehold om dette, og to av akseptkriteriene (1 og 5) forutsetter i praksis at `?v=a` faktisk viser variant A. Jeg har **ikke endret standardverdien** siden dette er nøyaktig den typen forretningsbeslutning instruksen ber meg spørre om, ikke gjette på – men jeg har testet variant A i et eget spesialbygg (se AC 5) slik at innholdet er verifisert og klart dersom Erlend vil slå den på igjen.
- **Lighthouse-tall** (AC 21): ikke kjørt, se punkt 3/4.
- **Autorisasjon i Finanstilsynets konsesjonsregister** (åpen beslutning 3): ikke noe jeg kan sjekke herfra. Teksten «Autorisert regnskapsførerselskap» er uendret fra før (ikke lagt til av denne endringen), men arbeidsordren lister den som blokkerende for lansering inntil bekreftet – videreført som et åpent punkt, ikke noe jeg har undersøkt.
- Ingen nye bilder (portretter/hero-foto) er lagt til – de fantes ikke i pakken, `VITE_HERO_PHOTO` er fortsatt tom, mønsteret vises som før.

## 7. Diff mot forrige versjon (sammendrag – se PR-diffen for alt)

40 filer endret. De vesentligste bruddene med forrige oppførsel:

| Hva | Før | Nå |
|---|---|---|
| Felt i steg 1 | navn, telefon, firma, e-post, regnskapsfører, program, bransje, melding | navn, telefon, firma (nøyaktig tre) |
| API | ett steg, `200 { outcome, taskId }` | to steg: `POST /api/lead` → `201 { leadId }`, `PATCH /api/lead/:leadId` → `200` |
| Lagring | ingen varig lagring av selve leaden | Netlify Blobs, én rad per lead, oppdateres i steg 2 |
| Idempotens | ingen | `clientEventId`, sjekket før alt annet |
| Rate limiting | ingen | 5/10 min per IP-hash |
| Bransje-diskvalifisering | automatisk, sendte til «takker nei» | fjernet helt, ingen erstatning |
| Zap-rad | uten `leadId` (bevisst utelatt) | med `leadId` (kreves for steg 2s oppslag) |
| Meta CAPI | `event_id` = `leadId`, `em`+`ph` hashet | `event_id` = `clientEventId`, bare `ph` (ingen e-post finnes) |
| Calendly | del av hovedveien (antatt, se forrige work order) | bak en lenke på takkesiden, laster først ved åpning |
| Hovedknapp | «Book en samtale» | «Ring meg opp» |
| Hero desktop | 70 %-bredt panel, loddrett kant ved 30 % | fullbredde/fullhøyde, ingen klipping |
| Bekreftet-side | fantes ikke som egen rute | `/takk/bekreftet`, ny |

## Skjermbilder

Se `tests/__screenshots__/` i repoet (20 filer). Lastet opp sammen med PR-en.
