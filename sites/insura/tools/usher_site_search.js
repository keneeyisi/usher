/* SiteSearch: the ordinary keyword site search used by the Usher demo sites AND by the evaluation (same file, so the baseline is what visitors really get).
   Okapi BM25 (k1 1.2, b 0.75), title x3, headings x2, stop words, light suffix stemmer; page = title + area + group + summary + section labels + section bodies;
   best section by section-level BM25. UMD: window.SiteSearch / module.exports. Never used by Usher's decisions. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.SiteSearch = factory(); })(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const STOP = new Set(('a about above after again against all am an and any are as at be because been before being below between both but by can cannot could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just me more most my no nor not now of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your').split(' '));
const IRR = { paid: 'pay', bought: 'buy', sent: 'send', children: 'child', people: 'person', went: 'go', gone: 'go', left: 'leave', drove: 'drive', broke: 'break', stolen: 'steal', stole: 'steal' };
function stem(w) { if (IRR[w]) return IRR[w]; if (w.length < 4) return w; let s = w;
  if (/ies$/.test(s) && s.length > 4) s = s.replace(/ies$/, 'y'); else if (/(sses|xes|ches|shes)$/.test(s)) s = s.replace(/es$/, ''); else if (/s$/.test(s) && !/(ss|us|is)$/.test(s)) s = s.replace(/s$/, '');
  if (/ing$/.test(s) && s.length > 5) s = s.replace(/ing$/, ''); else if (/ed$/.test(s) && s.length > 4) s = s.replace(/ed$/, '');
  if (/(.)\1$/.test(s) && !/(ll|ss|zz)$/.test(s) && s.length > 3) s = s.slice(0, -1);
  return s; }
const norm = t => String(t).toLowerCase().replace(/[\u2018\u2019']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const tokenize = t => norm(t).split(' ').filter(w => w && w.length > 1 && !STOP.has(w)).map(stem);
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function build(docs, opts) {
  opts = Object.assign({ k1: 1.2, b: 0.75, titleWeight: 3, headingWeight: 2, extra: null }, opts || {}); // opts.extra: {pageId: [texts]} adds hidden descriptions (the strengthened baseline, evaluation only)
  const rep = (s, n) => Array(n).fill(s).join(' '); const pages = [], secs = [];
  for (const d of docs) {
    const parts = [rep(d.title, opts.titleWeight), d.group, d.area, d.summary]; const ex = opts.extra && opts.extra[d.id] ? opts.extra[d.id] : [];
    d.sections.forEach((s, i) => { parts.push(rep(s.label, opts.headingWeight), s.body); secs.push({ id: d.id, i, anchor: s.anchor, tokens: tokenize(rep(s.label, opts.headingWeight) + ' ' + s.body) }); });
    parts.push(...ex); pages.push({ id: d.id, doc: d, tokens: tokenize(parts.join(' ')) });
  }
  const mk = items => { const N = items.length, df = new Map(); let tot = 0;
    for (const it of items) { tot += it.tokens.length; it.tf = new Map(); for (const t of it.tokens) it.tf.set(t, (it.tf.get(t) || 0) + 1); for (const t of it.tf.keys()) df.set(t, (df.get(t) || 0) + 1); }
    const avg = tot / N;
    return q => items.map(it => { let sc = 0; for (const t of q) { const f = it.tf.get(t); if (!f) continue; const n = df.get(t), idf = Math.log(1 + (N - n + 0.5) / (n + 0.5)); sc += idf * (f * (opts.k1 + 1)) / (f + opts.k1 * (1 - opts.b + opts.b * it.tokens.length / avg)); } return { it, sc }; }); };
  const sp = mk(pages), ss = mk(secs);
  return { search(query, k) { const q = [...new Set(tokenize(query))];
    const ranked = sp(q).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc || (a.it.id < b.it.id ? -1 : 1)).slice(0, k || 10); const sec = ss(q);
    return ranked.map(x => { const best = sec.filter(y => y.it.id === x.it.id && y.sc > 0).sort((a, b) => b.sc - a.sc || a.it.i - b.it.i)[0];
      return { id: x.it.id, doc: x.it.doc, score: Math.round(x.sc * 1000) / 1000, sectionAnchor: best ? best.it.anchor : null, sectionIndex: best ? best.it.i : null }; }); } };
}
return { build, tokenize, stem, escape, STOP };
});
