/* R6 UI checks: vendored axe-core (tests/vendor/axe.min.js, test-only) on key pages + screenshots.
   Usage: node tests/run_ui_checks.js [baseUrl] [outDir]   (serve the build on :8008 first) */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const BASE=(process.argv[2]||'http://localhost:8008/').replace(/\/?$/,'/usher-demonstrator/sites/civicsphere/');const OUT=process.argv[3]||path.join(__dirname,'..','ui_check_results');
const AXE=path.join(__dirname,'vendor','axe.min.js');fs.mkdirSync(path.join(OUT,'screens'),{recursive:true});
const PAGES=[['home','#home'],['directory','#directory'],['domain','#domain/transport-vehicles'],['group','#group/transport-vehicles/'+encodeURIComponent('Parking')],['service-parking','#service/residential-parking'],['service-identity','#service/identity-replacement'],['account-dashboard','#domain/my-civicsphere'],['activity-in-progress','#service/activity-in-progress/section/0'],['saved-application','#service/saved-residential-parking-application'],['search','#search/parking'],['info-accessibility','#info/accessibility'],['task-parking-resumed','#task/parking/2/resumed'],['not-found','#service/nope']];
async function axe(pg){await pg.addScriptTag({path:AXE});return pg.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}});return r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.length,targets:v.nodes.slice(0,3).map(n=>n.target.join(' '))}))})}
(async()=>{const b=await chromium.launch();const res=[];const errs=[],ext=[];
 async function newPage(vp){const ctx=await b.newContext({viewport:vp});const pg=await ctx.newPage();pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});pg.on('pageerror',e=>errs.push(e.message));pg.on('request',r=>{const u=r.url();if(!u.startsWith(BASE.replace(/\/$/,''))&&!/^(data|blob):/.test(u))ext.push(u)});return pg}
 const pg=await newPage({width:1366,height:900});await pg.goto(BASE+'index.html#home');await pg.waitForTimeout(400);
 const rgx=g=>(g.groups&&g.groups['transport-vehicles'])||[];
 for(const [name,h] of PAGES){await pg.evaluate(x=>{location.hash=x},h);await pg.waitForTimeout(900);if(name==='group'){const ok=await pg.evaluate(()=>!!document.querySelector('.listitem'));if(!ok){const g=await pg.evaluate(()=>CivicCore.GROUPS['transport-vehicles'][0]);await pg.evaluate(x=>{location.hash=x},'#group/transport-vehicles/'+encodeURIComponent(g));await pg.waitForTimeout(600)}}
  const v=await axe(pg);res.push({page:name,hash:await pg.evaluate(()=>location.hash),viewport:'desktop',violations:v})}
 // shots
 const shot=async(p,n,full)=>{await p.screenshot({path:path.join(OUT,'screens',n+'.png'),fullPage:!!full})};
 await pg.evaluate(()=>{location.hash='#home'});await pg.waitForTimeout(500);await shot(pg,'01_homepage_desktop',true);
 await pg.evaluate(()=>{location.hash='#service/identity-replacement'});await pg.waitForTimeout(500);await shot(pg,'02_service_page_identity_replacement',true);
 await pg.evaluate(()=>{location.hash='#domain/my-civicsphere'});await pg.waitForTimeout(500);await shot(pg,'03_my_account_dashboard',true);
 // assistant: wait for model, then T04-like query
 await pg.evaluate(()=>{location.hash='#home'});await pg.click('#nbpill');await pg.waitForFunction(()=>/ready|keyword matching/.test(document.getElementById('nbstatus').textContent),null,{timeout:180000});
 await pg.fill('#nbinput',"I've just moved into a new house and need to sort out parking. I want to know what I'll have to pay.");await pg.click('#nbfind');
 await pg.waitForFunction(()=>location.hash.startsWith('#group/')&&/Parking/.test(document.getElementById('trace').textContent)&&document.querySelector('#app h1')&&/Parking/.test(document.querySelector('#app h1').textContent),null,{timeout:60000,polling:20});await shot(pg,'04a_assistant_navigating_trace');
 await pg.waitForFunction(()=>document.getElementById('nbresult').dataset.navigation==='complete',null,{timeout:60000});await pg.waitForFunction(()=>document.querySelector('[data-highlighted="1"]'),null,{timeout:10000});await pg.waitForTimeout(1200);
 await shot(pg,'04b_assistant_arrived_section_highlighted');const arrived=await pg.evaluate(()=>({hash:location.hash,decision:document.getElementById('nbresult').dataset.decision,trace:window.__civicTrace.slice(-1)[0]}));
 res.push({page:'assistant-open-with-result',hash:arrived.hash,viewport:'desktop',violations:await axe(pg)});
 // debug mode
 const dp=await newPage({width:1366,height:900});await dp.goto(BASE+'index.html?debug=1#home');await dp.waitForTimeout(600);res.push({page:'debug-panel',hash:'?debug=1#home',viewport:'desktop',violations:await axe(dp)});
 // mobile
 const mp=await newPage({width:390,height:844});await mp.goto(BASE+'index.html#home');await mp.waitForTimeout(500);res.push({page:'home',hash:'#home',viewport:'mobile-390',violations:await axe(mp)});await shot(mp,'05a_mobile_homepage');
 await mp.click('.menu-toggle');await mp.waitForTimeout(200);await shot(mp,'05b_mobile_menu_open');res.push({page:'home-menu-open',hash:'#home',viewport:'mobile-390',violations:await axe(mp)});await mp.click('.menu-toggle');
 await mp.evaluate(()=>{location.hash='#service/residential-parking/section/2'});await mp.waitForTimeout(1500);await shot(mp,'05c_mobile_service_section_highlighted');res.push({page:'service-parking-section',hash:'#service/residential-parking/section/2',viewport:'mobile-390',violations:await axe(mp)});
 await mp.click('#nbpill');await mp.waitForTimeout(300);await shot(mp,'05d_mobile_assistant_sheet');res.push({page:'assistant-sheet',hash:'#service/residential-parking/section/2',viewport:'mobile-390',violations:await axe(mp)});
 const sp=await newPage({width:320,height:640});const reflow=[];for(const h of ['#home','#service/residential-parking','#domain/my-civicsphere','#task/parking/2/resumed']){await sp.goto(BASE+'index.html'+h);await sp.waitForTimeout(500);reflow.push({hash:h,scrollWidth:await sp.evaluate(()=>document.documentElement.scrollWidth),ok:await sp.evaluate(()=>document.documentElement.scrollWidth<=322)})}
 console.log('reflow 320px:',JSON.stringify(reflow));
 const tally={};res.forEach(r=>r.violations.forEach(v=>{tally[v.impact]=(tally[v.impact]||0)+v.nodes}));
 const summary={reflow,base:BASE,axeVersion:'4.14.0',pages:res.length,impactNodeTotals:tally,arrived,consoleErrors:errs,externalRequests:ext,results:res};
 fs.writeFileSync(path.join(OUT,'ui_checks.json'),JSON.stringify(summary,null,2));
 console.log('pages checked:',res.length);res.forEach(r=>console.log(`${r.viewport.padEnd(10)} ${r.page.padEnd(28)} ${r.violations.length?r.violations.map(v=>v.impact+':'+v.id+'('+v.nodes+')').join(', '):'no violations'}`));
 console.log('impact totals (nodes):',JSON.stringify(tally));console.log('assistant arrived:',JSON.stringify(arrived));console.log('console errors:',errs.length,'external requests:',ext.length);await b.close()})();
