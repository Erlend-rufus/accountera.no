# Zapier-oppsett: «Ring meg opp» (AO-3)

Til: Erlend. Dette må gjøres i Zapier-kontoen, jeg har ikke tilgang dit herfra. Koden er klar og venter på disse to Zap-ene (eller ett Zap utvidet med et nytt steg – se under).

## Hvorfor dette må endres

Den gamle Zapen tok imot ett kall per henvendelse, med e-post og bransje i nyttelasten, og skrev én rad. Den nye siden samler inn i to steg: nummeret med en gang («Ring meg opp»), og tre valgfrie spørsmål etterpå på takkesiden. Begge steg skal lande i **samme rad** i Google Sheet-registeret, identifisert med et felt som heter `leadId`. E-post og bransje finnes ikke lenger noe sted.

## Steg 1: oppdater dagens Zap (trigger fra `/api/lead`)

Dette er formodentlig Zapen som allerede kjører i dag (`ZAPIER_HOOK_URL` i Netlifys miljøvariabler peker på et Catch Hook).

1. Åpne Zapen i Zapier, gå til triggeren (Catch Hook).
2. Send en testinnsending fra forhåndsvisningen (se bunnen av dette dokumentet) for å få et ferskt eksempel på nyttelasten inn i Zapier.
3. Den nye nyttelasten fra `POST /api/lead` ser slik ut (nøyaktig disse feltene, ingen andre):

   ```json
   {
     "leadId": "<ugjettbar id>",
     "timestamp": "2026-10-08T12:30:00.000Z",
     "navn": "Kari Nordmann",
     "firma": "Eksempel AS",
     "telefon": "+4740156666",
     "telefon_oppgitt": "40 15 66 66",
     "vinkel": "a",
     "utm_source": "",
     "utm_medium": "",
     "utm_campaign": "",
     "utm_content": "",
     "utm_term": "",
     "orgnr": "926445936",
     "brreg_treff": "ja",
     "side_url": "https://leads.accountera.no/?v=a"
   }
   ```

   **Borte fra forrige versjon:** `epost`, `bransje`, `har_regnskapsforer`, `regnskapsprogram`, `melding`, `kvalifisert`, `clickup_url`. Disse feltene finnes ikke lenger i nyttelasten – fjern dem fra «Google Sheets»-steget hvis de står der, ellers kommer de til å stå tomme for alle nye rader.

   **Nytt:** `leadId` (var bevisst utelatt før – trengs nå for at steg 2 skal finne raden igjen) og `utm_term`.

4. I «Google Sheets – Create Spreadsheet Row»-steget: map `leadId` til en kolonne (f.eks. kolonne A, helt til venstre, så den er lett å lese av i steg 2 under). Map resten av feltene som før (bare med de nye navnene).
5. Varselet til Marius (uansett om det går via Zapiers egen e-post/SMS-handling, Slack, eller noe annet) skal fortsatt vise **navn, telefon og firmanavn** – akkurat de feltene finnes fortsatt, bare under disse navnene. Oppdater eventuelle tekstfelt i varselet som refererte til `epost` eller `bransje`.
6. **Ikke fjern noe annet i Zapen** (f.eks. en eventuell ClickUp-handling) uten å si fra – den koden er uendret og venter fortsatt et kall fra `/api/lead`, bare med de nye feltene.

## Steg 2: nytt steg – oppdater raden fra steg 1

Dette er en **ny** Zap, trigget av et eget Catch Hook som `PATCH /api/lead/:leadId` kaller.

1. Opprett en ny Zap: Trigger = «Webhooks by Zapier» → «Catch Hook».
2. Kopier URL-en Zapier gir deg, og send den til meg (eller sett den direkte) som miljøvariabelen `ZAPIER_HOOK_URL_STEP2` i Netlify (Site settings → Environment variables). Uten denne variabelen logges det bare en advarsel server-side – ingen krasjer, men steg 2 havner aldri i arket.
3. Send en testinnsending gjennom hele flyten på forhåndsvisningen (steg 1, så steg 2 – enten «Send» eller «Hopp over») for å få et eksempel på nyttelasten inn.
4. Nyttelasten fra `PATCH /api/lead/:leadId` ser slik ut:

   ```json
   {
     "leadId": "<samme id som i steg 1>",
     "har": "selv",
     "regnskapsprogram": "Fiken",
     "melding": "fritekst, kan være tom",
     "step2_status": "sendt",
     "step2_tidspunkt": "2026-10-08T12:35:00.000Z"
   }
   ```

   `har` er en av tre verdier: `selv`, `byraa`, `ingen`, eller en tom streng hvis spørsmålet ikke ble besvart. `step2_status` er enten `sendt` eller `hoppet_over`.

5. Legg til et steg: «Google Sheets – **Find Row**» (eller «Lookup Row»), i samme regneark/ark som steg 1, søk etter raden der kolonnen for `leadId` er lik `leadId` fra webhooken.
6. Legg til et steg til: «Google Sheets – **Update Row**» på raden du nettopp fant. Map `har`, `regnskapsprogram`, `melding`, `step2_status`, `step2_tidspunkt` til de tilsvarende kolonnene (opprett nye kolonner i arket hvis de ikke finnes).
7. **Denne Zapen skal ikke opprette en ny rad.** Hvis «Find Row» ikke finner noen match (skal i praksis aldri skje, siden serveren allerede har sjekket at raden finnes før den kaller webhooken – men test det), sett Zapen til å stoppe/feile i stedet for å falle tilbake på «Create Row».
8. **Varsling ved steg 2**: arbeidsordren sier standard er **nei** (Marius skal ikke ha et nytt varsel her) inntil du bekrefter noe annet. Ikke legg til en varslingshandling i denne Zapen med mindre du ønsker det – si i så fall fra om at meldingen bør være tydelig annerledes enn «ny lead» (f.eks. «lead oppdatert»), så den ikke blandes med steg 1-varselet.

## Testing (gjør dette før kampanjen slås på)

1. Gå til forhåndsvisnings-URL-en (ikke den skarpe siden) og fyll ut steg 1 med et tydelig testnavn, f.eks. «TEST Kari Nordmann», og et telefonnummer du kjenner igjen.
2. Sjekk at det dukker opp én ny rad i arket, med `leadId` utfylt og uten noen tomme kolonner som ikke skal være tomme.
3. Gå videre til takkesiden, svar på steg 2 (eller trykk «Hopp over»), og sjekk at **samme rad** blir oppdatert – ikke en ny rad.
4. Lag én til testinnsending og trykk «Hopp over» på steg 2: sjekk at raden får `step2_status = hoppet_over` og at de andre steg 2-feltene (`har`, `regnskapsprogram`, `melding`) står tomme.
5. **Slett testradene fra arket etterpå** (arbeidsordre punkt 5.4 – dette gjelder generelt for test-leads, ikke bare i ClickUp).

## Ting jeg ikke kan gjøre herfra

- Jeg har ikke tilgang til Zapier-kontoen og kan derfor ikke bekrefte at Zap-ene faktisk er satt opp riktig – bare at koden sender nøyaktig nyttelastene over, verifisert i `tests/functions.test.ts` (se `buildStep1SheetPayload`/`buildStep2SheetPayload`-testene).
- Jeg vet ikke hvordan dagens varsel til Marius er bygget opp innad i Zapen (SMS? Slack? e-post?) – bare at det mottar disse feltene. Du må selv finne og rette opp referanser til `epost`/`bransje` i selve varslingsteksten.
