/*
 * Usher engine (usher-engine/0.1), the site-agnostic navigation core of RESOLVER7_GP.
 * createEngine(profile) -> the catalogue API and the decision policy for ONE site, built only from a usher-profile/0.1 object.
 * It is a refactor of civicsphere-core.js + civicsphere-semantic.js (RESOLVER6): the same text analysis, the same frozen decision parameters and the
 * same decision policy; everything specific to one site (taxonomy, pages, sections, vocabulary, qualifiers, off-topic examples, lexical hints,
 * saved states, wording) is read from the profile. Pure and deterministic: no DOM, network or storage. UMD: window.Usher.createEngine / require().
 * Regression gate G1 to G7 (tests/gate_g1_g7.js) shows that on the CivicSphere profile every decision equals RESOLVER6.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.Usher = root.Usher || {}; Object.assign(root.Usher, api); }
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const ENGINE_VERSION = 'RESOLVER9_USHER4';
const PROFILE_FORMAT = 'usher-profile/0.1'; const LEGACY_PROFILE_FORMATS = ['goalpost-profile/0.1']; // pre-rename id (Usher was called Goalpost until 26 Oct 2026), still accepted
const formatOk = f => f === PROFILE_FORMAT || LEGACY_PROFILE_FORMATS.includes(f);
const INDEX_FORMAT = 'usher-index/0.1';

/* ---- model registry and frozen decision parameters (identical to RESOLVER6) ---- */
const MODELS = {
  'minilm': { key: 'minilm', id: 'Xenova/all-MiniLM-L6-v2', dtype: 'q8', pooling: 'mean', normalize: true, dim: 384, queryPrefix: '', passagePrefix: '' },
  'bge-small': { key: 'bge-small', id: 'Xenova/bge-small-en-v1.5', dtype: 'q8', pooling: 'cls', normalize: true, dim: 384, queryPrefix: 'Represent this sentence for searching relevant passages: ', passagePrefix: '' },
  'e5-small': { key: 'e5-small', id: 'Xenova/e5-small-v2', dtype: 'q8', pooling: 'mean', normalize: true, dim: 384, queryPrefix: 'query: ', passagePrefix: 'passage: ' }
};
const DEFAULT_MODEL = 'minilm';
function pickModel(key) {
  const requested = key || (typeof process !== 'undefined' && process.env && (process.env.USHER_MODEL || process.env.CIVIC_MODEL)) || (typeof location !== 'undefined' && location.search ? new URLSearchParams(location.search).get('model') : null);
  return Object.assign({}, MODELS[requested] || MODELS[DEFAULT_MODEL]);
}
const PARAMS_FROZEN = {
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

/* ---- generic English defaults (a profile may extend them); nothing here names a site ---- */
const CONTRACTIONS = [[/\bcan't\b/g, 'cannot'], [/\bcant\b/g, 'cannot'], [/\bwon't\b/g, 'will not'], [/n't\b/g, ' not'], [/\bi'm\b/g, 'i am'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'], [/'d\b/g, ' would'], [/'re\b/g, ' are'], [/'s\b/g, ''], [/s'(?=\s|$)/g, 's']];
const IRREGULAR = { owed: 'owe', owing: 'owe', owes: 'owe', paid: 'pay', bought: 'buy', began: 'begin', begun: 'begin', children: 'child', people: 'person', sent: 'send' };
const DEFAULT_INTENTS = {
  cost: ['how much', 'cost', 'price', 'fee', 'charge', 'owe', 'what will i pay', 'have to pay', 'what do i pay', 'expensive'],
  documents: ['document', 'paperwork', 'evidence', 'proof', 'what do i need to bring', 'what should i bring'],
  requirements: ['what do i need', 'what will i need', 'what i need', 'what i will need', 'requirement', 'need to provide', 'what information', 'before i start', 'before i can', 'need to do before', 'do i need'],
  eligibility: ['eligible', 'eligibility', 'qualify', 'am i allowed', 'who can', 'entitled'],
  howto: ['how do i', 'how can i', 'how to', 'apply', 'application', 'sign up', 'get a', 'get one', 'get a new', 'request'],
  status: ['status', 'progress', 'heard back', 'heard anything', 'heard nothing', 'not heard', 'any update', 'an update', 'update on', 'how long', 'still waiting', 'chase'],
  resume: ['carry on', 'left off', 'did not finish', 'not finished', 'unfinished', 'half finished', 'pick up where', 'resume', 'saved', 'continue my', 'continue where', 'continue with my', 'finish my application', 'finish off', 'get back to my', 'started applying', 'started an application', 'started my application', 'started filling', 'in progress',
    // RESOLVER6: everyday ways of saying 'continue an unfinished form' (general phrasing, not per query)
    'get back to it', 'pick it up again', 'pick it back up', 'where i got to', 'where i stopped', 'filled in half', 'half filled', 'half fill', 'half done', 'half complete', 'draft'],
};
const RESUME_WEAK = ['halfway through', 'half way through', 'part way through', 'partway through', 'come back to', 'go back to', 'get back to', 'return to', 'not complete', 'incomplete', 'never finish', 'did not complete', 'did not submit', 'not submit', 'abandon', 'lost my progress', 'lost what i'];
const RESUME_CONTEXT = ['application', 'form', 'apply', 'applying', 'permit', 'renewal', 'registration', 'request', 'claim', 'online'];
const ACTION_WORDS = { appeal: ['appeal', 'challenge', 'dispute', 'contest', 'object', 'objection', 'overturn', 'review', 'reconsider', 'complain', 'complaint'],
  pay: ['pay', 'payment'], apply: ['apply', 'application', 'register', 'registration', 'renew', 'renewal'], book: ['book', 'booking', 'appointment', 'reserve'],
  report: ['report'], cancel: ['cancel', 'stop'], request: ['request', 'order'] };
const ACTION_OBJECTS = ['decision', 'something', 'thing', 'anything', 'one', 'online', 'today', 'now', 'please', 'make', 'like', 'would', 'how', 'way', 'go', 'about'];
const INTENT_SUPPRESS = [['followup', 'create'], ['status', 'create'], ['difficulty', 'pay'], ['resume', 'howto']];
const GENERIC_DEFAULT = ['help', 'need', 'want', 'get', 'know', 'support', 'assistance', 'advice', 'apply', 'sort out', 'find out', 'information', 'problem', 'issue', 'question', 'form'];
const THRESHOLDS = { navigateMinScore: 16, navigateMinConfidence: 0.80, clarifyMinScore: 8, lexicalMinScore: 3, optionMinRatio: 0.5, maxOptions: 3,
  confidenceFormula: 'min(0.99, 0.40 + 0.30*min(1, top/30) + 0.30*min(1, (top-second)/15))' };
/* ---- RESOLVER7_GP3 decision policy: generic English cues (no site words) ---- */
const POLICY_DEFAULTS = {
  savedRouting: true,      // rule S: prefer the visitor's own saved item when the goal plausibly refers to it
  savedNavWindow: 0.03,    // S2: saved page's own similarity within this of the best other page (and >= navigateMin) -> go to it
  savedOfferWindow: 0.06,  // S3: within this -> ask, offering the saved item first
  savedIntentWindow: 0.12, // S1: resume/status goal: max(saved page, its owner page) within this of the best other page -> go to the saved item
  twinRule: true,          // rule T: near-duplicate pages with different roles (profile area/destination "role": "task")
  twinBand: 0.10,          // the twin must score within this of the top page
  twinMinPairSim: 0.65,    // page-centroid cosine for two pages to count as twins (mutual nearest neighbours across roles)
  // ---- USHER2 (P7, 29 Oct 2026): all OFF by default, so CivicSphere (no policy block) behaves exactly as RESOLVER7_GP3 ----
  extraStatusCues: false,  // (i) wider everyday ways of asking about one's own open item (STATUS_EXTRA / RESUME_EXTRA below)
  savedContextRoute: false,// (i) a first-person goal that names a detail of the visitor's own saved item (its label or current step) goes to it
  savedContextMinRank: 3,  //     ... only if the saved page or its owner page is among the top N candidates
  savedContextMaxDf: 1,    //     ... and only words used by at most this many page titles/summaries (distinctive details, not 'new', 'house', 'damage')
  qualifierGuard: false,   // (ii) do not ask the qualifier question when the goal already says more (status/resume cue, or a strong unambiguous match)
  qualifierSkipScore: 0.50,//     ... strong match = top score >= this with margin >= marginMin and >= 2 content words besides the trigger
  twinPickMin: null,       // (ii) twin rule: score floor for using task/information cues (null = navigateMin, as GP3)
  savedGuards: false,      // (i) rules S2/S3 (saved item by similarity alone) are not applied to how-to, hypothetical or general questions
  clarifyTopK: 0,          // (iii) close-call questions show the top K candidates (>= clarifyMin) instead of the optionWindow band (0 = GP3 band)
  // ---- USHER3 (P8, 30 Oct 2026): all OFF by default ----
  oodGuard: false,         // (a) decline unrelated requests: low absolute similarity, or words the site never uses while the best match is not strong
  oodFloor: null,          //     decline when the best page text similarity is below this (absolute)
  oodCueFrac: 0.34,        //     unrelated-word cue: share of content words that no page, section, description or alias of the site uses
  oodCueSim: null,         //     decline when the cue holds and the best page text similarity is below this (null = off)
  oodEntitySim: null,      //     decline when the goal names a capitalised word the site never uses (a shop, brand or place it does not serve) and the best similarity is below this
  oodNoNavSim: null,       //     cue holds but similarity is above oodCueSim: do not navigate below this similarity; ask instead
  optionWindowTopK: null,  // (b) with clarifyTopK: an option must score within this of the top option (null = no limit)
  savedOptionGuard: false, // (b) the visitor's saved item (or its owner page) is offered as an option only when the goal has a status/resume/own-item cue or it scores within optionWindow of the top
  twinCueBalance: false,   // (b) twin rule: when the goal names a word that only one of the two twin pages' texts use, that page wins over task/information cues
  savedWordGuard: false,   // (c) rules S1 (status only), S2 and S3 need the goal to share a word with the saved item (its label, kind, current step, page or owner page title) and no unrelated-word cue
  mergeIntents: false,     // (c) 'resume' | 'all': add the engine's built-in everyday cue phrases to the profile's own lists instead of replacing them
  qualifierOptionCheck: false, // (b) skip a qualifier question when the best page is not one of its options and scores above all of them by qualifierOutGap
  qualifierOutGap: 0.03,
  twinThirdGap: null,      // (b) rule T applies only when no third page scores within this of the lower twin (else the normal three-option question)
  // ---- USHER4 (P9, 3 Nov 2026): all OFF by default, so every earlier profile behaves exactly as USHER3 ----
  plainParaphrase: false,  // (p1) index: for each page whose own texts use a service-language phrase in PARAPHRASE (generic, no site words), add one text with the everyday wording
  oodCueAnchor: null,      // (p2) the unrelated-word cue alone does not decline when the best page's own texts use >= this many of the goal's other content words; ask instead
  oodOrgSim: null,         // (p3) the goal asks when/where/how to contact another organisation or place (ORG_PLACES) that the best page's own texts never mention: decline below this similarity, ask above
  oodWeakCueReject: false, // (p4) a weak match (best score < navigateMin) with the unrelated-word cue or an unknown capitalised name is declined, not asked
  savedConflictGuard: false, // (p5) rule S does not use a saved item when the goal names a title word of a higher-ranked page that the saved item does not have (another product or service)
  oodEntityAnchor: null,  // (p2b) for the unknown-name check: an unfamiliar name alongside >= this many other content words that the site does use asks instead of declining
  oodFloorOwn: false,      // (p1f) with p1: the low-similarity floor uses the best similarity to the site's OWN texts (everyday-wording texts excluded), so generic everyday phrases cannot lift an unrelated goal over it
  vagueMaxContent: 0,      // (p6) goals with at most this many content words need margin >= vagueMargin to go straight to a page (0 = off)
  vagueMargin: 0.08
};
// USHER4 (p1): everyday wording for common service-language phrases. Generic English (UK public services, insurance, telecoms, billing), not one site's words.
// Each entry: [regex over a page's own texts, everyday phrasings added as one extra page text].
const PARAPHRASE = [
  ['single[- ]occupier|single[- ]person|sole occupier|only one adult|one adult lives|living alone', ['I live alone', 'I live on my own', 'I live by myself now', 'nobody else lives with me']],
  ['household charge|council tax|local tax on your home', ['council tax'], 'syn'],
  ['(reduction|discount)s? (on|to|for) (the|your)', ['pay less', 'lower my bill', 'reduce what I pay']],
  ['appeal|challenge (a|the|your)|dispute (a|the|your)|review of (a|the) decision', ['I think it is wrong', 'I disagree with the decision', 'it is unfair and I want it looked at again']],
  ['(housing|home|council home|tenant|property) repairs?|disrepair', ['damp and mould in my flat', 'something is broken in my rented home', 'a leak in my council house']],
  ['planning (application|permission)s?|development approval|building control', ['building an extension or shed', 'does building work need permission', 'my neighbour is building something']],
  ['eligibility check|check (what|which) (benefits|support|help)', ['see if I qualify', 'what am I entitled to', 'help on a low income']],
  ['librar(y|ies)', ['borrow or renew library books', 'overdue library books']],
  ['event (permit|licen[cs]e|notification|application)s?|temporary event|events? in (parks|public spaces)', ['organise an event in a park', 'a charity run or fun run', 'a street party or festival']],
  ['care support|home care|social care|adult care|meals at home|meal delivery', ['help at home for an elderly relative', 'hot meals delivered to someone who is frail', 'a carer for my parent']],
  ['hardship|living[- ]cost|crisis support|emergency (support|assistance|payment)|financial support', ['struggling to afford essentials', 'help buying school uniforms or food', 'money is tight']],
  ['dropped kerbs?|vehicle crossings?|crossovers?|footway crossings?', ['drop the kerb for a driveway', 'park on my front garden', 'driveway access across the pavement']],
  ['personal possessions|valuables|specified items|high[- ]value items?', ['jewellery such as a ring or watch', 'expensive items I take out with me', 'adding an engagement ring']],
  ['mid[- ]term (adjustment|change)s?|change (your|a) policy|adjust (your|a) policy', ['update my cover', 'extend or change my dates', 'change the details on my policy']],
  ['cancel(l?ing|l?ation)? (your|a|the)? ?(policy|cover|insurance)|cooling[- ]off', ['stop my policy', 'end my cover early', 'cancel and get money back']],
  ['auto(matic)?[- ]?renew|renew(s|ed)? automatically|renewal (quote|invitation|notice)', ['stop it renewing automatically', 'turn off auto renewal', 'I do not want it to renew']],
  ['missed payments?|failed payments?|returned (direct debit|payment)s?|arrears|unpaid (bill|premium|balance)', ['my direct debit bounced', 'a payment did not go through', 'behind on payments']],
  ['payment (method|card|details)s?|ways to pay|card details|how to pay', ['update my bank card', 'my card expired', 'change how I pay']],
  ['\\bhub\\b|router', ['router', 'wifi box', 'modem'], 'syn'],
  ['digital (voice|phone)|home phone|landline', ['plug my phone into the router', 'landline phone not working']],
  ['\\bbills?\\b|billing|statements?', ['invoice', 'receipt', 'tax invoice', 'VAT receipt'], 'syn'],
  ['home move|moving home|house move|relocat', ['moving house', 'taking my service to a new address']],
  ['bereavement|after a death|someone (has )?died|death of', ['someone passed away', 'lost a loved one']],
  ['anti[- ]social behaviour', ['noisy or threatening neighbours', 'harassment in my street']],
  ['fly[- ]?tipping|illegal(ly)? dump', ['rubbish dumped in the street', 'someone dumped a mattress']],
  ['pest control|pests', ['rats or mice', 'a wasps nest', 'cockroaches or bed bugs']],
  ['noise (nuisance|complaint)s?', ['loud music next door', 'a barking dog']],
  ['escape of water', ['a burst pipe', 'water leaking through the ceiling']],
  ['accidental damage', ['I spilled or dropped something', 'knocked something over and broke it']],
  ['no[- ]claims? (discount|bonus)', ['years without claiming', 'my NCD']],
  ['intermittent|connection (drops|keeps dropping)|dropping out', ['keeps cutting out', 'connection keeps dropping']],
  ['outages?|service status', ['internet is down', 'no internet in my area']],
  ['early (termination|exit|cancellation) (charge|fee)s?|exit fees?', ['cost to leave my contract early', 'fee for cancelling early']],
  ['porting|\\bpac\\b|\\bstac\\b|keep your number', ['keep my number when I switch', 'move my number to another network']],
  ['roaming', ['using my phone abroad', 'charges when travelling overseas']],
  ['blue badge', ['disabled parking permit']],
  ['electoral regist|register to vote|voter registration', ['get on the voting list', 'register to vote']],
  ['housing register|social housing|housing applications?', ['get a council house or flat', 'on the waiting list for housing']],
  ['bulky (waste|items?)|large[- ]items?', ['get rid of an old sofa', 'collect an old fridge or mattress']],
  ['street ?light', ['a streetlight is not working']]
];
// USHER4 (p3): other organisations and places a visitor may ask about (generic English). Used only when the site's own texts never mention the phrase.
const ORG_PLACES = ['post office', 'supermarket', 'bank', 'building society', 'pharmacy', 'chemist', 'gp surgery', 'doctors surgery', 'doctor', 'dentist', 'hospital', 'a and e', 'library', 'school', 'nursery',
  'police station', 'train station', 'railway station', 'bus station', 'airport', 'restaurant', 'cafe', 'pub', 'cinema', 'gym', 'leisure centre', 'swimming pool', 'garage', 'petrol station', 'car wash', 'mot centre',
  'tip', 'recycling centre', 'council', 'job centre', 'jobcentre', 'citizens advice', 'passport office', 'embassy', 'consulate', 'register office', 'church', 'mosque', 'museum', 'zoo', 'shopping centre', 'retail park',
  'high street', 'market', 'butcher', 'bakery', 'hairdresser', 'barber', 'vet', 'vets', 'optician', 'opticians', 'launderette', 'dry cleaner', 'hotel', 'takeaway', 'shop', 'store'];
const ORG_LOGISTICS = /\b(open|opens|opening|close|closes|closing|shut|shuts|(what|which) hours|hours (of|on|today|at)|phone number|telephone number|contact number|address (of|for)|nearest|near me|directions|how far|timetable)\b/;
// (i) generic English, not site words: asking how one's own open matter is going, or continuing one that is under way
const STATUS_EXTRA = ['any news', 'news on', 'any word', 'happening with', 'what is happening', 'going on with', 'how is my', 'getting on', 'where are we', 'where is my', 'left to do', 'still to do', 'next step', 'still coming', 'still on for', 'still booked', 'anything happened', 'has anything', 'moved on', 'got anywhere', 'sorted yet', 'when will i hear', 'check on my', 'check how my'];
const RESUME_EXTRA = ['on the go', 'under way', 'underway', 'already started', 'i started', 'i have started', 'already begun', 'my open', 'that i opened', 'i opened', 'i reported', 'i logged', 'already reported', 'already logged', 'got the photos', 'have the photos', 'add to my', 'add more', 'more details to my', 'push * back', 'move * date', 'change the date of my'];
const FIRST_PERSON = ['i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours'];
const THIRD_PARTY = ['mum', 'mom', 'mother', 'dad', 'father', 'parent', 'friend', 'neighbour', 'neighbor', 'son', 'daughter', 'child', 'kid', 'wife', 'husband', 'partner', 'brother', 'sister',
  'gran', 'grandma', 'grandad', 'grandmother', 'grandfather', 'colleague', 'boss', 'flatmate', 'housemate', 'he', 'she', 'his', 'her', 'him', 'someone else', 'somebody else'];
const GENERAL_MARKERS = ['in general', 'generally', 'usually', 'normally', 'typically', 'in principle', 'on average'];
const HYPOTHETICAL = ['if', 'in case', 'suppose', 'supposing', 'would i', 'would it', 'would my', 'would that'];
const QUESTION_OPENERS = ['does', 'do', 'is', 'are', 'am', 'will', 'would', 'can', 'could', 'should', 'what', 'which', 'who'];
const PAST_IRREGULAR = ['broke', 'broken', 'stole', 'stolen', 'took', 'taken', 'fell', 'fallen', 'came', 'went', 'gone', 'hit', 'got', 'lost', 'left', 'ran', 'threw', 'thrown', 'blew', 'blown', 'caught', 'bit', 'bitten', 'froze', 'frozen', 'tore', 'torn', 'ate', 'eaten'];
const NOT_PAST_ED = ['need', 'speed', 'bed', 'red', 'feed', 'seed', 'shed', 'hundred', 'indeed', 'proceed', 'succeed', 'exceed', 'breed', 'embed', // not verbs in the past
  'insured', 'covered', 'interested', 'worried', 'concerned', 'based', 'called', 'named', 'related', 'supposed', 'registered', 'married', 'retired', 'qualified', 'employed', 'unemployed',
  'disabled', 'required', 'included', 'excluded', 'limited', 'detailed', 'advanced', 'unlimited', 'used', 'needed', 'allowed', 'expected']; // participles used as adjectives
const RANK_DEFAULTS = { k: 10, wMax: 0.7, sectionTextPenalty: 0.03 };

function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
const r4 = x => Math.round(x * 10000) / 10000;
const clamp01 = x => Math.max(0, Math.min(1, x));
function labelIntents(label) { // information-need intents inferred from a section label
  const l = label.toLowerCase(), out = [];
  if (/\b(fee|fees|charge|charges|cost|costs|price|prices|tariff|tariffs|rates)\b/.test(l)) out.push('cost');
  if (/^(how to|how do|apply|book|request|report|register|enrol|order|make a|set up|start)\b/.test(l) || /\bhow to\b/.test(l)) out.push('howto');
  if (/\b(document|documents|evidence|proof)\b/.test(l)) out.push('documents');
  if (/\b(who can|who qualifies|eligib|can i appeal|do i need)/.test(l)) out.push('eligibility');
  if (/\b(what happens|status|progress|processing times|response times|timescales|after the)\b/.test(l)) out.push('status');
  return out;
}
function textsHash(texts) { // FNV-1a over the texts, to detect a stale index
  let h = 0x811c9dc5; const str = JSON.stringify(texts);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}
function b64ToBytes(b64) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u;
}

function createEngine(profile, engineOpts) {
'use strict';
if (!profile || !formatOk(profile.format)) throw new Error('Usher: expected a ' + PROFILE_FORMAT + ' profile');
engineOpts = engineOpts || {};
const MODEL = pickModel(engineOpts.model);
const SITE = profile.site || {}, SCOPE = SITE.scope || {}, VOC = profile.vocabulary || {}, HINTS = profile.hints || {};
const PARAMS = Object.assign({}, PARAMS_FROZEN, profile.params || {});
const SAVED_NOUN = VOC.savedNoun || 'saved item';
const SHORT = SITE.shortName || SITE.name || 'this site';
const REJECT_MESSAGE = SCOPE.rejectMessage || `I could not match that to anything on ${SHORT}. Try describing what you want to do in different words.`;

/* ---- catalogue from the profile ---- */
const AREAS = profile.taxonomy.areas;
const DOMAINS = AREAS.map(a => [a.id, a.label, a.description || '', a.kind || 'service']);
const GROUPS = {}; const GROUP_LABEL = {};
for (const a of AREAS) { GROUPS[a.id] = (a.groups || []).map(g => g.label); for (const g of a.groups || []) GROUP_LABEL[a.id + '|' + g.id] = g.label; }
const SERVICES = profile.destinations.map(d => {
  const label = GROUP_LABEL[d.area + '|' + d.group];
  const s = { id: d.id, title: d.title, domain: d.area, group: label == null ? d.group : label, groupId: d.group, url: d.url || null, description: d.summary, type: d.kind || 'information',
    descriptions: d.descriptions && d.descriptions.length ? d.descriptions.slice() : null, aliases: (d.aliases || []).slice(), parent: d.parent || null,
    generated: !!d.generated, routable: d.routable !== false, aliasOf: d.aliasOf || null,
    sections: (d.sections || []).map(x => ({ id: x.id, label: x.label, anchor: x.anchor || null, keywords: (x.keywords || []).slice(), intents: Array.isArray(x.intents) ? x.intents.slice() : labelIntents(x.label), body: x.body || null, descriptions: x.descriptions ? x.descriptions.slice() : null })) };
  if (!s.parent) delete s.parent;
  return s;
});
const BY_ID = new Map(SERVICES.map(s => [s.id, s]));
const byId = id => BY_ID.get(id) || null;
const domainOf = id => DOMAINS.find(d => d[0] === id) || null;
const SAVED = (profile.savedStates || []).map(x => Object.assign({}, x));
const SAVED_FOR = {}; for (const x of SAVED) if (x.ownerDestination) SAVED_FOR[x.ownerDestination] = x.destination;
const FALLBACK_RESUME = (profile.resume || {}).fallbackDestination || null;
const RESUME_TARGETS = new Set([...SAVED.map(x => x.destination), FALLBACK_RESUME].filter(Boolean));
const SAVED_DESTINATIONS = new Set(SAVED.map(x => x.destination));
const GOAL_PROFILES = HINTS.lexicalProfiles || [];
const PROFILE_INTENTS = {}; for (const p of GOAL_PROFILES) PROFILE_INTENTS[p.id] = p.intents || {};
const routable = s => s.routable;
const POLICY = Object.assign({}, POLICY_DEFAULTS, profile.policy || {});
const ROLE = {}; { const areaRole = {}; for (const a of AREAS) if (a.role) areaRole[a.id] = a.role; for (const d of profile.destinations) { const r = d.role || areaRole[d.area]; if (r) ROLE[d.id] = r; } }
const HAS_ROLES = Object.values(ROLE).some(r => r === 'task');
// USHER3 (a): the site's own vocabulary (every word of its areas, groups, pages, sections, descriptions, aliases, saved items and intent cues). Query-independent.
let LEX = null; function lexicon() { if (LEX) return LEX; LEX = new Set(); const add = t => { if (t) for (const w of stemsOf(String(t))) LEX.add(w); };
  for (const a of AREAS) { add(a.label); add(a.description); for (const g of a.groups || []) add(g.label); }
  for (const s of SERVICES) { add(s.title); add(s.description); (s.descriptions || []).forEach(add); (s.aliases || []).forEach(add); add(s.group);
    for (const x of s.sections) { add(x.label); add(x.body); (x.descriptions || []).forEach(add); (x.keywords || []).forEach(add); } }
  for (const st of SAVED) { add(st.label); add((st.progress || {}).stepLabel); add(st.kind); }
  if (POLICY.plainParaphrase) for (const s of SERVICES) { paraphraseFor(s).forEach(add); paraphraseFor(s).vocab.forEach(add); }
  for (const terms of Object.values(INTENTS)) terms.forEach(add);
  for (const q of profile.qualifiers || []) add(q.message);
  return LEX; }
function unknownWords(A) { const L = lexicon(); return contentTokens(A).filter(w => !L.has(w) && !/^[0-9]+$/.test(w)); }
function entityWords(A) { // capitalised words in the original text (not the first word) that the site never uses
  const L = lexicon(); const raw = String(A.query || '').split(/\s+/).slice(1); const out = [];
  for (const t of raw) { if (!/^[A-Z][a-zA-Z'’]+/.test(t) || /^I('|’|$)/.test(t)) continue; const n = normalise(t).split(' ').filter(Boolean); for (const w of n.map(stem)) if (w.length > 2 && !STOP.has(w) && !L.has(w)) out.push(w); }
  return [...new Set(out)]; }
let TITLE_DF = null; function titleDf() { if (TITLE_DF) return TITLE_DF; TITLE_DF = new Map(); for (const d of SERVICES) { if (!d.routable || SAVED_DESTINATIONS.has(d.id)) continue; const ws = new Set(stemsOf(d.title + ' ' + (d.description || ''))); for (const w of ws) TITLE_DF.set(w, (TITLE_DF.get(w) || 0) + 1); } return TITLE_DF; }
// USHER4 (p1) everyday wording for a page, from its own texts only (title, summary, descriptions, aliases, section labels and bodies)
const PARA_RE = PARAPHRASE.map(([re, plain, kind]) => [new RegExp(re, 'i'), plain, kind]);
function pageOwnText(s) { return [s.title, s.description, ...(s.descriptions || []), ...(s.aliases || []), ...s.sections.flatMap(x => [x.label, x.body || '', ...(x.descriptions || [])])].filter(Boolean).join(' . '); }
const PARA_CACHE = new Map();
function paraphraseFor(s) { if (PARA_CACHE.has(s.id)) return PARA_CACHE.get(s.id); const own = pageOwnText(s), out = [];
  // 'syn' entries (another name for the same thing) never form a text of their own: they name the page in its situation texts and join its vocabulary
  const syn = []; for (const [re, plain, kind] of PARA_RE) if (re.test(own)) { if (kind === 'syn') syn.push(...plain); else out.push(plain.join('; ')); }
  const res = syn.length ? out.map(t => `(${syn.join(', ')}) ${t}`) : out; res.vocab = syn; PARA_CACHE.set(s.id, res); return res; }
// USHER4 (p2) words a page's own texts use (with its everyday wording when p1 is on)
let PAGE_LEX = null; function pageLex(id) { if (!PAGE_LEX) { PAGE_LEX = new Map(); for (const s of SERVICES) { const w = new Set(stemsOf(pageOwnText(s) + (POLICY.plainParaphrase ? ' ' + paraphraseFor(s).join(' ') + ' ' + paraphraseFor(s).vocab.join(' ') : ''))); PAGE_LEX.set(s.id, w); } } return PAGE_LEX.get(id) || new Set(); }
// USHER4 (p3) the site's own texts as one normalised string (phrase look-ups)
let CORPUS = null; function corpus() { if (CORPUS) return CORPUS; const parts = []; for (const a of AREAS) { parts.push(a.label, a.description || ''); for (const g of a.groups || []) parts.push(g.label); } for (const s of SERVICES) parts.push(pageOwnText(s));
  CORPUS = ' ' + normalise(parts.join(' . ')) + ' '; return CORPUS; }
function orgCue(A, topId) { const q = ' ' + A.normalised + ' '; if (!ORG_LOGISTICS.test(A.normalised)) return []; const own = topId && byId(topId) ? ' ' + normalise(pageOwnText(byId(topId))) + ' ' : corpus(); return ORG_PLACES.filter(p => q.includes(' ' + p + ' ') && !own.includes(' ' + p + ' ')); }
const twinCache = new WeakMap();
function twinMap(index) { // mutual nearest neighbours across roles by page-description centroid (kind 'p' texts); structural, query-independent
  if (twinCache.has(index)) return twinCache.get(index);
  const dim = index.dim, C = new Map();
  index.texts.forEach(([id, sec, text, kind], i) => { if (kind !== 'p') return; const s = byId(id); if (!s || !s.routable || RESUME_TARGETS.has(id)) return;
    if (!C.has(id)) C.set(id, new Float64Array(dim)); const v = C.get(id); for (let d = 0; d < dim; d++) v[d] += index.vectors[i * dim + d]; });
  for (const v of C.values()) { let n = 0; for (let d = 0; d < dim; d++) n += v[d] * v[d]; n = Math.sqrt(n) || 1; for (let d = 0; d < dim; d++) v[d] /= n; }
  const cos = (a, b) => { let x = 0; for (let d = 0; d < dim; d++) x += a[d] * b[d]; return x; };
  const isTask = id => ROLE[id] === 'task', ids = [...C.keys()];
  const nn = id => { let best = null, bv = -2; for (const o of ids) { if (o === id || isTask(o) === isTask(id) || (byId(o) || {}).type !== (byId(id) || {}).type) continue; const c = cos(C.get(id), C.get(o)); if (c > bv) { bv = c; best = o; } } return [best, bv]; };
  const map = {};
  if (HAS_ROLES) for (const id of ids) if (isTask(id)) { const [o, v] = nn(id); if (o && v >= POLICY.twinMinPairSim && nn(o)[0] === id) { map[id] = { twin: o, sim: r4(v) }; map[o] = { twin: id, sim: r4(v) }; } }
  twinCache.set(index, map); return map;
}
function setSavedStates(list) { // the host calls usher.setState(list) after login; rebuilds the resume routing in place
  SAVED.length = 0; for (const x of list) SAVED.push(Object.assign({}, x));
  for (const k of Object.keys(SAVED_FOR)) delete SAVED_FOR[k];
  for (const x of SAVED) if (x.ownerDestination) SAVED_FOR[x.ownerDestination] = x.destination;
  SAVED_DESTINATIONS.clear(); for (const x of SAVED) SAVED_DESTINATIONS.add(x.destination);
  RESUME_TARGETS.clear(); for (const d of [...SAVED_DESTINATIONS, FALLBACK_RESUME]) if (d) RESUME_TARGETS.add(d);
}

/* ---- text analysis ---- */
const CANON = [];
for (const e of VOC.entities || []) for (const pat of e.patterns || []) CANON.push([new RegExp(pat, 'g'), e.canonical]);
const INTENTS = Object.assign({}, DEFAULT_INTENTS, VOC.intents || {});
if (POLICY.mergeIntents) for (const [k, terms] of Object.entries(VOC.intents || {})) if (DEFAULT_INTENTS[k] && (POLICY.mergeIntents === 'all' || k === 'resume' || k === 'status')) INTENTS[k] = [...new Set([...DEFAULT_INTENTS[k], ...terms])];
const GENERIC = GENERIC_DEFAULT.concat(VOC.genericWords || []);
const ACTIONS = Object.assign({}, ACTION_WORDS); for (const [k, v] of Object.entries(VOC.actionWords || {})) ACTIONS[k] = (ACTIONS[k] || []).concat(v);
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
function compileTerm(term) { if (!termCache.has(term)) termCache.set(term, term.split(/\s+/).flatMap(w => w === '*' ? ['*'] : stemsOf(w))); return termCache.get(term); }
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
const GENERIC_STEMS = new Set(GENERIC.filter(t => !t.includes(' ')).map(t => compileTerm(t)[0]));
let actionIndex = null;
function contentTokens(A) { return [...new Set(A.stems)].filter(w => w.length > 2 && !STOP.has(w) && !GENERIC_STEMS.has(w)); }
function genericAction(A) { // the action family when the goal is ONLY an action (no topic), else null
  if (!actionIndex) { actionIndex = new Map(); for (const [fam, ws] of Object.entries(ACTIONS)) for (const w of ws) actionIndex.set(stem(w), fam); }
  const objects = new Set(ACTION_OBJECTS.map(stem));
  const toks = contentTokens(A).concat(A.stems.filter(w => actionIndex.has(w)));
  let fam = null;
  for (const w of new Set(toks)) { if (actionIndex.has(w)) { fam = fam || actionIndex.get(w); continue; } if (objects.has(w)) continue; return null; }
  return fam;
}
function analyse(q) {
  const normalised = normalise(q);
  const tokens = normalised ? normalised.split(' ') : [];
  const A = { query: q, normalised, tokens, stems: tokens.map(stem) };
  A.stemSet = new Set(A.stems);
  const intents = {};
  for (const [k, terms] of Object.entries(INTENTS)) { const hits = terms.filter(t => hasTerm(A, t)); if (hits.length) intents[k] = hits; }
  if (POLICY.extraStatusCues) { const st = STATUS_EXTRA.filter(t => hasTerm(A, t)), rs = RESUME_EXTRA.filter(t => hasTerm(A, t));
    if (st.length) intents.status = (intents.status || []).concat(st.map(t => t + ' (usher2)'));
    if (rs.length && FIRST_PERSON.some(w => A.tokens.includes(w))) A.ownItemCues = rs; }
  if (!intents.resume) { const weak = RESUME_WEAK.filter(t => hasTerm(A, t)); if (weak.length && RESUME_CONTEXT.some(t => hasTerm(A, t))) intents.resume = weak.map(t => t + ' (+context)'); }
  const suppressed = [];
  for (const [a, b] of INTENT_SUPPRESS) if (intents[a] && intents[b]) { suppressed.push(b + ' (by ' + a + ')'); delete intents[b]; }
  A.intents = intents; A.suppressedIntents = suppressed;
  A.generic = GENERIC.filter(t => hasTerm(A, t));
  return A;
}

const anyTerm = (A, list) => list.some(t => hasTerm(A, t));
function personCues(A) {
  const firstPerson = FIRST_PERSON.some(w => A.tokens.includes(w));
  return { firstPerson, thirdParty: anyTerm(A, THIRD_PARTY), general: anyTerm(A, GENERAL_MARKERS) };
}
function eventCues(A) { // task vs information cues for twin pages
  const hypothetical = anyTerm(A, HYPOTHETICAL);
  const past = A.tokens.filter(w => !NOT_PAST_ED.includes(w) && ((/^[a-z]{3,}ed$/.test(w)) || PAST_IRREGULAR.includes(w)));
  const narrative = past.length > 0 && !hypothetical;
  const report = (ACTIONS.report || []).some(w => A.stemSet.has(stem(w)));
  const task = [];
  if (narrative) task.push('past event: ' + past.join(' ')); if (report) task.push('report');
  for (const k of ['create', 'status', 'resume']) if (A.intents[k]) task.push(k);
  const info = [];
  if (QUESTION_OPENERS.includes(A.tokens[0]) && !narrative) info.push('question: ' + A.tokens[0]);
  if (hypothetical) info.push('hypothetical'); if (anyTerm(A, GENERAL_MARKERS)) info.push('general');
  if (A.intents.eligibility) info.push('eligibility');
  return { task, info };
}

/* ---- paths and validation ---- */
function pathLabels(id, sectionIndex) {
  const s = byId(id); if (!s) return [];
  const out = [domainOf(s.domain)[1], s.group];
  if (s.parent && byId(s.parent)) out.push(byId(s.parent).title);
  out.push(s.title);
  if (sectionIndex != null && s.sections[sectionIndex]) out.push(s.sections[sectionIndex].label);
  return out;
}
const optionFor = (id, sectionIndex) => { const s = byId(id); if (!s) return null; return { id, title: s.title, sectionIndex: sectionIndex == null ? null : sectionIndex, path: pathLabels(id, sectionIndex).join(' \u2192 ') }; };
function validateDestination(id, sectionIndex) {
  const s = byId(id);
  if (!s) return { ok: false, error: `unknown destination id "${id}"` };
  if (sectionIndex != null && !(Number.isInteger(sectionIndex) && sectionIndex >= 0 && sectionIndex < s.sections.length)) return { ok: false, error: `section index ${sectionIndex} out of range for "${id}" (0-${s.sections.length - 1})` };
  return { ok: true };
}
const validateCatalogue = () => validateProfile(profile);

/* ---- URLs (navigation.mode: hash | path | callback) ---- */
const NAV = SITE.navigation || { mode: 'path' };
const expand = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (m, k) => vars[k] == null ? '' : String(vars[k]));
function urlFor(kind, id, sectionIndex) { // kind: home | area | group | page | section
  const T = NAV.urlTemplates || {};
  if (kind === 'home') return T.home || SITE.baseUrl || '/usher-demonstrator/sites/civicsphere/';
  if (kind === 'area') return T.area ? expand(T.area, { area: id, id }) : ((AREAS.find(a => a.id === id) || {}).url || null);
  if (kind === 'group') { const s = id; const vars = { area: s.domain, group: s.groupId, groupLabel: encodeURIComponent(s.group) }; return T.group ? expand(T.group, vars) : null; }
  const s = byId(id); if (!s) return null;
  if (kind === 'page') return T.page ? expand(T.page, { id }) : s.url;
  if (kind === 'section') { const x = s.sections[sectionIndex]; if (T.section) return expand(T.section, { id, index: sectionIndex, anchor: x && x.anchor ? String(x.anchor).replace(/^#/, '') : '' }); return (s.url || '') + (x && x.anchor ? x.anchor : ''); }
  return null;
}
// Route steps shown to the visitor: Home > Area > Group > [parent] > Page > [Section], each with its URL (null when the site has no page for it).
function routeSteps(id, sectionIndex) {
  const s = byId(id), d = domainOf(s.domain), parent = s.parent ? byId(s.parent) : null;
  const L = [{ label: 'Home', kind: 'home', url: urlFor('home') }, { label: d[1], kind: 'area', url: urlFor('area', s.domain) }, { label: s.group, kind: 'group', url: urlFor('group', s) }];
  if (parent) L.push({ label: parent.title, kind: 'page', id: parent.id, url: urlFor('page', parent.id) });
  L.push({ label: s.title, kind: 'page', id, url: urlFor('page', id) });
  if (sectionIndex != null && s.sections[sectionIndex]) L.push({ label: s.sections[sectionIndex].label, kind: 'section', id, index: sectionIndex, url: urlFor('section', id, sectionIndex) });
  return L;
}

/* ---- lexical (hints) ---- */
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
function chooseSectionLex(s, A) {
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
// Keyword-only fallback (used only when the meaning model cannot load).
function resolveGoal(q) {
  const A = analyse(q);
  const evaluated = GOAL_PROFILES.map(p => scoreProfile(p, A));
  const ranked = evaluated.filter(x => x.eligible).sort((a, b) => b.score - a.score);
  const result = { version: ENGINE_VERSION, query: String(q == null ? '' : q), normalised: A.normalised, intents: A.intents, suppressedIntents: A.suppressedIntents, generic: A.generic,
    decision: null, destinationId: null, sectionIndex: null, sectionId: null, sectionLabel: null, path: [], confidence: null, reason: null, clarification: null,
    candidates: ranked.map(x => ({ id: x.id, title: (byId(x.id) || {}).title, score: x.score, parts: x.parts, topic: x.topic, context: x.context, intents: x.intentHits, generic: x.generic, exclude: x.exclude, qualifierUnmet: x.qualifierUnmet })),
    rejectedProfiles: evaluated.filter(x => !x.eligible).filter(x => x.topic.length || x.context.length).map(x => ({ id: x.id, why: x.why, topic: x.topic, context: x.context })),
    lexical: [], sectionScores: [], thresholds: THRESHOLDS };
  if (!A.normalised) { result.decision = 'reject'; result.reason = 'empty input'; return result; }
  const top = ranked[0], second = ranked[1];
  const profileOptions = () => ranked.filter(x => top && x.score >= Math.max(THRESHOLDS.clarifyMinScore, top.score * THRESHOLDS.optionMinRatio)).slice(0, THRESHOLDS.maxOptions)
    .map(x => { const s = byId(x.id); return optionFor(x.id, chooseSectionLex(s, A).index); });
  if (top && top.score >= THRESHOLDS.clarifyMinScore) {
    const evidence = Math.min(1, Math.max(0, top.score) / 30), margin = Math.min(1, Math.max(0, top.score - (second ? Math.max(0, second.score) : 0)) / 15);
    const conf = { value: Math.min(0.99, Math.round((0.40 + 0.30 * evidence + 0.30 * margin) * 100) / 100), evidence: Math.round(evidence * 100) / 100, margin: Math.round(margin * 100) / 100, top: top.score, second: second ? Math.max(0, second.score) : 0 };
    result.confidenceComponents = conf; result.confidence = conf.value;
    if (top.qualifierUnmet) {
      const gp = GOAL_PROFILES.find(p => p.id === top.id);
      result.decision = 'clarify'; result.reason = 'qualifier';
      result.clarification = { message: gp.qualifier.message, options: gp.qualifier.options.map(id => optionFor(id, null)).filter(Boolean) };
      return result;
    }
    if (top.score >= THRESHOLDS.navigateMinScore && conf.value >= THRESHOLDS.navigateMinConfidence) {
      const s = byId(top.id); const secRes = chooseSectionLex(s, A);
      result.sectionScores = secRes.scores;
      const v = validateDestination(top.id, secRes.index);
      if (!v.ok) { result.decision = 'reject'; result.reason = 'invalid destination: ' + v.error; return result; }
      Object.assign(result, { decision: 'navigate', destinationId: top.id, sectionIndex: secRes.index, sectionId: secRes.index == null ? null : s.sections[secRes.index].id,
        sectionLabel: secRes.index == null ? null : s.sections[secRes.index].label, path: pathLabels(top.id, secRes.index),
        reason: `top score ${top.score}, margin ${top.score - (second ? second.score : 0)} over ${second ? second.id : 'no runner-up'}` });
      return result;
    }
    const opts = profileOptions();
    result.decision = 'clarify'; result.reason = top.score < THRESHOLDS.navigateMinScore ? 'weak_evidence' : 'ambiguous';
    result.clarification = { message: opts.length > 1 ? `Your goal could match more than one ${SHORT} destination. Which of these is closest?` : 'I think I know where you mean, but I need a little more detail. Is it this?', options: opts };
    return result;
  }
  const lex = lexical(A); result.lexical = lex.slice(0, 5);
  if (lex.length && lex[0].score >= THRESHOLDS.lexicalMinScore) {
    const seen = new Set(); const opts = [];
    for (const l of lex) { if (seen.has(l.title)) continue; seen.add(l.title); opts.push(optionFor(l.id, null)); if (opts.length >= THRESHOLDS.maxOptions) break; }
    result.decision = 'clarify'; result.reason = 'lexical_only';
    result.clarification = { message: `I found related ${SHORT} pages but could not identify your goal confidently. Is it one of these?`, options: opts };
    return result;
  }
  if (A.generic.length || (top && top.score > 0)) {
    result.decision = 'clarify'; result.reason = 'low_specificity';
    result.clarification = { message: 'Tell me a little more about what you are trying to do, for example the situation you are in or what you want to find out.', options: [] };
    return result;
  }
  result.decision = 'reject'; result.reason = 'no_match'; result.clarification = { message: REJECT_MESSAGE, options: [] };
  return result;
}

/* ---- semantic index texts ---- */
// [destinationId, sectionIndex|null, text, kind]  kind: 'p' page description, 's' section description, 't' templated section text, 'n' off-topic example
function buildTexts() {
  const out = [], tpl = VOC.sectionTemplates || {};
  for (const s of SERVICES) {
    if (!routable(s)) continue;
    const pageTexts = s.descriptions || [s.description];
    for (const t of pageTexts) out.push([s.id, null, `${s.title}: ${t}`, 'p']);
    if (POLICY.plainParaphrase) for (const t of paraphraseFor(s)) out.push([s.id, null, `${s.title}: ${t}`, 'a']);
    s.sections.forEach((x, i) => {
      const own = x.body ? [x.body] : x.descriptions;
      const texts = own || [tpl[x.label] ? tpl[x.label].replace('{t}', s.title) : `${x.label} for ${s.title}.`];
      for (const t of texts) out.push([s.id, i, `${x.label} (${s.title}): ${t}`, own ? 's' : 't']);
    });
  }
  for (const t of profile.offTopic || []) out.push([OFFTOPIC_ID, null, t, 'n']);
  return out;
}
function decodeIndex(json) {
  const bytes = b64ToBytes(json.vectors);
  const vectors = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
  const expected = textsHash(buildTexts());
  return { model: json.model, dim: json.dim, texts: json.texts, vectors, stale: json.textsHash !== expected, textsHash: json.textsHash, expectedHash: expected };
}
function indexVectors(index) {
  if (index.vectors instanceof Float32Array) return index.vectors;
  if (!index._vec) { const bytes = b64ToBytes(index.vectors); Object.defineProperty(index, '_vec', { value: new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4), enumerable: false }); }
  return index._vec;
}
function rankDestinations(queryVector, index, opts) { // ranked-list (semantic search) baseline: same model, texts and destination rule, no policy
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
  return out.slice(0, o.k == null ? out.length : o.k).map((c, i) => ({ rank: i + 1, id: c.id, title: byId(c.id).title, score: Math.round(c.score * 1e4) / 1e4, bestText: c.best.text, bestSection: c.best.sec, path: pathLabels(c.id, null).join(' \u2192 ') }));
}

/* ---- the decision policy (RESOLVER6, unchanged) ---- */
const QUALS = (profile.qualifiers || []).map(q => ({ id: q.id, trig: (q.triggerTerms || []).map(stem), unless: (q.unlessAnyOf || []).map(stem), message: q.message, options: q.options || [] }));
function lexicalEvidence(id, A, P, lexWords) {
  const prof = GOAL_PROFILES.find(p => p.id === id);
  let ev = 0, why = '';
  if (prof) { const sp = scoreProfile(prof, A);
    const corroborated = sp.eligible && sp.topic.length > 0 && (sp.context.length > 0 || Object.keys(sp.intentHits || {}).length > 0);
    if (sp.exclude && sp.exclude.length && P.lexExcludeBlocks) { ev = -0.5; why = 'profile contradicted: ' + sp.exclude.join(','); }
    else if (sp.eligible && (corroborated || !P.lexRequireCorroboration || sp.score < 0)) { ev = Math.max(-1, Math.min(1, sp.score / P.lexProfileScale)); why = `profile ${sp.score}`; }
    else if (sp.eligible) why = 'profile uncorroborated';
    else if (sp.exclude && sp.exclude.length) { ev = -0.5; why = 'profile excluded: ' + sp.exclude.join(','); } }
  const w = lexWords.get(id);
  if (w && ev >= 0 && w.matched.length >= P.lexMinWords) { const wv = P.lexWordWeight * Math.min(1, w.score / P.lexWordScale); if (wv > ev) { ev = wv; why = `words ${w.matched.join(',')}`; } }
  return { ev, why };
}
function applyLexicalTieBreak(cands, A, P, result) {
  const top = cands[0].score;
  const lexWords = new Map(lexical(A).map(l => [l.id, l]));
  const inBand = cands.filter(c => top - c.score <= P.band);
  if (inBand.length < 2) return;
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
function sectionTextIdx(index, id, sec) {
  if (!index.bySection) { index.bySection = new Map(); index.texts.forEach(([tid, tsec], k) => { if (tsec == null) return; const key = tid + '#' + tsec; if (!index.bySection.has(key)) index.bySection.set(key, []); index.bySection.get(key).push(k); }); }
  return index.bySection.get(id + '#' + sec) || [];
}
function chooseSection(s, A, query, sims, index, P) {
  const r3 = P.hybrid ? chooseSectionLex(s, A) : { scores: [] };
  const scores = s.sections.map((x, i) => {
    let sim = -1;
    for (const k of sectionTextIdx(index, s.id, i)) if (sims[k] > sim) sim = sims[k];
    const intentHits = x.intents.filter(k => A.intents[k]);
    const keywordHits = x.keywords.filter(t => hasTerm(A, t));
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
function resolveSemantic(query, qvec, index, overrides) {
  const P = Object.assign({}, PARAMS, overrides || {});
  const A = analyse(query);
  const result = { version: ENGINE_VERSION, mode: 'semantic', query: String(query == null ? '' : query), normalised: A.normalised, intents: A.intents, generic: A.generic,
    decision: null, destinationId: null, sectionIndex: null, sectionId: null, sectionLabel: null, path: [], confidence: null, reason: null, clarification: null,
    candidates: [], sectionScores: [], adjustments: [], thresholds: P };
  if (!A.normalised) { result.decision = 'reject'; result.reason = 'empty input'; return result; }
  const content = contentTokens(A);
  const dim = index.dim, sims = new Float64Array(index.texts.length);
  for (let i = 0; i < index.texts.length; i++) { let s = 0; const o = i * dim; for (let k = 0; k < dim; k++) s += qvec[k] * index.vectors[o + k]; sims[i] = s; }
  const per = new Map(), offBest = { v: -1, text: null }; let ownMax = -1;
  index.texts.forEach(([id, sec, text, kind], i) => {
    if (kind === 't') return;
    if (kind === 'n') { if (sims[i] > offBest.v) { offBest.v = sims[i]; offBest.text = text; } return; }
    const v = sec == null ? sims[i] : sims[i] - P.sectionTextPenalty;
    if (!per.has(id)) per.set(id, { id, vals: [], best: null });
    const e = per.get(id); e.vals.push(v); if (kind !== 'a' && v > ownMax) ownMax = v;
    if (!e.best || v > e.best.v) e.best = { v, text, section: sec };
  });
  const cands = [];
  for (const e of per.values()) {
    const v = e.vals.slice().sort((a, b) => b - a);
    const base = v.length > 1 ? P.wMax * v[0] + (1 - P.wMax) * v[1] : v[0];
    let adj = 0; const notes = [];
    for (const [k, w] of Object.entries(PROFILE_INTENTS[e.id] || {})) if (A.intents[k] && k !== 'resume') { adj += w * P.intentScale; notes.push(`${k} ${w > 0 ? '+' : ''}${r4(w * P.intentScale)}`); }
    if (A.intents.resume) { if (RESUME_TARGETS.has(e.id)) { adj += P.resumeBoost; notes.push('resume +' + P.resumeBoost); } }
    else if (SAVED_DESTINATIONS.has(e.id)) { adj -= P.noResumePenalty; notes.push('no resume intent -' + P.noResumePenalty); }
    cands.push({ id: e.id, title: byId(e.id).title, score: r4(base + adj), similarity: r4(base), adjustments: notes, bestText: e.best.text, bestSim: r4(e.best.v) });
  }
  cands.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  if (P.hybrid && cands.length && GOAL_PROFILES.length) applyLexicalTieBreak(cands, A, P, result);
  result.candidates = cands.slice(0, 8);
  result.offTopic = { similarity: r4(offBest.v), text: offBest.text };
  const top = cands[0], second = cands[1];
  const margin = top.score - (second ? second.score : 0);
  result.confidence = Math.min(0.99, Math.round((0.40 + 0.35 * clamp01((top.score - P.clarifyMin) / (0.75 - P.clarifyMin)) + 0.25 * clamp01(margin / 0.10)) * 100) / 100);
  result.confidenceComponents = { top: top.score, second: second ? second.score : 0, margin: r4(margin) };
  const option = (id, sec) => { const s = byId(id); return { id, title: s.title, sectionIndex: sec == null ? null : sec, path: pathLabels(id, sec).join(' \u2192 ') }; };
  const ownCue = () => !!(A.intents.status || A.intents.resume || A.ownItemCues);
  const options = () => cands.filter(c => (POLICY.clarifyTopK > 0 || c.score >= top.score - P.optionWindow) && c.score >= P.clarifyMin
      && (POLICY.optionWindowTopK == null || c.score >= top.score - POLICY.optionWindowTopK)
      && (!POLICY.savedOptionGuard || !SAVED_DESTINATIONS.has(c.id) || c === top || ownCue() || c.score >= top.score - P.optionWindow)).slice(0, POLICY.clarifyTopK > 0 ? Math.min(3, POLICY.clarifyTopK) : 3).map(c => option(c.id, chooseSection(byId(c.id), A, query, sims, index, P).index));

  // 1. Low specificity: no content words beyond generic ones.
  if (!content.length) {
    result.decision = 'clarify'; result.reason = 'low_specificity';
    result.clarification = { message: 'Tell me a little more about what you are trying to do, for example the situation you are in or what you want to find out.', options: [] };
    return result;
  }
  const go = (id, reason, note) => { const s = byId(id); const sec = chooseSection(s, A, query, sims, index, P); result.sectionScores = sec.scores;
    Object.assign(result, { decision: 'navigate', destinationId: id, sectionIndex: sec.index, sectionId: sec.index == null ? null : s.sections[sec.index].id,
      sectionLabel: sec.index == null ? null : s.sections[sec.index].label, path: pathLabels(id, sec.index), reason }); if (note) result.adjustments.push(note); return result; };
  // 1a. USHER3 (a): unrelated request. Low absolute similarity, or words this site never uses with a match that is not strong.
  const unk = unknownWords(A), ent = entityWords(A), cueFrac = content.length ? unk.length / content.length : 0;
  result.unknownWords = unk; result.entityWords = ent;
  const cue = unk.length > 0 && cueFrac >= POLICY.oodCueFrac;
  // USHER4 (p2): the best page's own texts use several of the goal's other words: the unknown words are a detail, not a different subject
  const anchorHits = (POLICY.oodCueAnchor != null && cue) || (POLICY.oodEntityAnchor != null && ent.length) ? content.filter(w => !unk.includes(w) && pageLex(top.id).has(w)) : [];
  const anchored = POLICY.oodCueAnchor != null && cue && anchorHits.length >= POLICY.oodCueAnchor;
  const entKnown = POLICY.oodEntityAnchor != null && ent.length ? content.filter(w => !unk.includes(w) && !ent.includes(w)) : [];
  const entAnchored = POLICY.oodEntityAnchor != null && ent.length > 0 && entKnown.length >= POLICY.oodEntityAnchor;
  if (entAnchored && POLICY.oodEntitySim != null && top.bestSim < POLICY.oodEntitySim) result.adjustments.push(`USHER4: ${top.id} the goal's other words [${entKnown.join(', ')}] are all site words; the unfamiliar name [${ent.join(', ')}] alone does not decline, asking instead`);
  const org = POLICY.oodOrgSim != null && POLICY.oodGuard && !A.intents.resume ? orgCue(A, top.id) : [];
  result.orgWords = org; result.anchorHits = anchorHits;
  if (anchored && cue && POLICY.oodCueSim != null && top.bestSim < POLICY.oodCueSim) result.adjustments.push(`USHER4: ${top.id} uses [${anchorHits.join(', ')}]; unknown words [${unk.join(', ')}] alone do not decline, asking instead`);
  if (POLICY.oodGuard && !A.intents.resume) {
    const floorSim = POLICY.oodFloorOwn && POLICY.plainParaphrase ? r4(ownMax) : top.bestSim;
    const why = POLICY.oodFloor != null && floorSim < POLICY.oodFloor ? `best similarity${floorSim !== top.bestSim ? ' to the site\'s own texts' : ''} ${floorSim} < ${POLICY.oodFloor}`
      : org.length && top.bestSim < POLICY.oodOrgSim ? `asks about ${org.join(', ')}, which the site never mentions, and best similarity ${top.bestSim} < ${POLICY.oodOrgSim}`
      : cue && POLICY.oodCueSim != null && top.bestSim < POLICY.oodCueSim && !anchored ? `words the site never uses [${unk.join(', ')}] and best similarity ${top.bestSim} < ${POLICY.oodCueSim}`
      : ent.length && POLICY.oodEntitySim != null && top.bestSim < POLICY.oodEntitySim && !entAnchored ? `names [${ent.join(', ')}], which the site never uses, and best similarity ${top.bestSim} < ${POLICY.oodEntitySim}` : null;
    if (why) { result.adjustments.push('USHER3 out of scope: ' + why); result.decision = 'reject'; result.reason = 'out_of_scope'; result.clarification = { message: REJECT_MESSAGE, options: [] }; return result; }
  }
  const cueNoNav = (POLICY.oodGuard && cue && POLICY.oodNoNavSim != null && top.bestSim < POLICY.oodNoNavSim) || (anchored && POLICY.oodCueSim != null && top.bestSim < POLICY.oodCueSim) || (entAnchored && POLICY.oodEntitySim != null && top.bestSim < POLICY.oodEntitySim) || org.length > 0;
  // 1b. GP3 rule S: the visitor's own saved item (open claim, saved quote, open ticket, pending move) when the goal plausibly refers to it.
  if (POLICY.savedRouting && SAVED.length) {
    const pc = personCues(A);
    if (!pc.thirdParty && !pc.general) {
      const simOf = id => { const c = cands.find(x => x.id === id); return c ? c.similarity : -1; };
      const other = cands.find(c => !RESUME_TARGETS.has(c.id)); const ref = other ? other.score : 0;
      const personal = A.intents.resume || (A.intents.status && pc.firstPerson) || !!(A.ownItemCues && pc.firstPerson);
      // a sibling service (same group as the saved item's owner, scoring above it) that the goal names by a title word the saved item does not have: the goal is about that sibling
      const words = t => new Set(stemsOf(t || '').filter(w => w.length > 2 && !STOP.has(w) && !GENERIC_STEMS.has(w)));
      const namesSibling = st => { const own = st.ownerDestination && byId(st.ownerDestination); if (!other || !own || other.id === own.id || byId(other.id).domain !== own.domain || byId(other.id).groupId !== own.groupId || other.score <= simOf(own.id)) return null;
        const mine = new Set([...words(st.label), ...words(byId(st.destination).title), ...words(own.title), ...words((st.progress || {}).stepLabel)]);
        const hit = [...words(byId(other.id).title)].filter(w => A.stemSet.has(w) && !mine.has(w)); return hit.length ? hit : null; };
      const savedWords = st => { const own = st.ownerDestination && byId(st.ownerDestination); return new Set([...words(st.label), ...words(st.kind), ...words((st.progress || {}).stepLabel), ...words(byId(st.destination).title), ...words(own ? own.title : '')]); };
      const sharesWord = st => [...savedWords(st)].some(w => A.stemSet.has(w));
      const wordOk = st => !POLICY.savedWordGuard || (sharesWord(st) && !cue);
      // USHER4 (p5): the goal names a title word of a page ranked above the saved item's owner page that the saved item does not have (another product or service)
      const allKinds = new Set(SAVED.flatMap(x => [...words(x.kind)]));
      const conflictOf = st => { if (!POLICY.savedConflictGuard) return null; const mine = savedWords(st); const ownSim = Math.max(simOf(st.destination), st.ownerDestination ? simOf(st.ownerDestination) : -1);
        const q = content.filter(w => !mine.has(w) && !allKinds.has(w));
        for (const c of cands.filter(c => !RESUME_TARGETS.has(c.id) && c.id !== st.ownerDestination).slice(0, 5)) { if (c.similarity <= ownSim) continue;
          const hit = [...words(byId(c.id).title)].filter(w => q.includes(w)); if (hit.length) return c.id + ': ' + hit.join(' '); }
        return null; };
      const conflicts = SAVED.filter(st => conflictOf(st)); if (conflicts.length) result.adjustments.push('USHER4 rule S: skipped ' + conflicts.map(st => st.destination + ' (goal names ' + conflictOf(st) + ')').join(', '));
      const eligible = SAVED.filter(st => byId(st.destination) && !namesSibling(st) && !conflicts.includes(st));
      if (SAVED.some(st => byId(st.destination) && namesSibling(st))) result.adjustments.push('GP3 rule S: skipped ' + SAVED.filter(st => byId(st.destination) && namesSibling(st)).map(st => st.destination + ' (goal names sibling ' + other.id + ': ' + namesSibling(st).join(' ') + ')').join(', '));
      if (personal) {
        let best = null; for (const st of eligible) { if (!A.intents.resume && !A.ownItemCues && !wordOk(st)) continue; const rel = Math.max(simOf(st.destination), st.ownerDestination ? simOf(st.ownerDestination) : -1); if (byId(st.destination) && (!best || rel > best.rel)) best = { st, rel }; }
        // USHER2 (i): 'my <kind>' (e.g. my claim, my fault) with a status/resume cue and exactly one saved item of that kind: it is that item
        const possessive = A.tokens.includes('my') || A.tokens.includes('our');
        const kindHit = POLICY.extraStatusCues && !A.intents.howto ? eligible.filter(st => st.kind && A.stemSet.has(stem(st.kind)) && (A.tokens.includes('my') || A.tokens.includes('our'))) : [];
        if (kindHit.length === 1 && SAVED.filter(x => x.kind === kindHit[0].kind).length === 1) return go(kindHit[0].destination, `saved state (${A.intents.resume ? 'resume' : 'status'} intent, names your ${kindHit[0].kind}): ${kindHit[0].destination}`, 'USHER2 rule S1k');
        if (best && best.rel >= P.clarifyMin && best.rel >= ref - POLICY.savedIntentWindow)
          return go(best.st.destination, `saved state (${A.intents.resume ? 'resume' : 'status'} intent): ${best.st.destination} relevance ${best.rel.toFixed(3)} vs ${other ? other.id + ' ' + ref.toFixed(3) : 'none'}`, 'GP3 rule S1');
      } else if (pc.firstPerson && POLICY.savedContextRoute && !anyTerm(A, HYPOTHETICAL) && !A.intents.howto && (A.tokens.includes('my') || A.tokens.includes('our'))) {
        // USHER2 (i): the goal names a detail of the visitor's own item (words of its label or current step that its owner page title does not have)
        const topN = cands.slice(0, POLICY.savedContextMinRank).map(c => c.id);
        for (const st of eligible) { const own = st.ownerDestination && byId(st.ownerDestination);
          const det = new Set([...words(st.label), ...words((st.progress || {}).stepLabel)]); for (const w of words(own ? own.title : '')) det.delete(w);
          for (const w of [...det]) if ((titleDf().get(w) || 0) > POLICY.savedContextMaxDf) det.delete(w); // only distinctive details: words that few page titles/summaries use
          const hit = [...det].filter(w => A.stemSet.has(w));
          if (hit.length && (topN.includes(st.destination) || (own && topN.includes(own.id)))) return go(st.destination, `saved item detail named (${hit.join(', ')}): ${st.destination}`, 'USHER2 rule S4'); }
      }
      const infoQuestion = POLICY.savedGuards && (A.intents.howto || anyTerm(A, HYPOTHETICAL) || QUESTION_OPENERS.includes(A.tokens[0]) || A.tokens[0] === 'how');
      if (infoQuestion) result.adjustments.push('USHER2 saved guard: information question, rules S2/S3 not applied');
      if (!personal && pc.firstPerson && !infoQuestion) {
        let best = null; for (const st of eligible) { if (!wordOk(st)) continue; const v = simOf(st.destination); if (byId(st.destination) && (!best || v > best.v)) best = { st, v }; }
        if (best) { const gap = ref - best.v;
          if (best.v >= P.navigateMin && gap <= POLICY.savedNavWindow)
            return go(best.st.destination, `saved state match: ${best.st.destination} ${best.v.toFixed(3)} vs ${other ? other.id + ' ' + ref.toFixed(3) : 'none'} (window ${POLICY.savedNavWindow})`, 'GP3 rule S2');
          if (best.v >= P.navigateMin && gap <= POLICY.savedOfferWindow) {
            const rest = cands.filter(c => !RESUME_TARGETS.has(c.id) && c.score >= ref - P.optionWindow && c.score >= P.clarifyMin).slice(0, 2);
            const label = best.st.label || byId(best.st.destination).title;
            result.decision = 'clarify'; result.reason = 'saved_state_offer'; result.adjustments.push(`GP3 rule S3: ${best.st.destination} ${best.v.toFixed(3)} vs ${other ? other.id + ' ' + ref.toFixed(3) : 'none'}`);
            result.clarification = { message: `Is this about your ${label}? If not, choose the closest option.`, options: [option(best.st.destination, null), ...rest.map(c => option(c.id, chooseSection(byId(c.id), A, query, sims, index, P).index))] };
            return result;
          } }
      }
    }
  }
  // 2. Qualifiers (profile.qualifiers): a trigger word with none of the disambiguating words is underspecified, not unrelated.
  const qualSkip = q => { if (!POLICY.qualifierGuard) return null; if (A.intents.status || A.intents.resume || A.ownItemCues) return 'status/resume cue';
    const extra = content.filter(w => !q.trig.includes(w)); if (extra.length >= 2 && top.score >= POLICY.qualifierSkipScore && margin >= P.marginMin) return `strong match ${top.id} ${top.score.toFixed(3)}`; return null; };
  for (const q of QUALS) {
    if (q.trig.some(t => A.stemSet.has(t)) && !q.unless.some(t => A.stemSet.has(t))) {
      let why = qualSkip(q);
      if (!why && POLICY.qualifierOptionCheck && !q.options.includes(top.id)) { const bestOpt = Math.max(-1, ...cands.filter(c => q.options.includes(c.id)).map(c => c.score)); if (top.score >= P.clarifyMin && top.score - bestOpt >= POLICY.qualifierOutGap) why = `best page ${top.id} is not one of the question's options (${top.score.toFixed(3)} vs ${bestOpt.toFixed(3)})`; }
      if (why) { result.adjustments.push(`USHER2 qualifier ${q.id} skipped: ${why}`); continue; }
      result.decision = 'clarify'; result.reason = 'qualifier';
      result.clarification = { message: q.message, options: q.options.map(id => option(id, null)) };
      return result;
    }
  }
  // 3. Unrelated input: weak match overall, or an off-topic example is closer than any page.
  const offTopic = P.offTopic && offBest.v >= P.offTopicMin && offBest.v - top.bestSim >= P.offTopicMargin && !A.intents.resume;
  if (top.score < P.clarifyMin || offTopic) {
    if (offTopic) result.adjustments.push(`off-topic prototype ${r4(offBest.v)} vs best service text ${top.bestSim}`);
    result.decision = 'reject'; result.reason = offTopic && top.score >= P.clarifyMin ? 'off_topic' : 'no_match';
    result.clarification = { message: REJECT_MESSAGE, options: [] };
    return result;
  }
  // 3b. Generic action ("I want to appeal"): several services fit equally well; ask which.
  const action = P.genericActionClarify && !A.intents.resume ? genericAction(A) : null;
  if (action) {
    const opts = cands.filter(c => c.score >= P.clarifyMin).slice(0, 3).map(c => option(c.id, null));
    result.decision = 'clarify'; result.reason = 'generic_action'; result.adjustments.push('generic action: ' + action);
    result.clarification = { message: (VOC.actionMessages || {})[action] || ACTION_MESSAGES[action] || 'Which of these is closest to what you want to do?', options: opts };
    return result;
  }
  // 4. Task-state consistency: a resume goal goes to the saved state of the service it is about, else to the fallback account page.
  if (A.intents.resume) {
    const topic = cands.find(c => !RESUME_TARGETS.has(c.id));
    const target = topic && topic.score >= P.clarifyMin && SAVED_FOR[topic.id] && !(result.adjustments.some(a => a.startsWith('USHER4 rule S: skipped') && a.includes(SAVED_FOR[topic.id] + ' ('))) ? SAVED_FOR[topic.id] : FALLBACK_RESUME;
    if (!target || !byId(target)) { result.decision = 'clarify'; result.reason = 'low_specificity'; result.clarification = { message: 'Tell me a little more about what you are trying to do.', options: [] }; return result; }
    const s = byId(target); const sec = chooseSection(s, A, query, sims, index, P);
    result.sectionScores = sec.scores;
    Object.assign(result, { decision: 'navigate', destinationId: target, sectionIndex: sec.index, sectionId: sec.index == null ? null : s.sections[sec.index].id,
      sectionLabel: sec.index == null ? null : s.sections[sec.index].label, path: pathLabels(target, sec.index),
      reason: `resume intent: ${target === FALLBACK_RESUME ? 'no ' + SAVED_NOUN + ' for ' + (topic ? topic.id : 'this goal') + ', showing ' + s.title : SAVED_NOUN + ' for ' + topic.id}` });
    result.adjustments.push('resume routing');
    return result;
  }
  // 4b. GP3 rule T: the top page has a near-duplicate twin with a different role (e.g. a claim page vs a cover page). Use task/information cues, else ask ONE question naming both.
  if (POLICY.twinRule && HAS_ROLES) {
    const tm = twinMap(index)[top.id]; const tc = tm ? cands.find(c => c.id === tm.twin) : null;
    const third = tc ? cands.find(c => c.id !== top.id && c.id !== tc.id) : null;
    const thirdClose = tc && POLICY.twinThirdGap != null && third && third.score >= Math.min(top.score, tc.score) - POLICY.twinThirdGap;
    if (thirdClose) result.adjustments.push(`USHER3 rule T skipped: ${third.id} scores close to the twin pair`);
    if (tc && !thirdClose && tc.score >= top.score - POLICY.twinBand && tc.score >= P.clarifyMin) {
      const taskId = ROLE[top.id] === 'task' ? top.id : tc.id, infoId = taskId === top.id ? tc.id : top.id;
      const cue = eventCues(A); const note = `twin pair ${taskId} / ${infoId} (page sim ${tm.sim}); task cues [${cue.task.join(', ')}] information cues [${cue.info.join(', ')}]`;
      const pick = cue.task.length && !cue.info.length ? taskId : cue.info.length && !cue.task.length ? infoId : null;
      if (pick && !cueNoNav && top.score >= (POLICY.twinPickMin == null ? P.navigateMin : POLICY.twinPickMin)) return go(pick, `twin rule: ${pick} (${pick === taskId ? 'task' : 'information'} cues) over ${pick === taskId ? infoId : taskId}`, 'GP3 rule T: ' + note);
      result.decision = 'clarify'; result.reason = 'twin_question'; result.adjustments.push('GP3 rule T: ' + note);
      const T = byId(taskId), I = byId(infoId);
      result.clarification = { message: VOC.twinMessage ? VOC.twinMessage.replace('{task}', T.title).replace('{info}', I.title) : `Is this about something that has already happened (${T.title}) or about how it works and what is included (${I.title})?`,
        options: [option(taskId, chooseSection(T, A, query, sims, index, P).index), option(infoId, chooseSection(I, A, query, sims, index, P).index)] };
      return result;
    }
  }
  // 5. Navigate on a strong match with a clear margin; otherwise clarify with the closest options.
  if (cueNoNav && top.score >= P.navigateMin && margin >= P.marginMin) result.adjustments.push(`USHER3: words the site never uses [${unk.join(', ')}], asking instead of going straight to ${top.id}`);
  const vague = POLICY.vagueMaxContent > 0 && content.length <= POLICY.vagueMaxContent && !A.intents.status && !A.intents.resume && margin < POLICY.vagueMargin && second && second.score >= P.clarifyMin;
  if (vague && !cueNoNav && top.score >= P.navigateMin && margin >= P.marginMin) result.adjustments.push(`USHER4: short goal (${content.length} content words) and margin ${margin.toFixed(3)} < ${POLICY.vagueMargin}: asking`);
  if (!cueNoNav && !vague && top.score >= P.navigateMin && margin >= P.marginMin) {
    const s = byId(top.id); const sec = chooseSection(s, A, query, sims, index, P);
    result.sectionScores = sec.scores;
    const v = validateDestination(top.id, sec.index);
    if (!v.ok) { result.decision = 'reject'; result.reason = 'invalid destination: ' + v.error; return result; }
    Object.assign(result, { decision: 'navigate', destinationId: top.id, sectionIndex: sec.index, sectionId: sec.index == null ? null : s.sections[sec.index].id,
      sectionLabel: sec.index == null ? null : s.sections[sec.index].label, path: pathLabels(top.id, sec.index),
      reason: `similarity ${top.score.toFixed(3)}, margin ${margin.toFixed(3)} over ${second ? second.id : 'none'}` });
    return result;
  }
  if (POLICY.oodWeakCueReject && POLICY.oodGuard && top.score < P.navigateMin && (cue || ent.length) && !anchored && !entAnchored) {
    result.adjustments.push(`USHER4 out of scope: weak match ${top.score.toFixed(3)} < ${P.navigateMin} with ${cue ? 'words the site never uses [' + unk.join(', ') + ']' : 'names [' + ent.join(', ') + ']'}`);
    result.decision = 'reject'; result.reason = 'out_of_scope'; result.clarification = { message: REJECT_MESSAGE, options: [] }; return result; }
  const opts = options();
  result.decision = 'clarify'; result.reason = top.score < P.navigateMin ? 'weak_match' : 'close_alternatives';
  result.clarification = { message: opts.length > 1 ? `Your goal could match more than one ${SHORT} destination. Which of these is closest?` : 'I think I know where you mean, but I need a little more detail. Is it this?', options: opts };
  return result;
}

return { version: ENGINE_VERSION, profile, site: SITE, scope: SCOPE, MODEL, MODELS, PARAMS, THRESHOLDS, DOMAINS, GROUPS, SERVICES, SAVED, OFFTOPIC_ID,
  slug, byId, domainOf, pathLabels, optionFor, routable, urlFor, routeSteps, normalise, stem, analyse, contentTokens, hasTerm, genericAction,
  scoreProfile, chooseSection: chooseSectionLex, lexical, resolveGoal, resolveSemantic, rankDestinations, buildTexts, textsHash, decodeIndex,
  validateDestination, validateCatalogue, POLICY, ROLE, lexicon, unknownWords, entityWords, twinMap, personCues, eventCues, RESUME_TARGETS, SAVED_FOR, SAVED_DESTINATIONS, setSavedStates, GOAL_PROFILES };
}

/* ---- profile validation (also used by tools/usher-validate.js) ---- */
const BUILTIN_INTENTS = new Set(['howto', 'cost', 'eligibility', 'requirements', 'documents', 'status', 'responsibility', 'resume', 'difficulty', 'followup', 'create', 'pay']);
function validateProfile(p) {
  const errors = [], warnings = [];
  const E = m => errors.push(m), W = m => warnings.push(m);
  if (!p || !formatOk(p.format)) { E(`format must be "${PROFILE_FORMAT}"`); return { ok: false, errors, warnings, counts: {} }; }
  const site = p.site || {};
  for (const k of ['id', 'name', 'shortName', 'lang']) if (!site[k]) E(`site.${k} is required`);
  const mode = (site.navigation || {}).mode;
  if (!['path', 'hash', 'callback'].includes(mode)) E('site.navigation.mode must be path, hash or callback');
  const areas = (p.taxonomy || {}).areas;
  if (!Array.isArray(areas) || !areas.length) { E('taxonomy.areas must be a non-empty array'); return { ok: false, errors, warnings, counts: {} }; }
  const areaIds = new Set(), groupKeys = new Set();
  for (const a of areas) {
    if (!a.id || !a.label) E('area needs id and label'); if (areaIds.has(a.id)) E(`duplicate area id ${a.id}`); areaIds.add(a.id);
    if (a.kind && !['service', 'account'].includes(a.kind)) E(`area ${a.id}: kind must be service or account`);
    if (a.role && !['task', 'information'].includes(a.role)) E(`area ${a.id}: role must be task or information`);
    const gi = new Set(); for (const g of a.groups || []) { if (!g.id || !g.label) E(`area ${a.id}: group needs id and label`); if (gi.has(g.id)) E(`area ${a.id}: duplicate group id ${g.id}`); gi.add(g.id); groupKeys.add(a.id + '|' + g.id); }
    if (!(a.groups || []).length) W(`area ${a.id} has no groups`);
  }
  const dests = p.destinations || [], ids = new Map();
  for (const d of dests) ids.set(d.id, (ids.get(d.id) || 0) + 1);
  for (const [id, n] of ids) if (n > 1) E(`duplicate destination id ${id} (x${n})`);
  const needAnchor = mode === 'path';
  let sections = 0, routableN = 0;
  { const OK = { home: [], area: ['area', 'id'], group: ['area', 'group', 'groupLabel'], page: ['id'], section: ['id', 'index', 'anchor'] };
    for (const [k, t] of Object.entries(((site.navigation || {}).urlTemplates) || {})) { if (!OK[k]) { W(`navigation.urlTemplates.${k}: unknown template key (use ${Object.keys(OK).join(', ')})`); continue; }
      for (const m of String(t).matchAll(/\{([A-Za-z]+)\}/g)) if (!OK[k].includes(m[1])) E(`navigation.urlTemplates.${k}: unknown placeholder {${m[1]}} (allowed: ${OK[k].map(x => '{' + x + '}').join(' ') || 'none'})`); } }
  for (const d of dests) {
    if (!d.id || !d.title || !d.summary) E(`destination ${d.id || '?'}: id, title and summary are required`);
    if (!areaIds.has(d.area)) E(`${d.id}: unknown area ${d.area}`); else if (!groupKeys.has(d.area + '|' + d.group)) E(`${d.id}: group ${d.group} not in area ${d.area}`);
    if (mode !== 'hash' && !(site.navigation || {}).urlTemplates && !d.url) E(`${d.id}: url is required`);
    if (d.parent && (!ids.has(d.parent) || (dests.find(x => x.id === d.parent) || {}).area !== d.area)) E(`${d.id}: invalid parent ${d.parent}`);
    if (d.aliasOf && !ids.has(d.aliasOf)) E(`${d.id}: aliasOf ${d.aliasOf} does not exist`);
    if (d.role && !['task', 'information'].includes(d.role)) E(`${d.id}: role must be task or information`);
    const routable = d.routable !== false; if (routable) routableN++;
    if (routable && !(d.descriptions && d.descriptions.length)) W(`${d.id}: no descriptions[] (the summary alone is embedded)`);
    if (!Array.isArray(d.sections) || !d.sections.length) E(`${d.id}: at least one section is required`);
    else if (d.sections.length < 2) W(`${d.id}: only one section`);
    const si = new Set();
    (d.sections || []).forEach((x, i) => { sections++; if (!x.id || !x.label) E(`${d.id}: section ${i} needs id and label`); if (si.has(x.id)) E(`${d.id}: duplicate section id ${x.id}`); si.add(x.id);
      if (needAnchor && !x.anchor && !(site.navigation || {}).urlTemplates) E(`${d.id}/${x.id}: anchor is required in path mode`);
      for (const k of x.intents || []) if (!BUILTIN_INTENTS.has(k) && !((p.vocabulary || {}).intents || {})[k]) W(`${d.id}/${x.id}: unknown intent ${k}`); });
  }
  const dset = id => ids.has(id);
  const saved = p.savedStates || [];
  for (const x of saved) {
    if (!x.destination || !dset(x.destination)) E(`savedState ${x.id}: destination ${x.destination} does not exist`);
    if (x.ownerDestination && !dset(x.ownerDestination)) E(`savedState ${x.id}: ownerDestination ${x.ownerDestination} does not exist`);
    if (!x.synthetic) W(`savedState ${x.id}: demo profiles must set synthetic: true (no real personal data)`);
    if (x.progress && !(x.progress.step >= 0 && x.progress.step < x.progress.total)) E(`savedState ${x.id}: progress.step out of range`);
  }
  if ((p.resume || {}).fallbackDestination && !dset(p.resume.fallbackDestination)) E(`resume.fallbackDestination ${p.resume.fallbackDestination} does not exist`);
  for (const q of p.qualifiers || []) { if (!q.message || !(q.triggerTerms || []).length) E(`qualifier ${q.id}: message and triggerTerms are required`); for (const o of q.options || []) if (!dset(o)) E(`qualifier ${q.id}: option ${o} does not exist`); }
  for (const lp of (p.hints || {}).lexicalProfiles || []) { if (!dset(lp.id)) E(`lexical profile ${lp.id}: no destination`); if (lp.qualifier) for (const o of lp.qualifier.options || []) if (!dset(o)) E(`lexical profile ${lp.id}: qualifier option ${o} missing`); }
  const off = p.offTopic || []; if (off.length < 20) W(`offTopic has ${off.length} examples (20 to 60 recommended)`);
  for (const e of (p.vocabulary || {}).entities || []) for (const pat of e.patterns || []) { try { new RegExp(pat, 'g'); } catch (x) { E(`entity ${e.canonical}: bad pattern ${pat}`); } }
  return { ok: errors.length === 0, errors, warnings, counts: { areas: areas.length, destinations: dests.length, routable: routableN, sections, savedStates: saved.length, offTopic: off.length, lexicalProfiles: ((p.hints || {}).lexicalProfiles || []).length } };
}

return { createEngine, validateProfile, textsHash, MODELS, pickModel, DEFAULT_MODEL, ENGINE_VERSION, PROFILE_FORMAT, INDEX_FORMAT, PARAMS_FROZEN, labelIntents, slug };
});
