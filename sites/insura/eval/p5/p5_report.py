# Builds the P5 results tables from the goalpost-eval-v2 outputs in p5/final (no re-running, no item edits).
import json, math, sys
from math import comb
D='/workspace/civicspherenav/work/eval_gp/'
def wilson(k,n,z=1.96):
    if n==0: return 'n/a'
    p=k/n; den=1+z*z/n; c=(p+z*z/(2*n))/den; h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
    return f'{100*p:.1f}% [{100*max(0,c-h):.0f}-{100*min(1,c+h):.0f}] ({k}/{n})'
def mcn(x,y):  # exact two-sided McNemar on paired booleans; returns onlyX, onlyY, p
    b=sum(1 for i,j in zip(x,y) if i and not j); c=sum(1 for i,j in zip(x,y) if j and not i); n=b+c
    p=1.0 if n==0 else min(1.0,2*sum(comb(n,k) for k in range(0,min(b,c)+1))/2**n)
    return b,c,p
STRICT={'insura':{'INS_F04','INS_F11','INS_F27','INS_F46','INS_F54'},'lumenet':{'LUM_F25','LUM_F38','LUM_F39','LUM_F47'}}
BROAD={'insura':STRICT['insura']|{'INS_F07','INS_F15','INS_F21','INS_F23'},'lumenet':STRICT['lumenet']|{'LUM_F05','LUM_F16','LUM_F27','LUM_F30','LUM_F37','LUM_F52','LUM_F53'}}
def table(site,setname,ver,exclude=frozenset()):
    J=json.load(open(f'{D}p5/final/{setname}_{ver}_{site}.json')); R=[r for r in J['rows'] if r['id'] not in exclude]
    nav=[r for r in R if r['gold']=='navigate']; rej=[r for r in R if r['gold']=='reject']; cla=[r for r in R if r['gold']=='clarify']
    out={'n':len(R),'nNav':len(nav),'nClar':len(cla),'nRej':len(rej)}
    cc=[bool(r['c'].get('correctNav')) for r in nav]
    out['committedCorrect']={'GP':wilson(sum(cc),len(nav))}
    for b in ['a','a2','b']: out['committedCorrect'][b]=wilson(sum(r[b]['h1'] for r in nav),len(nav))
    # wrong destination over ALL items: Goalpost = committed somewhere wrong (incl. committing on clarify/reject items); a ranked list always commits its top-1, so it is wrong on every item whose top-1 is not the gold page (all clarify/reject items count as wrong for it)
    gw=[bool(r['c'].get('wrongNav')) for r in R]
    out['wrongDestAll']={'GP':wilson(sum(gw),len(R))}
    bw={b:[not (r['gold']=='navigate' and r[b]['h1']) for r in R] for b in ['a','a2','b']}
    for b in bw: out['wrongDestAll'][b]=wilson(sum(bw[b]),len(R))
    gwn=[bool(r['c'].get('wrongNav')) for r in nav]; out['wrongDestNavItems']={'GP':wilson(sum(gwn),len(nav))}
    for b in ['a','a2','b']: out['wrongDestNavItems'][b]=wilson(sum(not r[b]['h1'] for r in nav),len(nav))
    clar=[r for r in R if r['c']['decision']=='clarify']
    out['clarificationRate']=wilson(len(clar),len(R)); out['clarGoldInOptions']=wilson(sum(1 for r in clar if r['c'].get('offersGold')),len(clar))
    out['within1']={'GP':wilson(sum(bool(r['c'].get('within1')) for r in nav),len(nav))}
    for b in ['a','a2','b']: out['within1'][b+'_hit3']=wilson(sum(r[b]['h3'] for r in nav),len(nav))
    out['rejection']=wilson(sum(1 for r in rej if r['c']['decision']=='reject'),len(rej))
    out['decisionCorrectAll']=wilson(sum(1 for r in R if (r['c'].get('correctNav') if r['gold']=='navigate' else r['c'].get('correct'))),len(R))
    out['mcnemar_committedCorrect']={b:mcn(cc,[r[b]['h1'] for r in nav]) for b in ['a','a2','b']}
    out['mcnemar_noWrongDestAll']={b:mcn([not x for x in gw],[not x for x in bw[b]]) for b in bw}
    S=J['summary']; out['savedState']=S.get('savedState'); out['twins']=S.get('twins')
    return out
if __name__=='__main__':
    res={}
    for site in ['insura','lumenet']:
        for st in ['heldout_fresh_p5_FROZEN','heldout_FROZEN','tuned_v2']:
            for v in ['v4','v3']: res[f'{site}|{st}|{v}']=table(site,st,v)
        for v in ['v4','v3']:
            res[f'{site}|fresh_minus_strict_neardups|{v}']=table(site,'heldout_fresh_p5_FROZEN',v,STRICT[site])
            res[f'{site}|fresh_minus_broad_neardups|{v}']=table(site,'heldout_fresh_p5_FROZEN',v,BROAD[site])
    json.dump(res,open(D+'p5/final/p5_tables.json','w'),indent=1); print('ok',len(res))
