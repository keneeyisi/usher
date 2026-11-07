/*
 * Usher widget (usher-widget/0.1): the drop-in "I’m here because…" entry, command-line dialog, route strip, route walk and optional coach.
 * Re-implemented from the R6.3 interface of CivicSphereNav, against profile data only (no CivicSphere code). Lives in an open Shadow DOM so host CSS
 * cannot break it and it cannot break the host; theming crosses the boundary only through CSS custom properties (--usher-*).
 * Add to a page:  <script src="usher/usher.js" data-profile="profile.json" data-index="usher-index.json"></script>
 * Optional data-*: data-models, data-vendor (default ./models/ ./vendor/), data-hotkey ("/usher/sites/civicsphere/" default, "off"), data-compare (URL of a compare page), data-debug.
 * Host API: window.usher { ready, engine, explain, embedder, open(), close(), resolve(q), ask(q), setState(list), on(evt, fn), navigate(id, section, source),
 *   cancel(), trace, lastResult, onNavigate, onResume, html {...} }. Nothing is sent anywhere; the host decides what to do with events (analytics is the host's choice).
 */
(function () {
'use strict';
if (window.usher) return;
const SCRIPT = document.currentScript;
const attr = (k, d) => (SCRIPT && SCRIPT.getAttribute('data-' + k)) || d;
const CFG = { profile: attr('profile', 'usher-profile.json'), index: attr('index', 'usher-index.json'), models: attr('models', './models/'), vendor: attr('vendor', './vendor/'),
  hotkey: attr('hotkey', 'off'), compare: attr('compare', ''), embedder: SCRIPT && SCRIPT.src ? new URL('usher-embedder.js', SCRIPT.src).href : './usher/usher-embedder.js' };
const QS = new URLSearchParams(location.search);
const DEBUG = QS.get('debug') === '1' || attr('debug', '') === '1';
const MODEL_WAIT_MS = Number(QS.get('modelwait')) || 30000;
const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const SMOOTH = REDUCED ? 'auto' : 'smooth';
const PRE_MOVE_MS = 1500;                      // the interpretation is shown before the route starts
const STEP_MS = 600;                           // one route step
const escape = s => String(s).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

/* ---------------- state and events ---------------- */
const G = window.usher = { version: 'usher-widget/0.1', engine: null, explain: null, profile: null, embedder: null, trace: [], lastResult: null, onNavigate: null, onResume: null, ready: null, html: {} };
const listeners = {};
G.on = (evt, fn) => { (listeners[evt] = listeners[evt] || []).push(fn); return G; };
const emit = (evt, detail) => { for (const fn of listeners[evt] || []) { try { fn(detail); } catch (e) { console.warn('Usher listener error', e); } } };
const log = (type, detail) => emit('log', Object.assign({ type }, detail || {}));
let C = null, X = null, P = null, NAV = { mode: 'path' }, UI = {}, SHORT = '', PRODUCT = 'Usher';
let walkTimers = [], currentResult = null, coach = null, host = null, R = null;      // R = shadow root
const $ = id => R && R.getElementById(id);

/* ---------------- embedder status (the module does the loading) ---------------- */
const E = G.embedder = { state: 'loading', progress: 0, stage: 'Starting', loadMs: null, error: null, index: null, model: null, ready: null, embed: null, _fns: [] };
E.onchange = fn => { E._fns.push(fn); fn(E); };
E.emit = () => { for (const fn of E._fns) { try { fn(E); } catch (e) { console.warn('Usher embedder listener error', e); } } };

/* ---------------- shadow DOM ---------------- */
const CSS = /*@@CSS@@*/'';
/* Rotating placeholder examples (profile ui.placeholders, each completing "I’m here because…"; ui.placeholder is the single-example fallback).
   A new example is shown each time the panel opens; while it is open and the input is empty the example changes every PH_MS, once through the list,
   then stops (typing hides it at once). On phones (<= 480 px) the "e.g. " prefix is dropped so the example fits the input. With prefers-reduced-motion only the per-open change is used. The placeholder is never announced. */
const PH_MS = 3500;
const phList = () => { const L = Array.isArray(UI.placeholders) && UI.placeholders.length ? UI.placeholders : null; const pre = UI.placeholderPrefix == null ? 'e.g. ' : UI.placeholderPrefix, narrowPh = window.matchMedia && matchMedia('(max-width: 480px)').matches;   // phones: no "e.g." so the example fits
  return L ? L.map(x => (narrowPh ? '' : pre) + x) : [UI.placeholder || 'e.g. what brings you here?']; };
const phText = i => { const L = phList(); return L[((i % L.length) + L.length) % L.length]; };
let phIdx = -1, phTimer = null, phLeft = 0;
function setPh(i) { const el = $('nbinput'); if (!el) return; phIdx = i; el.placeholder = phText(i); el.dataset.phIndex = String(((i % phList().length) + phList().length) % phList().length); }
function phStop() { if (phTimer) { clearInterval(phTimer); phTimer = null; } }
function phStart() {
  phStop(); setPh(phIdx + 1); phLeft = phList().length - 1;
  if (REDUCED || phLeft < 1) return;
  phTimer = setInterval(() => { const el = $('nbinput'); if (!el || el.value || !$('nbpanel').classList.contains('open') || phLeft-- <= 0) { phStop(); return; } setPh(phIdx + 1); }, PH_MS);
}
function mount() {
  host = document.createElement('div'); host.id = 'usher-root'; host.setAttribute('data-usher', '');
  host.style.display = 'contents';
  (document.body.firstChild ? document.body.insertBefore(host, document.body.firstChild) : document.body.appendChild(host));
  R = host.attachShadow({ mode: 'open' });
  const pill = UI.pillLabel || 'I’m here because…', sub = UI.subline || 'Describe your situation. We’ll take you there.', ph = phText(0), hk = CFG.hotkey === 'off' ? '' : CFG.hotkey;
  const compass = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/usher/sites/civicsphere/><path d="M15.8 8.2l-2.1 5.5-5.5 2.1 2.1-5.5z" fill="currentColor"/></svg>';
  R.innerHTML = `<style>${CSS}</style>
<div id="announcer" class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"></div>
<div id="routestrip" class="routestrip" role="navigation" aria-label="Your route" hidden></div>
<div id="trace" class="navtrace" aria-hidden="true"></div>
<aside id="coach" class="coach" aria-label="Find it yourself guide" hidden></aside>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<div class="navassist">
 <div id="nbscrim" class="nbscrim" hidden></div>
 <div id="nbpanel" class="nbpanel" role="dialog" aria-modal="true" aria-labelledby="nblabel">
  <div class="nbbody">
   <div class="nbhead"><label id="nblabel" for="nbinput" class="nbprompt">${compass}<span>${escape(pill)}</span></label><button id="nbclose" class="nbclose" type="button" aria-label="Close (Esc)">×</button></div>
   <p id="nbsub" class="nbsub">${escape(sub)}</p>
   <div class="nbinput"><input id="nbinput" placeholder="${escape(ph)}" aria-describedby="nbsub" autocomplete="off" data-ph-index="0"><button id="mic" class="mic" type="button" aria-label="Voice input">●</button><button id="nbfind" class="nbfind" type="button">${escape(UI.findLabel || 'Show my route')}</button></div>
   <div id="nbstatus" class="nbstatus" data-state="loading" role="status" aria-live="polite">Preparing…</div>
   <div id="nbresult" class="nbresult"></div>
   <p class="nbfoot">${CFG.compare ? '<button class="linkbtn" type="button" id="vstoggle">Compare with site search</button>' : '<span></span>'}<span class="kbdhint"><kbd>Enter</kbd> to go · <kbd>Esc</kbd> to close</span></p>
  </div>
 </div>
 <button id="nbpill" class="pill" type="button" aria-haspopup="dialog" aria-controls="nbpanel" aria-expanded="false"${hk ? ` aria-keyshortcuts="${escape(hk)}"` : ''}>${compass}<span class="pilltext">${escape(pill)}</span>${hk ? `<kbd aria-hidden="true">${escape(hk)}</kbd>` : ''}</button>
</div>`;
  if (!document.getElementById('usher-host-style')) {
    const st = document.createElement('style'); st.id = 'usher-host-style';
    st.textContent = '[data-usher-coach-target]{outline:3px solid #f0b13b!important;outline-offset:4px;border-radius:4px;animation:usherCoachPulse 1.4s ease-in-out infinite}@keyframes usherCoachPulse{0%,100%{box-shadow:0 0 0 0 rgba(240,177,59,.7)}50%{box-shadow:0 0 0 10px rgba(240,177,59,0)}}[data-usher-highlight]{animation:usherPulse 2.4s ease both}@keyframes usherPulse{0%{box-shadow:-14px 0 0 #f0b13b}60%{box-shadow:-14px 0 0 #f0b13b}100%{box-shadow:-14px 0 0 transparent}}@media (prefers-reduced-motion:reduce){[data-usher-highlight]{animation:none;box-shadow:-14px 0 0 #f0b13b}[data-usher-coach-target]{animation:none}}';
    document.head.appendChild(st);
  }
}

/* ---------------- small UI helpers ---------------- */
function announce(t) { const a = $('announcer'); if (!a) return; a.textContent = ''; setTimeout(() => { a.textContent = t; }, 30); }
function toast(t) { const e = $('toast'); if (!e) return; e.textContent = t; e.classList.add('show'); setTimeout(() => e.classList.remove('show'), 1800); }
function setResult(html, attrs) { const out = $('nbresult'); out.innerHTML = html; out.dataset.state = attrs.state || 'done'; out.dataset.decision = attrs.decision || ''; out.dataset.destination = attrs.destination || ''; out.dataset.section = attrs.section != null ? String(attrs.section) : ''; out.dataset.navigation = ''; }
const trace = (kicker, L, active, caption, plain) => { const el = $('trace'); el.innerHTML = walkCard(kicker, L, active, caption); el.classList.add('show'); G.trace.push(plain); };
function statusText(s) { if (!s) return ['loading', 'Preparing…']; if (s.state === 'ready') return ['ready', `Meaning model ready · ${(s.model && s.model.id ? s.model.id.replace(/^[^/]*\//, '') : 'model')}, runs offline in your browser · loaded in ${(s.loadMs / 1000).toFixed(1)} s`]; if (s.state === 'failed') return ['failed', 'Meaning model unavailable · using keyword matching']; return ['loading', `Preparing… ${s.progress}% · ${s.stage}`]; }
function paintStatus() { const el = $('nbstatus'); if (!el) return; const [st, txt] = statusText(E); el.dataset.state = st; el.textContent = txt; el.title = E.error || ''; }
function setPanel(open, focus) {
  const p = $('nbpanel'), pill = $('nbpill'), was = p.classList.contains('open');
  if (!open && R.activeElement && p.contains(R.activeElement)) pill.focus();
  p.classList.toggle('open', open); $('nbscrim').hidden = !open; document.documentElement.classList.toggle('usher-open', open); pill.setAttribute('aria-expanded', String(open));
  if (open && (focus || !was)) $('nbinput').focus();
  if (open && !was) phStart(); else if (!open) phStop();
}
const panelFocusables = () => [...R.querySelectorAll('#nbpanel button,#nbpanel input,#nbpanel a[href],#nbpanel [tabindex="0"]')].filter(e => !e.disabled && e.offsetParent !== null);

/* ---------------- route display ---------------- */
const routeStrip = (L, active, opts = {}) => `<ol class="route${opts.mini ? ' mini' : ''}"${opts.label ? ` aria-label="${escape(opts.label)}"` : ''}>${L.map((x, i) => `<li class="${i < active ? 'done' : i === active ? 'active' : 'todo'}"${i === active ? ' aria-current="step"' : ''}>${escape(x.label)}</li>`).join('')}</ol>`;
const walkCard = (kicker, L, active, caption) => `<div class="tiny">${escape(kicker)}</div>${routeStrip(L, active)}<span class="walkcap">${escape(caption)}</span>`;
function stripHide() { const el = $('routestrip'); if (el) { el.hidden = true; el.innerHTML = ''; } clearRoute(); }
function stripRender(L, active, caption, walking) {
  const el = $('routestrip'); if (!el) return; const keep = $('rsextra'); const extra = keep && !walking ? keep.innerHTML : '';
  el.hidden = false; el.dataset.state = walking ? 'walking' : 'arrived';
  el.innerHTML = `<div class="rshead"><strong>Your route</strong><span class="rscap">${escape(caption)}</span>${walking ? '<button class="linkbtn" type="button" id="stripstop">Stop</button>' : ''}<button class="rsx" type="button" id="rsdismiss" aria-label="Dismiss your route">Dismiss <span aria-hidden="true">×</span></button></div><ol class="rsl">${L.map((x, i) => `<li class="${i < active ? 'done' : i === active ? 'active' : 'todo'}"${i === active ? ' aria-current="step"' : ''}><span class="rsn" aria-hidden="true">${i + 1}</span>${escape(x.label)}</li>`).join('')}</ol><div id="rsextra">${extra}</div>`;
  $('rsdismiss').onclick = () => { if (walkTimers.length) cancelWalk(); stripHide(); log('route_strip_dismissed'); emit('dismiss', {}); };
  const st = $('stripstop'); if (st) st.onclick = () => cancelWalk();
}
function cancelWalk() {
  walkTimers.forEach(clearTimeout); walkTimers = []; setWalking(false);
  const o = $('nbresult'); if (o && o.dataset.navigation !== 'complete') { o.dataset.navigation = 'cancelled'; const ns = o.querySelector('.navstage span'); if (ns) ns.textContent = 'Stopped. You can carry on browsing from here.'; }
  const sw = $('stopwalk'); if (sw) sw.remove(); $('trace').classList.remove('show'); stripHide(); announce('Navigation stopped.');
}
function setWalking(on) { document.documentElement.classList.toggle('usher-walking', on); emit('walking', { on }); }

/* ---------------- result rendering (what I understood / one route / one question) ---------------- */
const bridgeHtml = b => { if (!b) return ''; const li = []; if (b.page) li.push(`Your words “${escape(b.page.phrase)}” match how this site describes <b>${escape(b.page.label)}</b>${b.page.area ? ` (in ${escape(b.page.area)})` : ''}.`); if (b.section) li.push(`You said “${escape(b.section.phrase)}”: on this page that’s under <b>${escape(b.section.label)}</b>.`); return `<ul class="bridge" aria-label="Terminology">${li.map(x => `<li>${x}</li>`).join('')}</ul>`; };
const whyHtml = lines => lines.length ? `<div class="why"><span class="kicker">Why here</span>${lines.map(l => `<p>${escape(l)}</p>`).join('')}</div>` : '';
/* "saved escape of water claim", not "... claim claim": the kind word is added only when the subject does not already end with it */
const savedName = it => { const subj = it.subject ? it.subject.replace(/^a /, '') : it.serviceTitle, k = kindWord(it.savedId); return k && !new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i').test(subj) ? subj + ' ' + k : subj; };
const situationHtml = r => X.situation(C, r).map(it => `<div class="situation" role="note"><span class="kicker">Something of yours</span><p>You have a saved ${escape(savedName(it))} (ref ${escape(it.reference)}). Continue from step ${it.stepNo} of ${it.total}, ${escape(it.stepLabel)}?</p><button class="btn secondary situbtn" type="button" data-saved="${escape(it.savedId)}">Continue ${escape(kindWord(it.savedId))}</button></div>`).join('');
const kindWord = destId => { const s = C.SAVED.find(x => x.destination === destId); return (s && s.kind) || 'application'; };
G.html = { bridge: bridgeHtml, route: routeStrip, why: whyHtml, situation: r => (C ? situationHtml(r) : ''), escape };
function semanticDebugHtml(r) {
  const pct = x => x == null ? '–' : Math.round(x * 100) + '%'; const intents = Object.entries(r.intents || {}).map(([k, v]) => `<b>${k}</b>: ${v.map(escape).join(', ')}`).join('<br>') || 'none'; const cc = r.confidenceComponents;
  const cand = (r.candidates || []).slice(0, 6).map(c => `<tr><td><code>${c.id}</code></td><td><b>${c.score}</b><br><span class="sim">sim ${c.similarity}</span></td><td>${(c.adjustments || []).length ? escape(c.adjustments.join(', ')) + '<br>' : ''}<span class="sim">best: ${escape((c.bestText || '').slice(0, 110))} (${c.bestSim})</span></td></tr>`).join('');
  const secs = (r.sectionScores || []).map(x => `${escape(x.label)}: ${x.score} <span class="sim">(sim ${x.similarity}${x.intentHits.length ? ' · intent:' + x.intentHits.join(',') : ''}${x.keywordHits.length ? ' · kw:' + x.keywordHits.map(escape).join(',') : ''}${(x.labelHits || []).length ? ' · label:' + x.labelHits.map(escape).join(',') : ''})</span>`).join('<br>') || 'none';
  return `<div class="debugbox" id="debugbox" tabindex="0" role="region" aria-label="Debug details"><b>Debug · ${escape(r.version)} · ${r.mode === 'semantic' ? 'semantic' : 'keyword'}</b><br>decision <b>${r.decision}</b> · reason ${escape(r.reason || '')} · confidence ${pct(r.confidence)}${cc ? ` (top ${cc.top}, second ${cc.second}${cc.margin != null ? ', margin ' + cc.margin : ''})` : ''}<br>model: <code>${escape(E.model ? E.model.id + ' ' + E.model.dtype : '')}</code> · load ${E.loadMs != null ? E.loadMs + ' ms' : '–'}<br>normalised: <code>${escape(r.normalised)}</code><br><b>Intents</b><br>${intents}<br><b>Candidates</b><table><tr><th>destination</th><th>score</th><th>evidence</th></tr>${cand || '<tr><td colspan=3>none</td></tr>'}</table><b>Section scores</b><br>${secs}<br>${(r.adjustments || []).map(escape).join('<br>')}</div>`;
}
function renderDecision(r, source) {
  currentResult = r;
  const dbg = (r.fallbackNotice ? `<p class="fallbacknote" id="fallbacknote">${escape(r.fallbackNotice)}</p>` : '') + (DEBUG ? semanticDebugHtml(r) : '');
  const it = X.interpret(C, r);
  if (r.decision === 'navigate') {
    const s = C.byId(r.destinationId); const v = C.validateDestination(r.destinationId, r.sectionIndex);
    if (!v.ok) { setResult('<div class="badge">Navigation blocked</div><h3>The resolved destination failed catalogue validation.</h3>' + dbg, { decision: 'blocked' }); console.warn('Blocked invalid destination', v.error); return; }
    const L = C.routeSteps(r.destinationId, r.sectionIndex);
    setResult(`<div class="answer"><span class="kicker">What I understood</span><p class="interp">${escape(it ? it.text : '')}</p>${bridgeHtml(X.bridge(C, r))}<div class="dest"><span class="kicker">Taking you to</span><h3>${escape(s.title)}${r.sectionLabel ? ' · ' + escape(r.sectionLabel) : ''}</h3>${routeStrip(L, -1, { mini: true, label: 'Route' })}</div>${whyHtml(X.whyHere(C, r))}<div class="walkrow"><div class="navstage active"><i></i><span>Taking you there…</span></div><button class="linkbtn" type="button" id="stopwalk">Stop</button></div><p class="conf">Goal resolved · ${Math.round(r.confidence * 100)}% confidence</p></div>${dbg}`, { decision: 'navigate', destination: r.destinationId, section: r.sectionIndex });
    announce((it ? it.text + ' ' : '') + 'Taking you to ' + s.title + (r.sectionLabel ? ', ' + r.sectionLabel : '') + '.');
    walkTimers.push(setTimeout(() => navigate(r.destinationId, r.sectionIndex, source), PRE_MOVE_MS)); return;
  }
  const c = X.clarifyQuestion(r);
  if (r.decision === 'clarify') {
    const opts = c.options.length ? `<div class="optlist question" role="group" aria-labelledby="askq-h">${c.options.map(o => `<button class="optbtn" type="button" data-id="${escape(o.id)}" data-section="${o.sectionIndex == null ? '' : o.sectionIndex}"><span class="opttitle">${escape(o.title)}</span><small>${escape(o.path)}</small></button>`).join('')}</div>` : '';
    setResult(`<div class="askq"><span class="kicker">What I understood</span><p class="interp">${escape(it ? it.text : '')}</p><span class="kicker">One quick question</span><h3 id="askq-h">${escape(c.question)}</h3>${opts}<p class="mini">${c.options.length ? 'Not quite right? Describe it a different way.' : 'Add a little more detail and try again.'}</p></div>${situationHtml(r)}${dbg}`, { decision: 'clarify' });
    announce((it ? it.text + ' ' : '') + c.question + (c.options.length ? ` ${c.options.length} options.` : '')); return;
  }
  const msg = (r.clarification && r.clarification.message) || `I could not resolve that goal to a ${SHORT} destination.`;
  const ex = (UI.examples || []).slice(0, 2);
  setResult(`<div class="notice reject"><span class="kicker">What I understood</span><p class="interp">${escape(it ? it.text : '')}</p><p>${escape(msg)}</p></div>${ex.length ? `<p class="mini">You could try one of these:</p><div class="eglist">${ex.map(q => `<button class="egbtn" type="button" data-q="${escape(q)}">${escape(q.length > 60 ? q.slice(0, 57) + '…' : q)}</button>`).join('')}</div>` : ''}${dbg}`, { decision: 'reject' });
  announce(msg);
}

/* ---------------- resolving ---------------- */
async function semanticResult(q) {
  let s = E;
  if (s.state === 'loading') {
    const out = $('nbresult');
    const show = () => { if (out && out.dataset.state === 'interpreting') { const sp = out.querySelector('.navstage span'); if (sp) sp.textContent = `Preparing the meaning model… ${E.progress}%`; } }; show();
    const iv = setInterval(show, 200);
    await Promise.race([E.ready, new Promise(res => setTimeout(res, MODEL_WAIT_MS))]); clearInterval(iv);
  }
  if (E.state === 'ready') { try { const v = await E.embed(q); const r = C.resolveSemantic(q, v, E.index); return { r, source: 'semantic-resolver' }; } catch (e) { console.warn('Usher: semantic resolution failed, using keyword matching.', e); } }
  const r = C.resolveGoal(q); r.mode = 'lexical'; r.fallbackNotice = E.state === 'loading' ? 'The meaning model is still loading, so this answer used keyword matching.' : 'The meaning model is unavailable, so this answer used keyword matching.';
  return { r, source: 'lexical-fallback' };
}
async function resolveUI(q) {
  try {
    walkTimers.forEach(clearTimeout); walkTimers = []; setWalking(false);
    if (!String(q || '').trim()) { setResult(`<div class="notice">Describe the outcome you are trying to achieve, not the ${SHORT} page name.</div>`, { decision: 'empty' }); announce('Describe the outcome you are trying to achieve.'); return; }
    setResult(`<div class="badge">Interpreting goal</div><h3>${PRODUCT} is understanding what you are trying to accomplish…</h3><div class="navstage active"><i></i><span>Analysing everyday language</span></div>`, { state: 'interpreting' }); announce('Interpreting your goal…');
    await new Promise(r => setTimeout(r, 180));
    const sem = await semanticResult(q); const r = sem.r;
    G.lastResult = r; emit('decision', r);
    log('goal_interpreted', { query: q, decision: r.decision, destination: r.destinationId, section: r.sectionIndex, confidence: r.confidence, reason: r.reason, source: sem.source, mode: r.mode || 'lexical' });
    if (DEBUG) console.debug('Usher result', r);
    renderDecision(r, sem.source);
  } catch (error) {
    console.error('Usher resolver error:', error);
    setResult(`<div class="badge">Navigation fallback</div><h3>${PRODUCT} could not complete interpretation.</h3><p>Please try describing the outcome you are trying to achieve in a little more detail.</p>`, { decision: 'error' }); announce(`${PRODUCT} could not complete interpretation.`);
    log('resolver_error', { message: String(error) });
  }
}

/* ---------------- navigation and the route walk ---------------- */
const here = () => NAV.mode === 'hash' ? (location.hash || (C ? C.urlFor('home') : '#home')) : location.pathname + location.search;
function go(url, ctx) {
  if (!url) return;
  if (typeof G.onNavigate === 'function') { G.onNavigate(url, ctx || {}); return; }
  if (NAV.mode === 'callback') { console.warn('Usher: navigation.mode is callback but usher.onNavigate is not set'); return; }
  if (NAV.mode === 'hash' || url.charAt(0) === '#') { location.hash = url.charAt(0) === '#' ? url : '#' + url; return; }
  const target = new URL(url, location.href);
  if (target.pathname === location.pathname && target.search === location.search) { location.hash = target.hash; return; }
  location.assign(target.href);
}
function stepCaption(L, i) {
  const x = L[i];
  if (x.kind === 'area') { const a = C.DOMAINS.find(d => d[1] === x.label); return a && a[3] === 'account' ? 'Opening your account' : 'Entering the topic'; }
  if (x.kind === 'group') return 'Choosing the group';
  if (x.kind === 'page' && L[i + 1] && L[i + 1].kind === 'page') return 'Opening ' + x.label;
  return 'Opening the service page';
}
function navigate(id, section, source) {
  const v = C.validateDestination(id, section);
  if (!v.ok) { console.warn('Usher blocked navigation:', v.error); log('navigation_blocked', { destination: id, section, error: v.error }); toast('Destination could not be validated against the catalogue.'); const o = $('nbresult'); if (o) o.dataset.navigation = 'blocked'; return false; }
  walkTimers.forEach(clearTimeout); walkTimers = []; exitCoach(true); setPanel(false);
  const L = C.routeSteps(id, section), N = L.length, finalPath = C.pathLabels(id, section), last = finalPath[finalPath.length - 1];
  // Intermediate steps (everything between Home and the final page or section). A section is reached on the page URL plus its anchor.
  const lastPageIdx = L.map(x => x.kind).lastIndexOf('page'); const steps = L.slice(1, lastPageIdx + 1).map((x, k) => ({ x, i: k + 1, cap: stepCaption(L, k + 1), ev: x.kind === 'area' ? 'navigation_domain' : x.kind === 'group' ? 'navigation_group' : (L[k + 2] && L[k + 2].kind === 'page') ? 'navigation_parent' : 'navigation_service' }));
  const direct = (NAV.walk || (NAV.mode === 'hash' ? 'visit' : 'direct')) === 'direct';
  const finalUrl = L[N - 1].url;
  setWalking(true);
  stripRender(L, 0, 'Starting from the homepage', true); trace(PRODUCT + ' is taking you there', L, 0, 'Starting from the homepage', 'Understanding goal'); log('navigation_started', { destination: id, section, source }); emit('navigate', { id, section, source }); announce(`Taking you to ${last}. ${N - 1} steps.`);
  steps.forEach((st, k) => walkTimers.push(setTimeout(() => { if (!direct) go(st.x.url, { step: st.x, final: false }); stripRender(L, st.i, `Step ${k + 1} of ${N - 1} · ${st.cap}`, true); trace(PRODUCT + ' is taking you there', L, st.i, `Step ${k + 1} of ${N - 1} · ${st.cap}`, st.x.label); announce(`Step ${k + 1} of ${N - 1}: ${st.x.label}`); log(st.ev, { destination: id }); }, STEP_MS * (k + 1))));
  walkTimers.push(setTimeout(() => {
    saveRoute({ id, section, source, at: Date.now() });
    go(finalUrl, { step: L[N - 1], final: true });
    stripRender(L, N - 1, 'You are here: ' + last, false); trace('Found it', L, N, finalPath.join(' → '), 'FOUND: ' + finalPath.join(' → ')); setWalking(false); log('navigation_completed', { destination: id, section, source });
    const o = $('nbresult'); if (o) { o.dataset.navigation = 'complete'; const ns = o.querySelector('.navstage span'); if (ns) ns.textContent = 'Navigation complete'; const sw = $('stopwalk'); if (sw) sw.remove(); afterArrival(id, section); }
    announce(`Arrived: ${last}.${section != null ? ' The section is highlighted.' : ''}`); emit('arrive', { id, section, source });
    if (window.matchMedia && matchMedia('(max-width:760px)').matches) { setPanel(false); toast('Arrived: ' + last); }
    if (NAV.mode !== 'hash') highlightSection(id, section);
    walkTimers.push(setTimeout(() => $('trace').classList.remove('show'), 2400));
  }, STEP_MS * (steps.length + 1)));
  return true;
}
function afterArrival(id, section, restored) {
  const ex = $('rsextra'); if (!ex || ex.querySelector('.arrival')) return; const r = restored || currentResult; const box = document.createElement('div'); box.className = 'arrival';
  box.innerHTML = `<button class="btn secondary howbtn" type="button" id="howbtn">Show me how to find this myself next time</button>${r && r.decision === 'navigate' ? situationHtml(r) : ''}`;
  ex.appendChild(box); box.querySelector('#howbtn').onclick = () => startCoach(id, section);
}
function highlightSection(id, section) {
  if (section == null) return; const x = C.byId(id).sections[section]; if (!x || !x.anchor) return;
  setTimeout(() => { const e = document.getElementById(String(x.anchor).replace(/^#/, '')); if (!e) return; e.scrollIntoView({ behavior: SMOOTH, block: 'center' }); e.setAttribute('data-usher-highlight', '1'); setTimeout(() => e.removeAttribute('data-usher-highlight'), 3000); }, 200);
}
/* Route persistence across full page loads (multi-page sites): the strip re-appears in its "arrived" state on the destination page. */
const KEY = 'usher.route', CKEY = 'usher.coach';
function saveRoute(o) { if (SITE_PERSIST() && NAV.mode !== 'hash') { try { const r = currentResult || {}; sessionStorage.setItem(KEY, JSON.stringify(Object.assign(o, { result: { decision: r.decision, destinationId: r.destinationId, sectionIndex: r.sectionIndex, sectionLabel: r.sectionLabel, reason: r.reason, candidates: (r.candidates || []).slice(0, 3).map(c => ({ id: c.id })), clarification: r.clarification ? { options: (r.clarification.options || []).map(x => ({ id: x.id })) } : null } }))); } catch (e) { /* storage unavailable */ } } }
function clearRoute() { try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
const SITE_PERSIST = () => (P.site.persistence || 'session') !== 'none';
function restoreRoute() {
  if (NAV.mode === 'hash' || !SITE_PERSIST()) return;
  let o; try { o = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { o = null; } if (!o || Date.now() - o.at > 30 * 60 * 1000) return;
  const s = C.byId(o.id); if (!s) return;
  const L = C.routeSteps(o.id, o.section), fin = L[L.length - 1].url; const f = new URL(fin, location.href); if (f.pathname !== location.pathname) return;   // only on the destination page
  const finalPath = C.pathLabels(o.id, o.section); stripRender(L, L.length - 1, 'You are here: ' + finalPath[finalPath.length - 1], false); afterArrival(o.id, o.section, o.result); highlightSection(o.id, o.section); log('route_restored', { destination: o.id });
}

/* ---------------- optional coach: replays the route as real menu clicks (needs the links to exist on the host pages) ---------------- */
function coachSteps(id, section) {
  const L = C.routeSteps(id, section), st = [];
  const CT = UI.coachTexts || {};
  for (let i = 1; i < L.length; i++) {
    const x = L[i], prev = L[i - 1]; let text;
    if (x.kind === 'area') text = (C.DOMAINS.find(d => d[1] === x.label) || [])[3] === 'account' ? (CT.account || `Find “${x.label}” in the header or menu.`) : `On the homepage, choose “${x.label}”.`;
    else if (x.kind === 'section') text = (CT.section || 'In “Contents”, choose “{label}”.').replace('{label}', x.label);
    else if (x.kind === 'page' && prev.kind === 'page') text = `Open “${x.label}”.`;
    else text = `Choose “${x.label}”.`;
    st.push({ at: prev.url, href: x.url, text, prefix: x.kind === 'page' && prev.kind === 'page' });
  }
  return st;
}
const sameUrl = (a, b) => a === b || (() => { try { return new URL(a, location.href).href === new URL(b, location.href).href; } catch (e) { return false; } })();
function coachTarget(step) { const as = [...document.querySelectorAll('a[href]')].filter(a => { const h = a.getAttribute('href') || ''; return step.prefix ? h.startsWith(step.href) : sameUrl(h, step.href); }); return as.find(a => a.offsetParent !== null) || as[0] || null; }
function startCoach(id, section) {
  cancelWalk(); exitCoach(true); const steps = coachSteps(id, section); coach = { id, section, steps, i: 0, final: C.routeSteps(id, section).slice(-1)[0].url }; setPanel(false);
  $('coach').hidden = false; log('coach_started', { destination: id, section }); saveCoach();
  if (!sameUrl(here(), steps[0].at) && !(NAV.mode === 'hash' && location.hash === steps[0].at)) go(steps[0].at); else showCoach();
}
function saveCoach() { try { if (coach && NAV.mode !== 'hash') sessionStorage.setItem(CKEY, JSON.stringify({ id: coach.id, section: coach.section })); else sessionStorage.removeItem(CKEY); } catch (e) { /* ignore */ } }
function showCoach() {
  if (!coach) return; const box = $('coach'); document.querySelectorAll('[data-usher-coach-target]').forEach(e => { e.removeAttribute('data-usher-coach-target'); e.classList.remove('coach-target'); });
  const atFinal = sameUrl(here(), coach.final) || (NAV.mode === 'hash' && location.hash === coach.final);
  if (atFinal || coach.i >= coach.steps.length) { const path = C.routeSteps(coach.id, coach.section).map(x => x.label).join(' › '); box.innerHTML = `<p class="kicker">Find it yourself</p><p id="coachtext"><b>That’s the route.</b> Next time, follow the same menus: ${escape(path)}.</p><div class="coachbtns"><button class="btn primary" type="button" id="coachdone">Done</button></div>`; $('coachdone').onclick = () => exitCoach(); $('coachdone').focus(); announce('That is the route. ' + C.routeSteps(coach.id, coach.section).map(x => x.label).join(', then ')); return; }
  const st = coach.steps[coach.i]; const t = coachTarget(st);
  box.innerHTML = `<p class="kicker">Find it yourself · step ${coach.i + 1} of ${coach.steps.length}</p><p id="coachtext">${escape(st.text)}${t ? '' : ' (link not visible on this page)'}</p><div class="coachbtns"><button class="btn primary" type="button" id="coachnext">${t ? 'Do it for me' : 'Next'}</button><button class="linkbtn" type="button" id="coachstop">Stop</button></div>`;
  $('coachnext').onclick = () => { coach.i++; go(st.href); }; $('coachstop').onclick = () => exitCoach();
  if (t) { t.setAttribute('data-usher-coach-target', '1'); t.classList.add('coach-target'); t.scrollIntoView({ behavior: SMOOTH, block: 'center' }); setTimeout(() => t.focus({ preventScroll: true }), REDUCED ? 0 : 250); }
  announce(`Step ${coach.i + 1} of ${coach.steps.length}. ${st.text}`);
}
function coachOnRoute() {
  if (!coach) return; const h = here(); const atFinal = sameUrl(h, coach.final) || (NAV.mode === 'hash' && location.hash === coach.final);
  const idx = coach.steps.findIndex(s => sameUrl(s.at, h) || (NAV.mode === 'hash' && s.at === location.hash));
  if (atFinal) coach.i = coach.steps.length; else if (idx >= 0) coach.i = idx; else { exitCoach(true); return; }
  setTimeout(showCoach, 60);
}
function exitCoach(silent) { document.querySelectorAll('[data-usher-coach-target]').forEach(e => { e.removeAttribute('data-usher-coach-target'); e.classList.remove('coach-target'); }); const box = $('coach'); if (box) { box.hidden = true; box.innerHTML = ''; } if (coach && !silent) announce('Guide closed.'); coach = null; saveCoach(); }
function restoreCoach() { if (NAV.mode === 'hash') return; let o; try { o = JSON.parse(sessionStorage.getItem(CKEY) || 'null'); } catch (e) { o = null; } if (!o || !C.byId(o.id)) return; coach = { id: o.id, section: o.section, steps: coachSteps(o.id, o.section), i: 0, final: C.routeSteps(o.id, o.section).slice(-1)[0].url }; $('coach').hidden = false; coachOnRoute(); }

/* ---------------- voice (optional) ---------------- */
function voice() { const Speech = window.SpeechRecognition || window.webkitSpeechRecognition; if (!Speech) { toast('Voice input is not supported by this browser.'); return; } const r = new Speech(); r.lang = (P.site.lang) || 'en-GB'; r.onresult = e => { $('nbinput').value = e.results[0][0].transcript; resolveUI(e.results[0][0].transcript); }; r.start(); toast('Listening… describe what you need.'); log('voice_started'); }

/* ---------------- wiring ---------------- */
function wire() {
  const vt = $('vstoggle'); if (vt) vt.onclick = () => { setPanel(false); go(CFG.compare); };
  $('nbpill').onclick = () => setPanel(!$('nbpanel').classList.contains('open'), true);
  $('nbclose').onclick = () => { setPanel(false); $('nbpill').focus(); }; $('nbscrim').onclick = () => { setPanel(false); $('nbpill').focus(); };
  $('nbfind').onclick = () => resolveUI($('nbinput').value); $('mic').onclick = voice; $('nbinput').onkeydown = e => { if (e.key === 'Enter') resolveUI(e.target.value); }; $('nbinput').addEventListener('input', phStop);
  $('nbresult').addEventListener('click', e => {
    const sb = e.target.closest('.situbtn'); if (sb) { log('situation_continue', { saved: sb.dataset.saved }); resume(sb.dataset.saved); return; }
    const eg = e.target.closest('.egbtn'); if (eg) { $('nbinput').value = eg.dataset.q; resolveUI(eg.dataset.q); return; }
    if (e.target.closest('#stopwalk')) { cancelWalk(); return; }
    const b = e.target.closest('.optbtn'); if (!b) return; const sec = b.dataset.section === '' ? null : Number(b.dataset.section);
    log('clarification_option_chosen', { destination: b.dataset.id, section: sec }); navigate(b.dataset.id, sec, 'clarification-choice');
  });
  $('routestrip').addEventListener('click', e => { const sb = e.target.closest('.situbtn'); if (sb) { log('situation_continue', { saved: sb.dataset.saved }); resume(sb.dataset.saved); } });
  document.addEventListener('keydown', e => {
    const open = $('nbpanel').classList.contains('open');
    if (e.key === 'Escape' && coach) { exitCoach(); return; }
    if (e.key === 'Escape' && open) { setPanel(false); $('nbpill').focus(); return; }
    if (CFG.hotkey !== 'off' && e.key === CFG.hotkey && !e.ctrlKey && !e.metaKey && !e.altKey && !open) { const t = (e.composedPath && e.composedPath()[0]) || e.target, tag = t && t.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return; e.preventDefault(); setPanel(true, true); return; }
    if (e.key === 'Tab' && open) { const f = panelFocusables(); if (!f.length) return; const first = f[0], lastEl = f[f.length - 1]; if (!$('nbpanel').contains(R.activeElement)) { e.preventDefault(); first.focus(); } else if (e.shiftKey && R.activeElement === first) { e.preventDefault(); lastEl.focus(); } else if (!e.shiftKey && R.activeElement === lastEl) { e.preventDefault(); first.focus(); } }
  });
  window.addEventListener('hashchange', () => { if (coach) coachOnRoute(); });
  if (DEBUG) { $('nbpanel').classList.add('debug'); setPanel(true); }
}
function resume(destId) { const s = C.SAVED.find(x => x.destination === destId); if (typeof G.onResume === 'function') { G.onResume(s || { destination: destId }); return; } if (s) go(s.resumeUrl || C.urlFor('page', s.destination)); }

/* ---------------- public API ---------------- */
G.open = () => { if (R) setPanel(true, true); };
G.close = () => { if (R) setPanel(false); };
G.cancel = () => cancelWalk();
G.ask = q => { if (!R) return; setPanel(true); $('nbinput').value = q; return resolveUI(q); };
G.resolve = async q => (await semanticResult(q)).r;
G.semanticResult = semanticResult;
G.navigate = (id, section, source) => navigate(id, section == null ? null : section, source || 'api');
G.takeMeThere = (r, source) => { setPanel(true); currentResult = r; const s = C.byId(r.destinationId), it = X.interpret(C, r);
  setResult(`<div class="answer"><p class="interp">${escape(it ? it.text : '')}</p><div class="dest"><span class="kicker">Taking you to</span><h3>${escape(s.title)}${r.sectionLabel ? ' · ' + escape(r.sectionLabel) : ''}</h3></div><div class="walkrow"><div class="navstage active"><i></i><span>Taking you there…</span></div></div></div>`, { decision: 'navigate', destination: r.destinationId, section: r.sectionIndex });
  return navigate(r.destinationId, r.sectionIndex, source || 'api'); };
G.setState = list => { if (C) C.setSavedStates(list || []); };
G.walking = () => document.documentElement.classList.contains('usher-walking');
G.showCard = (html, plain) => { if (!R) return; const el = $('trace'); el.innerHTML = html; el.classList.add('show'); G.trace.push(plain); };  // host actions (e.g. start a task) reuse the floating card
G.hideCard = () => { if (R) $('trace').classList.remove('show'); };
G.log = log;

/* ---------------- start ---------------- */
async function loadProfile() { const resp = await fetch(CFG.profile); if (!resp.ok) throw new Error(`${CFG.profile}: HTTP ${resp.status}`); return resp.json(); }
G.ready = (async () => {
  if (!window.Usher || !Usher.createEngine) throw new Error('Usher engine missing');
  P = await loadProfile(); G.profile = P;
  C = G.engine = Usher.createEngine(P); X = G.explain = Usher.createExplain(P);
  NAV = (P.site || {}).navigation || NAV; UI = P.ui || {}; SHORT = (P.site || {}).shortName || ''; PRODUCT = ((P.site || {}).scope || {}).productName || 'Usher'; E.model = C.MODEL;
  if (!document.body) await new Promise(r => document.addEventListener('DOMContentLoaded', r));
  mount(); wire(); E.onchange(() => { paintStatus(); if (E.state !== 'loading' && !E._logged) { E._logged = 1; log('model_' + E.state, { loadMs: E.loadMs, error: E.error }); } });
  restoreRoute(); restoreCoach(); emit('ready', G);
  // load the meaning model (a separate module so a failure falls back to keyword matching)
  import(CFG.embedder).then(m => m.run(E, { engine: C, index: CFG.index, models: CFG.models, vendor: CFG.vendor, params: QS })).catch(err => { E.state = 'failed'; E.error = String(err && err.message || err); E.stage = 'Unavailable'; E.embed = null; E.ready = Promise.resolve(E); console.warn('Usher: embedder module did not load; using keyword matching.', E.error); E.emit(); });
  return G;
})();
E.ready = new Promise(res => { const iv = setInterval(() => { if (E.state !== 'loading') { clearInterval(iv); res(E); } }, 50); });
G.ready.catch(err => console.error('Usher failed to start:', err));
})();
