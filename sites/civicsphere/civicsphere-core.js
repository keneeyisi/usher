/*
 * CivicSphereNav core (RESOLVER6; catalogue and lexical resolver from RESOLVER3)
 * Catalogue, goal profiles and a pure, deterministic resolver.
 * No DOM, network or storage access: the same file runs in the browser
 * (window.CivicCore) and in Node (require('./civicsphere-core.js')).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { let content = null; try { content = require('./civicsphere-content.js'); } catch (e) { content = null; } module.exports = factory(content); }
  else root.CivicCore = factory(root.CivicContent || null);
})(typeof self !== 'undefined' ? self : this, function (CONTENT) {
'use strict';
const VERSION = 'RESOLVER6';

function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

/* ------------------------------------------------------------------ */
/* Catalogue                                                          */
/* ------------------------------------------------------------------ */
// [id, label, description, kind]
const DOMAINS = [
  ['money-tax', 'Money & Tax', 'Payments, household charges, tax support and financial services.', 'service'],
  ['benefits-support', 'Benefits & Support', 'Support with living costs, household needs and financial assistance.', 'service'],
  ['housing-property', 'Housing & Property', 'Housing, property, renting, repairs and neighbourhood services.', 'service'],
  ['transport-vehicles', 'Transport & Vehicles', 'Parking, permits, vehicles, roads and local transport.', 'service'],
  ['planning-development', 'Planning & Development', 'Planning applications, development approvals and building matters.', 'service'],
  ['work-business', 'Work & Business', 'Employment, business support, licensing and local economic services.', 'service'],
  ['education-learning', 'Education & Learning', 'Schools, learning, childcare and education support.', 'service'],
  ['health-care', 'Health & Care', 'Care services, local health information and wellbeing support.', 'service'],
  ['family-community', 'Family & Community', 'Family services, community support, events and local participation.', 'service'],
  ['environment-utilities', 'Environment & Utilities', 'Waste, recycling, utilities, environmental services and reporting.', 'service'],
  ['identity-records', 'Identity & Records', 'Identity documents, certificates, records and official requests.', 'service'],
  ['safety-legal-civic', 'Safety, Legal & Civic Services', 'Complaints, appeals, safety reporting and civic processes.', 'service'],
  ['my-civicsphere', 'My CivicSphere', 'Your saved applications, activity and records (synthetic test account).', 'account']
];
const GROUPS = {
  'money-tax': ['Household Charges', 'Payments', 'Financial Support', 'Tax Records'],
  'benefits-support': ['Financial Support', 'Household Support', 'Disability & Care Support', 'Emergency Assistance'],
  'housing-property': ['Housing Services', 'Property Records', 'Renting & Tenancy', 'Neighbourhood Housing'],
  'transport-vehicles': ['Parking & Road Access', 'Vehicles & Registration', 'Public Transport', 'Road Services'],
  'planning-development': ['Planning & Development', 'Building Matters', 'Property Development', 'Local Plans'],
  'work-business': ['Business & Licensing', 'Employment Support', 'Local Economy', 'Trading Standards'],
  'education-learning': ['Schools & Admissions', 'Learning & Skills', 'Childcare', 'Adult Education'],
  'health-care': ['Care Services', 'Local Health Information', 'Wellbeing', 'Health Access'],
  'family-community': ['Family Services', 'Community Life', 'Local Participation', 'Events & Activities'],
  'environment-utilities': ['Waste & Recycling', 'Environmental Reporting', 'Utilities', 'Climate & Nature'],
  'identity-records': ['Certificates & Documents', 'Personal Records', 'Official Records', 'Identity Services'],
  'safety-legal-civic': ['Complaints & Appeals', 'Safety Reporting', 'Civic Processes', 'Legal Information'],
  'my-civicsphere': ['Activity & Records']
};
const serviceNames = {
  'Money & Tax': ['Household Charge Payment', 'Household Charge Discounts', 'Payment Difficulties', 'Tax Records', 'Payment Arrangements', 'Exemptions', 'Financial Support', 'Annual Statements', 'Charge Appeals', 'Direct Debit'],
  'Benefits & Support': ['Living Cost Support', 'Household Support', 'Emergency Assistance', 'Care Support Payment', 'Eligibility Checker', 'Support Applications', 'Evidence Requirements', 'Payment Information', 'Appeals', 'Support Reviews'],
  'Housing & Property': ['Housing Repairs', 'Rent Support', 'Property Records', 'Tenancy Support', 'Housing Applications', 'Neighbourhood Issues', 'Property Information', 'Housing Costs', 'Temporary Accommodation', 'Housing Appeals'],
  'Transport & Vehicles': ['Residential Parking', 'Visitor Parking', 'Vehicle Registration', 'Road Permits', 'Public Transport', 'Road Services', 'Vehicle Records', 'Parking Charges', 'Travel Support', 'Traffic Reports'],
  'Planning & Development': ['Development Approval', 'Planning Applications', 'Building Guidance', 'Property Development', 'Local Plans', 'Planning Records', 'Development Fees', 'Application Guidance', 'Planning Appeals', 'Neighbourhood Development'],
  'Work & Business': ['Business Licence', 'Trading Registration', 'Employment Support', 'Business Rates', 'Local Business Support', 'Trading Standards', 'Workplace Guidance', 'Business Records', 'Licensing Appeals', 'Business Premises'],
  'Education & Learning': ['School Place', 'Childcare Support', 'Adult Learning', 'Learning Accounts', 'School Information', 'Education Support', 'Course Funding', 'Education Records', 'Admissions Appeals', 'Skills Development'],
  'Health & Care': ['Care & Support', 'Health Access', 'Wellbeing Services', 'Care Assessment', 'Support Planning', 'Health Information', 'Care Charges', 'Carer Support', 'Care Records', 'Service Appeals'],
  'Family & Community': ['Community Events', 'Family Support', 'Community Groups', 'Local Activities', 'Family Records', 'Community Facilities', 'Youth Services', 'Volunteering', 'Community Funding', 'Event Permits'],
  'Environment & Utilities': ['Waste & Recycling', 'Report an Environmental Issue', 'Collection Services', 'Recycling Guidance', 'Utility Support', 'Climate & Nature', 'Environmental Records', 'Waste Charges', 'Street Cleanliness', 'Environmental Appeals'],
  'Identity & Records': ['Document Replacement', 'Birth Certificates', 'Change of Address', 'Official Records', 'Identity Services', 'Record Requests', 'Certificates', 'Personal Details', 'Record Corrections', 'Identity Support'],
  'Safety, Legal & Civic Services': ['Formal Complaint', 'Challenge a Decision', 'Safety Reporting', 'Civic Processes', 'Legal Information', 'Service Appeals', 'Public Safety', 'Civic Requests', 'Complaint Review', 'Decision Records']
};
const EXTRA_SECTIONS = ['Overview', 'Eligibility', 'What you need', 'Requirements', 'Fees and charges', 'How it works', 'Documents and evidence', 'Application process', 'What happens next'];
// Default information-need intents for common section labels (used when a section has no explicit intents).
const SECTION_LABEL_INTENTS = {
  'Eligibility': ['eligibility'], 'Who can apply': ['eligibility'], 'Who can register': ['eligibility'],
  'What you need': ['requirements'], 'Requirements': ['requirements'], 'Information required': ['requirements'],
  'Fees and charges': ['cost'], 'Fees': ['cost'], 'Charges': ['cost'], 'Permit charges': ['cost'],
  'Documents and evidence': ['documents'], 'Documents': ['documents'], 'Evidence': ['documents'],
  'Application process': ['howto'], 'How to apply': ['howto'], 'What happens next': ['status']
};
// RESOLVER6: information-need intents inferred from a section label (for content-defined sections).
function labelIntents(label) {
  const l = label.toLowerCase().replace(/household charges?/g, ''), out = []; // the service name is not a cost cue
  if (/\b(fee|fees|charge|charges|cost|costs|price|tariff|tariffs|rates)\b/.test(l)) out.push('cost');
  if (/^(how to|how do|apply|book|request|report|register|enrol|order|make a|set up|start)\b/.test(l) || /\bhow to\b/.test(l)) out.push('howto');
  if (/\b(document|documents|evidence|proof)\b/.test(l)) out.push('documents');
  if (/\b(who can|who qualifies|eligib|can i appeal|do i need)/.test(l)) out.push('eligibility');
  if (/\b(what happens|status|progress|processing times|response times|timescales|after the)\b/.test(l)) out.push('status');
  return out;
}
function sec(label, opts) {
  opts = opts || {};
  const x = { id: opts.id || slug(label), label, keywords: opts.kw || [], intents: opts.intents || SECTION_LABEL_INTENTS[label] || [] };
  if (opts.body) x.body = opts.body;
  return x;
}

// Synthetic task definitions (step labels are used to validate saved application state).
const TASKS = {
  parking: { service: 'residential-parking', steps: ['Eligibility', 'Vehicle', 'Permit', 'Review'] },
  identity: { service: 'identity-replacement', steps: ['Start', 'Document', 'Details', 'Address', 'Review'] }
};

const SPECIAL = [
  { id: 'residential-parking', title: 'Residential Parking', domain: 'transport-vehicles', group: 'Parking & Road Access', description: 'A permit for residents who need to park near their home.', type: 'transaction', task: 'T2', taskKind: 'parking',
    aliases: ['parking permit', 'park outside my house', 'resident parking', 'parking near home'],
    sections: [sec('Eligibility', { kw: ['eligible', 'qualify'] }), sec('Permit requirements', { intents: ['requirements', 'documents'] }), sec('Permit charges', { intents: ['cost'] }), sec('How to apply', { intents: ['howto'] })] },
  { id: 'visitor-parking', title: 'Visitor Parking', domain: 'transport-vehicles', group: 'Parking & Road Access', description: 'Arrange short-term parking access for visitors.', type: 'transaction', task: 'T1',
    aliases: ['visitor parking', 'guest parking', 'visitors permit'],
    sections: [sec('Eligibility'), sec('Visitor permits', { intents: ['howto'], kw: ['visitor permit'] }), sec('Charges', { intents: ['cost'] })] },
  { id: 'vehicle-registration', title: 'Vehicle Registration', domain: 'transport-vehicles', group: 'Vehicles & Registration', description: 'Register or update the details of a vehicle, and see what you owe.', type: 'transaction', task: 'T2',
    aliases: ['register my vehicle', 'vehicle registration', 'car registration'],
    sections: [sec('Who can register'), sec('Information required', { intents: ['requirements', 'documents'] }), sec('Registration process', { intents: ['howto'] }), sec('Fees and charges', { intents: ['cost'], kw: ['owe'] })] },
  { id: 'identity-replacement', title: 'Document Replacement', domain: 'identity-records', group: 'Certificates & Documents', description: 'Replace an identity document that is lost, damaged or no longer usable.', type: 'application', task: 'T3', taskKind: 'identity',
    aliases: ['replace identity document', 'lost ID', 'damaged identity document', 'replace my document', 'replace my civic identity document'],
    sections: [sec('Who can apply'), sec('What you need', { intents: ['requirements'] }), sec('Documents', { intents: ['documents'] }), sec('Fees', { intents: ['cost'] }), sec('Replacement process', { intents: ['howto'], kw: ['new one'] })] },
  { id: 'birth-certificate', title: 'Birth Certificates', domain: 'identity-records', group: 'Certificates & Documents', description: 'Request an official copy of a birth record.', type: 'record_request', task: 'T1',
    aliases: ['birth certificate', 'copy of birth record', 'birth records'],
    sections: [sec('Eligibility'), sec('What you need'), sec('Fees'), sec('Request a certificate', { intents: ['howto'] })] },
  { id: 'address-change', title: 'Change of Address', domain: 'identity-records', group: 'Personal Records', description: 'Update your address across relevant civic records.', type: 'update', task: 'T1',
    aliases: ['change my address', 'moving house', 'update address'],
    sections: [sec('Before you start', { intents: ['requirements'] }), sec('Records affected', { kw: ['which records'] }), sec('Update process', { intents: ['howto'] })] },
  { id: 'large-item-collection', title: 'Large-item Collection', domain: 'environment-utilities', group: 'Waste & Recycling', description: 'Arrange collection of large household items.', type: 'booking', task: 'T2',
    aliases: ['collect a sofa', 'large rubbish collection', 'bulky waste', 'dispose of furniture'],
    sections: [sec('What can be collected', { kw: ['what can', 'which item'] }), sec('Charges', { intents: ['cost'] }), sec('Collection slots', { kw: ['when', 'slot', 'what day', 'date'] }), sec('How to request', { intents: ['howto'] })] },
  { id: 'household-tax-assistance', title: 'Household Payment Assistance', domain: 'money-tax', group: 'Household Charges', description: 'Get help when household charges are difficult to pay.', type: 'application', task: 'T2',
    aliases: ['help paying household tax', 'cannot afford household charges', 'tax payment help', 'payment assistance'],
    sections: [sec('Eligibility'), sec('Evidence', { intents: ['documents'] }), sec('Support options', { kw: ['what * help', 'help is available', 'help available', 'support available', 'what * support', 'option'] }), sec('Apply for support', { intents: ['howto'] })] },
  { id: 'development-approval', title: 'Development Approval', domain: 'planning-development', group: 'Planning & Development', description: 'Understand whether proposed development requires approval and how to apply.', type: 'application', task: 'T4',
    aliases: ['build an extension', 'planning permission', 'development approval', 'change my property'],
    sections: [sec('Do I need approval?', { intents: ['requirements', 'eligibility'], kw: ['do i need', 'need permission', 'need approval', 'without permission', 'before i start', 'allowed to'] }), sec('Application types', { kw: ['type of application', 'which application'] }), sec('Documents', { intents: ['documents'] }), sec('Fees', { intents: ['cost'] }), sec('Decision process', { intents: ['status'], kw: ['decision'] })] },
  { id: 'formal-complaint', title: 'Formal Complaint', domain: 'safety-legal-civic', group: 'Complaints & Appeals', description: 'Make a formal complaint about a civic service or decision, follow its progress, or take it further.', type: 'complaint', task: 'T2',
    aliases: ['make a complaint', 'complain about a service', 'formal complaint'],
    sections: [sec('Before you complain', { kw: ['can i complain', 'what can i complain about'] }), sec('How complaints are handled', { intents: ['status'], kw: ['how long', 'what happens'] }), sec('Submit a complaint', { intents: ['create'] }), sec('Not happy with the response?', { id: 'not-happy-with-the-response', intents: ['followup'], kw: ['appeal', 'review', 'escalate'] })] },
  { id: 'financial-support', title: 'Financial Support', domain: 'benefits-support', group: 'Financial Support', description: 'Find support with living costs, food, household bills and loss of income.', type: 'application', task: 'T2',
    aliases: ['financial support', 'financial assistance', 'help with bills', 'help paying for food', 'living cost support'],
    sections: [sec('What support is available', { kw: ['what * support', 'what * help', 'available', 'can i get'] }), sec('How to apply', { intents: ['howto'] }), sec('Evidence and documents', { intents: ['documents'] }), sec('Payment information', { kw: ['when will i be paid', 'payment date'] })] },
  { id: 'housing-property-housing-repairs', title: 'Housing Repairs', domain: 'housing-property', group: 'Housing Services', description: 'Repairs in rented homes: what counts as a repair, what your landlord must fix and how to report it.', type: 'information',
    aliases: ['housing repairs', 'landlord repairs', 'report a repair'],
    sections: [sec('What counts as a repair', { kw: ['what counts', 'is it a repair'] }), sec('What your landlord must fix', { intents: ['responsibility'], kw: ['landlord'] }), sec('How to report a repair', { intents: ['howto'], kw: ['report'] }), sec('If repairs are not done', { intents: ['followup'], kw: ['ignor', 'not been fixed', 'still not', 'refus'] })] },
  // My CivicSphere: synthetic account area (no real personal data).
  { id: 'activity-in-progress', title: 'In Progress', domain: 'my-civicsphere', group: 'Activity & Records', description: 'Applications you have started but not yet submitted.', type: 'account', aliases: ['in progress', 'saved applications', 'my applications'],
    sections: [sec('Saved applications', { intents: ['resume'] }), sec('Awaiting your action'), sec('Recently submitted', { intents: ['status'] })] },
  { id: 'activity-submitted', title: 'Submitted Applications', domain: 'my-civicsphere', group: 'Activity & Records', description: 'Applications you have submitted and their current status.', type: 'account', aliases: ['submitted applications'],
    sections: [sec('Current applications', { intents: ['status'] }), sec('Past applications')] },
  { id: 'saved-residential-parking-application', title: 'Residential Parking Application', parent: 'activity-in-progress', domain: 'my-civicsphere', group: 'Activity & Records', description: 'Your saved, unsubmitted residential parking permit application (synthetic test state).', type: 'saved_application',
    aliases: ['saved parking application'],
    savedApplication: { reference: 'CS-RP-20261008-0427', task: 'parking', step: 2, savedAt: '2026-10-08T17:42:00+01:00', applicant: 'Alex Morgan (synthetic test account)', completed: { 'Vehicle registration': 'CSH 284A', 'Vehicle type': 'Passenger vehicle', 'Eligible parking area': 'Zone C (synthetic)' } },
    sections: [sec('Application summary'), sec('Progress so far', { intents: ['status'] }), sec('Continue where you left off', { intents: ['resume'] })] }
];

const SERVICES = [];
(function buildCatalogue() {
  const used = new Set();
  for (const d of DOMAINS) {
    if (d[3] !== 'service') continue;
    const groups = GROUPS[d[0]], names = serviceNames[d[1]];
    groups.forEach((g, gi) => {
      for (let j = 0; j < 3; j++) {
        const n = names[(gi * 3 + j) % names.length];
        let id = slug(d[0] + '-' + n);
        if (used.has(id)) id = slug(d[0] + '-' + g + '-' + n); // RESOLVER3: unique IDs for repeated names
        used.add(id);
        const labels = [...EXTRA_SECTIONS.slice(0, 3 + (j % 3)), 'Contact and support'];
        const svc = { id, title: n, domain: d[0], group: g, description: `Information and services relating to ${n.toLowerCase()}.`, type: ['information', 'transaction', 'application', 'booking', 'update'][j % 5], aliases: [n.toLowerCase(), g.toLowerCase()], sections: labels.map(l => sec(l)), generated: true };
        // RESOLVER6: synthetic content gives every generated service a real summary, descriptions and its own sections.
        const c = CONTENT && CONTENT.SERVICE_CONTENT[d[0] + '|' + n];
        if (c) { svc.description = c.summary; svc.about = c.about.slice(); svc.sections = c.sections.map(([label, body]) => sec(label, { body, intents: labelIntents(label) })); svc.content = true; }
        SERVICES.push(svc);
      }
    });
  }
  for (const sp of SPECIAL) {
    const s = Object.assign({ aliases: [], generated: false }, sp);
    const i = SERVICES.findIndex(x => x.generated && x.title === sp.title && x.domain === sp.domain);
    if (i >= 0) SERVICES[i] = s; else SERVICES.push(s);
  }
  // RESOLVER6: repeated (group-qualified) copies of a core service show that service's content, so the site is coherent.
  for (const s of SERVICES) {
    if (!s.generated) continue;
    const core = SERVICES.find(x => !x.generated && x.title === s.title && x.domain === s.domain);
    if (core) { s.description = core.description; s.sections = core.sections.map(x => Object.assign({}, x, { keywords: x.keywords.slice(), intents: x.intents.slice() })); s.duplicateOf = core.id; s.content = true; }
  }
})();
const byId = id => SERVICES.find(s => s.id === id) || null;
const domainOf = id => DOMAINS.find(d => d[0] === id) || null;

/* ------------------------------------------------------------------ */
/* Text analysis                                                      */
/* ------------------------------------------------------------------ */
const CONTRACTIONS = [[/\bcan't\b/g, 'cannot'], [/\bcant\b/g, 'cannot'], [/\bwon't\b/g, 'will not'], [/n't\b/g, ' not'], [/\bi'm\b/g, 'i am'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'], [/'d\b/g, ' would'], [/'re\b/g, ' are'], [/'s\b/g, ''], [/s'(?=\s|$)/g, 's']];
// Multi-word entities collapsed to one token before stemming.
const CANON = [
  [/\bhousehold (charges?|payments?|tax(es)?)( bills?)?\b/g, 'householdcharge'],
  [/\b(civic )?(identity|id) (documents?|cards?)\b/g, 'identitydocument']
];
const IRREGULAR = { owed: 'owe', owing: 'owe', owes: 'owe', paid: 'pay', bought: 'buy', began: 'begin', begun: 'begin', children: 'child', people: 'person', sent: 'send' };
function normalise(q) {
  let t = String(q == null ? '' : q).toLowerCase().replace(/[\u2018\u2019`]/g, "'");
  for (const [re, r] of CONTRACTIONS) t = t.replace(re, r);
  t = t.replace(/[^a-z0-9\s]/g, ' ');
  for (const [re, r] of CANON) t = t.replace(re, r);
  return t.replace(/\s+/g, ' ').trim();
}
function stem(w) {
  if (IRREGULAR[w]) return IRREGULAR[w];
  if (w.length <= 3) return w;
  if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
  if (/ied$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
  let s = w;
  if (/ing$/.test(s) && s.length > 5) s = s.slice(0, -3);
  else if (/ed$/.test(s) && s.length > 4) s = s.slice(0, -2);
  else if (/(ss|x|z|ch|sh)es$/.test(s)) s = s.slice(0, -2);
  else if (/s$/.test(s) && !/(ss|us|is)$/.test(s)) s = s.slice(0, -1);
  if (/([b-df-hj-np-tv-z])\1$/.test(s) && !/(ll|ss|ff|zz)$/.test(s)) s = s.slice(0, -1);
  if (/e$/.test(s) && s.length > 3) s = s.slice(0, -1);
  return s;
}
const stemsOf = text => normalise(text).split(' ').filter(Boolean).map(stem);
const termCache = new Map();
function compileTerm(term) {
  if (!termCache.has(term)) termCache.set(term, term.split(/\s+/).flatMap(w => w === '*' ? ['*'] : stemsOf(w)));
  return termCache.get(term);
}
// Contiguous stem-sequence match; '*' matches a gap of 0-2 tokens.
function matchAt(stems, pat, i, k) {
  if (k === pat.length) return true;
  if (pat[k] === '*') { for (let g = 0; g <= 2; g++) if (i + g <= stems.length && matchAt(stems, pat, i + g, k + 1)) return true; return false; }
  return i < stems.length && stems[i] === pat[k] && matchAt(stems, pat, i + 1, k + 1);
}
function hasTerm(A, term) {
  const pat = compileTerm(term);
  if (!pat.length) return false;
  for (let i = 0; i < A.stems.length; i++) if (matchAt(A.stems, pat, i, 0)) return true;
  return false;
}

const STOP = new Set(stemsOf('a an the i me my we our us you your to of and or for in on at with about is are am be been was were it this that these those do does did can could would should will shall what how who where when why which there here have has had not no but so if just get got want need know like some any help please tell service services information relating thing really also from by as up out its into than then them they he she his her him one very'));
const GENERIC = ['help', 'need', 'want', 'get', 'know', 'support', 'assistance', 'advice', 'apply', 'sort out', 'find out', 'information', 'problem', 'issue', 'question', 'form'];
const GENERIC_STEMS = new Set(GENERIC.filter(t => !t.includes(' ')).map(t => compileTerm(t)[0]));

// Information-need and task-state intents.
const INTENTS = {
  cost: ['how much', 'cost', 'price', 'fee', 'charge', 'owe', 'what will i pay', 'have to pay', 'what do i pay', 'expensive'],
  documents: ['document', 'paperwork', 'evidence', 'proof', 'what do i need to bring', 'what should i bring'],
  requirements: ['what do i need', 'what will i need', 'what i need', 'what i will need', 'requirement', 'need to provide', 'what information', 'before i start', 'before i can', 'need to do before', 'do i need'],
  eligibility: ['eligible', 'eligibility', 'qualify', 'am i allowed', 'who can', 'entitled'],
  howto: ['how do i', 'how can i', 'how to', 'apply', 'application', 'sign up', 'get a', 'get one', 'get a new', 'request'],
  create: ['make a complaint', 'want to complain', 'complain about', 'raise a complaint', 'submit a complaint', 'lodge a complaint', 'file a complaint', 'report a problem'],
  status: ['status', 'progress', 'heard back', 'heard anything', 'heard nothing', 'not heard', 'any update', 'an update', 'update on', 'how long', 'still waiting', 'chase'],
  followup: ['not happy with * response', 'not happy with * reply', 'not happy with * outcome', 'not happy with * decision', 'not happy with * answer', 'unhappy with * response', 'unhappy with * outcome', 'unhappy with * decision', 'dissatisfied', 'not satisfied', 'what can i do next', 'what do i do next', 'what next', 'what are my options', 'next step', 'appeal', 'escalate', 'take it further', 'take this further', 'take it further', 'challenge', 'disagree with'],
  resume: ['carry on', 'left off', 'did not finish', 'not finished', 'unfinished', 'half finished', 'pick up where', 'resume', 'saved', 'continue my', 'continue where', 'continue with my', 'finish my application', 'finish off', 'get back to my', 'started applying', 'started an application', 'started my application', 'started filling', 'in progress',
    // RESOLVER6: everyday ways of saying 'continue an unfinished form' (general phrasing, not per query)
    'get back to it', 'pick it up again', 'pick it back up', 'where i got to', 'where i stopped', 'filled in half', 'half filled', 'half fill', 'half done', 'half complete', 'draft'],
  difficulty: ['struggl', 'keep up with', 'behind on', 'behind with', 'fall behind', 'fallen behind', 'arrear', 'cannot afford', 'unable to pay', 'cannot pay', 'difficult to pay', 'hard to pay', 'trouble paying', 'debt'],
  responsibility: ['supposed to', 'responsible', 'responsibility', 'must fix', 'have to fix', 'should fix', 'meant to', 'obliged to', 'whose responsibility', 'who should fix', 'who has to fix'],
  pay: ['pay my', 'make a payment', 'pay the', 'pay online', 'direct debit', 'pay it', 'pay bill']
};
// RESOLVER6: weaker resume cues count only when the goal also mentions an application/form-like object
// ("halfway through the form" is resume; "halfway through my course" is not; "get back to work" is not).
const RESUME_WEAK = ['halfway through', 'half way through', 'part way through', 'partway through', 'come back to', 'go back to', 'get back to', 'return to', 'not complete', 'incomplete', 'never finish', 'did not complete', 'did not submit', 'not submit', 'abandon', 'lost my progress', 'lost what i'];
const RESUME_CONTEXT = ['application', 'form', 'apply', 'applying', 'permit', 'renewal', 'registration', 'request', 'claim', 'online'];
// RESOLVER6: goals made only of an action verb (plus empty objects such as "a decision", "something") are underspecified:
// "I want to appeal" could be any of several appeal routes. The semantic resolver asks which one (generic-action clarify).
const ACTION_WORDS = { appeal: ['appeal', 'challenge', 'dispute', 'contest', 'object', 'objection', 'overturn', 'review', 'reconsider', 'complain', 'complaint'],
  pay: ['pay', 'payment'], apply: ['apply', 'application', 'register', 'registration', 'renew', 'renewal'], book: ['book', 'booking', 'appointment', 'reserve'],
  report: ['report'], cancel: ['cancel', 'stop'], request: ['request', 'order'] };
const ACTION_OBJECTS = ['decision', 'something', 'thing', 'anything', 'one', 'online', 'today', 'now', 'please', 'make', 'like', 'would', 'how', 'way', 'go', 'about'];
let actionIndex = null;
function genericAction(A) { // returns the action family when the goal is ONLY an action (no topic), else null
  if (!actionIndex) { actionIndex = new Map(); for (const [fam, ws] of Object.entries(ACTION_WORDS)) for (const w of ws) actionIndex.set(stem(w), fam); }
  const objects = new Set(ACTION_OBJECTS.map(stem));
  const toks = contentTokens(A).concat(A.stems.filter(w => actionIndex.has(w)));
  let fam = null;
  for (const w of new Set(toks)) { if (actionIndex.has(w)) { fam = fam || actionIndex.get(w); continue; } if (objects.has(w)) continue; return null; }
  return fam;
}
// Suppression rules keep intents mutually consistent.
const INTENT_SUPPRESS = [['followup', 'create'], ['status', 'create'], ['difficulty', 'pay'], ['resume', 'howto']];

function analyse(q) {
  const normalised = normalise(q);
  const tokens = normalised ? normalised.split(' ') : [];
  const A = { query: q, normalised, tokens, stems: tokens.map(stem) };
  A.stemSet = new Set(A.stems);
  const intents = {};
  for (const [k, terms] of Object.entries(INTENTS)) { const hits = terms.filter(t => hasTerm(A, t)); if (hits.length) intents[k] = hits; }
  if (!intents.resume) { const weak = RESUME_WEAK.filter(t => hasTerm(A, t)); if (weak.length && RESUME_CONTEXT.some(t => hasTerm(A, t))) intents.resume = weak.map(t => t + ' (+context)'); }
  const suppressed = [];
  for (const [a, b] of INTENT_SUPPRESS) if (intents[a] && intents[b]) { suppressed.push(b + ' (by ' + a + ')'); delete intents[b]; }
  A.intents = intents; A.suppressedIntents = suppressed;
  A.generic = GENERIC.filter(t => hasTerm(A, t));
  return A;
}

/* ------------------------------------------------------------------ */
/* Goal profiles                                                      */
/* topic: what the destination is about (first hit 14, further +5, max 3 extra)
 * context: situation cues (+6 each, max 3)
 * intents: weights applied when an information-need/task-state intent is present
 * exclude: contradicting evidence (-20 each)
 * generic words (help, need, ...) add +2 each (max 2) ONLY if topic/context evidence exists
 * resume intent: -20 for every profile that is not resumeExempt
 * qualifier: if none of its terms is present the goal is underspecified -> clarify
 * requiresIntent: profile is only considered when that intent is present
 * requiresTopic: profile needs topic evidence (context alone is not enough)
 * intentTopic: a detected intent counts as topic evidence for this profile          */
/* ------------------------------------------------------------------ */
const TAX_QUALIFIER = { terms: ['householdcharge', 'payment assistance'], message: 'I understand that you are asking about tax, but I need to know which type of tax or charge you mean.', options: ['money-tax-household-charge-payment', 'household-tax-assistance', 'money-tax-tax-records'] };
const GOAL_PROFILES = [
  { id: 'residential-parking', topic: ['park', 'parking permit', 'resident parking', 'residential parking', 'parking space'],
    context: ['house', 'home', 'resident', 'residential', 'street', 'permit', 'outside my house', 'near my home', 'near home', 'where i live', 'move', 'new house', 'new home', 'road', 'car'],
    exclude: ['visitor', 'visit', 'guest', 'bus', 'train', 'public transport', 'extension', 'extend', 'build', 'planning', 'loft', 'conservatory'], intents: { howto: 2, cost: 2 } },
  { id: 'visitor-parking', topic: ['visitor parking', 'visitor permit', 'guest parking', 'park'],
    context: ['visitor', 'visit', 'guest', 'friend', 'family', 'parent', 'relative'], exclude: ['resident', 'residential'], intents: {} },
  { id: 'vehicle-registration', topic: ['vehicle', 'car', 'van', 'motorbike', 'motorcycle', 'vehicle registration', 'number plate', 'logbook'],
    context: ['register', 'registration', 'buy', 'new', 'owner', 'sold', 'own'], exclude: ['park', 'parking permit'], intents: { cost: 6, howto: 2 } },
  { id: 'identity-replacement', topic: ['identitydocument', 'replace', 'replacement', 'id'],
    context: ['lost', 'damag', 'stolen', 'broken', 'expired', 'destroy', 'new one', 'ruin'], exclude: ['address', 'park', 'vehicle'], intents: { documents: 2, requirements: 2 } },
  { id: 'birth-certificate', topic: ['birth certificate', 'birth record', 'copy of my birth'], context: ['copy', 'official', 'certificate'], exclude: [], intents: {} },
  { id: 'address-change', topic: ['change of address', 'change my address', 'update my address', 'new address', 'address'],
    context: ['move', 'moving house', 'new house', 'new home', 'record', 'update'], exclude: ['park', 'extension', 'build', 'landlord', 'rent'], intents: {} },
  { id: 'large-item-collection', topic: ['sofa', 'furniture', 'bulky', 'large item', 'mattress', 'fridge', 'freezer', 'wardrobe', 'washing machine', 'cooker', 'get rid of', 'dispose'],
    context: ['collect', 'collection', 'pick up', 'take away', 'council', 'old', 'rubbish', 'waste'], exclude: [], intents: { cost: 2 } },
  { id: 'household-tax-assistance', topic: ['householdcharge', 'payment assistance', 'tax'], qualifier: TAX_QUALIFIER,
    context: ['bill', 'afford', 'payment'], exclude: ['park', 'permit'], intents: { difficulty: 14, pay: -8, eligibility: 2 } },
  { id: 'money-tax-household-charge-payment', topic: ['householdcharge', 'tax'], qualifier: TAX_QUALIFIER,
    context: ['bill', 'payment', 'online'], exclude: ['park', 'permit'], intents: { pay: 10, difficulty: -12, cost: 4 } },
  { id: 'financial-support', topic: ['financial support', 'financial assistance', 'financial help', 'benefit', 'living cost', 'cost of living', 'food', 'bill', 'income', 'lost my job', 'lost job', 'lost my income', 'unemploy', 'redundant', 'jobless', 'essential', 'money'],
    context: ['struggl', 'afford', 'job', 'work', 'family', 'child', 'rent'], exclude: ['park', 'permit', 'tax', 'householdcharge'], intents: { difficulty: 6, eligibility: 2, howto: 2 } },
  { id: 'housing-property-housing-repairs', topic: ['repair', 'fix', 'broken', 'leak', 'damp', 'mould', 'mold', 'heating', 'boiler', 'maintenance'],
    context: ['landlord', 'rent', 'tenant', 'flat', 'property', 'home', 'house'], exclude: ['park', 'tax', 'planning', 'extension'], intents: { responsibility: 6 } },
  { id: 'housing-property-tenancy-support', topic: ['tenancy', 'evict', 'eviction', 'lease', 'deposit', 'my rights', 'tenant rights', 'notice to leave'],
    context: ['landlord', 'rent', 'tenant', 'flat', 'home'], exclude: ['park', 'tax', 'planning', 'extension', 'repair', 'fix', 'broken', 'leak'], intents: {} },
  { id: 'development-approval', topic: ['extension', 'extend', 'planning permission', 'planning', 'development', 'loft', 'conservatory', 'garage', 'outbuilding', 'house bigger', 'home bigger', 'bigger at the back', 'build'],
    context: ['house', 'home', 'property', 'garden', 'back', 'permission', 'approval', 'before i start'], exclude: ['parking permit', 'resident parking', 'visitor', 'landlord', 'rent', 'object', 'objection', 'oppose'], intents: { requirements: 3, eligibility: 2 } }, // R6: objecting to someone else's plans is not applying for approval
  { id: 'formal-complaint', topic: ['complain', 'complaint'], context: ['service', 'staff', 'council', 'response', 'decision', 'rude', 'treat', 'outcome', 'reply'],
    exclude: [], intents: { followup: 8, status: 4, create: 4 } },
  { id: 'saved-residential-parking-application', requiresIntent: 'resume', requiresTopic: true, resumeExempt: true, topic: ['park', 'parking permit', 'resident parking', 'residential parking'],
    context: ['application', 'apply', 'permit', 'form', 'yesterday', 'start', 'earlier'], exclude: ['visitor'], intents: { resume: 16 } },
  { id: 'activity-in-progress', resumeExempt: true, intentTopic: 'resume', topic: ['my activity', 'my account', 'saved application', 'unfinished application', 'my applications', 'draft'],
    context: ['application', 'apply', 'form', 'start', 'yesterday'], exclude: [], intents: {} }
];

const THRESHOLDS = { navigateMinScore: 16, navigateMinConfidence: 0.80, clarifyMinScore: 8, lexicalMinScore: 3, optionMinRatio: 0.5, maxOptions: 3,
  confidenceFormula: 'min(0.99, 0.40 + 0.30*min(1, top/30) + 0.30*min(1, (top-second)/15))' };

function scoreProfile(p, A) {
  const hits = list => (list || []).filter(t => hasTerm(A, t));
  const topic = hits(p.topic), context = hits(p.context), exclude = hits(p.exclude);
  if (p.intentTopic && A.intents[p.intentTopic]) topic.push('intent:' + p.intentTopic);
  const base = { id: p.id, topic, context, exclude, generic: [], intentHits: {} };
  if (p.requiresIntent && !A.intents[p.requiresIntent]) return Object.assign(base, { eligible: false, why: 'requires intent: ' + p.requiresIntent });
  if (p.requiresTopic && !topic.length) return Object.assign(base, { eligible: false, why: 'requires topic evidence (specific record)' });
  if (!(topic.length >= 1 || context.length >= 2)) return Object.assign(base, { eligible: false, why: 'no topic evidence and fewer than 2 context cues' });
  const parts = { topic: topic.length ? 14 + 5 * Math.min(3, topic.length - 1) : 0, context: 6 * Math.min(3, context.length), intents: 0, generic: 0, exclude: -20 * exclude.length, resumePenalty: 0 };
  for (const [k, w] of Object.entries(p.intents || {})) if (A.intents[k]) { parts.intents += w; base.intentHits[k] = w; }
  base.generic = A.generic.slice(0, 2); parts.generic = 2 * base.generic.length;
  if (A.intents.resume && !p.resumeExempt) parts.resumePenalty = -20;
  const score = Object.values(parts).reduce((s, v) => s + v, 0);
  const qualifierUnmet = !!(p.qualifier && !p.qualifier.terms.some(t => hasTerm(A, t)));
  return Object.assign(base, { eligible: true, parts, score, qualifierUnmet });
}

function chooseSection(s, A) {
  const titleStems = new Set(stemsOf(s.title));
  const labelCounts = {};
  s.sections.forEach(x => new Set(stemsOf(x.label)).forEach(st => { labelCounts[st] = (labelCounts[st] || 0) + 1; }));
  const scores = s.sections.map((x, i) => {
    const intentHits = x.intents.filter(k => A.intents[k]);
    const keywordHits = x.keywords.filter(t => hasTerm(A, t));
    const labelHits = [...new Set(stemsOf(x.label))].filter(st => !STOP.has(st) && !titleStems.has(st) && labelCounts[st] === 1 && A.stemSet.has(st));
    return { index: i, id: x.id, label: x.label, score: 6 * intentHits.length + 4 * keywordHits.length + 3 * labelHits.length, intentHits, keywordHits, labelHits };
  });
  let best = null;
  for (const sc of scores) if (sc.score >= 3 && (!best || sc.score > best.score)) best = sc;
  return { index: best ? best.index : null, scores };
}

let lexIndex = null;
function lexical(A) {
  if (!lexIndex) lexIndex = SERVICES.filter(s => domainOf(s.domain)[3] === 'service').map(s => ({ s,
    title: new Set(stemsOf(s.title)), mid: new Set(stemsOf(s.group + ' ' + s.aliases.join(' '))),
    low: new Set(stemsOf(s.sections.map(x => x.label).join(' ') + ' ' + (s.generated ? '' : s.description))) }));
  const q = contentTokens(A);
  if (!q.length) return [];
  return lexIndex.map(e => { let score = 0; const matched = [];
    for (const w of q) { if (e.title.has(w)) { score += 3; matched.push(w); } else if (e.mid.has(w)) { score += 2; matched.push(w); } else if (e.low.has(w)) { score += 1; matched.push(w); } }
    return { id: e.s.id, title: e.s.title, score, matched };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------------------ */
/* RESOLVER6 ranked-list mode (semantic-search baseline)              */
/* rankDestinations(queryVector, index, {k, wMax, sectionTextPenalty})  */
/*  -> [{rank, id, title, score, bestText, bestSection, path}]         */
/* Pure cosine aggregation with the same model, descriptions and       */
/* destination rule as the semantic resolver (score = wMax*best +      */
/* (1-wMax)*second-best description similarity; section descriptions   */
/* discounted; templated and off-topic prototype texts excluded). No   */
/* intents, lexical tie-break, thresholds or clarify/reject logic.     */
/* index: CivicSemantic.decodeIndex(json) or the raw semantic-index    */
/* JSON. queryVector: L2-normalised embedding of the query (with the   */
/* model's query prefix, see CivicSemantic.MODEL).                     */
/* ------------------------------------------------------------------ */
const RANK_DEFAULTS = { k: 10, wMax: 0.7, sectionTextPenalty: 0.03 };
function indexVectors(index) {
  if (index.vectors instanceof Float32Array) return index.vectors;
  if (!index._vec) {
    const b64 = index.vectors; let bytes;
    if (typeof Buffer !== 'undefined') bytes = new Uint8Array(Buffer.from(b64, 'base64'));
    else { const bin = atob(b64); bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); }
    Object.defineProperty(index, '_vec', { value: new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4), enumerable: false });
  }
  return index._vec;
}
function rankDestinations(queryVector, index, opts) {
  const o = Object.assign({}, RANK_DEFAULTS, opts || {});
  const vec = indexVectors(index), dim = index.dim, per = new Map();
  index.texts.forEach(([id, sec, text, kind], i) => {
    if (kind === 't' || kind === 'n') return;
    let sim = 0; const off = i * dim; for (let d = 0; d < dim; d++) sim += queryVector[d] * vec[off + d];
    const v = sec == null ? sim : sim - o.sectionTextPenalty;
    if (!per.has(id)) per.set(id, { vals: [], best: null });
    const e = per.get(id); e.vals.push(v); if (!e.best || v > e.best.v) e.best = { v, text, sec };
  });
  const out = [];
  for (const [id, e] of per) { const v = e.vals.sort((a, b) => b - a); out.push({ id, score: v.length > 1 ? o.wMax * v[0] + (1 - o.wMax) * v[1] : v[0], best: e.best }); }
  out.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  return out.slice(0, o.k == null ? out.length : o.k).map((c, i) => ({ rank: i + 1, id: c.id, title: byId(c.id).title, score: Math.round(c.score * 1e4) / 1e4,
    bestText: c.best.text, bestSection: c.best.sec, path: pathLabels(c.id, null).join(' \u2192 ') }));
}

function pathLabels(id, sectionIndex) {
  const s = byId(id); if (!s) return [];
  const out = [domainOf(s.domain)[1], s.group];
  if (s.parent && byId(s.parent)) out.push(byId(s.parent).title);
  out.push(s.title);
  if (sectionIndex != null && s.sections[sectionIndex]) out.push(s.sections[sectionIndex].label);
  return out;
}
function optionFor(id, sectionIndex) {
  const s = byId(id); if (!s) return null;
  return { id, title: s.title, sectionIndex: sectionIndex == null ? null : sectionIndex, path: pathLabels(id, sectionIndex).join(' \u2192 ') };
}
function confidenceOf(top, second) {
  const evidence = Math.min(1, Math.max(0, top) / 30), margin = Math.min(1, Math.max(0, top - second) / 15);
  return { value: Math.min(0.99, Math.round((0.40 + 0.30 * evidence + 0.30 * margin) * 100) / 100), evidence: Math.round(evidence * 100) / 100, margin: Math.round(margin * 100) / 100, top, second };
}

function contentTokens(A) { return [...new Set(A.stems)].filter(w => w.length > 2 && !STOP.has(w) && !GENERIC_STEMS.has(w)); }

/* ------------------------------------------------------------------ */
/* resolveGoal: pure function, string -> decision                     */
/* ------------------------------------------------------------------ */
function resolveGoal(q) {
  const A = analyse(q);
  const evaluated = GOAL_PROFILES.map(p => scoreProfile(p, A));
  const ranked = evaluated.filter(x => x.eligible).sort((a, b) => b.score - a.score);
  const result = { version: VERSION, query: String(q == null ? '' : q), normalised: A.normalised, intents: A.intents, suppressedIntents: A.suppressedIntents, generic: A.generic,
    decision: null, destinationId: null, sectionIndex: null, sectionId: null, sectionLabel: null, path: [], confidence: null, reason: null, clarification: null,
    candidates: ranked.map(x => ({ id: x.id, title: (byId(x.id) || {}).title, score: x.score, parts: x.parts, topic: x.topic, context: x.context, intents: x.intentHits, generic: x.generic, exclude: x.exclude, qualifierUnmet: x.qualifierUnmet })),
    rejectedProfiles: evaluated.filter(x => !x.eligible).filter(x => x.topic.length || x.context.length).map(x => ({ id: x.id, why: x.why, topic: x.topic, context: x.context })),
    lexical: [], sectionScores: [], thresholds: THRESHOLDS };
  if (!A.normalised) { result.decision = 'reject'; result.reason = 'empty input'; return result; }

  const top = ranked[0], second = ranked[1];
  const profileOptions = () => ranked.filter(x => top && x.score >= Math.max(THRESHOLDS.clarifyMinScore, top.score * THRESHOLDS.optionMinRatio)).slice(0, THRESHOLDS.maxOptions)
    .map(x => { const s = byId(x.id); return optionFor(x.id, chooseSection(s, A).index); });

  if (top && top.score >= THRESHOLDS.clarifyMinScore) {
    const conf = confidenceOf(top.score, second ? Math.max(0, second.score) : 0);
    result.confidenceComponents = conf; result.confidence = conf.value;
    if (top.qualifierUnmet) {
      result.decision = 'clarify'; result.reason = 'qualifier';
      result.clarification = { message: GOAL_PROFILES.find(p => p.id === top.id).qualifier.message, options: GOAL_PROFILES.find(p => p.id === top.id).qualifier.options.map(id => optionFor(id, null)).filter(Boolean) };
      return result;
    }
    if (top.score >= THRESHOLDS.navigateMinScore && conf.value >= THRESHOLDS.navigateMinConfidence) {
      const s = byId(top.id); const secRes = chooseSection(s, A);
      result.sectionScores = secRes.scores;
      const v = validateDestination(top.id, secRes.index);
      if (!v.ok) { result.decision = 'reject'; result.reason = 'invalid destination: ' + v.error; return result; }
      Object.assign(result, { decision: 'navigate', destinationId: top.id, sectionIndex: secRes.index, sectionId: secRes.index == null ? null : s.sections[secRes.index].id,
        sectionLabel: secRes.index == null ? null : s.sections[secRes.index].label, path: pathLabels(top.id, secRes.index),
        reason: `top score ${top.score}, margin ${top.score - (second ? second.score : 0)} over ${second ? second.id : 'no runner-up'}` });
      return result;
    }
    const opts = profileOptions();
    result.decision = 'clarify';
    result.reason = top.score < THRESHOLDS.navigateMinScore ? 'weak_evidence' : 'ambiguous';
    result.clarification = { message: opts.length > 1 ? 'Your goal could match more than one CivicSphere destination. Which of these is closest?' : 'I think I know where you mean, but I need a little more detail. Is it this?', options: opts };
    return result;
  }
  const lex = lexical(A); result.lexical = lex.slice(0, 5);
  if (lex.length && lex[0].score >= THRESHOLDS.lexicalMinScore) {
    const seen = new Set(); const opts = [];
    for (const l of lex) { if (seen.has(l.title)) continue; seen.add(l.title); opts.push(optionFor(l.id, null)); if (opts.length >= THRESHOLDS.maxOptions) break; }
    result.decision = 'clarify'; result.reason = 'lexical_only';
    result.clarification = { message: 'I found related CivicSphere pages but could not identify your goal confidently. Is it one of these?', options: opts };
    return result;
  }
  if (A.generic.length || (top && top.score > 0)) {
    result.decision = 'clarify'; result.reason = 'low_specificity';
    result.clarification = { message: 'Tell me a little more about what you are trying to do, for example the situation you are in or what you want to find out.', options: [] };
    return result;
  }
  result.decision = 'reject'; result.reason = 'no_match';
  result.clarification = { message: 'I could not match that to a CivicSphere service. Usher helps with public services such as parking, housing, household charges, identity documents and complaints.', options: [] };
  return result;
}

/* ------------------------------------------------------------------ */
/* Validation                                                         */
/* ------------------------------------------------------------------ */
function validateDestination(id, sectionIndex) {
  const s = byId(id);
  if (!s) return { ok: false, error: `unknown destination id "${id}"` };
  if (sectionIndex != null && !(Number.isInteger(sectionIndex) && sectionIndex >= 0 && sectionIndex < s.sections.length)) return { ok: false, error: `section index ${sectionIndex} out of range for "${id}" (0-${s.sections.length - 1})` };
  return { ok: true };
}
function validateCatalogue() {
  const errors = [], ids = new Map();
  for (const s of SERVICES) ids.set(s.id, (ids.get(s.id) || 0) + 1);
  for (const [id, n] of ids) if (n > 1) errors.push(`duplicate service id ${id} (x${n})`);
  for (const s of SERVICES) {
    const d = domainOf(s.domain);
    if (!d) errors.push(`${s.id}: unknown domain ${s.domain}`);
    else if (!(GROUPS[s.domain] || []).includes(s.group)) errors.push(`${s.id}: group "${s.group}" not in ${s.domain}`);
    if (!Array.isArray(s.sections) || !s.sections.length) errors.push(`${s.id}: no sections`);
    const secIds = new Set();
    (s.sections || []).forEach((x, i) => { if (!x.id || !x.label) errors.push(`${s.id}: section ${i} missing id/label`); if (secIds.has(x.id)) errors.push(`${s.id}: duplicate section id ${x.id}`); secIds.add(x.id); });
    if (s.parent && (!byId(s.parent) || byId(s.parent).domain !== s.domain)) errors.push(`${s.id}: invalid parent ${s.parent}`);
    if (s.taskKind && !TASKS[s.taskKind]) errors.push(`${s.id}: unknown task ${s.taskKind}`);
    if (s.savedApplication) { const t = TASKS[s.savedApplication.task]; if (!t) errors.push(`${s.id}: saved application task missing`); else if (!(s.savedApplication.step >= 0 && s.savedApplication.step < t.steps.length)) errors.push(`${s.id}: saved step out of range`); }
  }
  for (const p of GOAL_PROFILES) {
    if (!byId(p.id)) errors.push(`profile ${p.id}: no catalogue destination`);
    if (p.qualifier) for (const o of p.qualifier.options) if (!byId(o)) errors.push(`profile ${p.id}: qualifier option ${o} missing`);
  }
  for (const [k, t] of Object.entries(TASKS)) if (!byId(t.service)) errors.push(`task ${k}: service ${t.service} missing`);
  return { ok: errors.length === 0, errors, counts: { domains: DOMAINS.length, services: SERVICES.length, sections: SERVICES.reduce((n, s) => n + s.sections.length, 0), profiles: GOAL_PROFILES.length } };
}

return { VERSION, DOMAINS, GROUPS, SERVICES, TASKS, GOAL_PROFILES, INTENTS, THRESHOLDS, slug, byId, domainOf, pathLabels,
  normalise, stem, analyse, contentTokens, hasTerm, scoreProfile, chooseSection, lexical, resolveGoal, validateDestination, validateCatalogue,
  genericAction, ACTION_WORDS, RESUME_WEAK, RANK_DEFAULTS, rankDestinations };
});
