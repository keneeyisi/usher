/*
 * CivicSphereNav RESOLVER6: meaning-based (semantic) resolver with a RESOLVER3 lexical tie-breaker.
 * RESOLVER6 additions: synthetic descriptions for every page/section (civicsphere-content.js), an off-topic null class,
 * a generic-action clarify gate, wider resume phrasing (core), contradicting profile terms block keyword boosts,
 * a model registry, and rankDestinations (ranked-list mode, in civicsphere-core.js).
 * Pure and deterministic: given the query text, its embedding vector and the precomputed catalogue index,
 * it always returns the same decision. No DOM, network or model code here (see civicsphere-embedder.js).
 * Hybrid scoring: sentence-embedding similarity is the main signal; RESOLVER3 intent features
 * (resume, follow-up, status, cost, documents, eligibility, how-to, ...) drive section choice and
 * task-state/structural consistency (saved applications, ambiguous "tax").
 * RESOLVER5 hybrid: RESOLVER3 lexical/intent evidence only re-ranks candidates whose semantic score is within
 * a narrow band of the best one (tie-breaker/booster). Far-behind candidates can never be lifted by keywords,
 * so semantic similarity stays the primary signal. Sections also use RESOLVER3's discriminative label words.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./civicsphere-core.js'), require('./civicsphere-descriptions.js'));
  else root.CivicSemantic = factory(root.CivicCore, root.CivicDescriptions);
})(typeof self !== 'undefined' ? self : this, function (C, D) {
'use strict';
// RESOLVER6: model registry (pooling and instruction prefixes differ per model). The shipped model is DEFAULT_MODEL;
// others can be tried with CIVIC_MODEL=<key> (Node) or ?model=<key> (browser) if their files and index are present.
const MODELS = {
  'minilm': { key: 'minilm', id: 'Xenova/all-MiniLM-L6-v2', dtype: 'q8', pooling: 'mean', normalize: true, dim: 384, queryPrefix: '', passagePrefix: '' },
  'bge-small': { key: 'bge-small', id: 'Xenova/bge-small-en-v1.5', dtype: 'q8', pooling: 'cls', normalize: true, dim: 384, queryPrefix: 'Represent this sentence for searching relevant passages: ', passagePrefix: '' },
  'e5-small': { key: 'e5-small', id: 'Xenova/e5-small-v2', dtype: 'q8', pooling: 'mean', normalize: true, dim: 384, queryPrefix: 'query: ', passagePrefix: 'passage: ' }
};
const DEFAULT_MODEL = 'minilm';
const requestedModel = (typeof process !== 'undefined' && process.env && process.env.CIVIC_MODEL) || (typeof location !== 'undefined' && location.search ? new URLSearchParams(location.search).get('model') : null);
const MODEL = Object.assign({}, MODELS[requestedModel] || MODELS[DEFAULT_MODEL]);
MODEL.indexFile = MODEL.key === DEFAULT_MODEL ? 'semantic-index.json' : `semantic-index.${MODEL.key}.json`;

// Calibrated on the TUNED fixtures only (tests/calibrate.js). RESOLVER5 values frozen 9 Oct 2026; RESOLVER6 re-calibrated on the 46 tuned
// fixtures (all R5 values and the new off-topic thresholds are on the 46/46 plateau) and frozen 9 Oct 2026 before heldout_r6 was run.
const PARAMS = {
  wMax: 0.7,                 // destination score = wMax*best + (1-wMax)*second-best description similarity
  sectionTextPenalty: 0.03,  // section descriptions also count as evidence for their page, slightly discounted
  resumeBoost: 0.10,         // resume intent: favour saved/in-progress destinations
  noResumePenalty: 0.20,     // saved application without resume intent
  navigateMin: 0.38,         // top similarity needed to navigate
  marginMin: 0.02,           // clear margin over the runner-up destination
  clarifyMin: 0.25,          // below this the input is treated as unrelated (reject)
  optionWindow: 0.08,        // clarification options within this distance of the top score
  sectionMin: 0.55,          // section chosen by similarity alone if it reaches this
  sectionIntentBonus: 0.08,  // per matching information-need intent (RESOLVER3 section intents)
  sectionKeywordBonus: 0.05, // per matching section keyword
  intentScale: 0.006,        // destination intent consistency: RESOLVER3 profile intent weight x this (e.g. difficulty +14 -> +0.056)
  // RESOLVER5 hybrid tie-breaker
  hybrid: true,
  band: 0.05,                // only candidates within this semantic distance of the best are re-ranked
  lexWeight: 0.08,           // maximum boost (or penalty) from RESOLVER3 evidence inside the band
  lexProfileScale: 30,       // RESOLVER3 goal-profile score that counts as full evidence (profiles cover the core services)
  lexWordScale: 6,           // RESOLVER3 title/group/section word-overlap score that counts as full evidence
  lexWordWeight: 0.5,        // word overlap counts at most half as much as a goal profile
  sectionLabelBonus: 0.04,   // per RESOLVER3 discriminative label-word hit when choosing a section
  // RESOLVER6 general fixes
  lexRequireCorroboration: false, // (tested: requiring topic + context/intent evidence hurt more than it helped; off)
  lexExcludeBlocks: true,    // a profile's contradicting terms (e.g. 'object' for applying for approval) block word-overlap boosts too
  lexMinWords: 1,            // (tested 2: hurt; 1 = RESOLVER5 behaviour)
  offTopic: true,            // off-topic prototype null class
  offTopicMin: 0.30,         // prototype similarity needed before it can reject
  offTopicMargin: 0.0,       // prototype must beat the best service text by at least this
  genericActionClarify: true // action-only goals ask which service
};
const OFFTOPIC_ID = '__offtopic__';
const ACTION_MESSAGES = { appeal: 'There are several ways to challenge, appeal or complain. Which one is about your situation?', pay: 'What would you like to pay for?',
  apply: 'What would you like to apply for?', book: 'What would you like to book?', report: 'What would you like to report?', cancel: 'What would you like to cancel?', request: 'What would you like to request?' };
const RESUME_TARGETS = new Set(['activity-in-progress', 'saved-residential-parking-application']);
const TAX_OPTIONS = ['money-tax-household-charge-payment', 'household-tax-assistance', 'money-tax-tax-records'];

function routable(s) {
  if (D.SEMANTIC_ALIASES[s.id]) return false;
  if (s.generated && s.id !== C.slug(s.domain + '-' + s.title)) return false; // group-qualified duplicate placeholder
  return true;
}
// Deterministic list of texts to embed: [serviceId, sectionIndex|null, text, kind]
// kind: 'p' page description, 's' hand-written section description, 't' templated section text.
// Templated texts ("Fees and charges (Parking Charges): how much ... costs") only restate the title plus boilerplate,
// so they are used to choose a section but are NOT counted as evidence for the destination itself.
function buildTexts() {
  const out = [];
  for (const s of C.SERVICES) {
    if (!routable(s)) continue;
    const pageTexts = s.content && s.about ? [s.description, ...s.about] : (D.PAGES[s.id] || [s.description]); // RESOLVER6: content file for generated services
    for (const t of pageTexts) out.push([s.id, null, `${s.title}: ${t}`, 'p']);
    s.sections.forEach((x, i) => {
      const own = x.body ? [x.body] : (D.SECTIONS[s.id] || {})[x.id];
      const texts = own || [D.SECTION_TEMPLATES[x.label] ? D.SECTION_TEMPLATES[x.label].replace('{t}', s.title) : `${x.label} for ${s.title}.`];
      for (const t of texts) out.push([s.id, i, `${x.label} (${s.title}): ${t}`, own ? 's' : 't']);
    });
  }
  for (const t of D.OFFTOPIC || []) out.push([OFFTOPIC_ID, null, t, 'n']); // RESOLVER6 null class, never a destination
  return out;
}
// Saved applications by the service they belong to (task-state consistency for resume goals).
const SAVED_FOR = {};
for (const s of C.SERVICES) if (s.savedApplication) { const owner = C.SERVICES.find(o => o.taskKind && o.taskKind === s.savedApplication.task && !o.savedApplication); if (owner) SAVED_FOR[owner.id] = s.id; }
const PROFILE_INTENTS = {};
for (const p of C.GOAL_PROFILES) PROFILE_INTENTS[p.id] = p.intents || {};
function textsHash(texts) { // FNV-1a over the texts, to detect a stale index
  let h = 0x811c9dc5; const str = JSON.stringify(texts);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}
function b64ToBytes(b64) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u;
}
function decodeIndex(json) {
  const bytes = b64ToBytes(json.vectors);
  const vectors = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
  const expected = textsHash(buildTexts());
  return { model: json.model, dim: json.dim, texts: json.texts, vectors, stale: json.textsHash !== expected, textsHash: json.textsHash, expectedHash: expected };
}
const r4 = x => Math.round(x * 10000) / 10000;
const clamp01 = x => Math.max(0, Math.min(1, x));

function resolveSemantic(query, qvec, index, overrides) {
  const P = Object.assign({}, PARAMS, overrides || {});
  const A = C.analyse(query);
  const result = { version: C.VERSION, mode: 'semantic', query: String(query == null ? '' : query), normalised: A.normalised, intents: A.intents, generic: A.generic,
    decision: null, destinationId: null, sectionIndex: null, sectionId: null, sectionLabel: null, path: [], confidence: null, reason: null, clarification: null,
    candidates: [], sectionScores: [], adjustments: [], thresholds: P };
  if (!A.normalised) { result.decision = 'reject'; result.reason = 'empty input'; return result; }
  const content = C.contentTokens(A);
  // Per-text similarity (vectors are L2-normalised, so dot product = cosine).
  const dim = index.dim, sims = new Float64Array(index.texts.length);
  for (let i = 0; i < index.texts.length; i++) { let s = 0; const o = i * dim; for (let k = 0; k < dim; k++) s += qvec[k] * index.vectors[o + k]; sims[i] = s; }
  const per = new Map(), offBest = { v: -1, text: null };
  index.texts.forEach(([id, sec, text, kind], i) => {
    if (kind === 't') return;
    if (kind === 'n') { if (sims[i] > offBest.v) { offBest.v = sims[i]; offBest.text = text; } return; }
    const v = sec == null ? sims[i] : sims[i] - P.sectionTextPenalty;
    if (!per.has(id)) per.set(id, { id, vals: [], best: null });
    const e = per.get(id); e.vals.push(v);
    if (!e.best || v > e.best.v) e.best = { v, text, section: sec };
  });
  const cands = [];
  for (const e of per.values()) {
    const v = e.vals.slice().sort((a, b) => b - a);
    const base = v.length > 1 ? P.wMax * v[0] + (1 - P.wMax) * v[1] : v[0];
    let adj = 0; const notes = [];
    for (const [k, w] of Object.entries(PROFILE_INTENTS[e.id] || {})) if (A.intents[k] && k !== 'resume') { adj += w * P.intentScale; notes.push(`${k} ${w > 0 ? '+' : ''}${r4(w * P.intentScale)}`); }
    if (A.intents.resume) { if (RESUME_TARGETS.has(e.id)) { adj += P.resumeBoost; notes.push('resume +' + P.resumeBoost); } }
    else if (e.id === 'saved-residential-parking-application') { adj -= P.noResumePenalty; notes.push('no resume intent -' + P.noResumePenalty); }
    cands.push({ id: e.id, title: C.byId(e.id).title, score: r4(base + adj), similarity: r4(base), adjustments: notes, bestText: e.best.text, bestSim: r4(e.best.v) });
  }
  cands.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  if (P.hybrid && cands.length) applyLexicalTieBreak(cands, A, P, result);
  result.candidates = cands.slice(0, 8);
  result.offTopic = { similarity: r4(offBest.v), text: offBest.text };
  const top = cands[0], second = cands[1];
  const margin = top.score - (second ? second.score : 0);
  result.confidence = Math.min(0.99, Math.round((0.40 + 0.35 * clamp01((top.score - P.clarifyMin) / (0.75 - P.clarifyMin)) + 0.25 * clamp01(margin / 0.10)) * 100) / 100);
  result.confidenceComponents = { top: top.score, second: second ? second.score : 0, margin: r4(margin) };
  const option = (id, sec) => { const s = C.byId(id); return { id, title: s.title, sectionIndex: sec == null ? null : sec, path: C.pathLabels(id, sec).join(' \u2192 ') }; };
  const options = () => cands.filter(c => c.score >= top.score - P.optionWindow && c.score >= P.clarifyMin).slice(0, 3).map(c => option(c.id, chooseSection(C.byId(c.id), A, query, sims, index, P).index));

  // 1. Low specificity: no content words beyond generic ones ("I need some help").
  if (!content.length) {
    result.decision = 'clarify'; result.reason = 'low_specificity';
    result.clarification = { message: 'Tell me a little more about what you are trying to do, for example the situation you are in or what you want to find out.', options: [] };
    return result;
  }
  // 2. Structural consistency: "tax" with no indication of which tax or charge. "Tax" names a catalogue domain,
  //    so such a goal is underspecified rather than unrelated (checked before the unrelated test).
  const taxAmbiguous = A.stemSet.has('tax') && !['householdcharge', 'council', 'household', 'home', 'house', 'property', 'vehicle', 'car', 'business', 'road'].some(t => A.stemSet.has(C.stem(t)));
  if (taxAmbiguous) {
    result.decision = 'clarify'; result.reason = 'qualifier';
    result.clarification = { message: 'I understand that you are asking about tax, but I need to know which type of tax or charge you mean.', options: TAX_OPTIONS.map(id => option(id, null)) };
    return result;
  }
  // 3. Unrelated input: weak match overall, or (RESOLVER6) an off-topic prototype is closer than any CivicSphere description.
  const offTopic = P.offTopic && offBest.v >= P.offTopicMin && offBest.v - top.bestSim >= P.offTopicMargin && !A.intents.resume;
  if (top.score < P.clarifyMin || offTopic) {
    if (offTopic) result.adjustments.push(`off-topic prototype ${r4(offBest.v)} vs best service text ${top.bestSim}`);
    result.decision = 'reject'; result.reason = offTopic && top.score >= P.clarifyMin ? 'off_topic' : 'no_match';
    result.clarification = { message: 'I could not match that to a CivicSphere service. Usher helps with public services such as parking, housing, household charges, identity documents and complaints.', options: [] };
    return result;
  }
  // 3b. RESOLVER6 generic action: the goal is only an action ("I want to appeal", "challenge a decision", "book something"),
  //     so several services fit equally well; ask which, offering the closest services for that action.
  const action = P.genericActionClarify && !A.intents.resume ? C.genericAction(A) : null;
  if (action) {
    const opts = cands.filter(c => c.score >= P.clarifyMin).slice(0, 3).map(c => option(c.id, null));
    result.decision = 'clarify'; result.reason = 'generic_action'; result.adjustments.push('generic action: ' + action);
    result.clarification = { message: ACTION_MESSAGES[action] || 'Which of these is closest to what you want to do?', options: opts };
    return result;
  }
  // 4. Task-state consistency: a resume goal goes to the saved application for the service it is about, if one exists;
  //    otherwise to In Progress (saved applications), never to a fresh application page.
  if (A.intents.resume) {
    const topic = cands.find(c => !RESUME_TARGETS.has(c.id));
    const target = topic && topic.score >= P.clarifyMin && SAVED_FOR[topic.id] ? SAVED_FOR[topic.id] : 'activity-in-progress';
    const s = C.byId(target); const sec = chooseSection(s, A, query, sims, index, P);
    result.sectionScores = sec.scores;
    Object.assign(result, { decision: 'navigate', destinationId: target, sectionIndex: sec.index, sectionId: sec.index == null ? null : s.sections[sec.index].id,
      sectionLabel: sec.index == null ? null : s.sections[sec.index].label, path: C.pathLabels(target, sec.index),
      reason: `resume intent: ${target === 'activity-in-progress' ? 'no saved application for ' + (topic ? topic.id : 'this goal') + ', showing In Progress' : 'saved application for ' + topic.id}` });
    result.adjustments.push('resume routing');
    return result;
  }
  // 5. Navigate on a strong match with a clear margin; otherwise clarify with the closest options.
  if (top.score >= P.navigateMin && margin >= P.marginMin) {
    const s = C.byId(top.id); const sec = chooseSection(s, A, query, sims, index, P);
    result.sectionScores = sec.scores;
    const v = C.validateDestination(top.id, sec.index);
    if (!v.ok) { result.decision = 'reject'; result.reason = 'invalid destination: ' + v.error; return result; }
    Object.assign(result, { decision: 'navigate', destinationId: top.id, sectionIndex: sec.index, sectionId: sec.index == null ? null : s.sections[sec.index].id,
      sectionLabel: sec.index == null ? null : s.sections[sec.index].label, path: C.pathLabels(top.id, sec.index),
      reason: `similarity ${top.score.toFixed(3)}, margin ${margin.toFixed(3)} over ${second ? second.id : 'none'}` });
    return result;
  }
  const opts = options();
  result.decision = 'clarify'; result.reason = top.score < P.navigateMin ? 'weak_match' : 'close_alternatives';
  result.clarification = { message: opts.length > 1 ? 'Your goal could match more than one CivicSphere destination. Which of these is closest?' : 'I think I know where you mean, but I need a little more detail. Is it this?', options: opts };
  return result;
}

// RESOLVER3 evidence for one destination, in [-1, 1]: goal-profile score (negative when contradicting terms are present)
// or, at reduced weight, word overlap with the page title/group/section labels.
function lexicalEvidence(id, A, P, lexWords) {
  const prof = C.GOAL_PROFILES.find(p => p.id === id);
  let ev = 0, why = '';
  if (prof) { const sp = C.scoreProfile(prof, A);
    // RESOLVER6: a profile only boosts when it has topic evidence AND corroborating situation or intent evidence, so a single
    // keyword ("extension") cannot override the meaning of the goal (e.g. objecting to someone else's plans). Penalties still apply.
    const corroborated = sp.eligible && sp.topic.length > 0 && (sp.context.length > 0 || Object.keys(sp.intentHits || {}).length > 0);
    if (sp.exclude && sp.exclude.length && P.lexExcludeBlocks) { ev = -0.5; why = 'profile contradicted: ' + sp.exclude.join(','); } // R6: contradicting terms block any keyword boost
    else if (sp.eligible && (corroborated || !P.lexRequireCorroboration || sp.score < 0)) { ev = Math.max(-1, Math.min(1, sp.score / P.lexProfileScale)); why = `profile ${sp.score}`; }
    else if (sp.eligible) why = 'profile uncorroborated';
    else if (sp.exclude && sp.exclude.length) { ev = -0.5; why = 'profile excluded: ' + sp.exclude.join(','); } }
  const w = lexWords.get(id);
  if (w && ev >= 0 && w.matched.length >= P.lexMinWords) { const wv = P.lexWordWeight * Math.min(1, w.score / P.lexWordScale); if (wv > ev) { ev = wv; why = `words ${w.matched.join(',')}`; } }
  return { ev, why };
}
function applyLexicalTieBreak(cands, A, P, result) {
  const top = cands[0].score;
  const lexWords = new Map(C.lexical(A).map(l => [l.id, l]));
  const inBand = cands.filter(c => top - c.score <= P.band);
  if (inBand.length < 2) return;                       // a clear semantic winner is never touched
  const notes = [];
  for (const c of inBand) {
    const { ev, why } = lexicalEvidence(c.id, A, P, lexWords);
    if (!ev) continue;
    const delta = r4(P.lexWeight * ev);
    c.score = r4(c.score + delta); c.adjustments.push(`lexical ${delta > 0 ? '+' : ''}${delta} (${why})`); notes.push(`${c.id} ${delta > 0 ? '+' : ''}${delta}`);
  }
  cands.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  if (notes.length) result.adjustments.push('lexical tie-break in band ' + P.band + ': ' + notes.join(', '));
}
function sectionTextIdx(index, id, sec) { // cached lookup: text positions for one section
  if (!index.bySection) { index.bySection = new Map(); index.texts.forEach(([tid, tsec], k) => { if (tsec == null) return; const key = tid + '#' + tsec; if (!index.bySection.has(key)) index.bySection.set(key, []); index.bySection.get(key).push(k); }); }
  return index.bySection.get(id + '#' + sec) || [];
}
function chooseSection(s, A, query, sims, index, P) {
  const r3 = P.hybrid ? C.chooseSection(s, A) : { scores: [] };   // RESOLVER3 section logic (label words)
  const scores = s.sections.map((x, i) => {
    let sim = -1;
    for (const k of sectionTextIdx(index, s.id, i)) if (sims[k] > sim) sim = sims[k];
    const intentHits = x.intents.filter(k => A.intents[k]);
    const keywordHits = x.keywords.filter(t => C.hasTerm(A, t));
    const labelHits = P.hybrid ? (r3.scores[i] || {}).labelHits || [] : [];
    const score = sim + P.sectionIntentBonus * intentHits.length + P.sectionKeywordBonus * keywordHits.length + P.sectionLabelBonus * labelHits.length;
    return { index: i, id: x.id, label: x.label, similarity: r4(sim), score: r4(score), intentHits, keywordHits, labelHits };
  });
  let best = null;
  for (const sc of scores) {
    const qualifies = sc.intentHits.length || sc.keywordHits.length || sc.labelHits.length || sc.similarity >= P.sectionMin;
    if (qualifies && (!best || sc.score > best.score)) best = sc;
  }
  return { index: best ? best.index : null, scores };
}

return { MODEL, MODELS, DEFAULT_MODEL, PARAMS, SAVED_FOR, OFFTOPIC_ID, routable, rankDestinations: (qvec, index, opts) => C.rankDestinations(qvec, index, opts), buildTexts, textsHash, decodeIndex, resolveSemantic, chooseSection };
});
