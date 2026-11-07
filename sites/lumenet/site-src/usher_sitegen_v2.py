#!/usr/bin/env python3
"""Usher demo-site generator, v2 visual themes (Insura: corporate consulting; Lumenet: consumer telecom).
usage: usher_sitegen_v2.py <content_dir> <out_dir> <usher_template_build_dir> <image_dir with *.webp + credits.json>
Parsing, profile, section ids and search docs are identical to usher_sitegen.py (v1); only page markup and CSS differ.
content_dir: NN_*.txt authored content (DSL below) + meta.json. One source -> pages, profile, search index, sitemap (so they cannot drift apart).
DSL:  =AREA id | Label | description | service|account      =GROUP id | Label (belongs to the last AREA)
      #id | Title | group | summary | alias;alias | desc ;; desc        - Section label :: body
"""
import sys, os, re, json, glob, shutil, html
src, out, tpl, imgdir = sys.argv[1:5]
meta = json.load(open(os.path.join(src, 'meta.json')))
def slug(s): return re.sub(r'^-|-$', '', re.sub(r'[^a-z0-9]+', '-', s.lower()))
areas, dests, cur_area, cur = [], [], None, None
for f in sorted(glob.glob(os.path.join(src, '[0-9][0-9]_*.txt'))):
    for ln, line in enumerate(open(f, encoding='utf8'), 1):
        line = line.rstrip('\n')
        if not line.strip(): continue
        if line.startswith('=AREA'):
            p = [x.strip() for x in line[5:].split('|')]; cur_area = {'id': p[0], 'label': p[1], 'description': p[2], 'kind': p[3], 'groups': []}; areas.append(cur_area)
        elif line.startswith('=GROUP'):
            p = [x.strip() for x in line[6:].split('|')]; cur_area['groups'].append({'id': p[0], 'label': p[1]})
        elif line.startswith('#'):
            p = [x.strip() for x in line[1:].split('|')]
            assert len(p) == 6, f'{f}:{ln}: expected 6 fields, got {len(p)}'
            cur = {'id': p[0], 'title': p[1], 'area': cur_area['id'], 'group': p[2], 'summary': p[3], 'aliases': [a.strip() for a in p[4].split(';') if a.strip()], 'descriptions': [d.strip() for d in p[5].split(';;') if d.strip()], 'sections': []}
            dests.append(cur)
        elif line.startswith('- '):
            label, body = [x.strip() for x in line[2:].split('::', 1)]
            cur['sections'].append({'label': label, 'body': body})
        else: raise SystemExit(f'{f}:{ln}: cannot parse: {line[:60]}')
byid = {d['id']: d for d in dests}
parents = meta.get('parents', {})
areaby = {a['id']: a for a in areas}
for d in dests:
    d['url'] = f"/p/{d['id']}.html"
    ids = set()
    for s in d['sections']:
        s['id'] = slug(s['label']); assert s['id'] not in ids, f"duplicate section id {d['id']}/{s['id']}"; ids.add(s['id']); s['anchor'] = s['id']
    assert d['group'] in [g['id'] for g in areaby[d['area']]['groups']], f"{d['id']}: unknown group {d['group']}"
    if d['id'] in parents: d['parent'] = parents[d['id']]
    if d['id'].split('-')[1:2] == ['saved'] or '-saved-' in d['id']: d['kind'] = 'saved'
    else: d['kind'] = 'account' if areaby[d['area']]['kind'] == 'account' else 'information'
# ---------- profile ----------
T = {"home": "/index.html", "area": "/{area}.html", "group": "/{area}.html#{group}", "page": "/p/{id}.html", "section": "/p/{id}.html#{anchor}"}
profile = {"format": "usher-profile/0.1",
 "site": {"id": meta['id'], "name": meta['name'], "shortName": meta['shortName'], "lang": "en-GB",
   "navigation": {"mode": "path", "urlTemplates": T},
   "scope": {"noun": meta['noun'], "productName": "Usher", "rejectMessage": meta['rejectMessage']}, "persistence": "session", "synthetic": True},
 "taxonomy": {"areas": areas},
 "destinations": [{k: v for k, v in d.items()} for d in dests],
 "savedStates": meta['saved'], "resume": {"fallbackDestination": meta['fallbackResume']},
 "vocabulary": {"entities": [], "savedNoun": meta['savedNoun'], "intents": meta['intents'], "sectionTemplates": {},
   "explain": {"subjects": {d['id']: d['title'].lower() for d in dests}, "howto": {}, "situations": []}},
 "qualifiers": meta['qualifiers'], "offTopic": meta['offTopic'], "hints": {"lexicalProfiles": []},
 "ui": {"pillLabel": "I want to\u2026", "placeholder": meta['placeholder'], "hotkey": "/", "examples": meta['examples']}}
os.makedirs(out, exist_ok=True)
for sub in ('usher', 'models', 'vendor', 'tools'):
    if os.path.exists(os.path.join(out, sub)): shutil.rmtree(os.path.join(out, sub))
    shutil.copytree(os.path.join(tpl, sub), os.path.join(out, sub), ignore=shutil.ignore_patterns('src', '__pycache__'))
os.makedirs(os.path.join(out, 'tests/vendor'), exist_ok=True); shutil.copy(os.path.join(tpl, 'tests/vendor/axe.min.js'), os.path.join(out, 'tests/vendor/axe.min.js'))
os.makedirs(os.path.join(out, 'assets/fonts'), exist_ok=True)
for f in glob.glob(os.path.join(tpl, 'assets/fonts/*')): shutil.copy(f, os.path.join(out, 'assets/fonts'))
os.makedirs(os.path.join(out, 'site-src'), exist_ok=True)
for f in glob.glob(os.path.join(src, '*.txt')) + [os.path.join(src, 'meta.json')]: shutil.copy(f, os.path.join(out, 'site-src'))
shutil.copy(sys.argv[0], os.path.join(out, "site-src", "usher_sitegen_v2.py"))
json.dump(profile, open(os.path.join(out, 'usher-profile.json'), 'w'), indent=1, ensure_ascii=False)
# ---------- search index (visible text only) ----------
E = html.escape
sdocs = [{"id": d['id'], "title": d['title'], "area": areaby[d['area']]['label'], "group": next(g['label'] for g in areaby[d['area']]['groups'] if g['id'] == d['group']), "summary": d['summary'], "url": d['url'],
          "sections": [{"anchor": s['anchor'], "label": s['label'], "body": s['body']} for s in d['sections']]} for d in dests]
json.dump(sdocs, open(os.path.join(out, 'search-docs.json'), 'w'), ensure_ascii=False)
# ---------- v2 common ----------
name = meta['name']; SID = meta['id']
SEARCH_JS = open(os.path.join(os.path.dirname(os.path.abspath(sys.argv[0])), 'usher_site_search.js')).read()
open(os.path.join(out, 'assets/site-search.js'), 'w').write(SEARCH_JS)
# images (verified CC0, local copies only)
credits = json.load(open(os.path.join(imgdir, 'credits.json')))
for c in credits: c['file'] = os.path.basename(c['file'])
os.makedirs(os.path.join(out, 'vendor/images'), exist_ok=True)
for c in credits: shutil.copy(os.path.join(imgdir, c['file']), os.path.join(out, 'vendor/images', c['file']))
json.dump(credits, open(os.path.join(out, 'vendor/images/credits.json'), 'w'), indent=1, ensure_ascii=False)
IMG = {c['file'].rsplit('.', 1)[0]: c for c in credits}
def img(key, cls='', alt='', eager=False):
    c = IMG[key]
    return f'<img class="{cls}" src="/vendor/images/{c["file"]}" width="{c["width"]}" height="{c["height"]}" alt="{E(alt)}"{"" if eager else " loading=\"lazy\""} decoding="async">'
ICONS = {
 'car': '<path d="M5 11l1.6-4.2A2 2 0 018.5 5.5h7a2 2 0 011.9 1.3L19 11"/><path d="M3 11h18v6H3z"/><path d="M6 17v2.5M18 17v2.5"/><circle cx="7.5" cy="14" r=".6"/><circle cx="16.5" cy="14" r=".6"/>',
 'home': '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
 'plane': '<path d="M10.5 21l1.5-5.5-7-2.5v-2l7 1.5V5a1.5 1.5 0 013 0v7.5l7-1.5v2l-7 2.5 1.5 5.5z"/>',
 'paw': '<circle cx="6.5" cy="10" r="1.7"/><circle cx="10" cy="6.5" r="1.7"/><circle cx="14.5" cy="6.5" r="1.7"/><circle cx="18" cy="10" r="1.7"/><path d="M12.2 12c-2.8 0-5.7 3.6-5.7 6 0 1.6 1.5 2 3 1.6s1.8-.5 2.7-.5 1.4.1 2.7.5 3-.1 3-1.6c0-2.4-2.9-6-5.7-6z"/>',
 'heart': '<path d="M12 20s-7.5-4.6-7.5-10.2A4 4 0 0112 7.4a4 4 0 017.5 2.4C19.5 15.4 12 20 12 20z"/>',
 'shield': '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
 'briefcase': '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 13h18"/>',
 'doc': '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
 'refresh': '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>',
 'edit': '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
 'help': '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 014.9.6c0 2-2.5 2.2-2.5 4"/><path d="M12 17.2v.1"/>',
 'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
 'arrow': '<path d="M5 12h14M13 6l6 6-6 6"/>',
 'arrowur': '<path d="M7 17L17 7M8.5 7H17v8.5"/>',
 'chev': '<path d="M9 6l6 6-6 6"/>',
 'down': '<path d="M6 9l6 6 6-6"/>',
 'search': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 'check': '<path d="M5 12.5l4.5 4.5L19 7"/>',
 'wifi': '<path d="M2.5 9a14 14 0 0119 0M5.5 12.5a9.5 9.5 0 0113 0M8.7 16a5 5 0 016.6 0"/><path d="M12 19.3v.2"/>',
 'phone': '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
 'tv': '<rect x="2.5" y="5" width="19" height="12.5" rx="2"/><path d="M8 21h8M12 17.5V21"/>',
 'tool': '<path d="M14.5 6.5a4 4 0 005 5l-8.3 8.3a2 2 0 01-2.9-2.9L16.6 8.6"/><path d="M14.5 6.5L17 4l3 3-2.5 2.5"/>',
 'truck': '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
 'card': '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
 'router': '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 13L5 6.5M17 13l2-6.5"/><path d="M7 16.5v.1M10.5 16.5v.1"/>',
 'lock': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
 'cart': '<path d="M3 4h2.2l2.4 11h10.8L21 8H6.6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
 'mail': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
 'menu': '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
 'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'star': '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
 'play': '<path d="M8 5.5l11 6.5-11 6.5z"/>',
 'speed': '<path d="M4 17a8 8 0 1116 0"/><path d="M12 17l4-5"/>',
 'people': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5c2.4 0 4 1.5 4.5 4"/>',
 'globe': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/>',
 'quote': '<path d="M9 7H6a2 2 0 00-2 2v3h5v5H4M20 7h-3a2 2 0 00-2 2v3h5v5h-5"/>',
}
def ic(n, cls='ic'):
    return f'<svg class="{cls}" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{ICONS[n]}</svg>'
def write(rel, content):
    p = os.path.join(out, rel); os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w', encoding='utf8').write(content)
def D(i): return byid[i]
def glabel(a, gid): return next(g['label'] for g in a['groups'] if g['id'] == gid)
saved_by_dest = {s['destination']: s for s in meta['saved']}
WIDGET = '<script src="/usher/usher.js" data-profile="/usher-profile.json" data-index="/usher-index.json" data-models="/models/" data-vendor="/vendor/" data-compare="/compare.html"></script>'
FONTS = '''@font-face{font-family:"Source Sans 3";src:url(fonts/source-sans-3-latin-400-normal.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Source Sans 3";src:url(fonts/source-sans-3-latin-400-italic.woff2) format("woff2");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"Source Sans 3";src:url(fonts/source-sans-3-latin-600-normal.woff2) format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"Source Sans 3";src:url(fonts/source-sans-3-latin-700-normal.woff2) format("woff2");font-weight:700;font-display:swap}
'''
NAV_JS = '''<script>(function(){var mq=window.matchMedia('(max-width:61.99rem)');var m=document.getElementById('menu');if(m&&mq.matches)m.removeAttribute('open');
var dds=[].slice.call(document.querySelectorAll('details.dd'));dds.forEach(function(d){d.addEventListener('toggle',function(){if(d.open&&!mq.matches)dds.forEach(function(o){if(o!==d)o.removeAttribute('open')})})});
document.addEventListener('click',function(e){if(mq.matches)return;dds.forEach(function(d){if(d.open&&!d.contains(e.target))d.removeAttribute('open')})});
document.addEventListener('keydown',function(e){if(e.key==='Escape')dds.forEach(function(d){if(d.open){d.removeAttribute('open');d.querySelector('summary').focus()}})});
[].slice.call(document.querySelectorAll('form[data-proto]')).forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();var s=f.querySelector('.formstatus');if(s)s.textContent='Thank you. This is a fictional prototype, so nothing was sent and nothing was stored.'})});
})()</script>'''
SJ = '<script src="/assets/site-search.js"></script><script>(function(){var q=new URLSearchParams(location.search).get("q")||"";var box=document.getElementById("sq");box.value=q;var out=document.getElementById("res");if(!q.trim()){out.innerHTML="<p>Type a word or phrase to search the site.</p>";return}fetch("/search-docs.json").then(function(r){return r.json()}).then(function(docs){var s=SiteSearch.build(docs);var hits=s.search(q,10);if(!hits.length){out.innerHTML="<p>No results for <strong>"+SiteSearch.escape(q)+"</strong>. Try different words.</p>";return}out.innerHTML="<p class=\\"rcount\\">"+hits.length+" results for <strong>"+SiteSearch.escape(q)+"</strong></p><ol class=\\"results\\">"+hits.map(function(h){var d=h.doc;var url=d.url+(h.sectionAnchor?"#"+h.sectionAnchor:"");return "<li><a href=\\""+url+"\\">"+SiteSearch.escape(d.title)+"</a><div class=\\"sub\\">"+SiteSearch.escape(d.area)+" &rsaquo; "+SiteSearch.escape(d.group)+"</div><div>"+SiteSearch.escape(d.summary)+"</div></li>"}).join("")+"</ol>"})})()</script>'
CJ = r'''<script src="/assets/site-search.js"></script><script>(function(){
var form=document.getElementById('cf'),input=document.getElementById('cq'),L=document.getElementById('cl'),R=document.getElementById('cr'),docs=null,S=null;
var esc=SiteSearch.escape;
function run(q){ if(!q.trim())return;
 L.innerHTML='<p>Searching&hellip;</p>';R.innerHTML='<p>Usher is working&hellip;</p>';
 (docs?Promise.resolve(docs):fetch('/search-docs.json').then(function(r){return r.json()})).then(function(d){docs=d;S=S||SiteSearch.build(d);var h=S.search(q,5);
  L.innerHTML=h.length?'<ol class="results">'+h.map(function(x){return '<li><a href="'+x.doc.url+(x.sectionAnchor?'#'+x.sectionAnchor:'')+'">'+esc(x.doc.title)+'</a><div class="sub">'+esc(x.doc.area)+' &rsaquo; '+esc(x.doc.group)+'</div></li>'}).join('')+'</ol>':'<p>No results.</p>';});
 window.usher.ready.then(function(){return window.usher.semanticResult(q)}).then(function(res){var r=res.r,G=window.usher,C=G.engine,h='';
  var it=G.explain.interpret(C,r); if(it&&it.text)h+='<p><em>'+esc(it.text)+'</em></p>';
  if(r.decision==='navigate'){var L2=C.routeSteps(r.destinationId,r.sectionIndex);h+='<p><strong>Go to:</strong> '+L2.map(function(x){return esc(x.label)}).join(' &rsaquo; ')+'</p><p><button class="btn" id="tmt" type="button">Take me there</button></p>'}
  else if(r.decision==='clarify'){h+='<p><strong>One question first:</strong> '+esc(r.clarification&&r.clarification.message||'')+'</p><ul>'+((r.clarification&&r.clarification.options)||[]).map(function(o){return '<li>'+esc(o.title||o.label||o.id)+'</li>'}).join('')+'</ul>'}
  else h+='<p>'+esc(C.SCOPE?C.SCOPE.rejectMessage:'No match.')+'</p>';
  R.innerHTML=h;var b=document.getElementById('tmt');if(b)b.onclick=function(){G.takeMeThere(r,'compare')};}).catch(function(e){R.innerHTML='<p>Usher could not run: '+esc(String(e))+'</p>'});}
form.onsubmit=function(e){e.preventDefault();history.replaceState(null,'','?q='+encodeURIComponent(input.value));run(input.value)};
var q0=new URLSearchParams(location.search).get('q');if(q0){input.value=q0;run(q0)};})()</script>'''
def credits_table():
    rows = ''.join(f'<tr><td><img src="/vendor/images/{c["file"]}" width="120" height="{round(120*c["height"]/c["width"])}" alt="" loading="lazy"></td><td><strong>{E(c["title"])}</strong><br><code>vendor/images/{E(c["file"])}</code></td><td>{E(c["photographer"])}</td><td><a href="{E(c["sourceUrl"])}">{E(c["sourceUrl"].replace("https://", ""))}</a></td><td><a href="{E(c["licenceUrl"])}">{E(c["licence"].split(",")[0])}</a></td></tr>' for c in credits)
    return (f'<p>Every photograph on this fictional site is a free stock photo from <strong>StockSnap.io</strong>, released under the <strong>Creative Commons CC0 1.0 Universal (public domain dedication)</strong>. The licence was checked on each photo&rsquo;s own source page (its structured data and the &ldquo;CC0 license&rdquo; notice) on 19 October 2026 before the image was downloaded. CC0 allows free commercial and non-commercial use without attribution; we credit the photographers anyway.</p>'
            '<p>The images were resized and converted to WebP and are served from this site only (no hotlinking). People in the photos are models in stock photography and are not connected with this fictional company. No brand, logo or watermark from the design references is used.</p>'
            f'<div class="tablewrap"><table class="credits"><caption class="visually-hidden">Image credits</caption><thead><tr><th scope="col">Image</th><th scope="col">Title and file</th><th scope="col">Photographer</th><th scope="col">Source page</th><th scope="col">Licence</th></tr></thead><tbody>{rows}</tbody></table></div>'
            '<p>Fonts: Source Sans 3 (SIL Open Font License 1.1). Icons: drawn for this prototype.</p>')
# =====================================================================
# INSURA theme: modern corporate consulting (warm off-white, plum, deep teal, orange accent)
# =====================================================================
def build_insura():
    SHORT = {'car': 'Car', 'home': 'Home', 'travel': 'Travel', 'life': 'Life', 'pet': 'Pet', 'claims': 'Claims', 'renewals': 'Renewals', 'changes': 'Changes', 'help': 'Help', 'account': 'My Insura'}
    AICON = {'car': 'car', 'home': 'home', 'travel': 'plane', 'life': 'heart', 'pet': 'paw', 'claims': 'doc', 'renewals': 'refresh', 'changes': 'edit', 'help': 'help', 'account': 'user'}
    AIMG = {'car': 'car', 'home': 'home', 'travel': 'travel', 'life': 'life', 'pet': 'pet', 'claims': 'weather', 'renewals': 'family', 'changes': 'business', 'help': 'testimonial', 'account': 'account'}
    CSS = FONTS + '''
:root{--plum:#5f0f40;--plum-d:#430a2d;--plum-t:#f4e6ee;--teal:#0f4c5c;--teal-d:#0a3540;--teal-t:#e3eff1;--orange:#fb8b24;--orange-h:#e36414;--orange-t:#fff0e0;--crimson:#9a031e;--crimson-t:#fbe9ec;
--bg:#faf6f1;--card:#fff;--ink:#241a20;--muted:#5a4d54;--line:#e6dcd3;--r-lg:28px;--r:18px;--r-sm:12px;
--usher-accent:#5f0f40;--usher-accent-dark:#430a2d;--usher-accent-tint:#f4e6ee;--usher-highlight:#fb8b24;--usher-highlight-tint:#fff0e0;--usher-link:#0f4c5c;--usher-text:#241a20;--usher-muted:#5a4d54;--usher-border:#e0d3ca;--usher-soft:#faf6f1;--usher-radius:14px;--usher-font:"Source Sans 3",system-ui,sans-serif}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;font:1.0625rem/1.6 "Source Sans 3",system-ui,sans-serif;color:var(--ink);background:var(--bg)}
img{max-width:100%;height:auto;display:block}
a{color:var(--teal);text-underline-offset:3px}a:hover{color:var(--plum)}
:focus-visible{outline:3px solid var(--plum);outline-offset:3px;box-shadow:0 0 0 6px var(--orange);border-radius:6px}
.visually-hidden{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.skip{position:absolute;left:-999px;top:0;background:#fff;color:var(--plum);padding:.6rem 1rem;z-index:50;border-radius:0 0 12px 0}.skip:focus{left:0}
.wrap{max-width:76rem;margin:0 auto;padding:0 1rem}
h1,h2,h3{font-weight:400;letter-spacing:-.015em;line-height:1.15;color:var(--plum);margin:0 0 .6rem}
h1{font-size:2.15rem}h2{font-size:1.85rem}h3{font-size:1.25rem;font-weight:600;letter-spacing:0}
h1 strong,h2 strong{font-weight:700}
p{margin:0 0 1rem}.lead{font-size:1.15rem;color:var(--muted)}.muted{color:var(--muted)}
.eyebrow{display:inline-flex;align-items:center;gap:.5rem;font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--teal);margin:0 0 .6rem}
.eyebrow::before{content:"";width:.55rem;height:.55rem;border-radius:50%;background:var(--orange);display:inline-block}
.ic{width:1.35rem;height:1.35rem;flex:none}
/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.55rem;min-height:48px;padding:.7rem 1.5rem;border-radius:999px;border:2px solid transparent;background:var(--orange);color:var(--ink);font:inherit;font-weight:700;text-decoration:none;cursor:pointer;line-height:1.2}
.btn:hover{background:var(--orange-h);color:var(--ink)}
.btn .ic{width:1.15rem;height:1.15rem}
.btn-plum{background:var(--plum);color:#fff}.btn-plum:hover{background:var(--plum-d);color:#fff}
.btn-light{background:transparent;color:#fff;border-color:rgba(255,255,255,.85)}.btn-light:hover{background:#fff;color:var(--plum)}
.btn-claim{background:var(--crimson);color:#fff}.btn-claim:hover{background:#7a0218;color:#fff}
.arrow-c{display:inline-grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:50%;background:var(--orange);color:var(--ink);flex:none;transition:transform .2s,background .2s}
.arrow-c .ic{width:1.1rem;height:1.1rem}
a:hover .arrow-c,.arrow-c:hover{background:var(--orange-h);transform:rotate(-45deg)}
/* prototype strip + header */
.proto{background:var(--plum);color:#fff;font-size:.88rem;padding:.4rem 0}.proto a{color:#fff}
header.site{background:#fff;border-bottom:1px solid var(--line);position:relative;z-index:30}
.bar{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem 1rem;padding:.75rem 0}
.brand{display:flex;align-items:center;gap:.6rem;font-size:1.6rem;font-weight:700;color:var(--plum);text-decoration:none;letter-spacing:-.02em;margin-right:auto}
.brand .mark{display:inline-grid;place-items:center;width:2.4rem;height:2.4rem;border-radius:12px 50% 50% 50%;background:var(--plum);color:#fff;font-size:1.2rem}
.brand .mark i{font-style:normal}.brand small{display:block;font-size:.72rem;font-weight:400;color:var(--muted);letter-spacing:0;line-height:1.1}
nav.main{order:5;flex:1 1 100%}
nav.main>details>summary{display:inline-flex;align-items:center;gap:.4rem;min-height:44px;padding:.4rem 1rem;border:2px solid var(--plum);border-radius:999px;color:var(--plum);font-weight:700;cursor:pointer;list-style:none}
nav.main summary::-webkit-details-marker{display:none}
nav.main ul{list-style:none;margin:0;padding:0}
nav.main>details>ul{margin-top:.5rem;border-top:1px solid var(--line)}
nav.main a,nav.main .dd>summary{display:flex;align-items:center;gap:.3rem;padding:.65rem .4rem;color:var(--ink);text-decoration:none;font-weight:600;border-radius:999px;cursor:pointer;list-style:none;min-height:44px}
nav.main a:hover,nav.main .dd>summary:hover{color:var(--plum);background:var(--plum-t)}
nav.main a[aria-current]{color:var(--plum);box-shadow:inset 0 -3px 0 var(--orange);border-radius:0}
.dd>summary .ic{width:1rem;height:1rem;transition:transform .2s}.dd[open]>summary .ic{transform:rotate(180deg)}
.dd ul{padding-left:1rem!important}
form.search{display:flex;align-items:center;flex:1 1 100%;order:4;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:.2rem .25rem .2rem 1rem}
form.search input{flex:1;min-width:0;border:0;background:transparent;font:inherit;padding:.45rem 0;color:var(--ink)}
form.search input:focus-visible{outline:none;box-shadow:none}
form.search:focus-within{outline:3px solid var(--plum);outline-offset:2px}
form.search button{display:inline-grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:50%;border:0;background:var(--plum);color:#fff;cursor:pointer}
@media(max-width:39.99rem){.bar .brand small{display:none}}.hdr-cta{display:flex;gap:.5rem;order:3}
.hdr-cta .btn{min-height:44px;padding:.5rem 1.1rem;font-size:.95rem}
@media(max-width:30rem){.hdr-cta .btn-q{display:none}}
/* sections */
main{display:block}main:focus{outline:none}
.sec-i{padding:3.5rem 0}
.head-row{display:grid;gap:1rem;margin-bottom:1.8rem}.head-row p{margin:0}
/* hero */
.hero-i{padding:1rem 0 0}
.hero-card{position:relative;border-radius:var(--r-lg);overflow:hidden;min-height:30rem;display:flex;align-items:flex-end;background:var(--plum-d)}
.hero-card>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero-card .ov{position:relative;padding:2rem 1.25rem 1.5rem;color:#fff;width:100%;background:linear-gradient(180deg,rgba(36,10,28,.25) 0%,rgba(36,10,28,.88) 45%,rgba(36,10,28,.94) 100%)}
.hero-card h1{color:#fff;font-size:2.6rem;font-weight:400;max-width:15ch}.hero-card h1 strong{font-weight:700}
.hero-card .lead{color:#fff;max-width:36rem}
.hero-card .eyebrow{color:#fff}
.actions{display:flex;flex-wrap:wrap;gap:.75rem;margin:1.2rem 0 1rem}
.usher-tip{font-size:.95rem;color:#fff;margin:0}.usher-tip kbd,.tipcard kbd{font:inherit;font-weight:700;border:1px solid currentColor;border-radius:6px;padding:0 .4rem}
.hero-chip{display:none}
/* mosaic */
.mosaic{display:grid;gap:1rem;grid-template-columns:1fr}
.m-card{position:relative;border-radius:var(--r-lg);padding:1.6rem;min-height:15rem;display:flex;flex-direction:column;justify-content:flex-end;gap:.6rem;text-decoration:none;color:var(--ink);overflow:hidden;background:var(--card)}
.m-card h3{font-size:1.45rem;font-weight:400;color:inherit;margin:0}.m-card p{margin:0}
.m-card .arrow-c{position:absolute;top:1.2rem;right:1.2rem}
.m-text{border:1px solid var(--line)}.m-text h3{color:var(--plum)}
.m-accent{background:var(--orange);color:var(--ink)}.m-accent .arrow-c{background:var(--ink);color:#fff}.m-accent:hover{background:var(--orange-h);color:var(--ink)}
.m-plum{background:var(--plum);color:#fff}.m-plum .big{font-size:3.4rem;line-height:1;font-weight:300}.m-plum .big strong{font-weight:700}
.m-teal{background:var(--teal);color:#fff}.m-teal h3{color:#fff}
.m-photo{color:#fff;min-height:18rem}.m-photo>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .5s}
.m-photo:hover>img{transform:scale(1.04)}.m-photo:hover{color:#fff}
.m-photo .cap{position:relative;background:linear-gradient(0deg,rgba(36,10,28,.92),rgba(36,10,28,.72));margin:-1.6rem;padding:1.4rem 1.6rem}
.m-photo h3{color:#fff}
/* service tiles */
.tiles{display:grid;gap:1rem;grid-template-columns:1fr;list-style:none;margin:0;padding:0}
.tile{position:relative;display:flex;flex-direction:column;justify-content:flex-end;min-height:22rem;border-radius:var(--r-lg);overflow:hidden;color:#fff;text-decoration:none;background:var(--teal-d)}
.tile>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .5s}.tile:hover>img{transform:scale(1.05)}
.tile .badge-ic{position:absolute;top:1rem;left:1rem;display:grid;place-items:center;width:3.2rem;height:3.2rem;border-radius:50%;background:var(--teal);color:#fff;box-shadow:0 0 0 5px rgba(255,255,255,.35)}
.tile .badge-ic .ic{width:1.5rem;height:1.5rem}
.tile .cap{position:relative;padding:1.3rem 1.3rem 1.3rem;background:linear-gradient(0deg,rgba(10,30,38,.95) 0%,rgba(10,30,38,.85) 70%,rgba(10,30,38,0) 100%);padding-top:3rem;display:flex;align-items:flex-end;gap:.8rem}
.tile .cap span.t{display:block;font-size:1.4rem;font-weight:400}.tile .cap span.d{display:block;font-size:.95rem;opacity:.95}
.tile .cap div{flex:1}.tile:hover{color:#fff}
/* dark band with notch */
.band{position:relative;background:var(--plum);color:#fff;border-radius:var(--r-lg) var(--r-lg) 0 0;margin-top:2.5rem;padding:4rem 0 3rem}
.band::before{content:"";position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:11rem;height:1.6rem;background:var(--bg);border-radius:0 0 1.6rem 1.6rem}
.band h2,.band h3{color:#fff}.band .eyebrow{color:#fff}
.feat{display:grid;gap:1rem;grid-template-columns:1fr;list-style:none;margin:0;padding:0}
.feat a{display:flex;flex-direction:column;gap:.7rem;height:100%;padding:1.5rem;border-radius:var(--r);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);color:#fff;text-decoration:none}
.feat a:hover{background:rgba(255,255,255,.16);color:#fff}
.feat .fi{display:grid;place-items:center;width:3rem;height:3rem;border-radius:50%;background:var(--orange);color:var(--ink)}
.feat h3{margin:0;font-size:1.2rem}.feat p{margin:0;font-size:.98rem}
.stats{display:grid;gap:1.5rem 1rem;grid-template-columns:1fr 1fr;margin:3rem 0 1rem;padding:2rem 0 0;border-top:1px solid rgba(255,255,255,.25);list-style:none}
.stats b{display:block;font-size:2.6rem;font-weight:300;line-height:1}.stats b strong{font-weight:700}.stats span{font-size:.95rem}
.fineprint{font-size:.88rem;opacity:.95;margin:0}
.band-teal{background:var(--teal);border-radius:0}
.band-teal::before{display:none}
/* chevron list */
.chev-wrap{display:grid;gap:2rem}
.chev{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.chev li{border-bottom:1px solid var(--line)}
.chev a{display:flex;align-items:center;gap:1rem;padding:1rem .25rem;text-decoration:none;color:var(--ink);min-height:44px}
.chev a:hover{color:var(--plum);background:#fff}
.chev a .t{flex:1;font-weight:600;font-size:1.08rem}.chev a .t small{display:block;font-weight:400;color:var(--muted);font-size:.95rem}
.chev .cc{display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;border:1.5px solid var(--plum);color:var(--plum);flex:none}.chev .cc .ic{width:1rem;height:1rem}
.chev a:hover .cc{background:var(--orange);border-color:var(--orange);color:var(--ink)}
.chev .ai{display:grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:50%;background:var(--teal-t);color:var(--teal);flex:none}
/* testimonial */
.testi{position:relative;border-radius:var(--r-lg);overflow:hidden;min-height:26rem;display:flex;align-items:flex-end;background:var(--teal-d)}
.testi>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.testi blockquote{position:relative;margin:1rem;background:#fff;border-radius:var(--r);padding:1.5rem;max-width:34rem}
.testi blockquote p{font-size:1.25rem;line-height:1.45;color:var(--plum)}
.testi footer{color:var(--muted);font-size:.95rem}.testi .stars{display:flex;gap:.15rem;color:var(--plum);margin-bottom:.6rem}.testi .stars .ic{width:1.1rem;height:1.1rem;fill:var(--orange)}
.qmark{display:grid;place-items:center;font-size:2.6rem;line-height:1;padding-top:.7rem;font-weight:700;width:3rem;height:3rem;border-radius:50%;background:var(--orange);color:var(--ink);margin-bottom:.8rem}
/* insights */
.ins{display:grid;gap:1.2rem;grid-template-columns:1fr;list-style:none;margin:0;padding:0}
.ins a{display:flex;flex-direction:column;height:100%;background:#fff;border-radius:var(--r-lg);overflow:hidden;text-decoration:none;color:var(--ink);border:1px solid var(--line)}
.ins img{width:100%;aspect-ratio:16/10;object-fit:cover}
.ins .b{padding:1.3rem 1.4rem 1.5rem;display:flex;flex-direction:column;gap:.5rem;flex:1}
.ins .tag{align-self:flex-start;background:var(--teal-t);color:var(--teal);border-radius:999px;padding:.15rem .7rem;font-size:.82rem;font-weight:700}
.ins h3{color:var(--plum);font-size:1.25rem;font-weight:600;margin:0}.ins p{margin:0;color:var(--muted)}
.ins .more{margin-top:auto;display:flex;align-items:center;gap:.6rem;font-weight:700;color:var(--teal);padding-top:.5rem}.ins .more .arrow-c{width:2.2rem;height:2.2rem}
.ins a:hover{border-color:var(--plum)}
/* partners */
.partners{display:flex;flex-wrap:wrap;justify-content:center;gap:.8rem 2.2rem;list-style:none;margin:0;padding:1.5rem 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.partners li{display:flex;align-items:center;gap:.5rem;color:var(--muted);font-weight:700;font-size:1.1rem;letter-spacing:.02em}
.partners .pm{display:inline-block;width:1.3rem;height:1.3rem;border-radius:50%;border:3px solid var(--teal)}.partners li:nth-child(2n) .pm{border-radius:4px;border-color:var(--plum)}.partners li:nth-child(3n) .pm{border-radius:2px 50%;border-color:var(--muted)}
/* connect */
.connect{display:grid;gap:0;border-radius:var(--r-lg);overflow:hidden;background:#fff;border:1px solid var(--line)}
.connect .ph{min-height:16rem;position:relative}.connect .ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.connect form{padding:1.6rem}
.field{display:flex;flex-direction:column;gap:.3rem;margin-bottom:1rem}
.field label{font-weight:600}
.field input,.field select,.field textarea{font:inherit;color:var(--ink);background:var(--bg);border:1.5px solid #8f8088;border-radius:14px;padding:.7rem .9rem;min-height:48px;width:100%}
.field textarea{min-height:7rem;resize:vertical}
.frow{display:grid;gap:0 1rem}
.formstatus{font-weight:600;color:var(--teal);margin:.8rem 0 0}
.news{background:var(--orange);color:var(--ink);border-radius:var(--r-lg);padding:1.8rem 1.4rem;display:grid;gap:1rem;align-items:center}
.news h2{color:var(--ink);font-size:1.6rem;margin:0}.news p{margin:0}
.news form{display:flex;flex-wrap:wrap;gap:.6rem}.news .field{flex:1 1 14rem;margin:0}.news .field input{background:#fff;border-color:var(--ink)}
.news .formstatus{color:var(--ink);flex-basis:100%;margin:0}
/* page hero (hubs, services, utility pages) */
.phero{padding:1rem 0 0}
.phero-card{display:grid;border-radius:var(--r-lg);overflow:hidden;background:var(--plum);color:#fff}
.phero-card .txt{padding:1.6rem 1.25rem 1.8rem}
.phero-card h1{color:#fff;font-size:2.2rem;margin-bottom:.5rem}
.phero-card .lead{color:#fff;margin:0}
.phero-card .eyebrow{color:#fff}
.phero-card .ph{position:relative;min-height:11rem}.phero-card .ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.phero-card .ph .badge-ic{position:absolute;left:1rem;bottom:1rem;display:grid;place-items:center;width:3.4rem;height:3.4rem;border-radius:50%;background:var(--teal);color:#fff;box-shadow:0 0 0 5px rgba(255,255,255,.4)}
.phero-teal .phero-card{background:var(--teal)}
.crumbs{font-size:.92rem;margin:0 0 .9rem}.crumbs ol{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.2rem .45rem}
.crumbs li{display:flex;align-items:center;gap:.45rem}.crumbs li+li::before{content:"/";opacity:.7}
.phero .crumbs a{color:#fff}
.jump{display:flex;flex-wrap:wrap;gap:.5rem;margin:1.2rem 0 0;padding:0;list-style:none}
.jump a{display:inline-flex;align-items:center;min-height:40px;padding:.35rem .95rem;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.5);color:#fff;text-decoration:none;font-size:.95rem;font-weight:600}
.jump a:hover{background:#fff;color:var(--plum)}
.grp{padding:2.4rem 0 .4rem;scroll-margin-top:1rem}
.grp:target h2{box-shadow:inset 0 -6px 0 var(--orange-t)}
.cgrid{display:grid;gap:1rem;grid-template-columns:1fr;list-style:none;margin:0;padding:0}
.cgrid a{position:relative;display:flex;flex-direction:column;gap:.45rem;height:100%;padding:1.4rem 1.4rem 1.4rem;padding-right:4.5rem;background:#fff;border-radius:var(--r);border:1px solid var(--line);text-decoration:none;color:var(--ink);min-height:8.5rem}
.cgrid a h3{color:var(--plum);margin:0;font-size:1.15rem}.cgrid a p{margin:0;color:var(--muted);font-size:.98rem}
.cgrid a .arrow-c{position:absolute;top:1.1rem;right:1.1rem;width:2.3rem;height:2.3rem}
.cgrid a:hover{border-color:var(--plum);box-shadow:0 10px 30px rgba(95,15,64,.1)}
.cgrid li:first-child a{background:var(--plum-t);border-color:transparent}
.sb{display:inline-flex;align-items:center;gap:.35rem;align-self:flex-start;border-radius:999px;padding:.1rem .65rem;font-size:.8rem;font-weight:700;letter-spacing:.03em}
.sb-claim{background:var(--crimson);color:#fff}.sb-quote{background:var(--teal);color:#fff}
/* service page */
.svc{display:grid;gap:2rem;padding-top:2rem;padding-bottom:3rem}
.toc{background:#fff;border-radius:var(--r);border:1px solid var(--line);padding:1.2rem 1.3rem}
.toc h2{font-size:1rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--teal);margin:0 0 .5rem}
.toc ol{list-style:none;margin:0;padding:0;counter-reset:t}
.toc li{counter-increment:t}
.toc a{display:flex;gap:.6rem;align-items:baseline;padding:.45rem 0;min-height:24px;color:var(--ink);text-decoration:none;font-weight:600}
.toc a::before{content:counter(t,decimal-leading-zero);font-size:.85rem;color:var(--plum);font-weight:700}
.toc a:hover{color:var(--plum);text-decoration:underline}
.side{display:flex;flex-direction:column;gap:1rem}
.tipcard{background:var(--teal);color:#fff;border-radius:var(--r);padding:1.3rem}.tipcard h2{color:#fff;font-size:1.2rem;font-weight:600}.tipcard p{margin:0}
.claimcard{background:var(--crimson-t);border-radius:var(--r);padding:1.3rem;border:1px solid #e9c4cc}.claimcard h2{font-size:1.2rem;font-weight:600;color:var(--crimson)}.claimcard p{margin:0 0 .8rem}
section.sec{background:#fff;border-radius:var(--r);border:1px solid var(--line);padding:1.4rem 1.4rem .6rem;margin-bottom:1rem;scroll-margin-top:1rem;display:grid;grid-template-columns:auto 1fr;gap:0 1rem}
section.sec .n{display:grid;place-items:center;width:2.4rem;height:2.4rem;border-radius:50%;background:var(--plum-t);color:var(--plum);font-weight:700;font-size:.95rem}
section.sec h2{font-size:1.4rem;font-weight:600;margin:.25rem 0 .5rem}
section.sec:target{border:2px solid var(--orange);box-shadow:0 0 0 6px var(--orange-t)}
section.sec:target .n{background:var(--orange);color:var(--ink)}
.state{background:#fff;border-radius:var(--r);border:2px solid var(--crimson);padding:1.3rem;margin:0 0 1.2rem}
.state.quote{border-color:var(--teal)}
.state h2{font-size:1.25rem;font-weight:600;margin:.5rem 0 .3rem}
.prog{height:.6rem;background:var(--plum-t);border-radius:999px;overflow:hidden;margin:.7rem 0 .4rem}.prog i{display:block;height:100%;background:var(--orange);border-radius:999px}
.sub{color:var(--muted);font-size:.92rem}
.related{margin-top:2rem}.related h2{font-size:1.5rem}
.prose{background:#fff;border-radius:var(--r-lg);border:1px solid var(--line);padding:1.6rem 1.4rem;margin:2rem 0 3rem}
.prose h2{font-size:1.5rem;margin-top:1rem}
/* search / compare */
.sform{display:flex;flex-wrap:wrap;gap:.6rem;align-items:flex-end}.sform .field{flex:1 1 16rem;margin:0}
.rcount{color:var(--muted)}
.results{list-style:none;margin:1rem 0 0;padding:0;display:grid;gap:.7rem}
.results li{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:1rem 1.2rem}
.results a{font-weight:700;font-size:1.1rem;color:var(--plum)}.results .sub{margin:.15rem 0 .3rem}
.cmp{display:grid;gap:1rem;grid-template-columns:1fr;margin-top:1.5rem}
.cmp>div{background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:1.3rem}
.cmp>div:last-child{border:2px solid var(--plum)}
.cmp h2{font-size:1.3rem;font-weight:600}.cmp .results li{border-radius:12px;background:var(--bg)}
.tablewrap{overflow-x:auto;border-radius:var(--r);border:1px solid var(--line);background:#fff}
table.credits{border-collapse:collapse;width:100%;min-width:42rem;font-size:.95rem}
table.credits th,table.credits td{text-align:left;vertical-align:top;padding:.7rem .8rem;border-bottom:1px solid var(--line)}
table.credits th{background:var(--plum-t);color:var(--plum)}
table.credits img{border-radius:10px;width:120px;height:auto}
table.credits a{overflow-wrap:anywhere}
/* footer */
.pre-foot{padding:0 0 3rem}
footer.site{background:var(--plum-d);color:#fff;padding:3.5rem 0 6.5rem;border-radius:var(--r-lg) var(--r-lg) 0 0}
footer.site a{color:#fff;text-decoration:none}footer.site a:hover{text-decoration:underline;color:#fff}
.fcols{display:grid;gap:2rem;grid-template-columns:1fr}
.fcols h2{color:#fff;font-size:1rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin:0 0 .8rem}
.fcols ul{list-style:none;margin:0;padding:0}.fcols li{margin:0 0 .15rem}.fcols li a{display:inline-block;padding:.3rem 0;min-height:24px}
.fbrand .brand{color:#fff;margin:0 0 .8rem}.fbrand .brand .mark{background:var(--orange);color:var(--ink)}.fbrand .brand small{color:#fff}
.fbottom a{text-decoration:underline!important}.fbottom{margin-top:2.5rem;padding-top:1.2rem;border-top:1px solid rgba(255,255,255,.25);font-size:.9rem;display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;justify-content:space-between}
@media(min-width:40rem){
 h1{font-size:2.7rem}h2{font-size:2.2rem}
 .mosaic{grid-template-columns:1fr 1fr}.tiles{grid-template-columns:1fr 1fr}.feat{grid-template-columns:1fr 1fr}.stats{grid-template-columns:repeat(4,1fr)}
 .ins{grid-template-columns:1fr 1fr}.cgrid{grid-template-columns:1fr 1fr}.frow{grid-template-columns:1fr 1fr}.fcols{grid-template-columns:1fr 1fr}
 .hero-card h1{font-size:3.4rem}.head-row{grid-template-columns:1.2fr 1fr;align-items:end}
 .testi blockquote{margin:2rem}.news{grid-template-columns:1fr 1.2fr;padding:2rem 2.4rem}.cmp{grid-template-columns:1fr 1fr}
 form.search{flex:0 1 17rem;order:2}
}
@media(min-width:62rem){form.search{flex:0 1 13rem}.bar .brand small{display:none}}@media(min-width:62rem) and (max-width:74.99rem){.hdr-cta .btn-q{display:none}}
@media(min-width:62rem){
 nav.main{order:1;flex:0 1 auto;margin:0 auto}nav.main>details>summary{display:none}nav.main>details>ul{display:flex;align-items:center;gap:.1rem;margin:0;border:0}
 nav.main a,nav.main .dd>summary{padding:.5rem .8rem}
 .brand{margin-right:0}
 .dd{position:relative}.dd ul{position:absolute;top:calc(100% + .5rem);right:0;min-width:15rem;background:#fff;border:1px solid var(--line);border-radius:var(--r);box-shadow:0 18px 40px rgba(36,10,28,.14);padding:.5rem!important}
 .dd ul a{border-radius:12px}
 .hero-card{min-height:37rem;align-items:center}
 .hero-card .ov{align-self:stretch;display:flex;flex-direction:column;justify-content:center;padding:3rem;background:linear-gradient(90deg,rgba(36,10,28,.92) 0%,rgba(36,10,28,.78) 45%,rgba(36,10,28,.1) 75%)}
 .hero-card h1{font-size:4.3rem}
 .hero-chip{display:flex;align-items:center;gap:.8rem;position:absolute;right:1.6rem;bottom:1.6rem;background:#fff;color:var(--ink);border-radius:var(--r);padding:.9rem 1.1rem;max-width:17rem;font-size:.95rem}
 .hero-chip .fi{display:grid;place-items:center;width:2.8rem;height:2.8rem;border-radius:50%;background:var(--orange);flex:none}
 .mosaic{grid-template-columns:repeat(4,1fr);grid-auto-rows:16rem;grid-auto-flow:dense}.m-tall{grid-row:span 2}.m-wide{grid-column:span 2}
 .tiles{grid-template-columns:repeat(3,1fr)}.tile{min-height:26rem}
 .feat{grid-template-columns:repeat(4,1fr)}.stats b{font-size:3.6rem}
 .chev-wrap{grid-template-columns:1fr 1.4fr;align-items:start}
 .testi{min-height:32rem;justify-content:flex-end}.testi blockquote{margin:2.5rem}
 .ins{grid-template-columns:repeat(3,1fr)}.cgrid{grid-template-columns:repeat(3,1fr)}
 .connect{grid-template-columns:1fr 1.1fr}.connect form{padding:2.4rem}
 .phero-card{grid-template-columns:1.35fr 1fr}.phero-card .txt{padding:2.6rem}.phero-card h1{font-size:3rem}
 .svc{grid-template-columns:18rem 1fr;align-items:start}.side{position:sticky;top:1rem}
 .fcols{grid-template-columns:1.6fr 1fr 1fr 1fr}
}
@media(max-width:61.99rem){nav.main details:not([open])>ul{display:none}.dd ul{position:static}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
'''
    open(os.path.join(out, 'assets/site.css'), 'w').write(CSS)
    logo = '<span class="mark" aria-hidden="true"><i>I</i></span>'
    def crumbs(items, cls=''):
        li = ''.join(f'<li><a href="{u}">{E(t)}</a></li>' if u else f'<li><span aria-current="page">{E(t)}</span></li>' for t, u in items)
        return f'<nav class="crumbs" aria-label="Breadcrumb"><ol>{li}</ol></nav>'
    def layout(title, body, cur=None, extra_script=''):
        main_ids = ['car', 'home', 'travel', 'life', 'pet', 'claims']
        more = [a for a in areas if a['id'] not in main_ids]
        def li(a): return f'<li><a href="/{a["id"]}.html"{" aria-current=\"page\"" if cur == a["id"] else ""}>{E(SHORT[a["id"]])}</a></li>'
        nav = ''.join(li(areaby[i]) for i in main_ids)
        nav += f'<li><details class="dd"><summary>More{ic("down")}</summary><ul>' + ''.join(li(a) for a in more) + '</ul></details></li>'
        foot_cover = ''.join(f'<li><a href="/{a["id"]}.html">{E(a["label"])}</a></li>' for a in areas[:5])
        foot_sup = ''.join(f'<li><a href="/{a["id"]}.html">{E(a["label"])}</a></li>' for a in areas[5:])
        return f'''<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)} - {name}</title><meta name="description" content="{name} (fictional {meta['noun']}): research prototype for Usher.">
<meta name="theme-color" content="#5f0f40"><link rel="stylesheet" href="/assets/site.css"></head><body>
<a class="skip" href="#main">Skip to main content</a>
<header class="site"><div class="proto"><div class="wrap"><strong>Research prototype.</strong> {name} is fictional. All products, prices, people and contact details are invented. <a href="/about.html">About</a></div></div>
<div class="wrap bar"><a class="brand" href="/index.html">{logo}<span>{name}<small>{E(meta['tagline'])}</small></span></a>
<nav class="main" aria-label="Main"><details open id="menu"><summary>{ic("menu")}Menu</summary><ul>{nav}</ul></details></nav>
<form class="search" role="search" aria-label="Site search" action="/search.html" method="get"><label class="visually-hidden" for="q">Search this site</label><input id="q" name="q" type="search" placeholder="Search {name}" autocomplete="off"><button type="submit">{ic("search")}<span class="visually-hidden">Search</span></button></form>
<div class="hdr-cta"><a class="btn btn-claim" href="/claims.html">Make a claim</a><a class="btn btn-q" href="/renewals.html">Get a quote</a></div></div></header>
<main id="main" tabindex="-1">{body}</main>
<footer class="site"><div class="wrap"><div class="fcols"><div class="fbrand"><a class="brand" href="/index.html">{logo}<span>{name}<small>{E(meta['tagline'])}</small></span></a><p>Plain-English cover and help when things go wrong. Claims line (fictional): {E(meta['phone'])}, open 24 hours.</p></div>
<div><h2>Cover</h2><ul>{foot_cover}</ul></div><div><h2>Support</h2><ul>{foot_sup}</ul></div>
<div><h2>Company</h2><ul><li><a href="/about.html">About</a></li><li><a href="/careers.html">Careers</a></li><li><a href="/press.html">Press</a></li><li><a href="/privacy.html">Privacy</a></li><li><a href="/cookies.html">Cookies</a></li><li><a href="/accessibility.html">Accessibility statement</a></li><li><a href="/compare.html">Compare with site search</a></li><li><a href="/credits.html">Image credits</a></li></ul></div></div>
<div class="fbottom"><p>&copy; 2026 {name} (fictional). Not a real insurer.</p><p>Photos: StockSnap, CC0 (<a href="/credits.html">credits</a>). Fonts: Source Sans 3 (SIL OFL).</p></div></div></footer>
{NAV_JS}
{WIDGET}
{extra_script}</body></html>
'''
    def phero(eyebrow, title, lead, crumbs_html='', imgkey=None, icon=None, extra='', teal=False):
        ph = f'<div class="ph">{img(imgkey, eager=True)}' + (f'<span class="badge-ic">{ic(icon)}</span>' if icon else '') + '</div>' if imgkey else ''
        return f'<section class="phero{" phero-teal" if teal else ""}"><div class="wrap"><div class="phero-card"><div class="txt">{crumbs_html}<p class="eyebrow">{E(eyebrow)}</p><h1>{title}</h1><p class="lead">{E(lead)}</p>{extra}</div>{ph}</div></div></section>'
    A = '<span class="arrow-c">' + ic('arrowur') + '</span>'
    CH = '<span class="cc">' + ic('chev') + '</span>'
    # ---------- home ----------
    tiles_def = [('car', '/car.html', 'Car insurance', 'Comprehensive, third party and add-ons'), ('home', '/home.html', 'Home insurance', 'Buildings, contents and landlords'), ('travel', '/travel.html', 'Travel insurance', 'Single trip, annual and winter sports'),
                 ('pet', '/pet.html', 'Pet insurance', 'Lifetime, time-limited and accident only'), ('life', '/life.html', 'Life insurance', 'Life, critical illness and income'), ('business', '/p/car-business-use.html', 'Business use', 'Using your car for work')]
    tico = {'car': 'car', 'home': 'home', 'travel': 'plane', 'pet': 'paw', 'life': 'heart', 'business': 'briefcase'}
    tiles = ''.join(f'<li><a class="tile" href="{u}">{img(k)}<span class="badge-ic">{ic(tico[k])}</span><div class="cap"><div><span class="t">{E(t)}</span><span class="d">{E(dsc)}</span></div>{A}</div></a></li>' for k, u, t, dsc in tiles_def)
    feats = [('clock', '/p/help-opening-times.html', 'Claims line open 24/7', 'Report an incident any time of day, then follow it online.'), ('doc', '/p/claim-track.html', 'Track every claim', 'See each step of your claim and what we need from you next.'),
             ('shield', '/p/car-ncd-protect.html', 'Protect your discount', 'Keep your no-claims discount even after a claim.'), ('people', '/p/help-vulnerable.html', 'Extra support', 'Tell us if you need more time, a different format or a helper.')]
    feat = ''.join(f'<li><a href="{u}"><span class="fi">{ic(i)}</span><h3>{E(t)}</h3><p>{E(dsc)}</p></a></li>' for i, u, t, dsc in feats)
    chev_items = [('renewals', '/renewals.html'), ('changes', '/changes.html'), ('help', '/help.html'), ('account', '/account.html')]
    chev = ''.join(f'<li><a href="{u}"><span class="ai">{ic(AICON[k])}</span><span class="t">{E(areaby[k]["label"])}<small>{E(areaby[k]["description"])}</small></span>{CH}</a></li>' for k, u in chev_items)
    chev += ''.join(f'<li><a href="{D(i)["url"]}"><span class="ai">{ic(AICON[D(i)["area"]])}</span><span class="t">{E(D(i)["title"])}<small>{E(D(i)["summary"])}</small></span>{CH}</a></li>' for i in ['claim-track', 'pay-direct-debit', 'help-complaint'])
    insights = [('weather', 'home-frozen-pipes', 'Winter home'), ('insight3', 'travel-winter-sports', 'Travel'), ('insight2', 'help-fraud-report', 'Staying safe')]
    ins = ''.join(f'<li><a href="{D(i)["url"]}">{img(k)}<div class="b"><span class="tag">{E(tag)}</span><h3>{E(D(i)["title"])}</h3><p>{E(D(i)["summary"])}</p><span class="more">Read the guide{A}</span></div></a></li>' for k, i, tag in insights)
    partners = ['Quillmere Repairs', 'Brackenfold Assist', 'Tarnwick Glass', 'Lowmoor Legal', 'Fennaway Vets', 'Orrinby Motors']
    part = ''.join(f'<li><span class="pm" aria-hidden="true"></span>{E(p)}</li>' for p in partners)
    topics = ''.join(f'<option>{E(a["label"])}</option>' for a in areas)
    home = f'''<section class="hero-i"><div class="wrap"><div class="hero-card">{img("hero", eager=True)}<div class="ov"><p class="eyebrow">Fictional insurer &middot; research prototype</p>
<h1>Insurance, <strong>explained.</strong></h1><p class="lead">{E(meta["heroSub"])}</p>
<p class="actions"><a class="btn" href="#cover">Find your cover {ic("arrow")}</a><a class="btn btn-light" href="/claims.html">Make a claim</a></p>
<p class="usher-tip">Not sure where to start? Use the <strong>I want to&hellip;</strong> button at the bottom of the screen (or press <kbd>/</kbd>) and describe what you are trying to do.</p></div>
<div class="hero-chip"><span class="fi">{ic("clock")}</span><span><strong>Claims line 24/7</strong><br>Fictional number {E(meta["phone"])}</span></div></div></div></section>
<section class="sec-i"><div class="wrap"><div class="head-row"><div><p class="eyebrow">Why {name}</p><h2>Cover that <strong>explains itself</strong></h2></div><p class="muted">Every policy page says what is covered, what is not and what to do next, in plain English. No jargon, no small-print surprises.</p></div>
<div class="mosaic">
<a class="m-card m-photo m-tall" href="/claims.html">{img("family")}<div class="cap"><h3>Claims made simple</h3><p>Start online, upload photos and follow every step.</p></div>{A}</a>
<a class="m-card m-text" href="/car.html"><h3>Car cover in plain English</h3><p>Compare comprehensive, third party and add-ons side by side.</p>{A}</a>
<a class="m-card m-accent" href="/p/pay-monthly-yearly.html"><h3>Pay monthly or yearly</h3><p>Spread the cost by Direct Debit, or pay once and save.</p>{A}</a>
<div class="m-card m-plum m-wide"><p class="big"><strong>4.8</strong>/5</p><p>Average customer rating* across car, home and travel claims.</p><p class="fineprint">*Illustrative figure for a fictional company.</p></div>
<a class="m-card m-photo m-tall" href="/help.html">{img("connect")}<div class="cap"><h3>Help when you need it</h3><p>Contact options, complaints, fraud and accessibility support.</p></div>{A}</a>
</div></div></section>
<section class="sec-i" id="cover" tabindex="-1"><div class="wrap"><div class="head-row"><div><p class="eyebrow">Our cover</p><h2>Protect what <strong>matters most</strong></h2></div><p class="muted">Six kinds of cover from one fictional insurer. Each guide lists levels of cover, extras and how to claim.</p></div>
<ul class="tiles">{tiles}</ul></div></section>
<section class="band"><div class="wrap"><div class="head-row"><div><p class="eyebrow">Why customers stay</p><h2>Support at <strong>every step</strong></h2></div><p>From the first quote to the final settlement, you can see where things are and what happens next.</p></div>
<ul class="feat">{feat}</ul>
<ul class="stats"><li><b><strong>1.2</strong>m</b><span>policies looked after*</span></li><li><b><strong>38</strong>k</b><span>claims settled last year*</span></li><li><b><strong>92</strong>%</b><span>of claims paid within 10 days*</span></li><li><b><strong>24</strong>/7</b><span>claims line*</span></li></ul>
<p class="fineprint">*All figures are invented for a fictional company in a research prototype.</p></div></section>
<section class="sec-i"><div class="wrap chev-wrap"><div><p class="eyebrow">Manage your cover</p><h2>Everything <strong>else</strong> you might need</h2><p class="muted">Renewals, changes, payments, complaints and your account. Pick a topic, or ask Usher in your own words.</p><p><a class="btn btn-plum" href="/search.html">Search the site {ic("search")}</a></p></div><ul class="chev">{chev}</ul></div></section>
<section class="sec-i" style="padding-top:0"><div class="wrap"><div class="testi">{img("testimonial")}<blockquote><span class="qmark" aria-hidden="true">&ldquo;</span><div class="stars" aria-hidden="true">{ic("star")*5}</div><p>&ldquo;A pipe burst on a Sunday night. I reported it online in ten minutes, uploaded photos the next morning and could see every step of the claim.&rdquo;</p><footer>Priya, fictional customer (illustrative testimonial)</footer></blockquote></div></div></section>
<section class="sec-i" style="padding-top:0"><div class="wrap"><div class="head-row"><div><p class="eyebrow">Latest insights</p><h2>Guides for the <strong>season ahead</strong></h2></div><p class="muted">Practical guides written in plain English.</p></div><ul class="ins">{ins}</ul></div></section>
<section class="sec-i" style="padding-top:0" aria-labelledby="ph"><div class="wrap"><h2 id="ph" class="visually-hidden">Our repair and assistance partners (fictional)</h2><p class="eyebrow" style="display:flex;justify-content:center">Our fictional repair and assistance partners</p><ul class="partners">{part}</ul></div></section>
<section class="sec-i" style="padding-top:0"><div class="wrap"><div class="connect"><div class="ph">{img("business")}</div><form data-proto aria-labelledby="lc"><p class="eyebrow">Get in touch</p><h2 id="lc">Let&rsquo;s <strong>connect</strong></h2><p class="muted">Send us a question about cover. This fictional form does not send anything.</p>
<div class="frow"><div class="field"><label for="cn">Your name</label><input id="cn" name="name" autocomplete="name"></div><div class="field"><label for="ce">Email address</label><input id="ce" name="email" type="email" autocomplete="email"></div></div>
<div class="field"><label for="ct">Topic</label><select id="ct" name="topic">{topics}</select></div><div class="field"><label for="cm">Message</label><textarea id="cm" name="message"></textarea></div>
<button class="btn" type="submit">Send message {ic("arrow")}</button><p class="formstatus" role="status"></p></form></div></div></section>
<section class="pre-foot"><div class="wrap"><div class="news"><div><h2>Seasonal cover tips</h2><p>One short email each season with guides like the ones above (fictional; nothing is sent).</p></div><form data-proto aria-label="Newsletter sign-up"><div class="field"><label for="ne">Email address</label><input id="ne" type="email" autocomplete="email"></div><button class="btn btn-plum" type="submit" style="align-self:flex-end">Subscribe</button><p class="formstatus" role="status"></p></form></div></div></section>'''
    write('index.html', layout('Home', home))
    def card(d):
        badge = ''
        if d['id'] in saved_by_dest:
            s = saved_by_dest[d['id']]; badge = f'<span class="sb sb-claim">Open claim</span>' if s['kind'] == 'claim' else f'<span class="sb sb-quote">Saved {E(s["kind"])}</span>'
        return f'<li><a href="{d["url"]}">{badge}<h3>{E(d["title"])}</h3><p>{E(d["summary"])}</p>{A}</a></li>'
    # ---------- area hubs ----------
    for a in areas:
        gs = ''
        for g in a['groups']:
            items = ''.join(card(d) for d in dests if d['area'] == a['id'] and d['group'] == g['id'])
            if items: gs += f'<section class="grp" id="{g["id"]}" aria-labelledby="h-{g["id"]}"><h2 id="h-{g["id"]}">{E(g["label"])}</h2><ul class="cgrid">{items}</ul></section>'
        jump = '<ul class="jump" aria-label="Jump to a topic">' + ''.join(f'<li><a href="#{g["id"]}">{E(g["label"])}</a></li>' for g in a['groups']) + '</ul>'
        cta = '' if a['id'] == 'claims' else f'<section class="sec-i" style="padding-bottom:0"><div class="news" style="background:var(--teal-t)"><div><h2 style="color:var(--plum)">Need to make a claim?</h2><p>Start online at any time and follow every step.</p></div><p style="margin:0"><a class="btn btn-claim" href="/claims.html">Make a claim {ic("arrow")}</a></p></div></section>'
        body = phero(f'{name} {SHORT[a["id"]].lower()}' if a['id'] != 'account' else 'Your account', E(a['label']), a['description'], crumbs([('Home', '/index.html'), (a['label'], None)]), AIMG[a['id']], AICON[a['id']], jump, teal=a['kind'] == 'account') + f'<div class="wrap">{gs}{cta}<div style="height:3rem"></div></div>'
        write(f'{a["id"]}.html', layout(a['label'], body, a['id']))
    # ---------- service pages ----------
    for d in dests:
        a = areaby[d['area']]; g = next(x for x in a['groups'] if x['id'] == d['group'])
        toc = ''.join(f'<li><a href="#{s["anchor"]}">{E(s["label"])}</a></li>' for s in d['sections'])
        secs = ''.join(f'<section class="sec" id="{s["anchor"]}"><span class="n" aria-hidden="true">{i:02d}</span><div><h2>{E(s["label"])}</h2><p>{E(s["body"])}</p></div></section>' for i, s in enumerate(d['sections'], 1))
        rel = [x for x in dests if x['area'] == d['area'] and x['group'] == d['group'] and x['id'] != d['id'] and x['kind'] != 'saved']
        relh = ''.join(f'<li><a href="{x["url"]}"><span class="t">{E(x["title"])}<small>{E(x["summary"])}</small></span>{CH}</a></li>' for x in rel)
        state = ''
        if d['id'] in saved_by_dest:
            s = saved_by_dest[d['id']]; pr = s['progress']; pc = round(100 * pr['step'] / pr['total'])
            b = '<span class="sb sb-claim">Open claim</span>' if s['kind'] == 'claim' else f'<span class="sb sb-quote">Saved {E(s["kind"])}</span>'
            state = f'<div class="state{"" if s["kind"] == "claim" else " quote"}">{b}<h2>{E(s["label"])}</h2><p style="margin:0">Reference <strong>{E(s["reference"])}</strong>. Step {pr["step"]} of {pr["total"]}: {E(pr["stepLabel"])}.</p><div class="prog" role="img" aria-label="Step {pr["step"]} of {pr["total"]}"><i style="width:{pc}%"></i></div><p class="sub" style="margin:0">Synthetic demonstration state.</p></div>'
        claimcard = '' if a['id'] == 'claims' else f'<div class="claimcard"><h2>Something happened?</h2><p>Report it online at any time.</p><a class="btn btn-claim" href="/claims.html">Make a claim</a></div>'
        side = f'<aside class="side" aria-label="Page tools"><nav class="toc" aria-label="On this page"><h2>On this page</h2><ol>{toc}</ol></nav><div class="tipcard"><h2>Not the right page?</h2><p>Press <kbd>/</kbd> or use <strong>I want to&hellip;</strong> and describe what you need in your own words.</p></div>{claimcard}</aside>'
        cr = crumbs([('Home', '/index.html'), (a['label'], f'/{a["id"]}.html'), (g['label'], f'/{a["id"]}.html#{g["id"]}'), (d['title'], None)])
        body = phero(g['label'], E(d['title']), d['summary'], cr, AIMG[a['id']], AICON[a['id']], teal=a['kind'] == 'account') + f'<div class="wrap svc">{side}<div>{state}{secs}' + (f'<div class="related"><h2>Related in {E(g["label"])}</h2><ul class="chev">{relh}</ul></div>' if relh else '') + '</div></div>'
        write(f'p/{d["id"]}.html', layout(d['title'], body, a['id']))
    for sid, t, txt in meta['about']:
        write(f'{sid}.html', layout(t, phero(name, E(t), txt, crumbs([('Home', '/index.html'), (t, None)])) + f'<div class="wrap"><div class="prose"><p>{E(txt)}</p><p><a href="/index.html">Back to the home page</a></p></div></div>'))
    write('credits.html', layout('Image credits', phero(name, 'Image credits', 'Photographer, source page and licence for every photo on this site.', crumbs([('Home', '/index.html'), ('Image credits', None)])) + f'<div class="wrap"><div class="prose">{credits_table()}</div></div>'))
    write('search.html', layout('Search', phero('Site search', 'Search', f'Search every {name} guide by keyword.', crumbs([('Home', '/index.html'), ('Search', None)])) + '<div class="wrap"><div class="prose"><form class="sform" role="search" aria-label="Search results" action="/search.html" method="get"><div class="field"><label for="sq">Search this site</label><input id="sq" name="q" type="search"></div><button class="btn btn-plum" type="submit">Search</button></form><div id="res" aria-live="polite"></div></div></div>', extra_script=SJ))
    write('compare.html', layout('Compare site search with Usher', phero('Research tool', 'Compare site search with Usher', 'Type the same request once and see what a conventional keyword search returns beside what Usher decides.', crumbs([('Home', '/index.html'), ('Compare', None)]), teal=True) + '<div class="wrap" style="padding-bottom:3rem"><div class="prose" style="margin-bottom:0"><form id="cf" class="sform"><div class="field"><label for="cq">What do you want to do?</label><input id="cq" type="text" autocomplete="off"></div><button class="btn btn-plum" type="submit">Compare</button></form></div><div class="cmp"><div><h2>Site search (keywords)</h2><div id="cl" aria-live="polite"></div></div><div><h2>Usher</h2><div id="cr" aria-live="polite"></div></div></div></div>', extra_script=CJ))
# =====================================================================
# LUMENET theme: bold consumer telecom (near-black navies, brand blue, yellow accents)
# =====================================================================
def build_lumenet():
    SHORT = {'plans': 'Broadband', 'mobile': 'Mobile', 'tv': 'TV', 'faults': 'Faults', 'moving': 'Moving', 'billing': 'Billing', 'contracts': 'Contracts', 'equipment': 'Wi-Fi & kit', 'account': 'My account', 'help': 'Help'}
    AICON = {'plans': 'wifi', 'mobile': 'phone', 'tv': 'tv', 'faults': 'tool', 'moving': 'truck', 'billing': 'card', 'contracts': 'doc', 'equipment': 'router', 'account': 'lock', 'help': 'help'}
    AIMG = {'plans': 'family', 'mobile': 'mobile', 'tv': 'gaming', 'faults': 'engineer', 'moving': 'home', 'billing': 'wfh', 'contracts': 'phoneman', 'equipment': 'blog3', 'account': 'family2', 'help': 'team1'}
    CSS = FONTS + '''
:root{--n0:#000814;--n1:#001d3d;--blue:#003566;--blue-t:#e6eef6;--y:#ffc300;--y2:#ffd60a;--y-t:#fff6d1;--ink:#0b1424;--muted:#46505f;--line:#dbe2ea;--soft:#f2f5f9;--r:14px;--r-lg:20px;
--usher-accent:#003566;--usher-accent-dark:#001d3d;--usher-accent-tint:#e6eef6;--usher-highlight:#ffc300;--usher-highlight-tint:#fff6d1;--usher-link:#003566;--usher-text:#0b1424;--usher-muted:#46505f;--usher-border:#cfd8e2;--usher-soft:#f2f5f9;--usher-radius:10px;--usher-font:"Source Sans 3",system-ui,sans-serif}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;font:1.0625rem/1.6 "Source Sans 3",system-ui,sans-serif;color:var(--ink);background:#fff}
img{max-width:100%;height:auto;display:block}
a{color:var(--blue);text-underline-offset:3px}a:hover{color:var(--n1)}
:focus-visible{outline:3px solid var(--n0);outline-offset:3px;box-shadow:0 0 0 6px var(--y);border-radius:4px}
.visually-hidden{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.skip{position:absolute;left:-999px;top:0;background:var(--y);color:var(--n0);padding:.6rem 1rem;z-index:50;font-weight:700}.skip:focus{left:0}
.wrap{max-width:76rem;margin:0 auto;padding:0 1rem}
h1,h2,h3{font-weight:700;letter-spacing:-.02em;line-height:1.12;color:var(--blue);margin:0 0 .6rem}
h1{font-size:2.3rem}h2{font-size:1.9rem}h3{font-size:1.22rem;letter-spacing:-.01em}
p{margin:0 0 1rem}.lead{font-size:1.15rem;color:var(--muted)}.muted{color:var(--muted)}
.ic{width:1.35rem;height:1.35rem;flex:none}
.eyebrow{display:inline-flex;align-items:center;gap:.55rem;font-size:.82rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--blue);margin:0 0 .5rem}
.eyebrow::before{content:"";width:1.6rem;height:.3rem;border-radius:3px;background:var(--y)}
.center{text-align:center}.center .eyebrow{justify-content:center}
.sh{max-width:44rem;margin:0 auto 2.2rem}.sh p{color:var(--muted);margin:0}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:48px;padding:.7rem 1.4rem;border-radius:8px;border:2px solid transparent;background:var(--y);color:var(--n0);font:inherit;font-weight:700;text-decoration:none;cursor:pointer;line-height:1.2}
.btn:hover{background:var(--y2);color:var(--n0);box-shadow:0 6px 18px rgba(0,8,20,.18)}
.btn .ic{width:1.1rem;height:1.1rem}
.btn-blue{background:var(--blue);color:#fff}.btn-blue:hover{background:var(--n1);color:#fff}
.btn-line{background:transparent;color:#fff;border-color:#fff}.btn-line:hover{background:#fff;color:var(--n1)}
/* top bar + header */
.topbar{background:var(--n0);color:#fff;font-size:.88rem}
.topbar .wrap{display:flex;flex-wrap:wrap;gap:.3rem 1.5rem;justify-content:space-between;align-items:center;padding-top:.4rem;padding-bottom:.4rem}
.topbar a{color:#fff}.topbar ul{display:flex;flex-wrap:wrap;gap:.2rem 1.1rem;list-style:none;margin:0;padding:0}
.topbar li a{display:inline-block;padding:.15rem 0;text-decoration:none}.topbar li a:hover{text-decoration:underline}
header.site{background:#fff;box-shadow:0 2px 0 var(--line);position:relative;z-index:30}
.bar{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem 1rem;padding:.7rem 0}
.brand{display:flex;align-items:center;gap:.55rem;font-size:1.65rem;font-weight:700;color:var(--n1);text-decoration:none;letter-spacing:-.03em;margin-right:auto}
.brand .mark{display:inline-grid;place-items:center;width:2.4rem;height:2.4rem;border-radius:8px;background:var(--y);color:var(--n1)}
.brand .mark .ic{width:1.5rem;height:1.5rem;stroke-width:2.4}
.brand small{display:block;font-size:.72rem;font-weight:600;color:var(--muted);letter-spacing:0;line-height:1.1}
nav.main{order:5;flex:1 1 100%}
nav.main>details>summary{display:inline-flex;align-items:center;gap:.4rem;min-height:44px;padding:.4rem 1rem;border-radius:8px;background:var(--n1);color:#fff;font-weight:700;cursor:pointer;list-style:none}
nav.main summary::-webkit-details-marker{display:none}
nav.main ul{list-style:none;margin:0;padding:0}
nav.main>details>ul{margin-top:.5rem;border-top:1px solid var(--line)}
nav.main a,nav.main .dd>summary{display:flex;align-items:center;gap:.3rem;padding:.65rem .5rem;color:var(--ink);text-decoration:none;font-weight:700;cursor:pointer;list-style:none;min-height:44px;border-radius:6px}
nav.main a:hover,nav.main .dd>summary:hover{color:var(--blue);background:var(--blue-t)}
nav.main .dd>summary.cur{box-shadow:inset 0 -4px 0 var(--y);border-radius:0}
nav.main a[aria-current]{color:var(--blue);background:var(--y-t)}
.dd>summary .ic{width:1rem;height:1rem;transition:transform .2s}.dd[open]>summary .ic{transform:rotate(180deg)}
.dd ul{padding-left:1rem!important}.dd ul a{font-weight:600}
.hdr-icons{display:flex;align-items:center;gap:.4rem;order:3}
.iconbtn{display:inline-grid;place-items:center;width:2.75rem;height:2.75rem;border-radius:50%;border:0;background:var(--soft);color:var(--n1);cursor:pointer;text-decoration:none}
.iconbtn:hover{background:var(--y);color:var(--n0)}
form.search{display:flex;align-items:center;flex:1 1 100%;order:4;border:2px solid var(--n1);border-radius:8px;overflow:hidden}
form.search input{flex:1;min-width:0;border:0;background:#fff;font:inherit;padding:.55rem .8rem;color:var(--ink)}
form.search input:focus-visible{outline:none;box-shadow:none}
form.search:focus-within{box-shadow:0 0 0 4px var(--y)}
form.search button{display:inline-grid;place-items:center;align-self:stretch;width:3rem;border:0;background:var(--y);color:var(--n0);cursor:pointer}
main{display:block}main:focus{outline:none}
.sec{padding:3.5rem 0}.sec-soft{background:var(--soft)}
/* hero */
.hero-l{position:relative;background:var(--n1);color:#fff;overflow:hidden}
.hero-l>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero-l .ov{position:relative;background:linear-gradient(180deg,rgba(0,8,20,.55),rgba(0,8,20,.9) 55%);padding:3rem 0 3.2rem}
.hero-l h1{color:#fff;font-size:2.7rem;max-width:14ch;line-height:1.05}
.hero-l h1 span{text-decoration:underline;text-decoration-color:var(--y);text-decoration-thickness:.14em;text-underline-offset:.12em;color:#fff}
.hero-l .lead{color:#fff;max-width:34rem}
.hero-l .eyebrow{color:#fff}
.price{display:inline-flex;align-items:baseline;gap:.4rem;background:var(--y);color:var(--n0);border-radius:12px;padding:.6rem 1rem;margin:0 0 1.2rem;font-weight:700}
.price b{font-size:2.2rem;line-height:1;letter-spacing:-.03em}.price small{font-size:.9rem;font-weight:600}
.checks{list-style:none;margin:0 0 1.4rem;padding:0;display:grid;gap:.45rem}
.checks li{display:flex;gap:.6rem;align-items:flex-start}
.checks .ck{display:grid;place-items:center;width:1.5rem;height:1.5rem;border-radius:50%;background:var(--y);color:var(--n0);flex:none;margin-top:.1rem}.checks .ck .ic{width:.95rem;height:.95rem;stroke-width:3}
.actions{display:flex;flex-wrap:wrap;gap:.7rem;margin:0 0 1rem}
.usher-tip{font-size:.95rem;margin:0;color:#fff}.usher-tip kbd,.tipcard kbd{font:inherit;font-weight:700;border:1px solid currentColor;border-radius:5px;padding:0 .4rem}
.fine{font-size:.86rem;opacity:.95}
/* service cards */
.scards{display:grid;gap:1rem;grid-template-columns:1fr;list-style:none;margin:0;padding:0}
.scards a{display:flex;flex-direction:column;gap:.6rem;height:100%;padding:1.6rem 1.4rem;border-radius:var(--r);background:#fff;border:1px solid var(--line);text-decoration:none;color:var(--ink);transition:transform .2s,box-shadow .2s}
.scards a:hover{transform:translateY(-3px);box-shadow:0 16px 36px rgba(0,29,61,.12)}
.scards .si{display:grid;place-items:center;width:3.4rem;height:3.4rem;border-radius:12px;background:var(--blue-t);color:var(--blue)}
.scards .si .ic{width:1.7rem;height:1.7rem}
.scards h3{margin:.3rem 0 0}.scards p{margin:0;color:var(--muted)}
.scards .more{margin-top:auto;display:inline-flex;align-items:center;gap:.4rem;font-weight:700;color:var(--blue);padding-top:.4rem}
.scards .hl a{background:var(--y);border-color:var(--y)}.scards .hl h3,.scards .hl p,.scards .hl .more{color:var(--n0)}.scards .hl .si{background:var(--n1);color:var(--y)}
/* about collage */
.about{display:grid;gap:2.5rem;align-items:center}
.collage{position:relative;padding:0 0 3rem 0;max-width:34rem}
.collage .c1{border-radius:var(--r-lg);width:85%;aspect-ratio:4/3.4;object-fit:cover}
.collage .c2{position:absolute;right:0;bottom:0;width:55%;aspect-ratio:1/1;object-fit:cover;border-radius:var(--r-lg);border:6px solid #fff}
.collage .yrs{position:absolute;left:1rem;bottom:1rem;background:var(--y);color:var(--n0);border-radius:var(--r);padding:.9rem 1.1rem;font-weight:700;line-height:1.1;box-shadow:0 10px 30px rgba(0,8,20,.25)}
.collage .yrs b{display:block;font-size:2.4rem;letter-spacing:-.03em}
.checks.dark .ck{background:var(--n1);color:var(--y)}
.checks.dark a{font-weight:700}
/* package picker */
.picker{display:grid;gap:2rem;align-items:center}
.tabs{display:flex;flex-wrap:wrap;gap:.4rem;background:#fff;border:1px solid var(--line);border-radius:12px;padding:.35rem;margin-bottom:1.2rem}
.tabs button{flex:1 1 4.5rem;min-height:46px;border:0;border-radius:9px;background:transparent;color:var(--n1);font:inherit;font-weight:700;cursor:pointer}
.tabs button[aria-selected=true]{background:var(--n1);color:#fff}
.tabs button:hover:not([aria-selected=true]){background:var(--blue-t)}
.pkpanel{background:#fff;border-radius:var(--r-lg);border:1px solid var(--line);padding:1.6rem;box-shadow:0 16px 40px rgba(0,29,61,.08)}
.pkpanel[hidden]{display:none}
.pkpanel h3{font-size:1.6rem;margin:0}.pkpanel .spd{color:var(--muted);margin:.2rem 0 1rem}
.pkpanel .price{margin:0 0 1rem}
.pkphoto{position:relative}.pkphoto img{border-radius:var(--r-lg);width:100%;aspect-ratio:4/3.3;object-fit:cover}
.pkphoto .tag{position:absolute;right:1rem;top:1rem;background:var(--n1);color:#fff;border-radius:10px;padding:.5rem .8rem;font-weight:700;display:flex;gap:.4rem;align-items:center}.pkphoto .tag .ic{color:var(--y)}
/* tv shows */
.shows{display:grid;gap:1rem;grid-template-columns:1fr 1fr;list-style:none;margin:0;padding:0}
.poster{position:relative;display:flex;flex-direction:column;justify-content:flex-end;aspect-ratio:2/3;border-radius:var(--r);overflow:hidden;color:#fff;text-decoration:none;padding:.9rem;isolation:isolate}
.poster::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--pg)}
.poster::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,transparent 35%,rgba(0,8,20,.92) 85%)}
.poster .art{position:absolute;inset:0;z-index:-1;opacity:.55}
.poster b{font-size:1.15rem;line-height:1.15}.poster span{font-size:.85rem}
.poster .ch{position:absolute;top:.7rem;left:.7rem;background:var(--y);color:var(--n0);font-size:.75rem;font-weight:700;border-radius:6px;padding:.1rem .5rem}
.poster:hover{color:#fff;outline:3px solid var(--y);outline-offset:-3px}
/* dark team band */
.band{background:var(--n1);color:#fff;padding:3.5rem 0}
.band h2,.band h3{color:#fff}.band .eyebrow{color:#fff}.band .sh p{color:#fff}
.team{display:grid;gap:1rem;grid-template-columns:1fr 1fr;list-style:none;margin:0;padding:0}
.team li{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);border-radius:var(--r);overflow:hidden}
.team img{width:100%;aspect-ratio:1/1.05;object-fit:cover}
.team .b{padding:.9rem 1rem 1rem}.team b{display:block;font-size:1.1rem}.team span{font-size:.92rem}
.team .role{display:inline-block;margin-top:.4rem;background:var(--y);color:var(--n0);border-radius:6px;padding:.05rem .5rem;font-size:.8rem;font-weight:700}
/* equipment */
.eq{display:grid;gap:1rem;grid-template-columns:1fr;list-style:none;margin:0;padding:0}
.eq a{display:flex;gap:1rem;align-items:center;padding:1.2rem;border-radius:var(--r);border:1px solid var(--line);background:#fff;text-decoration:none;color:var(--ink);height:100%}
.eq .si{display:grid;place-items:center;width:3.6rem;height:3.6rem;border-radius:50%;background:var(--n1);color:var(--y);flex:none}.eq .si .ic{width:1.7rem;height:1.7rem}
.eq b{display:block;color:var(--blue);font-size:1.1rem}.eq span{color:var(--muted);font-size:.95rem}
.eq a:hover{border-color:var(--blue)}
/* pricing */
.prices{display:grid;gap:1.2rem;grid-template-columns:1fr;list-style:none;margin:0;padding:0;align-items:stretch}
.plan{display:flex;flex-direction:column;height:100%;background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:1.8rem 1.5rem;position:relative}
.plan h3{font-size:1.35rem;margin:0}.plan .spd{color:var(--muted);margin:.1rem 0 1rem}
.plan .amt{font-size:2.8rem;font-weight:700;color:var(--n1);letter-spacing:-.03em;line-height:1}.plan .amt small{font-size:1rem;font-weight:600;color:var(--muted);letter-spacing:0}
.plan ul{list-style:none;margin:1.2rem 0 1.4rem;padding:0;display:grid;gap:.5rem}.plan li{display:flex;gap:.55rem}.plan li .ic{color:var(--blue);width:1.2rem;height:1.2rem;margin-top:.15rem;stroke-width:2.6}
.plan .btn{margin-top:auto}
.plan.hot{background:var(--n1);color:#fff;border-color:var(--n1);box-shadow:0 20px 45px rgba(0,29,61,.25)}
.plan.hot h3,.plan.hot .amt{color:#fff}.plan.hot .spd,.plan.hot .amt small{color:#fff}.plan.hot li .ic{color:var(--y)}
.plan .pop{position:absolute;top:-.85rem;left:1.5rem;background:var(--y);color:var(--n0);font-weight:700;font-size:.82rem;border-radius:6px;padding:.15rem .7rem;letter-spacing:.04em;text-transform:uppercase}
/* faq */
.faq{max-width:52rem;margin:0 auto;display:grid;gap:.7rem}
.faq details{background:#fff;border:1px solid var(--line);border-radius:12px}
.faq summary{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1rem 1.2rem;font-weight:700;color:var(--n1);cursor:pointer;list-style:none;min-height:48px}
.faq summary::-webkit-details-marker{display:none}
.faq summary .pm{display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:var(--y);color:var(--n0);flex:none;transition:transform .2s}
.faq details[open] summary .pm{transform:rotate(180deg)}.faq details[open]{border-color:var(--blue)}
.faq .ans{padding:0 1.2rem 1.1rem}.faq .ans p{margin:0 0 .5rem}
/* testimonials + blog */
.quotes{display:grid;gap:1rem;grid-template-columns:1fr;list-style:none;margin:0;padding:0}
.quotes li{background:#fff;border-radius:var(--r);border:1px solid var(--line);padding:1.5rem;display:flex;flex-direction:column;gap:.8rem}
.quotes .stars{display:flex;gap:.1rem;color:var(--n1)}.quotes .stars .ic{width:1.1rem;height:1.1rem;fill:var(--y)}
.quotes p{margin:0}.quotes .who{display:flex;gap:.7rem;align-items:center;margin-top:auto}
.quotes .av{display:grid;place-items:center;width:2.8rem;height:2.8rem;border-radius:50%;background:var(--n1);color:#fff;font-weight:700}
.quotes .ph{padding:0;overflow:hidden}.quotes .ph img{width:100%;aspect-ratio:16/10;object-fit:cover}.quotes .ph .in{padding:0 1.5rem 1.5rem;display:flex;flex-direction:column;gap:.8rem}
.blog{display:grid;gap:1.2rem;grid-template-columns:1fr;list-style:none;margin:0;padding:0}
.blog a{display:flex;flex-direction:column;height:100%;border-radius:var(--r);overflow:hidden;border:1px solid var(--line);background:#fff;text-decoration:none;color:var(--ink)}
.blog img{width:100%;aspect-ratio:16/10;object-fit:cover}
.blog .b{padding:1.2rem 1.3rem 1.4rem;display:flex;flex-direction:column;gap:.45rem;flex:1}
.blog .cat{align-self:flex-start;background:var(--y);color:var(--n0);font-weight:700;font-size:.8rem;border-radius:6px;padding:.05rem .55rem}
.blog h3{margin:0;font-size:1.2rem}.blog p{margin:0;color:var(--muted)}.blog .more{margin-top:auto;font-weight:700;color:var(--blue);display:flex;gap:.4rem;align-items:center}
.blog a:hover{border-color:var(--blue)}.blog a:hover h3{text-decoration:underline}
/* page hero */
.phero{background:var(--n1);color:#fff;position:relative;overflow:hidden}
.phero::after{content:"";position:absolute;right:-6rem;top:-6rem;width:18rem;height:18rem;border-radius:50%;border:2.5rem solid rgba(255,195,0,.12);pointer-events:none}
.phero .wrap{display:grid;gap:1.5rem;padding-top:2rem;padding-bottom:2.4rem;position:relative;z-index:1}
.phero h1{color:#fff;margin-bottom:.5rem}.phero .lead{color:#fff;margin:0}.phero .eyebrow{color:#fff}
.phero .ph{position:relative;display:none}
.phero .ph img{border-radius:var(--r-lg);width:100%;aspect-ratio:16/10;object-fit:cover;position:relative;z-index:1}
.phero .ph::before{content:"";position:absolute;left:-.8rem;bottom:-.8rem;width:60%;height:60%;background:var(--y);border-radius:var(--r-lg)}
.phero .ph .si{position:absolute;z-index:2;right:1rem;bottom:1rem;display:grid;place-items:center;width:3.4rem;height:3.4rem;border-radius:12px;background:var(--y);color:var(--n0)}
.crumbs{font-size:.92rem;margin:0 0 .9rem}.crumbs ol{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.2rem .45rem}
.crumbs li{display:flex;align-items:center;gap:.45rem}.crumbs li+li::before{content:"\\203A";font-weight:700}
.phero .crumbs a{color:#fff}
.jump{display:flex;flex-wrap:wrap;gap:.5rem;margin:1.2rem 0 0;padding:0;list-style:none}
.jump a{display:inline-flex;align-items:center;min-height:40px;padding:.35rem .9rem;border-radius:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.45);color:#fff;text-decoration:none;font-weight:700;font-size:.95rem}
.jump a:hover{background:var(--y);border-color:var(--y);color:var(--n0)}
.grp{padding:2.6rem 0 .3rem;scroll-margin-top:1rem}
.grp h2{display:flex;align-items:center;gap:.7rem}.grp h2::before{content:"";width:.45rem;align-self:stretch;border-radius:3px;background:var(--y)}
.grp:target h2{background:var(--y-t);border-radius:8px;padding-right:.6rem}
.sb{display:inline-flex;align-self:flex-start;border-radius:6px;padding:.05rem .55rem;font-size:.8rem;font-weight:700;background:var(--n1);color:#fff}
.scards .hl .sb{background:var(--n0)}
/* service page */
.svc{display:grid;gap:2rem;padding-top:2.2rem;padding-bottom:3.2rem}
.toc{background:var(--soft);border-radius:var(--r);padding:1.2rem 1.3rem;border-top:5px solid var(--y)}
.toc h2{font-size:1.05rem;margin:0 0 .4rem;color:var(--n1)}
.toc ol{margin:0;padding-left:1.3rem}.toc li{margin:0;padding:.1rem 0}.toc li::marker{color:var(--blue);font-weight:700}
.toc a{display:inline-block;padding:.3rem 0;min-height:24px;font-weight:600}
.side{display:flex;flex-direction:column;gap:1rem}
.tipcard{background:var(--y);color:var(--n0);border-radius:var(--r);padding:1.3rem}.tipcard h2{font-size:1.15rem;color:var(--n0)}.tipcard p{margin:0}
.helpcard{background:var(--n1);color:#fff;border-radius:var(--r);padding:1.3rem}.helpcard h2{color:#fff;font-size:1.15rem}.helpcard p{margin:0 0 .8rem}
section.sec2{border:1px solid var(--line);border-radius:var(--r);padding:1.3rem 1.4rem .5rem;margin:0 0 1rem;scroll-margin-top:1rem;position:relative;border-left:6px solid var(--blue)}
section.sec2 h2{font-size:1.35rem;margin:0 0 .5rem;display:flex;gap:.6rem;align-items:baseline}
section.sec2 h2 .n{display:inline-grid;place-items:center;min-width:2rem;height:2rem;border-radius:8px;background:var(--y);color:var(--n0);font-size:.95rem}
section.sec2:target{border-color:var(--y);border-left-color:var(--y);box-shadow:0 0 0 4px var(--y-t);background:#fffdf3}
.state{background:var(--y-t);border:2px solid var(--n1);border-radius:var(--r);padding:1.3rem;margin:0 0 1.2rem}
.state h2{font-size:1.25rem;margin:.5rem 0 .3rem}
.prog{height:.65rem;background:#fff;border:1px solid var(--n1);border-radius:999px;overflow:hidden;margin:.7rem 0 .4rem}.prog i{display:block;height:100%;background:var(--n1)}
.sub{color:var(--muted);font-size:.92rem}
.related{margin-top:2rem}
.rlist{list-style:none;margin:0;padding:0;display:grid;gap:.6rem}
.rlist a{display:flex;align-items:center;gap:.8rem;padding:.9rem 1rem;border-radius:12px;background:var(--soft);text-decoration:none;color:var(--ink);min-height:44px}
.rlist a b{color:var(--blue)}.rlist a small{display:block;color:var(--muted);font-size:.93rem}.rlist a span{flex:1}
.rlist .ic{color:var(--blue)}.rlist a:hover{background:var(--y-t)}
.prose{max-width:52rem;padding-top:2.2rem;padding-bottom:3.4rem}.related h2{font-size:1.6rem}
.sform{display:flex;flex-wrap:wrap;gap:.6rem;align-items:flex-end}
.field{display:flex;flex-direction:column;gap:.3rem;flex:1 1 16rem}.field label{font-weight:700;color:var(--n1)}
.field input{font:inherit;border:2px solid var(--n1);border-radius:8px;padding:.6rem .8rem;min-height:48px;color:var(--ink)}
.rcount{color:var(--muted)}
.results{list-style:none;margin:1rem 0 0;padding:0;display:grid;gap:.7rem}
.results li{border:1px solid var(--line);border-left:5px solid var(--blue);border-radius:10px;padding:.9rem 1.1rem}
.results a{font-weight:700;font-size:1.1rem}.results .sub{margin:.1rem 0 .3rem}
.cmp{display:grid;gap:1rem;grid-template-columns:1fr;margin-top:1.5rem}
.cmp>div{border:1px solid var(--line);border-radius:var(--r);padding:1.3rem;background:#fff}.cmp>div:last-child{border:2px solid var(--n1);background:var(--soft)}
.cmp h2{font-size:1.3rem}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--r)}
table.credits{border-collapse:collapse;width:100%;min-width:42rem;font-size:.95rem}
table.credits th,table.credits td{text-align:left;vertical-align:top;padding:.7rem .8rem;border-bottom:1px solid var(--line)}
table.credits th{background:var(--n1);color:#fff}table.credits img{border-radius:8px;width:120px;height:auto}table.credits a{overflow-wrap:anywhere}
/* footer */
footer.site{background:var(--n0);color:#fff;padding:3.5rem 0 6.5rem;border-top:6px solid var(--y)}
footer.site a{color:#fff;text-decoration:none}footer.site a:hover{text-decoration:underline;color:#fff}
.fcols{display:grid;gap:2rem;grid-template-columns:1fr}
.fcols h2{color:#fff;font-size:1.05rem;margin:0 0 .8rem}
.fcols ul{list-style:none;margin:0;padding:0}.fcols li a{display:inline-block;padding:.3rem 0;min-height:24px}
.fbrand .brand{color:#fff;margin:0 0 .8rem}.fbrand .brand small{color:#fff}
.fnews{display:flex;gap:.4rem;margin-top:.6rem}.fnews input{flex:1;min-width:0;font:inherit;border:0;border-radius:8px;padding:.6rem .8rem;min-height:48px}
.formstatus{margin:.5rem 0 0;font-weight:600}
.fbottom a,.topbar p a{text-decoration:underline!important}.fbottom{margin-top:2.5rem;padding-top:1.2rem;border-top:1px solid rgba(255,255,255,.2);font-size:.9rem;display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;justify-content:space-between}
@media(min-width:40rem){
 h1{font-size:2.8rem}h2{font-size:2.3rem}
 .scards{grid-template-columns:1fr 1fr}.shows{grid-template-columns:repeat(3,1fr)}.team{grid-template-columns:repeat(2,1fr)}.eq{grid-template-columns:1fr 1fr}
 .quotes{grid-template-columns:1fr 1fr}.blog{grid-template-columns:1fr 1fr}.fcols{grid-template-columns:1fr 1fr}.cmp{grid-template-columns:1fr 1fr}
 .hero-l h1{font-size:3.6rem}form.search{flex:0 1 15rem;order:2}
}
@media(min-width:62rem){
 nav.main{order:1;flex:0 1 auto;margin:0 auto}nav.main>details>summary{display:none}nav.main>details>ul{display:flex;align-items:center;gap:.15rem;margin:0;border:0}
 nav.main .dd>summary{padding:.5rem .8rem}.brand{margin-right:0}
 .dd{position:relative}.dd ul{position:absolute;top:calc(100% + .6rem);left:0;min-width:16rem;background:#fff;border:1px solid var(--line);border-top:4px solid var(--y);border-radius:0 0 12px 12px;box-shadow:0 20px 40px rgba(0,8,20,.16);padding:.5rem!important}
 .hero-l .ov{background:linear-gradient(90deg,rgba(0,8,20,.94) 0%,rgba(0,8,20,.8) 42%,rgba(0,8,20,.05) 72%);padding:5.5rem 0 6rem}
 .hero-l h1{font-size:4.4rem}
 .scards{grid-template-columns:repeat(4,1fr)}.grp .scards{grid-template-columns:repeat(3,1fr)}
 .about{grid-template-columns:1fr 1fr}.picker{grid-template-columns:1.1fr 1fr}
 .shows{grid-template-columns:repeat(6,1fr)}.team{grid-template-columns:repeat(4,1fr)}.eq{grid-template-columns:repeat(4,1fr)}.eq a{flex-direction:column;text-align:center}
 .prices{grid-template-columns:repeat(3,1fr);align-items:center}.plan.hot{padding:2.4rem 1.6rem}
 .quotes{grid-template-columns:repeat(3,1fr)}.blog{grid-template-columns:repeat(3,1fr)}
 .phero .wrap{grid-template-columns:1.4fr 1fr;align-items:center;padding-top:2.6rem;padding-bottom:3rem}.phero .ph{display:block}
 .svc{grid-template-columns:1fr 19rem;align-items:start}.side{position:sticky;top:1rem;order:2}
 .fcols{grid-template-columns:1.5fr 1fr 1fr 1fr 1.3fr}
}
@media(max-width:61.99rem){nav.main details:not([open])>ul{display:none}.dd ul{position:static}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
'''
    open(os.path.join(out, 'assets/site.css'), 'w').write(CSS)
    logo = f'<span class="mark" aria-hidden="true">{ic("wifi")}</span>'
    def crumbs(items):
        li = ''.join(f'<li><a href="{u}">{E(t)}</a></li>' if u else f'<li><span aria-current="page">{E(t)}</span></li>' for t, u in items)
        return f'<nav class="crumbs" aria-label="Breadcrumb"><ol>{li}</ol></nav>'
    MENU = [('Broadband', ['plans']), ('Mobile', ['mobile']), ('TV', ['tv']), ('Support', ['faults', 'moving', 'billing', 'contracts', 'equipment', 'help']), ('My account', ['account'])]
    def layout(title, body, cur=None, extra_script=''):
        nav = ''
        for lab, ids in MENU:
            if len(ids) == 1:
                a = areaby[ids[0]]
                items = f'<li><a href="/{a["id"]}.html"{" aria-current=\"page\"" if cur == a["id"] else ""}>All {E(a["label"][0].lower() + a["label"][1:])}</a></li>' + ''.join(f'<li><a href="/{a["id"]}.html#{g["id"]}">{E(g["label"])}</a></li>' for g in a['groups'])
            else:
                items = ''.join(f'<li><a href="/{i}.html"{" aria-current=\"page\"" if cur == i else ""}>{E(areaby[i]["label"])}</a></li>' for i in ids)
            nav += f'<li><details class="dd"><summary{" class=\"cur\"" if cur in ids else ""}>{E(lab)}{ic("down")}</summary><ul>{items}</ul></details></li>'
        fc = lambda ids: ''.join(f'<li><a href="/{i}.html">{E(areaby[i]["label"])}</a></li>' for i in ids)
        return f'''<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)} - {name}</title><meta name="description" content="{name} (fictional {meta['noun']}): research prototype for Usher.">
<meta name="theme-color" content="#001d3d"><link rel="stylesheet" href="/assets/site.css"></head><body>
<a class="skip" href="#main">Skip to main content</a>
<header class="site"><div class="topbar"><div class="wrap"><p style="margin:0"><strong>Research prototype.</strong> {name} is fictional. All products, prices, people and contact details are invented. <a href="/about.html">About</a></p><ul aria-label="Utility links"><li><a href="/help.html">Help &amp; support</a></li><li><a href="/p/fault-outage-check.html">Service status</a></li><li><a href="/p/help-stores.html">Find a store</a></li></ul></div></div>
<div class="wrap bar"><a class="brand" href="/index.html">{logo}<span>{name}<small>{E(meta['tagline'])}</small></span></a>
<nav class="main" aria-label="Main"><details open id="menu"><summary>{ic("menu")}Menu</summary><ul>{nav}</ul></details></nav>
<form class="search" role="search" aria-label="Site search" action="/search.html" method="get"><label class="visually-hidden" for="q">Search this site</label><input id="q" name="q" type="search" placeholder="Search {name}" autocomplete="off"><button type="submit">{ic("search")}<span class="visually-hidden">Search</span></button></form>
<div class="hdr-icons"><a class="iconbtn" href="/account.html">{ic("user")}<span class="visually-hidden">My account</span></a><a class="iconbtn" href="/plans.html">{ic("cart")}<span class="visually-hidden">Basket (empty): browse plans</span></a></div></div></header>
<main id="main" tabindex="-1">{body}</main>
<footer class="site"><div class="wrap"><div class="fcols"><div class="fbrand"><a class="brand" href="/index.html">{logo}<span>{name}<small>{E(meta['tagline'])}</small></span></a><p>Fast, fair broadband, mobile and TV. Sales and support (fictional): {E(meta['phone'])}.</p></div>
<div><h2>Shop</h2><ul>{fc(['plans', 'mobile', 'tv', 'equipment'])}</ul></div><div><h2>Support</h2><ul>{fc(['faults', 'moving', 'billing', 'contracts', 'help'])}</ul></div>
<div><h2>Company</h2><ul><li><a href="/about.html">About</a></li><li><a href="/careers.html">Careers</a></li><li><a href="/press.html">Press</a></li><li><a href="/privacy.html">Privacy</a></li><li><a href="/cookies.html">Cookies</a></li><li><a href="/accessibility.html">Accessibility statement</a></li><li><a href="/compare.html">Compare with site search</a></li><li><a href="/credits.html">Image credits</a></li></ul></div>
<div><h2>Stay in the loop</h2><form data-proto aria-label="Newsletter sign-up"><label for="fe">Email address</label><div class="fnews"><input id="fe" type="email" autocomplete="email"><button class="btn" type="submit">Join</button></div><p class="formstatus" role="status"></p></form><p class="fine">Fictional: nothing is sent.</p></div></div>
<div class="fbottom"><p>&copy; 2026 {name} (fictional). Not a real provider.</p><p>Photos: StockSnap, CC0 (<a href="/credits.html">credits</a>). Fonts: Source Sans 3 (SIL OFL).</p></div></div></footer>
{NAV_JS}
{WIDGET}
{extra_script}</body></html>
'''
    def phero(eyebrow, title, lead, crumbs_html='', imgkey=None, icon=None, extra=''):
        ph = f'<div class="ph">{img(imgkey, eager=True)}' + (f'<span class="si">{ic(icon)}</span>' if icon else '') + '</div>' if imgkey else ''
        return f'<section class="phero"><div class="wrap"><div>{crumbs_html}<p class="eyebrow">{E(eyebrow)}</p><h1>{title}</h1><p class="lead">{E(lead)}</p>{extra}</div>{ph}</div></section>'
    CK = '<span class="ck">' + ic('check') + '</span>'
    MORE = lambda t='Find out more': f'<span class="more">{E(t)} {ic("arrow")}</span>'
    # ---------- home ----------
    svc1 = [('plans', '/plans.html', 'Broadband', 'Part-fibre, full fibre and gigabit plans with a minimum speed guarantee.'), ('equipment', '/equipment.html', 'Wi-Fi & equipment', 'The Lumenet Hub, mesh discs and help to reach every room.'),
            ('mobile', '/mobile.html', 'Mobile & SIM', 'SIM-only plans, phones, eSIM and roaming.'), ('tv', '/tv.html', 'TV & bundles', 'TV packages, add-ons and money-saving bundles.')]
    svc2 = [('faults', '/faults.html', 'Faults & speed', 'Slow, dropping or no connection: fix it step by step.'), ('moving', '/moving.html', 'Moving home', 'Take your service with you and pick your date.'),
            ('billing', '/billing.html', 'Billing & payments', 'Understand your bill, pay, or get help paying.'), ('help', '/help.html', 'Help & support', 'Contact us, complaints and extra support.')]
    def scards(lst, hl):
        return '<ul class="scards">' + ''.join(f'<li{" class=\"hl\"" if i == hl else ""}><a href="{u}"><span class="si">{ic(AICON[k])}</span><h3>{E(t)}</h3><p>{E(dsc)}</p>{MORE()}</a></li>' for i, (k, u, t, dsc) in enumerate(lst)) + '</ul>'
    pk = [('150', '150 Mb', 'Full Fibre 150', 'Up to 150Mbps download', '29.99', 'plan-ftth', ['Great for 2 to 4 people', 'HD streaming on several screens', 'Lumenet Hub included']),
          ('500', '500 Mb', 'Full Fibre 500', 'Up to 500Mbps download', '34.99', 'plan-ftth', ['Busy homes of 4 or more', '4K streaming and gaming', 'Hub plus one mesh disc']),
          ('900', '900 Mb', 'Full Fibre 900', 'Up to 900Mbps download', '44.99', 'plan-ftth', ['Heavy users and home workers', 'Fast uploads for video calls', 'Hub plus two mesh discs']),
          ('1g', '1 Gb', 'Gigabit 1000', 'Up to 1,000Mbps download and upload', '54.99', 'plan-gigabit', ['Our fastest plan', 'Symmetrical speeds', 'Priority support line'])]
    tabs = ''.join(f'<button type="button" role="tab" id="tab-{k}" aria-controls="pk-{k}" aria-selected="{"true" if i == 1 else "false"}" tabindex="{"0" if i == 1 else "-1"}">{E(lab)}</button>' for i, (k, lab, *_r) in enumerate(pk))
    panels = ''.join(f'<div class="pkpanel" role="tabpanel" id="pk-{k}" aria-labelledby="tab-{k}" tabindex="0"{"" if i == 1 else " hidden"}><h3>{E(t)}</h3><p class="spd">{E(spd)}</p><p class="price"><b>&pound;{pr}</b><small>a month*</small></p><ul class="checks dark">' + ''.join(f'<li>{CK}<span>{E(f)}</span></li>' for f in feats) + f'</ul><a class="btn btn-blue" href="{D(dest)["url"]}">See plan details {ic("arrow")}</a></div>' for i, (k, lab, t, spd, pr, dest, feats) in enumerate(pk))
    PJ = '''<script>(function(){var tl=document.querySelector('[role=tablist]');if(!tl)return;var t=[].slice.call(tl.querySelectorAll('[role=tab]'));function sel(b,f){t.forEach(function(x){var on=x===b;x.setAttribute('aria-selected',on);x.tabIndex=on?0:-1;document.getElementById(x.getAttribute('aria-controls')).hidden=!on});if(f)b.focus()}
t.forEach(function(b,i){b.addEventListener('click',function(){sel(b)});b.addEventListener('keydown',function(e){var j=e.key==='ArrowRight'?i+1:e.key==='ArrowLeft'?i-1:e.key==='Home'?0:e.key==='End'?t.length-1:null;if(j===null)return;e.preventDefault();sel(t[(j+t.length)%t.length],true)})})})()</script>'''
    shows = [('Harbour Lights', 'Drama', 'Lumen One', '#0b3d63,#001d3d', 'M0 70 Q25 55 50 70 T100 70 V100 H0z'), ('The Quiet Orbit', 'Sci-fi', 'Northlight', '#2b1a4f,#000814', 'M50 30 a18 18 0 1 0 .1 0z'), ('Kestrel Point', 'Thriller', 'Lumen One', '#5a2a12,#1c0d05', 'M10 90 L50 25 L90 90z'),
             ('Saltmarsh Bakers', 'Lifestyle', 'Lumen Life', '#7a4b06,#2a1902', 'M20 60 h60 v25 h-60z'), ('Penhallow Nights', 'Comedy', 'Northlight', '#123f2e,#04140e', 'M30 40 a10 10 0 1 0 .1 0z M65 40 a10 10 0 1 0 .1 0z'), ('Fieldside Live', 'Sport', 'Fieldside', '#0a4a2a,#001d3d', 'M10 55 H90 M50 20 V90')]
    sh = ''.join(f'<li><a class="poster" href="/p/tv-packages.html" style="--pg:linear-gradient(160deg,{g})"><svg class="art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="{pth}" fill="none" stroke="#ffc300" stroke-width="3"/></svg><span class="ch">{E(ch)}</span><b>{E(t)}</b><span>{E(gen)} &middot; fictional</span></a></li>' for t, gen, ch, g, pth in shows)
    team = [('team1', 'Aisha Rahman', 'Wi-Fi specialist', 'Helps you reach every room.'), ('team2', 'Tom Ellery', 'Moving home lead', 'Plans your switch-over day.'), ('team3', 'Grace Okafor', 'Billing support', 'Explains every line on your bill.'), ('team4', 'Megan Hale', 'Faults engineer', 'Fixes slow and dropping lines.')]
    tm = ''.join(f'<li>{img(k)}<div class="b"><b>{E(n)}</b><span>{E(dsc)}</span><br><span class="role">{E(r)}</span></div></li>' for k, n, r, dsc in team)
    eqs = [('router', 'eq-hub', 'Lumenet Hub', 'Lights, ports and buttons explained'), ('wifi', 'eq-mesh', 'Mesh discs', 'Strong Wi-Fi in every room'), ('home', 'eq-powerline', 'Powerline adapters', 'Use your wiring to extend the network'), ('tv', 'tv-box', 'TV box & remote', 'Set up the box and voice remote')]
    eq = ''.join(f'<li><a href="{D(i)["url"]}"><span class="si">{ic(k)}</span><span><b>{E(t)}</b><span>{E(dsc)}</span></span></a></li>' for k, i, t, dsc in eqs)
    plans = [('Fibre 66', 'Up to 66Mbps', '24.99', 'plan-fttc', ['Ideal for 1 or 2 people', 'Streaming in HD', 'Free standard set-up'], False),
             ('Full Fibre 500', 'Up to 500Mbps', '34.99', 'plan-ftth', ['Busy homes of 4 or more', '4K streaming and gaming', 'Hub plus one mesh disc', 'Minimum speed guarantee'], True),
             ('Gigabit 1000', 'Up to 1,000Mbps', '54.99', 'plan-gigabit', ['Matching upload speeds', 'Hub plus two mesh discs', 'Priority support line'], False)]
    pl = ''.join(f'<li><div class="plan{" hot" if hot else ""}">' + ('<span class="pop">Most popular</span>' if hot else '') + f'<h3>{E(t)}</h3><p class="spd">{E(spd)}</p><p class="amt">&pound;{pr}<small> /month*</small></p><ul>' + ''.join(f'<li>{ic("check")}<span>{E(f)}</span></li>' for f in feats) + f'</ul><a class="btn{"" if hot else " btn-blue"}" href="{D(dest)["url"]}">Choose {E(t)}<span class="visually-hidden"> (fictional plan)</span></a></div></li>' for t, spd, pr, dest, feats, hot in plans)
    faqs = ['new-availability', 'speed-guarantee', 'move-service', 'fault-slow', 'rise-annual', 'eq-wifi-password']
    fq = ''.join(f'<details><summary>{E(D(i)["title"])}<span class="pm">{ic("down")}</span></summary><div class="ans"><p>{E(D(i)["summary"])} {E(D(i)["sections"][0]["body"])}</p><p><a href="{D(i)["url"]}">Read the full guide<span class="visually-hidden">: {E(D(i)["title"])}</span></a></p></div></details>' for i in faqs)
    stars = '<div class="stars" aria-hidden="true">' + ic('star') * 5 + '</div>'
    qts = [('JM', 'Joan and Malcolm', 'Retired, fictional customers', 'The engineer set everything up and showed us the mesh disc. The Wi-Fi now reaches the garden room.', 'testimonial'),
           ('DK', 'Dev K.', 'Home worker, fictional', 'Moving was painless. I picked the date online and was back online the day we got the keys.', None),
           ('SL', 'Sam L.', 'Gamer, fictional', 'When my line kept dropping in the evenings the fault checker found it in minutes and booked a visit.', None)]
    qt = ''.join((f'<li class="ph">{img(k)}<div class="in">' if k else '<li>') + f'{stars}<p>&ldquo;{E(q)}&rdquo;</p><div class="who"><span class="av" aria-hidden="true">{ini}</span><span><strong>{E(n)}</strong><br><span class="sub">{E(r)}</span></span></div>' + ('</div></li>' if k else '</li>') for ini, n, r, q, k in qts)
    blogs = [('blog1', 'help-guides', 'Guides'), ('blog2', 'fault-streaming', 'Gaming & streaming'), ('blog3', 'eq-dead-spots', 'Wi-Fi tips')]
    bl = ''.join(f'<li><a href="{D(i)["url"]}">{img(k)}<div class="b"><span class="cat">{E(c)}</span><h3>{E(D(i)["title"])}</h3><p>{E(D(i)["summary"])}</p>{MORE("Read more")}</div></a></li>' for k, i, c in blogs)
    home = f'''<section class="hero-l">{img("hero", eager=True)}<div class="ov"><div class="wrap"><p class="eyebrow">Fictional provider &middot; research prototype</p>
<h1>Fast, fair <span>broadband</span> for every room.</h1><p class="lead">{E(meta["heroSub"])}</p>
<p class="price"><small>Full fibre from</small><b>&pound;24.99</b><small>a month*</small></p>
<ul class="checks"><li>{CK}<span>Minimum speed guarantee on every plan</span></li><li>{CK}<span>Automatic compensation if we miss an appointment</span></li></ul>
<p class="actions"><a class="btn" href="/p/new-availability.html">Check availability {ic("arrow")}</a><a class="btn btn-line" href="/plans.html">View all plans</a></p>
<p class="usher-tip">Stuck? Use the <strong>I want to&hellip;</strong> button at the bottom of the screen (or press <kbd>/</kbd>) and describe what you need.</p><p class="fine" style="margin:.6rem 0 0">*Fictional example prices for a research prototype.</p></div></div></section>
<section class="sec"><div class="wrap"><div class="sh center"><p class="eyebrow">What we offer</p><h2>Everything your home needs to stay connected</h2><p>Broadband, Wi-Fi, mobile and TV from one fictional provider, plus help when something goes wrong.</p></div>{scards(svc1, 1)}<div style="height:1rem"></div>{scards(svc2, 0)}</div></section>
<section class="sec sec-soft"><div class="wrap about"><div class="collage">{img("family", "c1")}{img("family2", "c2")}<p class="yrs"><b>12+</b>years connecting homes*</p></div>
<div><p class="eyebrow">About {name}</p><h2>Broadband that is honest about speed and price</h2><p class="muted">We show the speed you can expect in the evening, the price after any offer ends and what happens if we let you down. *All company facts are invented.</p>
<ul class="checks dark"><li>{CK}<a href="{D("speed-guarantee")["url"]}">Minimum speed guarantee</a></li><li>{CK}<a href="{D("comp-automatic")["url"]}">Automatic compensation</a></li><li>{CK}<a href="{D("rise-annual")["url"]}">Price changes shown up front</a></li><li>{CK}<a href="{D("help-priority")["url"]}">Priority support if you need it</a></li></ul>
<p><a class="btn btn-blue" href="/about.html">More about us {ic("arrow")}</a></p></div></div></section>
<section class="sec"><div class="wrap picker"><div><p class="eyebrow">Choose your speed</p><h2>Find the right package</h2><p class="muted">Pick a speed to see the monthly price and what is included.</p>
<div class="tabs" role="tablist" aria-label="Broadband speed">{tabs}</div>{panels}<p class="sub" style="margin-top:.8rem">*Fictional example prices. <a href="{D("plan-choose")["url"]}">How to choose a plan</a></p></div>
<div class="pkphoto">{img("phoneman")}<span class="tag">{ic("speed")} Up to 1Gbps</span></div></div></section>
<section class="sec sec-soft"><div class="wrap"><div class="sh center"><p class="eyebrow">{name} TV</p><h2>Something for everyone tonight</h2><p>All shows and channels below are fictional. Explore our TV packages, add-ons and streaming apps.</p></div><ul class="shows">{sh}</ul>
<p class="center" style="margin:2rem 0 0"><a class="btn btn-blue" href="/tv.html">Explore TV {ic("arrow")}</a></p></div></section>
<section class="band"><div class="wrap"><div class="sh center"><p class="eyebrow">Our people</p><h2>Meet the support team</h2><p>Real-sounding help from a fictional team. Names are invented; photos are CC0 stock models.</p></div><ul class="team">{tm}</ul></div></section>
<section class="sec"><div class="wrap"><div class="sh center"><p class="eyebrow">Equipment</p><h2>Kit that keeps you connected</h2></div><ul class="eq">{eq}</ul></div></section>
<section class="sec sec-soft"><div class="wrap"><div class="sh center"><p class="eyebrow">Pricing</p><h2>Simple plans, clear prices</h2><p>*Fictional example prices for a research prototype. Prices rise each April by a set amount shown before you buy.</p></div><ul class="prices">{pl}</ul></div></section>
<section class="sec"><div class="wrap"><div class="sh center"><p class="eyebrow">FAQ</p><h2>Questions we hear every day</h2></div><div class="faq">{fq}</div></div></section>
<section class="sec sec-soft"><div class="wrap"><div class="sh center"><p class="eyebrow">Testimonials</p><h2>What our customers say</h2><p>Illustrative testimonials from fictional customers.</p></div><ul class="quotes">{qt}</ul></div></section>
<section class="sec"><div class="wrap"><div class="sh center"><p class="eyebrow">From the blog</p><h2>Tips, guides and news</h2></div><ul class="blog">{bl}</ul></div></section>'''
    write('index.html', layout('Home', home, extra_script=PJ))
    # ---------- area hubs ----------
    for a in areas:
        gs = ''
        for g in a['groups']:
            ds = [d for d in dests if d['area'] == a['id'] and d['group'] == g['id']]
            if not ds: continue
            items = ''
            for i, d in enumerate(ds):
                badge = ''
                if d['id'] in saved_by_dest:
                    s = saved_by_dest[d['id']]; badge = f'<span class="sb">{"Open fault ticket" if s["kind"] == "fault" else "Saved " + E(s["kind"])}</span>'
                items += f'<li{" class=\"hl\"" if i % 4 == 0 else ""}><a href="{d["url"]}"><span class="si">{ic(AICON[a["id"]])}</span>{badge}<h3>{E(d["title"])}</h3><p>{E(d["summary"])}</p>{MORE()}</a></li>'
            gs += f'<section class="grp" id="{g["id"]}" aria-labelledby="h-{g["id"]}"><h2 id="h-{g["id"]}">{E(g["label"])}</h2><ul class="scards">{items}</ul></section>'
        jump = '<ul class="jump" aria-label="Jump to a topic">' + ''.join(f'<li><a href="#{g["id"]}">{E(g["label"])}</a></li>' for g in a['groups']) + '</ul>'
        body = phero(f'{name} {SHORT[a["id"]]}', E(a['label']), a['description'], crumbs([('Home', '/index.html'), (a['label'], None)]), AIMG[a['id']], AICON[a['id']], jump) + f'<div class="wrap">{gs}<div style="height:3.5rem"></div></div>'
        write(f'{a["id"]}.html', layout(a['label'], body, a['id']))
    # ---------- service pages ----------
    for d in dests:
        a = areaby[d['area']]; g = next(x for x in a['groups'] if x['id'] == d['group'])
        toc = ''.join(f'<li><a href="#{s["anchor"]}">{E(s["label"])}</a></li>' for s in d['sections'])
        secs = ''.join(f'<section class="sec2" id="{s["anchor"]}"><h2><span class="n" aria-hidden="true">{i}</span>{E(s["label"])}</h2><p>{E(s["body"])}</p></section>' for i, s in enumerate(d['sections'], 1))
        rel = [x for x in dests if x['area'] == d['area'] and x['group'] == d['group'] and x['id'] != d['id'] and x['kind'] != 'saved']
        relh = ''.join(f'<li><a href="{x["url"]}"><span><b>{E(x["title"])}</b><small>{E(x["summary"])}</small></span>{ic("chev")}</a></li>' for x in rel)
        state = ''
        if d['id'] in saved_by_dest:
            s = saved_by_dest[d['id']]; pr = s['progress']; pc = round(100 * pr['step'] / pr['total'])
            state = f'<div class="state"><span class="sb">{"Open fault ticket" if s["kind"] == "fault" else "Saved " + E(s["kind"])}</span><h2>{E(s["label"])}</h2><p style="margin:0">Reference <strong>{E(s["reference"])}</strong>. Step {pr["step"]} of {pr["total"]}: {E(pr["stepLabel"])}.</p><div class="prog" role="img" aria-label="Step {pr["step"]} of {pr["total"]}"><i style="width:{pc}%"></i></div><p class="sub" style="margin:0">Synthetic demonstration state.</p></div>'
        side = f'<aside class="side" aria-label="Page tools"><nav class="toc" aria-label="On this page"><h2>On this page</h2><ol>{toc}</ol></nav><div class="tipcard"><h2>Not quite right?</h2><p>Press <kbd>/</kbd> or use <strong>I want to&hellip;</strong> and say what you need in your own words.</p></div><div class="helpcard"><h2>Something not working?</h2><p>Check for outages in your area first.</p><a class="btn" href="/p/fault-outage-check.html">Service status</a></div></aside>'
        cr = crumbs([('Home', '/index.html'), (a['label'], f'/{a["id"]}.html'), (g['label'], f'/{a["id"]}.html#{g["id"]}'), (d['title'], None)])
        body = phero(g['label'], E(d['title']), d['summary'], cr, AIMG[a['id']], AICON[a['id']]) + f'<div class="wrap svc">{side}<div>{state}{secs}' + (f'<div class="related"><h2>Related in {E(g["label"])}</h2><ul class="rlist">{relh}</ul></div>' if relh else '') + '</div></div>'
        write(f'p/{d["id"]}.html', layout(d['title'], body, a['id']))
    for sid, t, txt in meta['about']:
        write(f'{sid}.html', layout(t, phero(name, E(t), txt, crumbs([('Home', '/index.html'), (t, None)])) + f'<div class="wrap prose"><p>{E(txt)}</p><p><a href="/index.html">Back to the home page</a></p></div>'))
    write('credits.html', layout('Image credits', phero(name, 'Image credits', 'Photographer, source page and licence for every photo on this site.', crumbs([('Home', '/index.html'), ('Image credits', None)])) + f'<div class="wrap prose" style="max-width:76rem">{credits_table()}</div>'))
    write('search.html', layout('Search', phero('Site search', 'Search', f'Search every {name} guide by keyword.', crumbs([('Home', '/index.html'), ('Search', None)])) + '<div class="wrap prose"><form class="sform" role="search" aria-label="Search results" action="/search.html" method="get"><div class="field"><label for="sq">Search this site</label><input id="sq" name="q" type="search"></div><button class="btn btn-blue" type="submit">Search</button></form><div id="res" aria-live="polite"></div></div>', extra_script=SJ))
    write('compare.html', layout('Compare site search with Usher', phero('Research tool', 'Compare site search with Usher', 'Type the same request once and see what a conventional keyword search returns beside what Usher decides.', crumbs([('Home', '/index.html'), ('Compare', None)])) + '<div class="wrap" style="padding:2rem 1rem 3.4rem"><form id="cf" class="sform"><div class="field"><label for="cq">What do you want to do?</label><input id="cq" type="text" autocomplete="off"></div><button class="btn btn-blue" type="submit">Compare</button></form><div class="cmp"><div><h2>Site search (keywords)</h2><div id="cl" aria-live="polite"></div></div><div><h2>Usher</h2><div id="cr" aria-live="polite"></div></div></div></div>', extra_script=CJ))
# ---------- dispatch ----------
{'insura': build_insura, 'lumenet': build_lumenet}[SID]()
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f'<url><loc>http://{meta["domain"]}{u}</loc></url>' for u in ['/index.html', '/search.html'] + [f'/{a["id"]}.html' for a in areas] + [d['url'] for d in dests] + [f'/{s[0]}.html' for s in meta['about']] + ['/credits.html']) + '</urlset>')
print(json.dumps({'site': meta['id'], 'areas': len(areas), 'pages': len(dests), 'sections': sum(len(d['sections']) for d in dests), 'saved': len(meta['saved']), 'images': len(credits)}))
