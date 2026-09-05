/* eslint-disable */
/**
 * Regresjonskontroll mot bygget side (vite preview på :4173): skjermbilder ved 390 og 1440 og DOM-målinger.
 * Kjør: npm run build && npx vite preview & node tests/e2e.cjs
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.E2E_BASE || 'http://localhost:4173';
const OUT = process.env.E2E_OUT || path.join(__dirname, '__screenshots__');
const ALLOWED = new Set(['#133c62', '#142838', '#efece6']);

function rgbToHex(rgb) {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(rgb);
  if (!m) return null;
  const a = m[4] === undefined ? 1 : Number(m[4]);
  if (a === 0) return null;
  return { hex: '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join(''), alpha: a };
}

async function audit(page, label, width) {
  const problems = [];
  const data = await page.evaluate(() => {
    const out = { colors: [], smallText: [], bodyText: [], thinSmall: [] };
    const seen = new Set();
    const NOTE = ['ds-small', 'ds-field__hint', 'form__note', 'consent__text', 'ds-field__error', 'ds-kicker', 'ftr__brand', 'ftr__links', 'cal__status', 'quote'];
    const isVisible = (el) => {
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length > 0;
    };
    for (const el of document.querySelectorAll('body *')) {
      if (!isVisible(el)) continue;
      if (el.tagName === 'OPTION' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      const cs = getComputedStyle(el);
      const props = [['color', true], ['backgroundColor', true], ['borderTopColor', parseFloat(cs.borderTopWidth) > 0], ['borderLeftColor', parseFloat(cs.borderLeftWidth) > 0], ['borderBottomColor', parseFloat(cs.borderBottomWidth) > 0], ['borderRightColor', parseFloat(cs.borderRightWidth) > 0], ['outlineColor', cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0]];
      for (const [prop, use] of props) {
        if (!use) continue;
        const v = cs[prop];
        if (v && !seen.has(v)) {
          seen.add(v);
          out.colors.push(v + ' (' + prop + ' på ' + el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') + ')');
        }
      }
      const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (!hasText) continue;
      const fs = parseFloat(cs.fontSize);
      const fw = Number(cs.fontWeight);
      const txt = el.textContent.trim().slice(0, 40);
      const cls = typeof el.className === 'string' ? el.className : '';
      const inNote = NOTE.some((c) => cls.includes(c) || (el.closest && el.closest('.' + c)));
      if (fs < 16 && !cls.includes('ds-kicker')) out.smallText.push({ tag: el.tagName, cls, fs, txt });
      if (fw <= 100 && fs < 40) out.thinSmall.push({ tag: el.tagName, cls, fs, txt });
      // Brødtekst: p og li i main som ikke er noter, minst 18 px.
      if ((el.tagName === 'P' || el.tagName === 'LI') && el.closest('main') && !inNote && fs < 18) out.bodyText.push({ tag: el.tagName, cls, fs, txt });
    }
    return out;
  });
  for (const c of data.colors) {
    const h = rgbToHex(c);
    if (h && !ALLOWED.has(h.hex)) problems.push(`${label}@${width}: farge utenfor paletten ${c}`);
  }
  for (const t of data.smallText) problems.push(`${label}@${width}: tekst under 16 px: ${t.tag}.${t.cls} ${t.fs}px «${t.txt}»`);
  if (width === 390) for (const t of data.bodyText) problems.push(`${label}@${width}: brødtekst under 18 px: ${t.tag}.${t.cls} ${t.fs}px «${t.txt}»`);
  for (const t of data.thinSmall) problems.push(`${label}@${width}: Thin under 40 px: ${t.tag}.${t.cls} ${t.fs}px «${t.txt}»`);
  return problems;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const problems = [];
  const routes = [
    ['index-a', '/?v=a'],
    ['index-b', '/?v=b'],
    ['index-c', '/?v=c'],
    ['takk', '/takk'],
    ['takker-nei', '/takker-nei'],
    ['personvern', '/personvern'],
  ];
  for (const width of [390, 1440]) {
    for (const [name, route] of routes) {
      const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 1, isMobile: width === 390, hasTouch: width === 390 });
      const page = await ctx.newPage();
      const external = [];
      page.on('request', (r) => {
        const u = r.url();
        if (!u.startsWith(BASE) && !u.startsWith('data:')) external.push(u);
      });
      await page.goto(BASE + route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `${name}-${width}.png`), fullPage: true });
      // Uten samtykke: ingen eksterne forespørsler (Calendly er unntaket på /takk siden den er avtalt flyt).
      const ext = external.filter((u) => !u.includes('calendly.com'));
      if (ext.length) problems.push(`${name}@${width}: eksterne forespørsler før samtykke: ${ext.join(', ')}`);
      problems.push(...(await audit(page, name, width)));

      if (name === 'index-a' && width === 390) {
        // Sticky CTA: skjult mens samtykkelinjen vises, og mens hero-knappen eller skjemaet er i viewport.
        const stickyHiddenInitially = await page.$eval('.sticky', (el) => el.hidden);
        if (!stickyHiddenInitially) problems.push('index-a@390: sticky CTA synlig før samtykkevalg');
        await page.click('.consent__actions button:nth-child(2)');
        await page.waitForTimeout(200);
        const stillHiddenAtTop = await page.$eval('.sticky', (el) => el.hidden);
        if (!stillHiddenAtTop) problems.push('index-a@390: sticky CTA synlig mens hero-knappen er i viewport');
        await page.evaluate(() => window.scrollTo(0, 1600));
        await page.waitForTimeout(400);
        const visibleMid = await page.$eval('.sticky', (el) => !el.hidden);
        if (!visibleMid) problems.push('index-a@390: sticky CTA ikke synlig midt på siden');
        const rect = await page.$eval('.sticky', (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { top: r.top, bottom: r.bottom, h: r.height, display: cs.display, pos: cs.position, vh: window.innerHeight }; });
        console.log('sticky rect', JSON.stringify(rect));
        if (rect.h < 60 || rect.bottom > rect.vh + 1 || rect.top < rect.vh - 120) problems.push(`index-a@390: sticky CTA er ikke plassert nederst i viewport: ${JSON.stringify(rect)}`);
        await page.screenshot({ path: path.join(OUT, `index-a-390-sticky.png`) });
        await page.evaluate(() => document.getElementById('skjema').scrollIntoView());
        await page.waitForTimeout(400);
        const hiddenAtForm = await page.$eval('.sticky', (el) => el.hidden);
        if (!hiddenAtForm) problems.push('index-a@390: sticky CTA synlig mens skjemaet er i viewport');
        // Skjemafeil: send tomt skjema, første felt får fokus, ingen rødt.
        await page.click('button[type=submit]');
        await page.waitForTimeout(300);
        const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
        if (focused !== 'f-name') problems.push(`index-a@390: første feilfelt fikk ikke fokus (aktivt: ${focused})`);
        const errCount = await page.$$eval('.ds-field__error', (els) => els.length);
        if (errCount !== 7) problems.push(`index-a@390: ventet 7 feilmeldinger, fikk ${errCount}`);
        await page.screenshot({ path: path.join(OUT, `index-a-390-feil.png`), fullPage: true });
        problems.push(...(await audit(page, 'index-a-feil', width)));
        // Ugyldig telefon og tom e-post
        await page.fill('#f-name', 'Kari Nordmann');
        await page.fill('#f-company', 'Eksempel AS');
        await page.fill('#f-tel', '123');
        await page.selectOption('#f-regnskapsforer', 'Nei, jeg fører selv');
        await page.selectOption('#f-program', 'Fiken');
        await page.selectOption('#f-bransje', 'Bygg, anlegg og håndverk');
        await page.click('button[type=submit]');
        await page.waitForTimeout(300);
        const errs = await page.$$eval('.ds-field__error', (els) => els.map((e) => e.textContent.trim()));
        if (errs.length !== 2) problems.push(`index-a@390: ventet 2 feil (tel, e-post), fikk ${errs.length}: ${errs.join(' | ')}`);
      }
      if (name === 'takk') {
        // Uten VITE_CALENDLY_URL vises telefon-fallback. Med URL må boksen ha minimumshøyde 700/760.
        const cal = await page.$('.cal');
        if (cal) {
          const h = await cal.evaluate((el) => parseFloat(getComputedStyle(el).minHeight));
          const want = width === 390 ? 700 : 760;
          if (h < want) problems.push(`takk@${width}: Calendly min-height ${h} < ${want}`);
        } else {
          const notice = await page.$('.ds-notice');
          if (!notice) problems.push(`takk@${width}: verken Calendly-boks eller fallback-Notice`);
        }
      }
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'problems.txt'), problems.join('\n'));
  console.log(problems.length ? `AVVIK (${problems.length}):\n` + problems.join('\n') : 'Ingen avvik.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
