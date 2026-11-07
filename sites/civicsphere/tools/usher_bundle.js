#!/usr/bin/env node
// usage: node tools/usher_bundle.js <siteDir> [--check]  -> usher/usher.js = engine + explain + (already built) usher-widget.js, same recipe as tools/usher-build.js
const fs=require('fs'),path=require('path');const D=path.join(path.resolve(process.argv[2]),'usher'),rd=f=>fs.readFileSync(path.join(D,f),'utf8');
const out=['/usher-demonstrator/sites/civicsphere/* Usher bundle: usher-engine + usher-explain + usher-widget (see the individual files for documentation). */',rd('usher-engine.js'),rd('usher-explain.js'),rd('usher-widget.js')].join('\n;\n');
if(process.argv.includes('--check')){console.log(out===rd('usher.js')?'bundle matches recipe':'bundle DIFFERS');process.exit(0);}
fs.writeFileSync(path.join(D,'usher.js'),out);console.log('wrote',path.join(D,'usher.js'),out.length);
