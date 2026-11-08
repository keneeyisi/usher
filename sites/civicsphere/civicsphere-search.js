/* CivicSphereNav R6.2 · conventional keyword SITE SEARCH used by the header search and the comparison view.
   Okapi BM25 ported from the evaluation harness (eval/harness/lib/bm25.js): same stop-word list, tokenizer (CivicCore.normalise +
   CivicCore.stem), k1 1.2, b 0.75, title x3, headings x2, page = title + group + topic + summary (+ intro text) + section headings
   and section text; best section by section-level BM25. Here the text is what each page VISIBLY shows (provided by the UI).
   UMD: window.CivicSearch / module.exports. Presentation only: never used by the resolver. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.CivicSearch = factory(); })(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const STOP = new Set(('a about above after again against all am an and any are as at be because been before being below between both but by can cannot could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves im ive id ill dont doesnt didnt wont cant isnt arent wasnt want need get got like know'.split(' ')));

function tokenizer(C) { return text => C.normalise(text).split(' ').filter(w => w && !STOP.has(w) && w.length > 1).map(C.stem); }

/* docs: [{ id, title, group, domainLabel, summary, intro, sections: [{ id, label, body }] }] (visible text, built by the UI) */
function build(C, docs, opts) {
  opts = Object.assign({ k1: 1.2, b: 0.75, titleWeight: 3, headingWeight: 2 }, opts || {});
  const tok = tokenizer(C), rep = (s, n) => Array(n).fill(s).join(' ');
  const pages = [], sections = [];
  for (const s of docs) {
    const parts = [rep(s.title, opts.titleWeight), s.group, s.domainLabel, s.summary];
    if (s.intro) parts.push(s.intro);
    s.sections.forEach((x, i) => {
      parts.push(rep(x.label, opts.headingWeight), x.body);
      sections.push({ id: s.id, sectionIndex: i, sectionId: x.id, tokens: tok(`${rep(x.label, opts.headingWeight)} ${x.body}`) });
    });
    pages.push({ id: s.id, tokens: tok(parts.join(' ')) });
  }
  const mk = docsT => {
    const N = docsT.length, df = new Map(); let total = 0;
    for (const d of docsT) { total += d.tokens.length; d.tf = new Map(); for (const t of d.tokens) d.tf.set(t, (d.tf.get(t) || 0) + 1); for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1); }
    const avg = total / N;
    return q => docsT.map(d => { let sc = 0; for (const t of q) { const f = d.tf.get(t); if (!f) continue; const n = df.get(t); const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5)); sc += idf * (f * (opts.k1 + 1)) / (f + opts.k1 * (1 - opts.b + opts.b * d.tokens.length / avg)); } return { d, sc }; });
  };
  const scorePages = mk(pages), scoreSections = mk(sections);
  function search(query, k) {
    const q = [...new Set(tok(query))];
    const all = scorePages(q).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc || (a.d.id < b.d.id ? -1 : 1));
    const secScores = scoreSections(q);
    const results = all.slice(0, k || 10).map(x => {
      const best = secScores.filter(y => y.d.id === x.d.id && y.sc > 0).sort((a, b) => b.sc - a.sc || a.d.sectionIndex - b.d.sectionIndex)[0];
      return { id: x.d.id, score: Math.round(x.sc * 1000) / 1000, sectionId: best ? best.d.sectionId : null, sectionIndex: best ? best.d.sectionIndex : null };
    });
    return { total: all.length, terms: q, results };
  }
  return { search, size: pages.length, tokenize: tok };
}
return { build, tokenizer, STOP };
});
