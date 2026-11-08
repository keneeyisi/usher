#!/usr/bin/env node
// One-off converter: reads the FROZEN CivicSphere catalogue files (civicsphere-core/-content/-descriptions/-semantic.js, never edited)
// and writes profiles/civicsphere.profile.json (usher-profile/0.1). Usage: node tools/export-civicsphere.js [out.json]
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const C = require(path.join(ROOT, 'civicsphere-core.js'));
const D = require(path.join(ROOT, 'civicsphere-descriptions.js'));
const S = require(path.join(ROOT, 'civicsphere-semantic.js'));
const X = require(path.join(ROOT, 'civicsphere-explain.js'));
const slug = C.slug;
// The explanation tables are not exported by the legacy module; read them from its source text (the file itself is never edited).
const xsrc = fs.readFileSync(path.join(ROOT, 'civicsphere-explain.js'), 'utf8');
const grab = name => { const m = new RegExp('const ' + name + ' = ([\\s\\S]*?);\\n(?=const |//|function )').exec(xsrc); if (!m) throw new Error('cannot read ' + name); return (0, eval)('(' + m[1] + ')'); };
const CONTEXTS = grab('CONTEXTS'), HOWTO = grab('HOWTO');
const groupId = g => slug(g);
const GENERIC_INTENTS = new Set(['cost', 'documents', 'requirements', 'eligibility', 'howto', 'status', 'resume']); // shipped as engine defaults
const areas = C.DOMAINS.map(d => ({ id: d[0], label: d[1], description: d[2], kind: d[3], groups: (C.GROUPS[d[0]] || []).map(g => ({ id: groupId(g), label: g })) }));
const ownerOf = sa => { const o = C.SERVICES.find(x => x.taskKind && x.taskKind === sa.task && !x.savedApplication); return o ? o.id : null; };
const destinations = C.SERVICES.map(s => {
  const routable = S.routable(s);
  const pageTexts = s.content && s.about ? [s.description, ...s.about] : (D.PAGES[s.id] || [s.description]);
  const d = { id: s.id, title: s.title, area: s.domain, group: groupId(s.group), url: '#service/' + s.id, summary: s.description, kind: s.type };
  if (!routable) { d.routable = false; const a = D.SEMANTIC_ALIASES[s.id] || s.duplicateOf; if (a) d.aliasOf = a; }
  if (s.generated) d.generated = true;
  if (s.parent) d.parent = s.parent;
  d.descriptions = pageTexts.slice();
  d.aliases = (s.aliases || []).slice();
  d.sections = s.sections.map((x, i) => {
    const o = { id: x.id, label: x.label, anchor: '#sec-' + i };
    if (x.body) o.body = x.body;
    else { const own = (D.SECTIONS[s.id] || {})[x.id]; if (own) o.descriptions = own.slice(); }
    o.intents = x.intents.slice(); if (x.keywords && x.keywords.length) o.keywords = x.keywords.slice();
    return o;
  });
  return d;
});
const savedStates = C.SERVICES.filter(s => s.savedApplication).map(s => { const sa = s.savedApplication, t = C.TASKS[sa.task];
  return { id: 'saved-' + s.id, kind: 'application', ownerDestination: ownerOf(sa), destination: s.id, reference: sa.reference, label: s.title, savedAt: sa.savedAt,
    progress: { step: sa.step, total: t.steps.length, stepLabel: t.steps[sa.step] }, synthetic: true }; });
const taxQ = C.GOAL_PROFILES.find(p => p.qualifier).qualifier;
const siteIntents = {}; for (const [k, v] of Object.entries(C.INTENTS)) if (!GENERIC_INTENTS.has(k)) siteIntents[k] = v;
const profile = {
  format: 'usher-profile/0.1',
  site: { id: 'civicsphere', name: 'CivicSphere City Council', shortName: 'CivicSphere', lang: 'en-GB',
    navigation: { mode: 'hash', urlTemplates: { home: '#home', area: '#domain/{area}', group: '#group/{area}/{groupLabel}', page: '#service/{id}', section: '#service/{id}/section/{index}' } },
    scope: { noun: 'the council', productName: 'CivicSphereNav',
      rejectMessage: 'I could not match that to a CivicSphere service. CivicSphereNav helps with public services such as parking, housing, household charges, identity documents and complaints.' },
    persistence: 'session', synthetic: true },
  taxonomy: { areas },
  destinations,
  savedStates,
  resume: { fallbackDestination: 'activity-in-progress' },
  vocabulary: {
    entities: [ { canonical: 'householdcharge', patterns: ['\\bhousehold (charges?|payments?|tax(es)?)( bills?)?\\b'] }, { canonical: 'identitydocument', patterns: ['\\b(civic )?(identity|id) (documents?|cards?)\\b'] } ],
    savedNoun: 'saved application',
    intents: siteIntents,
    sectionTemplates: D.SECTION_TEMPLATES,
    explain: { subjects: X.SUBJECT, howto: HOWTO, intentNouns: X.INTENT_NOUN, situations: CONTEXTS.map(([re, text]) => ({ pattern: re.source, flags: re.flags, text })) }
  },
  qualifiers: [ { id: 'which-tax', triggerTerms: ['tax'], unlessAnyOf: ['householdcharge', 'council', 'household', 'home', 'house', 'property', 'vehicle', 'car', 'business', 'road'], message: taxQ.message, options: taxQ.options.slice() } ],
  offTopic: D.OFFTOPIC.slice(),
  hints: { lexicalProfiles: JSON.parse(JSON.stringify(C.GOAL_PROFILES)) },
  ui: { pillLabel: 'I want to…', placeholder: 'e.g. replace my identity document', hotkey: '/',
    examples: ['I need a new passport', "I've just moved into a new house and need to sort out parking. I want to know what I'll have to pay.", 'my landlord won’t fix the damp in my flat'] }
};
const out = process.argv[2] || path.join(ROOT, 'profiles', 'civicsphere.profile.json');
fs.writeFileSync(out, JSON.stringify(profile, null, 1));
console.log(`wrote ${out}: ${areas.length} areas, ${destinations.length} destinations (${destinations.filter(d => d.routable !== false).length} routable), ${destinations.reduce((n, d) => n + d.sections.length, 0)} sections, ${savedStates.length} saved state(s), ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
