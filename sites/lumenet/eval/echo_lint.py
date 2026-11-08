import json,re,sys
def toks(s): return re.sub(r"[^a-z0-9 ]"," ",s.lower().replace("'","")).split()
def run(site,items_file):
    p=json.load(open(f'../build/Goalpost_{site.capitalize()}/goalpost-profile.json'))
    texts=[]
    for d in p['destinations']:
        for t in [d['title'],d['summary']]+d.get('descriptions',[])+d.get('aliases',[]): texts.append((d['id'],t))
        for s in d['sections']: texts.append((d['id'],s['label']))
    T=[(i,toks(t)) for i,t in texts]
    stop=set('a an the i my me is it to of and in on for we you your do how can what when are was be at as or if so this that with'.split())
    out=[]
    for it in json.load(open(items_file))['items']:
        q=toks(it['query']); qg={tuple(q[i:i+3]) for i in range(len(q)-2)}; qs={t for t in q if t not in stop}
        best=(0,0,'')
        for i,t in T:
            g={tuple(t[k:k+3]) for k in range(len(t)-2)}; sh=len(qg&g)
            ts={x for x in t if x not in stop}; j=len(qs&ts)/max(1,len(qs|ts))
            if (sh,j)>best[:2]: best=(sh,round(j,2),i+': '+' '.join(t))
        out.append((it['id'],it['query'],best))
    return out
for site in ('insura','lumenet'):
    for f in (f'{site}_tuned.json',f'{site}_heldout_DRAFT.json'):
        o=run(site,f); flag=[x for x in o if x[2][0]>=1 or x[2][1]>=0.5]
        print('==',f,len(o),'flagged',len(flag))
        for x in flag: print(' ',x[0],repr(x[1]),'->',x[2])
