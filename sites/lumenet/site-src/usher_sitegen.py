#!/usr/bin/env python3
"""Usher demo-site generator.
usage: usher_sitegen.py <content_dir> <out_dir> <usher_template_build_dir>
content_dir: NN_*.txt authored content (DSL below) + meta.json. One source -> pages, profile, search index, sitemap (so they cannot drift apart).
DSL:  =AREA id | Label | description | service|account      =GROUP id | Label (belongs to the last AREA)
      #id | Title | group | summary | alias;alias | desc ;; desc        - Section label :: body
"""
import sys, os, re, json, glob, shutil, html
src, out, tpl = sys.argv[1:4]
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
shutil.copy(sys.argv[0], os.path.join(out, 'site-src', 'usher_sitegen.py'))
json.dump(profile, open(os.path.join(out, 'usher-profile.json'), 'w'), indent=1, ensure_ascii=False)
# ---------- search index (visible text only) ----------
E = html.escape
sdocs = [{"id": d['id'], "title": d['title'], "area": areaby[d['area']]['label'], "group": next(g['label'] for g in areaby[d['area']]['groups'] if g['id'] == d['group']), "summary": d['summary'], "url": d['url'],
          "sections": [{"anchor": s['anchor'], "label": s['label'], "body": s['body']} for s in d['sections']]} for d in dests]
json.dump(sdocs, open(os.path.join(out, 'search-docs.json'), 'w'), ensure_ascii=False)
# ---------- pages ----------
th = meta['theme']; name = meta['name']
CSS = """:root{--accent:%(accent)s;--accent-dark:%(accentDark)s;--tint:%(tint)s;--hi:%(highlight)s;--hi-tint:%(highlightTint)s;--link:%(link)s;--ink:#1b1f24;--muted:#4b5563;--line:#cfd6dd;--soft:#f5f7f9;--usher-accent:%(accent)s;--usher-accent-dark:%(accentDark)s;--usher-accent-tint:%(tint)s;--usher-highlight:%(highlight)s;--usher-highlight-tint:%(highlightTint)s;--usher-link:%(link)s;--usher-font:"Source Sans 3",system-ui,sans-serif}
@font-face{font-family:"Source Sans 3";src:url(fonts/source-sans-3-latin-400-normal.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Source Sans 3";src:url(fonts/source-sans-3-latin-600-normal.woff2) format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"Source Sans 3";src:url(fonts/source-sans-3-latin-700-normal.woff2) format("woff2");font-weight:700;font-display:swap}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%%}body{margin:0;font:1.0625rem/1.55 "Source Sans 3",system-ui,sans-serif;color:var(--ink);background:#fff}
a{color:var(--link)}a:hover{color:var(--accent-dark)}a:focus-visible,button:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid var(--hi);outline-offset:2px}
.skip{position:absolute;left:-999px;top:0;background:#fff;padding:.5rem 1rem;z-index:20}.skip:focus{left:0}
.wrap{max-width:68rem;margin:0 auto;padding:0 1rem}
header.site{background:var(--accent);color:#fff}header.site a{color:#fff;text-decoration:none}
.bar{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem;padding:.75rem 0}
.brand{display:flex;align-items:center;gap:.6rem;font-weight:700;font-size:1.4rem}.brand .mark{display:inline-grid;place-items:center;width:2.2rem;height:2.2rem;border-radius:50%%;background:var(--hi);color:var(--accent-dark);font-weight:700}
.brand small{display:block;font-size:.8rem;font-weight:400;opacity:.9}
form.search{display:flex;flex:1 1 100%%;gap:.4rem}form.search input{flex:1;min-width:0;padding:.6rem .7rem;border:2px solid transparent;border-radius:6px;font:inherit}
form.search button{padding:.6rem 1rem;border:0;border-radius:6px;background:var(--hi);color:var(--accent-dark);font:inherit;font-weight:600;cursor:pointer}
nav.main{background:var(--accent-dark)}nav.main ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap}nav.main a{display:block;padding:.6rem .8rem;color:#fff;text-decoration:none;font-size:.95rem}nav.main a:hover,nav.main a[aria-current]{background:rgba(255,255,255,.15)}
nav.main details summary{padding:.7rem 1rem;color:#fff;cursor:pointer;font-weight:600;list-style:none}nav.main details summary::-webkit-details-marker{display:none}
header.site .phase a{color:var(--link);text-decoration:underline}
.phase{background:var(--hi-tint);color:var(--ink);border-bottom:1px solid var(--line);font-size:.9rem;padding:.4rem 0}
main{padding:1.25rem 0 3rem}h1{font-size:1.9rem;line-height:1.2;margin:.5rem 0 .75rem;color:var(--accent-dark)}h2{font-size:1.35rem;margin:1.6rem 0 .5rem;color:var(--accent-dark)}
.lead{font-size:1.2rem;color:var(--muted);margin:0 0 1rem}.crumbs{font-size:.92rem;color:var(--muted);margin:.25rem 0}.crumbs a{color:var(--link)}
.hero{background:var(--tint);padding:1.5rem 0;margin:-1.25rem 0 1.5rem}.hero h1{font-size:2.2rem}
.cards{display:grid;gap:.9rem;grid-template-columns:1fr;padding:0;list-style:none}.cards li{border:1px solid var(--line);border-top:4px solid var(--accent);border-radius:6px;padding:.9rem 1rem;background:#fff}.cards h2,.cards h3{margin:0 0 .3rem;font-size:1.2rem}.cards p{margin:0;color:var(--muted);font-size:.98rem}
.toc{background:var(--soft);border:1px solid var(--line);border-radius:6px;padding:.8rem 1rem;margin:1rem 0}.toc h2{margin:0 0 .3rem;font-size:1rem}.toc ul{margin:0;padding-left:1.1rem}.toc li{margin:.15rem 0}.toc a{display:inline-block;min-height:24px;padding:.2rem 0}
section.sec{border-top:1px solid var(--line);padding-top:.2rem;scroll-margin-top:7rem}section.sec:target{background:var(--hi-tint);outline:3px solid var(--hi);padding:0 .75rem 1rem}
.list{list-style:none;padding:0;margin:0}.list li{padding:.7rem 0;border-bottom:1px solid var(--line)}.list a{font-weight:600}.list p{margin:.15rem 0 0;color:var(--muted)}
.related{margin-top:2rem}.state{border:2px solid var(--accent);border-radius:6px;padding:.8rem 1rem;background:var(--tint);margin:1rem 0}
.btn{display:inline-block;padding:.6rem 1rem;border-radius:6px;background:var(--accent);color:#fff;text-decoration:none;font-weight:600;border:0;font:inherit;cursor:pointer}.btn:hover{background:var(--accent-dark);color:#fff}
footer.site{background:var(--soft);border-top:1px solid var(--line);padding:1.2rem 0 5rem;font-size:.95rem}footer.site ul{list-style:none;padding:0;margin:.3rem 0;display:flex;flex-wrap:wrap;gap:.3rem 1rem}
.results li{padding:.7rem 0;border-bottom:1px solid var(--line)}.results .sub{color:var(--muted);font-size:.9rem}.cmp{display:grid;gap:1.2rem;grid-template-columns:1fr}.cmp>div{border:1px solid var(--line);border-radius:6px;padding:1rem}.cmp h2{margin-top:0}
@media(min-width:40rem){.cards{grid-template-columns:repeat(2,1fr)}form.search{flex:0 1 24rem;margin-left:auto}.cmp{grid-template-columns:1fr 1fr}}
@media(min-width:62rem){.cards{grid-template-columns:repeat(3,1fr)}nav.main details summary{display:none}}
@media(max-width:61.99rem){nav.main details:not([open]) ul{display:none}nav.main ul{display:block}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important}}
""" % {'accent': th['accent'], 'accentDark': th['accentDark'], 'tint': th['tint'], 'highlight': th['highlight'], 'highlightTint': th['highlightTint'], 'link': th['link']}
open(os.path.join(out, 'assets/site.css'), 'w').write(CSS)
SEARCH_JS = open(os.path.join(os.path.dirname(os.path.abspath(sys.argv[0])), 'usher_site_search.js')).read()
open(os.path.join(out, 'assets/site-search.js'), 'w').write(SEARCH_JS)
def layout(title, body, path, cur=None, h1='', extra_script='', main_class=''):
    nav = ''.join(f'<li><a href="/{a["id"]}.html"{" aria-current=\"page\"" if cur == a["id"] else ""}>{E(a["label"])}</a></li>' for a in areas)
    logo = f'<span class="mark" aria-hidden="true">{meta["logo"]}</span>'
    return f'''<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)} - {name}</title><meta name="description" content="{name} (fictional {meta['noun']}): research prototype for Usher.">
<link rel="stylesheet" href="/assets/site.css"></head><body>
<a class="skip" href="#main">Skip to main content</a>
<header class="site"><div class="wrap bar"><a class="brand" href="/index.html">{logo}<span>{name}<small>{E(meta['tagline'])}</small></span></a>
<form class="search" role="search" aria-label="Site search" action="/search.html" method="get"><label class="visually-hidden" for="q" style="position:absolute;left:-999px">Search this site</label><input id="q" name="q" type="search" placeholder="Search {name}" autocomplete="off"><button type="submit">Search</button></form></div>
<nav class="main" aria-label="Main"><div class="wrap"><details open id="menu"><summary>Menu</summary><ul>{nav}</ul></details></div></nav>
<div class="phase"><div class="wrap"><strong>Research prototype.</strong> {name} is fictional. All products, prices, people and contact details are invented. <a href="/about.html">About</a></div></div></header>
<main id="main" tabindex="-1"><div class="wrap">{body}</div></main>
<footer class="site"><div class="wrap"><ul><li><a href="/about.html">About</a></li><li><a href="/careers.html">Careers</a></li><li><a href="/privacy.html">Privacy</a></li><li><a href="/cookies.html">Cookies</a></li><li><a href="/accessibility.html">Accessibility statement</a></li><li><a href="/press.html">Press</a></li><li><a href="/compare.html">Compare with site search</a></li></ul><p>&copy; 2026 {name} (fictional). Fonts: Source Sans 3 (SIL OFL).</p></div></footer>
<script>(function(){{var d=document.getElementById('menu');if(d&&window.matchMedia('(max-width:61.99rem)').matches)d.removeAttribute('open')}})()</script>
<script src="/usher/usher.js" data-profile="/usher-profile.json" data-index="/usher-index.json" data-models="/models/" data-vendor="/vendor/" data-compare="/compare.html"></script>
{extra_script}</body></html>
'''
def write(rel, content):
    p = os.path.join(out, rel); os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w', encoding='utf8').write(content)
# home
cards = ''.join(f'<li><h2><a href="/{a["id"]}.html">{E(a["label"])}</a></h2><p>{E(a["description"])}</p></li>' for a in areas)
write('index.html', layout('Home', f'<div class="hero"><div class="wrap" style="padding:0"><h1>{E(meta["hero"])}</h1><p class="lead">{E(meta["heroSub"])}</p><p>Try the <strong>I want to&hellip;</strong> button at the bottom of the screen (or press <kbd>/</kbd>) and describe what you are trying to do.</p></div></div><h2>What do you need help with?</h2><ul class="cards">{cards}</ul>', 'index.html'))
for a in areas:
    gs = ''
    for g in a['groups']:
        items = ''.join(f'<li><a href="{d["url"]}">{E(d["title"])}</a><p>{E(d["summary"])}</p></li>' for d in dests if d['area'] == a['id'] and d['group'] == g['id'])
        if items: gs += f'<h2 id="{g["id"]}">{E(g["label"])}</h2><ul class="list">{items}</ul>'
    write(f'{a["id"]}.html', layout(a['label'], f'<p class="crumbs"><a href="/index.html">Home</a> &rsaquo; {E(a["label"])}</p><h1>{E(a["label"])}</h1><p class="lead">{E(a["description"])}</p>{gs}', f'{a["id"]}.html', a['id']))
saved_by_dest = {s['destination']: s for s in meta['saved']}
for d in dests:
    a = areaby[d['area']]; g = next(x for x in a['groups'] if x['id'] == d['group'])
    toc = ''.join(f'<li><a href="#{s["anchor"]}">{E(s["label"])}</a></li>' for s in d['sections'])
    secs = ''.join(f'<section class="sec" id="{s["anchor"]}"><h2>{E(s["label"])}</h2><p>{E(s["body"])}</p></section>' for s in d['sections'])
    rel = ''.join(f'<li><a href="{x["url"]}">{E(x["title"])}</a></li>' for x in dests if x['area'] == d['area'] and x['group'] == d['group'] and x['id'] != d['id'] and x['kind'] != 'saved')[:2000]
    state = ''
    if d['id'] in saved_by_dest:
        s = saved_by_dest[d['id']]; pr = s['progress']
        state = f'<div class="state"><strong>{E(s["label"])}</strong><br>Reference {E(s["reference"])}. Step {pr["step"]} of {pr["total"]}: {E(pr["stepLabel"])}. <span class="sub">(Synthetic demonstration state.)</span></div>'
    parent = f'<p class="crumbs"><a href="/index.html">Home</a> &rsaquo; <a href="/{a["id"]}.html">{E(a["label"])}</a> &rsaquo; <a href="/{a["id"]}.html#{g["id"]}">{E(g["label"])}</a> &rsaquo; {E(d["title"])}</p>'
    write(f'p/{d["id"]}.html', layout(d['title'], f'{parent}<h1>{E(d["title"])}</h1><p class="lead">{E(d["summary"])}</p>{state}<nav class="toc" aria-label="On this page"><h2>On this page</h2><ul>{toc}</ul></nav>{secs}' + (f'<div class="related"><h2>Related</h2><ul class="list">{rel}</ul></div>' if rel else ''), f'p/{d["id"]}.html', a['id']))
for sid, t, txt in meta['about']:
    write(f'{sid}.html', layout(t, f'<h1>{E(t)}</h1><p>{E(txt)}</p><p><a href="/index.html">Back to the home page</a></p>', f'{sid}.html'))
# search page
sj = '<script src="/assets/site-search.js"></script><script>(function(){var q=new URLSearchParams(location.search).get("q")||"";var box=document.getElementById("sq");box.value=q;var out=document.getElementById("res");if(!q.trim()){out.innerHTML="<p>Type a word or phrase to search the site.</p>";return}fetch("/search-docs.json").then(function(r){return r.json()}).then(function(docs){var s=SiteSearch.build(docs);var hits=s.search(q,10);if(!hits.length){out.innerHTML="<p>No results for <strong>"+SiteSearch.escape(q)+"</strong>. Try different words.</p>";return}out.innerHTML="<p>"+hits.length+" results for <strong>"+SiteSearch.escape(q)+"</strong></p><ol class=\\"results\\">"+hits.map(function(h){var d=h.doc;var url=d.url+(h.sectionAnchor?"#"+h.sectionAnchor:"");return "<li><a href=\\""+url+"\\">"+SiteSearch.escape(d.title)+"</a><div class=\\"sub\\">"+SiteSearch.escape(d.area)+" &rsaquo; "+SiteSearch.escape(d.group)+"</div><div>"+SiteSearch.escape(d.summary)+"</div></li>"}).join("")+"</ol>"})})()</script>'
write('search.html', layout('Search', '<h1>Search</h1><form role="search" aria-label="Search results" action="/search.html" method="get"><label for="sq">Search this site</label><br><input id="sq" name="q" type="search" style="width:100%;max-width:30rem;padding:.6rem;font:inherit;border:2px solid #4b5563;border-radius:6px"> <button class="btn" type="submit">Search</button></form><div id="res" aria-live="polite"></div>', 'search.html', extra_script=sj))
# compare page
cj = r'''<script src="/assets/site-search.js"></script><script>(function(){
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
write('compare.html', layout('Compare site search with Usher', '<h1>Compare site search with Usher</h1><p class="lead">Type the same request once and see what a conventional keyword search returns beside what Usher decides.</p><form id="cf"><label for="cq">What do you want to do?</label><br><input id="cq" type="text" style="width:100%;max-width:34rem;padding:.6rem;font:inherit;border:2px solid #4b5563;border-radius:6px" autocomplete="off"> <button class="btn" type="submit">Compare</button></form><div class="cmp"><div><h2>Site search (keywords)</h2><div id="cl" aria-live="polite"></div></div><div><h2>Usher</h2><div id="cr" aria-live="polite"></div></div></div>', 'compare.html', extra_script=cj))
# sitemap + README
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f'<url><loc>http://{meta["domain"]}{u}</loc></url>' for u in ['/index.html', '/search.html'] + [f'/{a["id"]}.html' for a in areas] + [d['url'] for d in dests] + [f'/{s[0]}.html' for s in meta['about']]) + '</urlset>')
routable = [d for d in dests]
print(json.dumps({'site': meta['id'], 'areas': len(areas), 'pages': len(dests), 'sections': sum(len(d['sections']) for d in dests), 'saved': len(meta['saved'])}))
