/* CivicSphereNav R6.2 · presentation-layer explanations built ONLY from what the resolver already returned.
   interpret(): plain-language restatement (templates; hedged "It sounds like"; contexts only from explicit cue words in the query)
   bridge():    the user's key phrase vs the site's official label (shown only when the words differ)
   whyHere():   1-2 lines of evidence (matched description text, section intent, margin over the runner-up)
   situation(): saved/in-progress items relevant to the result (suggestion only; never changes the decision)
   No LLM, no network, deterministic. UMD: window.CivicExplain / module.exports. Does not modify the result object. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.CivicExplain = factory(); })(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const STOP = new Set(('a about above after again against all am an and any are as at be because been before being below between both but by can cannot could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves im ive id ill dont doesnt didnt wont cant isnt arent wasnt want need get got like know please help really still also already yesterday today tomorrow week month year ago recently soon one thing things something someone way'.split(' ')));
/* Display nouns for the hand-built services (fit "what X costs", "you need X"); other pages use their lower-cased title. */
const SUBJECT = {
  'residential-parking': "a residents' parking permit", 'visitor-parking': 'visitor parking permits', 'vehicle-registration': 'vehicle registration',
  'identity-replacement': 'a replacement identity document', 'birth-certificate': 'a birth certificate', 'address-change': 'updating your address',
  'large-item-collection': 'a bulky item collection', 'household-tax-assistance': 'paying your household charge', 'money-tax-household-charge-payment': 'your household charge',
  'financial-support': 'financial support', 'housing-property-housing-repairs': 'repairs to your home', 'housing-property-tenancy-support': 'your tenancy', 'education-learning-school-place': 'a school place',
  'development-approval': 'planning permission', 'formal-complaint': 'a complaint', 'saved-residential-parking-application': "the residents' parking permit application you saved",
  'activity-in-progress': 'an application you started earlier', 'work-business-business-licence': 'a business licence'
};
// cue words that the resolver counts as intent evidence but that do not, on their own, say what the person wants
// ("council charge" is a name, not a question about cost). The interpretation only restates explicit intents.
const WEAK = new Set(['charge', 'charges', 'application', 'applications', 'get a', 'get a new', 'struggl', 'form', 'cost', 'costs', 'pay the']);
const GERUND = { report: 'reporting', request: 'requesting', apply: 'applying', book: 'booking', find: 'finding', pay: 'paying', check: 'checking', change: 'changing', challenge: 'challenging' };
const HOWTO = { 'formal-complaint': 'want to make a complaint', 'large-item-collection': 'want to book a bulky item collection' };
const CONTEXTS = [
  [/\b(just )?(moved|relocated) (in|into|house|home|to|here|address)\b|\bnew (house|home|flat|address)\b|\bmoved house\b/, "you've moved house"],
  [/\bmoving (in|into|house|home|to)\b/, "you're moving house"],
  [/\b(lost|losing) (my |our )?(job|work)\b|\b(unemployed|redundant|made redundant|redundancy)\b/, "you've lost your job"],
  [/\bstruggl\w* to (pay|afford)\b|\bcan ?not afford\b|\bcant afford\b|\bbehind (on|with) (my |the )?(rent|bills?|payments?)\b/, "you're finding it hard to pay"],
  [/\b(my|our) landlord\b|\b(i am|im) renting\b|\bi rent\b|\btenant\b/, 'you rent your home'],
  [/\b(had a baby|new baby|just had a baby|baby (was )?born)\b/, "you've had a baby"],
  // a person must be named: "my laptop died" is NOT a bereavement
  [/\b(my|our|his|her|their|a) (mum|mom|mother|dad|father|husband|wife|partner|son|daughter|brother|sister|gran|nan|grandma|grandmother|grandad|grandfather|grandparent|parent|relative|friend|neighbour|aunt|uncle|child|baby|family member) (has |have |had |just )*(died|passed away)\b|\bsomeone (has |had |just )*(died|passed away)\b|\bdeath of (my|our|a|his|her)\b|\bbereave\w*/, 'someone has died']
];
const FOLLOW_VERBS = new Set(['appeal', 'complain', 'challenge', 'dispute', 'object', 'chase']);
const INTENT_NOUN = { cost: 'costs and fees', pay: 'paying', eligibility: 'who can apply', documents: 'what you need', requirements: 'what you need', howto: 'how to apply', create: 'how to apply', status: 'checking progress', followup: 'following up', resume: 'continuing an application', difficulty: 'getting help', responsibility: 'who is responsible' };
const ORDER = ['resume', 'cost', 'pay', 'eligibility', 'documents', 'requirements', 'status', 'responsibility', 'followup', 'difficulty', 'howto', 'create'];
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const subjectOf = (C, id) => { if (SUBJECT[id]) return SUBJECT[id]; const t = ((C.byId(id) || {}).title || 'this service').toLowerCase(); const w = t.split(' '); return GERUND[w[0]] ? [GERUND[w[0]]].concat(w.slice(1)).join(' ') : t; };
const topIntent = r => ORDER.find(k => r.intents && (r.intents[k] || []).some(p => !WEAK.has(String(p).replace(/\s*\([^)]*\)\s*$/, '')))) || null;
function contexts(r) { const n = ' ' + (r.normalised || '') + ' '; const out = []; for (const [re, txt] of CONTEXTS) if (re.test(n) && !out.includes(txt)) out.push(txt); return out.slice(0, 2); }
function goalClause(C, r, intent, id) {
  const S = subjectOf(C, id), indefinite = /^(a|an) /.test(S);
  switch (intent) {
    case 'resume': return `want to pick up ${S}`;
    case 'cost': return indefinite ? `want to know what ${S} costs` : `want to know what you would pay for ${S}`;
    case 'pay': return `want to know about paying for ${S}`;
    case 'eligibility': return `want to check whether you can get ${S}`;
    case 'documents': case 'requirements': return `want to know what you need for ${S}`;
    case 'status': return `want to check the progress of ${S}`;
    case 'responsibility': return `want to know who is responsible for ${S}`;
    case 'followup': { const v = (r.intents.followup || []).find(p => FOLLOW_VERBS.has(p)); return v ? `want to ${v} about ${S}` : `want to follow up on ${S}`; }
    case 'difficulty': return `need help with ${S}`;
    case 'howto': case 'create': return HOWTO[id] || (indefinite ? `want to know how to get ${S}` : `want to know the steps for ${S}`);
    default: return indefinite ? `need ${S}` : `need help with ${S}`;
  }
}
function sentence(ctx, clause) {
  if (!ctx.length) return `It sounds like you ${clause}.`;
  const lead = ctx.length === 1 ? ctx[0] : ctx.slice(0, -1).join(', ') + ', ' + ctx[ctx.length - 1];
  const sep = ctx.length === 1 ? ' and ' : ', and ';
  return `It sounds like ${lead}${sep}${ctx.length === 1 && /^you/.test(ctx[0]) ? '' : 'you '}${clause}.`;
}
function interpret(C, r) {
  if (!r) return null;
  const ctx = contexts(r), intent = topIntent(r);
  if (r.decision === 'navigate' && r.destinationId) {
    const id = r.destinationId, isSaved = !!(C.byId(id) || {}).savedApplication;
    const clause = goalClause(C, r, isSaved || /resume/.test(r.reason || '') ? 'resume' : intent, id);
    return { text: sentence(ctx, clause), contexts: ctx, intent };
  }
  if (r.decision === 'clarify') {
    const v = r.intents && (r.intents.followup || []).find(p => FOLLOW_VERBS.has(p));
    let text;
    if (r.reason === 'generic_action' && v) text = `It sounds like you want to ${v}, but there is more than one kind of ${v === 'complain' ? 'complaint' : v} on this site.`;
    else if (r.reason === 'low_specificity') text = 'I need a little more detail to know which service you mean.';
    else text = 'That could fit more than one service, so I need one detail first.';
    if (ctx.length) text = `It sounds like ${ctx.join(' and ')}. ` + text.replace(/^It sounds like you/, 'You');
    return { text, contexts: ctx, intent };
  }
  if (r.decision === 'reject') return { text: "That doesn't look like something the council handles.", contexts: [], intent: null };
  return null;
}
/* ---- terminology bridge ---- */
function stems(C, text) { return C.normalise(String(text || '')).split(' ').filter(Boolean).map(C.stem); }
function evidenceStems(C, r, cand) {
  const ev = new Set();
  if (!cand) return ev;
  if (cand.bestText) stems(C, cand.bestText.replace(/^[^:]*:\s*/, '')).forEach(s => ev.add(s));   // matched description text (without its title prefix)
  for (const a of cand.adjustments || []) { const m = /\(words ([^)]+)\)/.exec(a); if (m) m[1].split(',').forEach(w => ev.add(C.stem(w.trim()))); }
  for (const w of [...(cand.topic || []), ...(cand.context || [])]) stems(C, w).forEach(s => ev.add(s));   // lexical-mode evidence
  return ev;
}
const INNER = new Set(['my', 'the', 'a', 'an', 'of', 'for', 'to', 'your', 'our', 'in', 'on', 'with', 'at', 'and']);
function keyPhrase(C, r, ev, exclude) {
  const toks = (r.normalised || '').split(' ').filter(Boolean);
  const generic = new Set((r.generic || []).flatMap(g => g.split(' ')));
  const skip = new Set(exclude || []);
  const content = t => !(STOP.has(t) || generic.has(t) || skip.has(t) || t.length < 2);
  let best = null;
  for (let a = 0; a < toks.length; a++) {
    if (!content(toks[a])) continue;
    for (let b = a; b < Math.min(toks.length, a + 4); b++) {
      const w = toks.slice(a, b + 1);
      if (!content(toks[b])) { if (INNER.has(toks[b])) continue; break; }
      if (w.slice(1, -1).some(t => !content(t) && !INNER.has(t))) break;   // only connector words inside a phrase
      const hits = w.filter(t => content(t) && ev.has(C.stem(t))).length;
      if (!hits) continue;
      const cw = w.filter(content).length;
      const key = [hits, hits / cw, -w.length, -a];   // most evidence words, then density, then shorter, then earlier
      if (!best || key.some((v, i) => v !== best.key[i]) && (() => { for (let i = 0; i < key.length; i++) if (key[i] !== best.key[i]) return key[i] > best.key[i]; return false; })()) best = { key, words: w, a };
    }
  }
  if (!best) return null;
  // a single matched word keeps the user's own modifier just before it ("new passport", "old mattress")
  if (best.words.length === 1 && best.a > 0 && content(toks[best.a - 1])) return toks[best.a - 1] + ' ' + best.words[0];
  return best.words.join(' ');
}
const differs = (C, phrase, label) => { const L = new Set(stems(C, label)); return stems(C, phrase).some(s => !L.has(s)); };
function bridge(C, r) {
  if (!r || r.decision !== 'navigate' || !r.destinationId) return null;
  const s = C.byId(r.destinationId); if (!s) return null;
  const cand = (r.candidates || []).find(c => c.id === r.destinationId);
  const intentWords = Object.values(r.intents || {}).flat().join(' ').replace(/\([^)]*\)/g, ' ').split(' ').filter(Boolean);
  const phrase = keyPhrase(C, r, evidenceStems(C, r, cand), intentWords);
  const out = { page: null, section: null };
  if (phrase && differs(C, phrase, s.title)) out.page = { phrase, label: s.title, area: (C.domainOf(s.domain) || [])[1] || '' };
  if (r.sectionIndex != null && r.sectionLabel) {
    const sec = (r.sectionScores || []).find(x => x.index === r.sectionIndex);
    const hit = sec && (sec.intentHits || [])[0];
    const raw = hit && r.intents && r.intents[hit] && r.intents[hit][0];
    const p = raw && String(raw).replace(/\s*\([^)]*\)\s*$/, '').trim();   // drop resolver annotations such as "(+context)"
    if (p && (' ' + r.normalised + ' ').includes(' ' + p + ' ') && differs(C, p, r.sectionLabel)) out.section = { phrase: p, label: r.sectionLabel, intent: hit };
  }
  return out.page || out.section ? out : null;
}
/* ---- why here ---- */
function snippet(text, n) { let t = String(text || '').replace(/^[^:]*:\s*/, '').trim().replace(/\.$/, ''); if (t.length > n) { t = t.slice(0, n); t = t.slice(0, t.lastIndexOf(' ')) + '…'; } return t; }
function whyHere(C, r) {
  if (!r || r.decision !== 'navigate' || !r.destinationId) return [];
  const lines = [], cands = r.candidates || [], top = cands.find(c => c.id === r.destinationId), second = cands.find(c => c.id !== r.destinationId);
  const isSaved = !!(C.byId(r.destinationId) || {}).savedApplication;
  if (isSaved && /resume/.test(r.reason || '')) lines.push('You asked to carry on where you left off, and this is the application you saved.');
  else if (r.mode === 'semantic' && top && top.bestText) lines.push(`Closest match to what you described: “${snippet(top.bestText, 120)}”.`);
  else if (top && (top.topic || top.context)) { const w = [...new Set([...(top.topic || []), ...(top.context || [])])].slice(0, 4); if (w.length) lines.push(`Matched your words: ${w.map(x => '“' + x + '”').join(', ')} (keyword matching).`); }
  const sec = r.sectionIndex != null ? (r.sectionScores || []).find(x => x.index === r.sectionIndex) : null;
  const hit = sec && (sec.intentHits || [])[0];
  if (hit && INTENT_NOUN[hit]) lines.push(`“${r.sectionLabel}” is the part of the page about ${INTENT_NOUN[hit]}.`);
  else if (second && r.mode === 'semantic' && r.confidenceComponents) {
    const m = r.confidenceComponents.margin;
    if (m >= 0.1) lines.push(`It was a clear match: the next closest page, ${second.title}, scored well below it.`);
    else if (m < 0.05) lines.push(`A close call: ${second.title} was also a strong match.`);
    else lines.push(`The next closest page was ${second.title}.`);
  }
  return lines.slice(0, 2);
}
/* ---- situation awareness (UI suggestion only) ---- */
function situation(C, r) {
  if (!r || r.decision === 'reject') return [];
  const out = [];
  for (const s of C.SERVICES.filter(x => x.savedApplication)) {
    const sa = s.savedApplication, t = C.TASKS[sa.task]; if (!t) continue;
    const related = t.service;
    if (r.destinationId === s.id || r.destinationId === s.parent) continue;   // the answer already IS the saved item
    const top3 = (r.candidates || []).slice(0, 3).map(c => c.id);
    const inOptions = ((r.clarification || {}).options || []).some(o => o.id === related || o.id === s.id);
    if (r.destinationId === related || inOptions || top3.includes(related) || top3.includes(s.id))
      out.push({ savedId: s.id, title: s.title, service: related, serviceTitle: (C.byId(related) || {}).title, reference: sa.reference, step: sa.step, stepNo: sa.step + 1, stepLabel: t.steps[sa.step], total: t.steps.length, subject: SUBJECT[related] || null });
  }
  return out;
}
function clarifyQuestion(r) { const c = (r && r.clarification) || { message: '', options: [] }; return { question: c.message || 'Which of these is closest to what you need?', options: (c.options || []).slice(0, 3) }; }
return { interpret, bridge, whyHere, situation, clarifyQuestion, contexts, keyPhrase, SUBJECT, INTENT_NOUN, STOP };
});
