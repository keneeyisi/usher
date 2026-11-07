#!/usr/bin/env node
// R7_GP2 / Usher v3 widget checks (19 Oct 2026): panel padding + header row, wording ("I’m here because…"), rotating placeholders,
// styles that were lost in the shadow-DOM move (primary/secondary buttons, links, coach), every widget state at 1280 / 414 / 375 / 320 px with
// screenshots, axe-core, overflow, console errors and external requests.
// usage: NODE_PATH=... node run_p4_panel.js <baseUrl> <siteDir> <profileRelPath> <outDir> <config.json>
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const [BASE0, SITE, PROF, OUT, CFGF] = process.argv.slice(2); const BASE = BASE0.replace(/\/?$/, '/usher-demonstrator/sites/civicsphere/');
const CFG = JSON.parse(fs.readFileSync(CFGF, 'utf8')); const P = JSON.parse(fs.readFileSync(path.join(SITE, PROF), 'utf8')); const UI = P.ui;
const AXE = fs.readFileSync(path.join(SITE, 'tests', 'vendor', 'axe.min.js'), 'utf8'); fs.mkdirSync(OUT, { recursive: true });
const res = [], errs = [], ext = []; const add = (id, pass, d) => { res.push({ id, pass: !!pass, detail: d }); console.log((pass ? 'PASS ' : 'FAIL ') + id.padEnd(52) + ' ' + JSON.stringify(d).slice(0, 320)); };
const START = BASE + (CFG.start || 'index.html');
const axeRun = async pg => { await pg.addScriptTag({ content: AXE }); return pg.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, n: v.nodes.length, t: v.nodes.slice(0, 2).map(n => n.target.join(' ')) }))); };
const ready = pg => pg.waitForFunction(() => window.usher && window.usher.embedder && window.usher.embedder.state !== 'loading', null, { timeout: 120000 });
const SR = 'document.getElementById("usher-root").shadowRoot';
const measure = pg => pg.evaluate(() => {
  const R = document.getElementById('usher-root').shadowRoot, q = s => R.querySelector(s), rc = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; };
  const cs = (e, p) => e ? getComputedStyle(e)[p] : null;
  const body = q('.nbbody'), opts = [...R.querySelectorAll('.optlist.question .optbtn')];
  return { vw: innerWidth, sw: document.documentElement.scrollWidth, panel: rc(q('#nbpanel')), close: rc(q('#nbclose')), label: rc(q('#nblabel')), sub: rc(q('#nbsub')), input: rc(q('.nbinput')), result: rc(q('#nbresult')),
    pad: body ? ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].map(p => parseFloat(cs(body, p))) : null,
    closeInLabelRow: (() => { const a = rc(q('#nbclose')), b = rc(q('#nblabel')); return a && b ? Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0 : null; })(),
    pillText: q('#nbpill') ? q('#nbpill').innerText.replace(/\s+/g, ' ').trim() : null, labelText: q('#nblabel') ? q('#nblabel').innerText.trim() : null, subText: q('#nbsub') ? q('#nbsub').innerText.trim() : null,
    dialogName: (() => { const d = q('#nbpanel'); const id = d && d.getAttribute('aria-labelledby'); return id && R.getElementById(id) ? R.getElementById(id).innerText.trim() : null; })(),
    inputDesc: q('#nbinput') ? q('#nbinput').getAttribute('aria-describedby') : null, placeholder: q('#nbinput') ? q('#nbinput').placeholder : null, phIndex: q('#nbinput') ? q('#nbinput').dataset.phIndex : null,
    ariaLabels: [...R.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')), decision: q('#nbresult') ? q('#nbresult').dataset.decision : null,
    question: q('#askq-h') ? q('#askq-h').innerText.trim() : null, interpPad: q('.interp') ? parseFloat(cs(q('.interp'), 'paddingLeft')) : null,
    destPad: q('.dest') ? ['paddingTop', 'paddingLeft'].map(p => parseFloat(cs(q('.dest'), p))) : null,
    optPad: opts.length ? ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].map(p => parseFloat(cs(opts[0], p))) : null,
    optGap: opts.length > 1 ? Math.round(opts[1].getBoundingClientRect().top - opts[0].getBoundingClientRect().bottom) : null,
    optInside: opts.length ? opts.every(o => { const b = o.getBoundingClientRect(), p = q('#nbpanel').getBoundingClientRect(); return b.left >= p.left + 12 && b.right <= p.right - 12; }) : null,
    situation: q('#nbresult .situation') ? q('#nbresult .situation').innerText.slice(0, 120) : null,
    situBtn: q('#nbresult .situation .btn') ? { bg: cs(q('#nbresult .situation .btn'), 'backgroundColor'), border: cs(q('#nbresult .situation .btn'), 'borderTopColor'), color: cs(q('#nbresult .situation .btn'), 'color') } : null,
    compare: !!q('#vstoggle'), brand: getComputedStyle(q('.pill')).backgroundColor };
});
(async () => {
  const b = await chromium.launch(); const shots = [];
  const mk = async (vp, extra = {}) => { const ctx = await b.newContext(Object.assign({ viewport: vp, deviceScaleFactor: 1 }, extra)); const pg = await ctx.newPage();
    pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push(String(e)));
    pg.on('request', r => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); }); return pg; };
  const shot = async (pg, name) => { const f = path.join(OUT, `${CFG.name}_${name}.png`); await pg.screenshot({ path: f }); shots.push(f); };
  const openPanel = async pg => { await pg.locator('#nbpill').click(); await pg.waitForTimeout(250); };
  const ask = async (pg, q, want) => { await pg.locator('#nbinput').fill(q); await pg.locator('#nbinput').press('Enter');
    await pg.waitForFunction(w => { const r = document.getElementById('usher-root').shadowRoot.getElementById('nbresult'); return r && r.dataset.decision && (!w || r.dataset.decision === w); }, want, { timeout: 60000 }); };
  const noWant = s => !/I want to/i.test(s || '');
  for (const [vw, vh] of [[1280, 800], [414, 820], [375, 760], [320, 640]]) {
    const tag = vw === 1280 ? 'desktop1280' : 'mobile' + vw, mob = vw < 760;
    // ---- empty ----
    let pg = await mk({ width: vw, height: vh }); await pg.goto(START); await ready(pg); await openPanel(pg);
    let m = await measure(pg); await shot(pg, `panel_empty_${tag}`);
    const minPad = mob ? 14 : 22, maxPad = mob ? 18 : 26;
    add(`${tag}_empty_padding_${mob ? '16' : '24'}px`, m.pad && m.pad[1] >= minPad && m.pad[1] <= maxPad && m.pad[3] >= minPad && m.pad[3] <= maxPad && m.pad[0] >= minPad, { pad: m.pad });
    add(`${tag}_empty_input_inset_from_panel`, m.input.l - m.panel.l >= minPad && m.panel.r - m.input.r >= minPad, { left: m.input.l - m.panel.l, right: m.panel.r - m.input.r });
    add(`${tag}_close_in_header_row_not_over_input`, m.closeInLabelRow && m.close.b <= m.input.t && m.close.r <= m.panel.r - 4 && m.close.w >= 44 && m.close.h >= 44 && m.label.r <= m.close.l, { close: m.close, label: m.label, input: m.input });
    add(`${tag}_close_not_over_subline`, m.sub && (m.close.b <= m.sub.t || m.close.r <= m.sub.l || m.close.l >= m.sub.r) , { close: m.close, sub: m.sub });
    add(`${tag}_wording_pill_label_dialog`, m.pillText.startsWith(UI.pillLabel) && m.labelText === UI.pillLabel && m.dialogName === UI.pillLabel && UI.pillLabel === 'I’m here because…', { pill: m.pillText, label: m.labelText, dialog: m.dialogName });
    add(`${tag}_wording_subline`, m.subText === 'Describe your situation. We’ll take you there.' && m.inputDesc === 'nbsub', { sub: m.subText, describedby: m.inputDesc });
    add(`${tag}_no_old_wording_in_widget`, [m.pillText, m.labelText, m.subText, m.placeholder, ...m.ariaLabels].every(noWant), { aria: m.ariaLabels });
    add(`${tag}_placeholder_from_profile_list`, (UI.placeholders || []).map(x => (vw <= 480 ? '' : 'e.g. ') + x).includes(m.placeholder), { placeholder: m.placeholder, idx: m.phIndex });
    add(`${tag}_compare_link_present`, m.compare === !!CFG.compare, { compare: m.compare });
    add(`${tag}_empty_no_horizontal_overflow`, m.sw <= vw + 1 && m.panel.l >= 0 && m.panel.r <= vw, { sw: m.sw, panel: m.panel });
    const fit = await pg.evaluate(L => { const i = document.getElementById('usher-root').shadowRoot.getElementById('nbinput'), c = document.createElement('canvas').getContext('2d'), st = getComputedStyle(i); c.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
      const boxW = Math.round(i.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight)); const w = L.map(p => [p, Math.round(c.measureText(p).width)]); return { boxW, fontSize: st.fontSize, widest: w.sort((a, b) => b[1] - a[1])[0], tooWide: w.filter(x => x[1] > boxW).map(x => x[0]) }; }, (UI.placeholders || []).map(x => (vw <= 480 ? '' : 'e.g. ') + x));
    add(`${tag}_all_placeholders_fit_input`, fit.tooWide.length === 0, fit);
    { const row = await pg.evaluate(() => { const R = document.getElementById('usher-root').shadowRoot, a = R.getElementById('mic').getBoundingClientRect(), f = R.getElementById('nbfind').getBoundingClientRect(); return { micTop: Math.round(a.top), findTop: Math.round(f.top), micH: Math.round(a.height), findH: Math.round(f.height) }; }); add(`${tag}_mic_and_find_share_a_row`, Math.abs(row.micTop - row.findTop) <= 2 && row.micH >= 44 && row.findH >= 44, row); }
    if (vw === 1280 || vw === 320) { const v = await axeRun(pg); add(`${tag}_axe_panel_empty`, !v.length, v); }
    if (vw === 1280) { // rotation: changes while open + empty, stops when typing, new example on re-open
      const p0 = m.placeholder; await pg.waitForTimeout(3900); const p1 = (await measure(pg)).placeholder;
      await pg.locator('#nbinput').fill('x'); const i1 = (await measure(pg)).phIndex; await pg.waitForTimeout(3900); const i2 = (await measure(pg)).phIndex; await pg.locator('#nbinput').fill('');
      await pg.keyboard.press('Escape'); await pg.waitForTimeout(150); await openPanel(pg); const p3 = (await measure(pg)).placeholder;
      add('desktop_placeholder_rotates_while_open', p1 !== p0 && (UI.placeholders || []).map(x => 'e.g. ' + x).includes(p1), { p0, p1 });
      add('desktop_placeholder_stops_after_typing', i1 === i2, { i1, i2 });
      add('desktop_placeholder_changes_on_reopen', p3 !== p1, { p1, p3 });
      await pg.keyboard.press('Escape'); await pg.waitForTimeout(150); await openPanel(pg);
    }
    // ---- question ----
    await ask(pg, CFG.askQ, 'clarify'); m = await measure(pg); await shot(pg, `panel_question_${tag}`);
    add(`${tag}_question_option_cards_padding`, m.optPad && m.optPad[0] >= 12 && m.optPad[3] >= 40 && m.optGap >= 10 && m.optInside, { optPad: m.optPad, gap: m.optGap, inside: m.optInside });
    add(`${tag}_question_text_site_name_only`, !!m.question && !(CFG.foreignNames || []).some(n => m.question.includes(n)) && (!/destination/.test(m.question) || m.question.includes(P.site.shortName)), { q: m.question });
    add(`${tag}_question_no_overflow`, m.sw <= vw + 1, { sw: m.sw });
    if (vw === 1280 || vw === 320) { const v = await axeRun(pg); add(`${tag}_axe_panel_question`, !v.length, v); }
    // ---- reject ----
    await ask(pg, CFG.rejQ, 'reject'); m = await measure(pg); await shot(pg, `panel_reject_${tag}`);
    add(`${tag}_reject_no_overflow`, m.sw <= vw + 1 && m.decision === 'reject', { sw: m.sw, d: m.decision });
    if (vw === 1280) { const v = await axeRun(pg); add(`${tag}_axe_panel_reject`, !v.length, v); }
    // ---- result (interpretation + route), captured inside the 1.5 s interpretation window ----
    await ask(pg, CFG.navQ, 'navigate'); m = await measure(pg); await shot(pg, `panel_result_${tag}`);
    add(`${tag}_result_cards_breathing_room`, m.destPad && m.destPad[0] >= 12 && m.destPad[1] >= 12 && m.interpPad >= 10, { destPad: m.destPad, interpPad: m.interpPad });
    add(`${tag}_result_no_overflow`, m.sw <= vw + 1, { sw: m.sw });
    await pg.close();
    // ---- saved state ----
    pg = await mk({ width: vw, height: vh }); await pg.goto(START); await ready(pg); await openPanel(pg);
    await ask(pg, CFG.savedQ, 'navigate'); await shot(pg, `panel_result_savedquery_${tag}`);
    // route strip: walking, then arrived
    await pg.waitForTimeout(1800); await shot(pg, `strip_walking_${tag}`);
    await pg.waitForFunction(() => { const s = document.getElementById('usher-root').shadowRoot.getElementById('routestrip'); return s && s.dataset.state === 'arrived'; }, null, { timeout: 30000 }).catch(() => {});
    await pg.waitForTimeout(400); await shot(pg, `strip_arrived_${tag}`);
    const st = await pg.evaluate(() => { const R = document.getElementById('usher-root').shadowRoot, s = R.getElementById('routestrip'), h = R.getElementById('howbtn'); return { state: s.dataset.state, hidden: s.hidden, sw: document.documentElement.scrollWidth, how: h ? { bg: getComputedStyle(h).backgroundColor, border: getComputedStyle(h).borderTopColor, color: getComputedStyle(h).color, visible: h.offsetParent !== null } : null }; });
    add(`${tag}_strip_arrived`, st.state === 'arrived' && !st.hidden && st.sw <= vw + 1, st);
    if (mob) { const t = pg.locator('#rstoggle'); if (await t.isVisible()) { await t.click(); await pg.waitForTimeout(300); } await shot(pg, `strip_arrived_expanded_${tag}`); }
    const sv = await pg.evaluate(() => { const R = document.getElementById('usher-root').shadowRoot, s = R.querySelector('#routestrip .situation'), bt = s && s.querySelector('.btn'); return { text: s ? s.innerText.replace(/\s+/g, ' ').slice(0, 160) : null, visible: !!(s && s.offsetParent), btn: bt ? { bg: getComputedStyle(bt).backgroundColor, border: getComputedStyle(bt).borderTopColor, color: getComputedStyle(bt).color } : null, sw: document.documentElement.scrollWidth }; });
    add(`${tag}_saved_state_note_in_strip`, !!sv.text && sv.visible && sv.btn && sv.btn.border !== 'rgba(0, 0, 0, 0)' && sv.sw <= vw + 1, sv);
    if (mob && vw === 320) { const v = await axeRun(pg); add(`${tag}_axe_strip_expanded_saved`, !v.length, v); }
    if (!mob) {
      add(`${tag}_howbtn_secondary_style_restored`, st.how && st.how.border !== 'rgba(0, 0, 0, 0)' && st.how.bg === 'rgb(255, 255, 255)', st.how);
      const v = await axeRun(pg); add(`${tag}_axe_strip_arrived`, !v.length, v);
      await pg.locator('#howbtn').click(); await pg.waitForTimeout(600); await shot(pg, `coach_${tag}`);
      const c = await pg.evaluate(() => { const R = document.getElementById('usher-root').shadowRoot, n = R.getElementById('coachnext'), co = R.getElementById('coach'); return { open: co && !co.hidden, next: n ? { bg: getComputedStyle(n).backgroundColor, color: getComputedStyle(n).color } : null }; });
      add(`${tag}_coach_primary_button_style_restored`, c.open && c.next && c.next.bg !== 'rgba(0, 0, 0, 0)' && c.next.color === 'rgb(255, 255, 255)', c);
      const v2 = await axeRun(pg); add(`${tag}_axe_coach`, !v2.length, v2);
    }
    await pg.close();
  }
  // reduced motion: no timed rotation
  { const pg = await mk({ width: 1280, height: 800 }, { reducedMotion: 'reduce' }); await pg.goto(START); await ready(pg); await openPanel(pg); const a = (await measure(pg)).placeholder; await pg.waitForTimeout(3900); const c = (await measure(pg)).placeholder; add('reduced_motion_no_timed_rotation', a === c, { a, c }); await pg.close(); }
  add('console_errors_0', errs.length === 0, errs.slice(0, 5)); add('external_requests_0', ext.length === 0, ext.slice(0, 5));
  const pass = res.filter(r => r.pass).length; console.log(`SUMMARY ${CFG.name}: ${pass}/${res.length} pass`);
  fs.writeFileSync(path.join(OUT, `${CFG.name}_p4_results.json`), JSON.stringify({ site: CFG.name, base: BASE, pass, total: res.length, results: res, screenshots: shots }, null, 1)); await b.close(); process.exit(pass === res.length ? 0 : 1);
})();
