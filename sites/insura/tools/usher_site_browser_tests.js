#!/usr/bin/env node
// Browser tests for a generated Usher demo site: phone widths 320/375/414 (widget open, ask, route strip collapsed + expanded, overflow, axe), axe over every page (375 px) and key pages at 1280, compare + search pages.
// usage: NODE_PATH=... node tools/usher_site_browser_tests.js <baseUrl> <siteDir> <outDir> "<query>" [--allpages]
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const BASE = process.argv[2].replace(/\/?$/, '/usher-demonstrator/sites/insura/'), SITE = process.argv[3], OUT = process.argv[4], QUERY = process.argv[5]; fs.mkdirSync(OUT, { recursive: true });
const AXE = fs.readFileSync(path.join(SITE, 'tests', 'vendor', 'axe.min.js'), 'utf8');
const prof = JSON.parse(fs.readFileSync(path.join(SITE, 'usher-profile.json'), 'utf8')); const res = []; const errs = [], ext = [];
const add = (id, pass, d) => { res.push({ id, pass: !!pass, detail: d }); console.log((pass ? 'PASS ' : 'FAIL ') + id.padEnd(46) + ' ' + JSON.stringify(d).slice(0, 300)); };
const axeRun = async pg => { await pg.addScriptTag({ content: AXE }); return pg.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, n: v.nodes.length, impact: v.impact, sample: v.nodes[0] && v.nodes[0].target && v.nodes[0].target.join(' ').slice(0, 80) }))); };
(async () => {
  const b = await chromium.launch();
  const mk = async vp => { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2 }); const pg = await ctx.newPage(); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) ext.push(r.url()); }); return pg; };
  const ready = pg => pg.waitForFunction(() => window.usher && window.usher.embedder && window.usher.embedder.state !== 'loading', null, { timeout: 120000 });
  for (const w of [320, 375, 414]) {
    const pg = await mk({ width: w, height: 760 }); await pg.goto(BASE + 'index.html'); await ready(pg);
    const vh = await axeRun(pg); add(`mobile_${w}_home_axe`, vh.length === 0, vh);
    const ov0 = await pg.evaluate(() => document.documentElement.scrollWidth); add(`mobile_${w}_home_no_horizontal_scroll`, ov0 <= w + 1, { scrollWidth: ov0 });
    await pg.screenshot({ path: `${OUT}/home_${w}.png` });
    await pg.locator('#nbpill').click(); await pg.waitForTimeout(500); await pg.screenshot({ path: `${OUT}/widget_open_${w}.png` });
    const pr = await pg.evaluate(() => { const p = document.getElementById('usher-root').shadowRoot.getElementById('nbpanel').getBoundingClientRect(); return { left: Math.round(p.left), right: Math.round(p.right), w: Math.round(p.width) }; });
    add(`mobile_${w}_panel_inside_viewport`, pr.left >= -1 && pr.right <= w + 1 && pr.w > 200, pr);
    const vo = await axeRun(pg); add(`mobile_${w}_axe_panel_open`, vo.length === 0, vo);
    await pg.locator('#nbinput').fill(QUERY); await pg.locator('#nbfind').click();
    await pg.waitForFunction(() => { const r = document.getElementById('usher-root').shadowRoot.getElementById('nbresult'); return r && (r.dataset.decision || r.dataset.navigation); }, null, { timeout: 60000 });
    await pg.waitForFunction(() => /\/p\/|\.html/.test(location.pathname) && location.pathname !== '/usher-demonstrator/sites/insura/index.html' || document.getElementById('usher-root').shadowRoot.getElementById('nbresult').dataset.decision !== 'navigate', null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(2500);
    const st = await pg.evaluate(() => { const r = document.getElementById('usher-root').shadowRoot, s = r.getElementById('routestrip'); const b = s.getBoundingClientRect(); return { path: location.pathname + location.hash, stripVisible: !s.hidden, collapsed: s.classList.contains('collapsed'), stripH: Math.round(b.height), state: s.dataset.state, sw: document.documentElement.scrollWidth }; });
    add(`mobile_${w}_strip_after_navigation`, st.stripVisible && st.state === 'arrived' && st.path !== '/usher-demonstrator/sites/insura/index.html', st);
    add(`mobile_${w}_strip_collapsed_height_le_20pct_viewport`, st.collapsed && st.stripH <= 0.2 * 760, st);
    add(`mobile_${w}_no_horizontal_scroll_destination`, st.sw <= w + 1, st);
    await pg.screenshot({ path: `${OUT}/strip_collapsed_${w}.png` });
    const vs = await axeRun(pg); add(`mobile_${w}_axe_destination_collapsed`, vs.length === 0, vs);
    await pg.locator('#rstoggle').click(); await pg.waitForTimeout(300);
    const ex = await pg.evaluate(() => { const s = document.getElementById('usher-root').shadowRoot.getElementById('routestrip'); return { collapsed: s.classList.contains('collapsed'), h: Math.round(s.getBoundingClientRect().height), exp: s.querySelector('#rstoggle').getAttribute('aria-expanded') }; });
    add(`mobile_${w}_strip_expands`, !ex.collapsed && ex.exp === 'true', ex); await pg.screenshot({ path: `${OUT}/strip_expanded_${w}.png` });
    const ve = await axeRun(pg); add(`mobile_${w}_axe_destination_expanded`, ve.length === 0, ve); await pg.close();
  }
  { const pg = await mk({ width: 1280, height: 800 }); await pg.goto(BASE + 'index.html'); await ready(pg); await pg.keyboard.press('/usher-demonstrator/sites/insura/'); await pg.locator('#nbinput').fill(QUERY); await pg.keyboard.press('Enter'); await pg.waitForTimeout(6000);
    const u = await pg.evaluate(() => location.pathname + location.hash); add('desktop_ask_navigates', u !== '/usher-demonstrator/sites/insura/index.html', { u }); await pg.screenshot({ path: `${OUT}/desktop_after_navigation.png` }); const v = await axeRun(pg); add('desktop_axe_destination', v.length === 0, v); await pg.close(); }
  // compare + search pages
  for (const [p, w] of [['compare.html?q=' + encodeURIComponent(QUERY), 375], ['search.html?q=' + encodeURIComponent(QUERY), 375], ['compare.html?q=' + encodeURIComponent(QUERY), 1280]]) { const pg = await mk({ width: w, height: 800 }); await pg.goto(BASE + p); await pg.waitForTimeout(p.startsWith('compare') ? 7000 : 1500); const v = await axeRun(pg); add(`axe_${p.split('?')[0]}_${w}`, v.length === 0, v); if (p.startsWith('compare')) { const t = await pg.evaluate(() => ({ l: document.getElementById('cl').innerText.slice(0, 120), r: document.getElementById('cr').innerText.slice(0, 160) })); add(`compare_renders_both_${w}`, t.l.length > 5 && t.r.length > 5 && !/could not run/.test(t.r), t); await pg.screenshot({ path: `${OUT}/compare_${w}.png`, fullPage: true }); } await pg.close(); }
  // every page at 375
  if (process.argv.includes('--allpages')) { const urls = ['index.html', 'search.html', 'compare.html', 'about.html', 'privacy.html', ...prof.taxonomy.areas.map(a => a.id + '.html'), ...prof.destinations.map(d => 'p/' + d.id + '.html')]; const pg = await mk({ width: 375, height: 800 }); let bad = [], n = 0, ovf = [];
    for (const u of urls) { await pg.goto(BASE + u); await pg.waitForLoadState('domcontentloaded'); const v = await axeRun(pg); n++; if (v.length) bad.push({ u, v }); const sw = await pg.evaluate(() => document.documentElement.scrollWidth); if (sw > 376) ovf.push({ u, sw }); }
    add('allpages_axe_375', bad.length === 0, { pages: n, violationPages: bad.length, first: bad.slice(0, 3) }); add('allpages_no_horizontal_scroll_375', ovf.length === 0, { pages: n, overflow: ovf.slice(0, 5) }); await pg.close(); }
  add('no_console_errors', errs.length === 0, errs.slice(0, 5)); add('no_external_requests', ext.length === 0, ext.slice(0, 5));
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(res, null, 1)); console.log(`${res.filter(r => r.pass).length}/${res.length} passed`); await b.close();
})();
