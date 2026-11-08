#!/usr/bin/env node
// Extra v2 checks: axe on EVERY html page at 1280 and 320 (incl. credits/careers/cookies/press), internal link + anchor check, image files local and credited, console errors, external requests, horizontal overflow at 320.
// usage: NODE_PATH=... node tools/usher_v2_extra_tests.js <baseUrl> <siteDir> <outJson>
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const BASE = process.argv[2].replace(/\/?$/, '/'), SITE = process.argv[3], OUT = process.argv[4];
const AXE = fs.readFileSync(path.join(SITE, 'tests/vendor/axe.min.js'), 'utf8');
const pages = []; (function walk(d, rel) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), r = rel ? rel + '/' + f : f; if (fs.statSync(p).isDirectory()) { if (['p'].includes(r)) walk(p, r); } else if (f.endsWith('.html')) pages.push(r); } })(SITE, '');
const credits = JSON.parse(fs.readFileSync(path.join(SITE, 'vendor/images/credits.json'), 'utf8')); const credited = new Set(credits.map(c => c.file));
(async () => { const b = await chromium.launch(); const res = { pages: pages.length, axe1280: [], axe320: [], overflow320: [], badLinks: [], badAnchors: [], uncreditedImages: [], missingImages: [], consoleErrors: [], external: [] };
  const anchors = {};
  for (const [w, key] of [[1280, 'axe1280'], [320, 'axe320']]) { const ctx = await b.newContext({ viewport: { width: w, height: 800 } }); const pg = await ctx.newPage();
    pg.on('console', m => { if (m.type() === 'error') res.consoleErrors.push(m.text()); }); pg.on('request', r => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')) res.external.push(u); });
    pg.on('response', r => { if (r.status() >= 400) res.badLinks.push({ status: r.status(), url: r.url() }); });
    for (const u of pages) { await pg.goto(BASE + u); await pg.waitForLoadState('domcontentloaded'); await pg.addScriptTag({ content: AXE });
      const v = await pg.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, n: v.nodes.length, sample: v.nodes[0].target.join(' ').slice(0, 80) })));
      if (v.length) res[key].push({ u, v });
      if (w === 320) { const sw = await pg.evaluate(() => document.documentElement.scrollWidth); if (sw > 321) res.overflow320.push({ u, sw }); }
      if (w === 1280) { const info = await pg.evaluate(() => ({ ids: [...document.querySelectorAll('[id]')].map(e => e.id), links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')), imgs: [...document.querySelectorAll('img')].map(i => ({ src: i.getAttribute('src'), ok: i.complete ? i.naturalWidth > 0 : null })) }));
        anchors[u] = { ids: new Set(info.ids), links: info.links };
        for (const im of info.imgs) { const f = im.src.split('/').pop(); if (!im.src.startsWith('/vendor/images/')) res.external.push('img:' + im.src); else if (!credited.has(f)) res.uncreditedImages.push({ u, f }); if (!fs.existsSync(path.join(SITE, im.src))) res.missingImages.push({ u, src: im.src }); } } }
    await ctx.close(); }
  for (const [u, { links }] of Object.entries(anchors)) for (const h of links) { if (/^(https?:|mailto:)/.test(h)) { if (!h.startsWith('https://stocksnap.io/') && !h.startsWith('https://creativecommons.org/')) res.external.push('link:' + h); continue; }
    const [p, frag] = h.split('#'); const target = p === '' ? u : p.replace(/^\//, '').split('?')[0]; if (p && !fs.existsSync(path.join(SITE, target))) res.badLinks.push({ from: u, h }); else if (frag && anchors[target] && !anchors[target].ids.has(frag)) res.badAnchors.push({ from: u, h }); }
  res.external = [...new Set(res.external)];
  res.summary = { pages: pages.length, axe1280ViolationPages: res.axe1280.length, axe320ViolationPages: res.axe320.length, overflow320: res.overflow320.length, badLinks: res.badLinks.length, badAnchors: res.badAnchors.length, uncredited: res.uncreditedImages.length, missingImages: res.missingImages.length, consoleErrors: res.consoleErrors.length, externalRequests: res.external.filter(x => !x.startsWith('link:')).length, externalLinks_onlyCreditsSourcePages: res.external.filter(x => x.startsWith('link:')).length, imagesCredited: credits.length };
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res.summary)); if (res.axe1280.length) console.log(JSON.stringify(res.axe1280.slice(0, 3))); if (res.axe320.length) console.log(JSON.stringify(res.axe320.slice(0, 3))); console.log(JSON.stringify({ bl: res.badLinks.slice(0, 5), ba: res.badAnchors.slice(0, 5), ext: res.external.slice(0, 5) })); await b.close(); })();
