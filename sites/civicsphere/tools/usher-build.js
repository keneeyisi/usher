#!/usr/bin/env node
// usher build: inlines usher/src/widget.css into usher/src/widget.js -> usher/usher-widget.js, and writes the one-file bundle
// usher/usher.js = engine + explain + widget (the file a site adds with one <script> tag; usher-embedder.js is loaded as an ES module beside it).
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..', 'usher'), rd = f => fs.readFileSync(path.join(D, f), 'utf8');
const widget = rd('src/widget.js').replace("/*@@CSS@@*/''", () => JSON.stringify(rd('src/widget.css')));
fs.writeFileSync(path.join(D, 'usher-widget.js'), widget);
fs.writeFileSync(path.join(D, 'usher.js'), ['/usher-demonstrator/sites/civicsphere/* Usher bundle: usher-engine + usher-explain + usher-widget (see the individual files for documentation). */', rd('usher-engine.js'), rd('usher-explain.js'), widget].join('\n;\n'));
console.log('built usher-widget.js and usher.js (' + (fs.statSync(path.join(D, 'usher.js')).size / 1024).toFixed(0) + ' KB)');
