#!/usr/bin/env node
// usher validate <profile.json>: exit 0 if valid (warnings allowed), 1 on errors.
const path = require('path'), fs = require('fs');
const G = require(path.join(__dirname, '..', 'usher', 'usher-engine.js'));
const f = process.argv[2]; if (!f) { console.error('usage: usher-validate.js <profile.json>'); process.exit(2); }
let p; try { p = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error('cannot read profile: ' + e.message); process.exit(2); }
const v = G.validateProfile(p);
for (const e of v.errors) console.log('ERROR ' + e); for (const w of v.warnings) console.log('WARN  ' + w);
console.log(`${v.ok ? 'VALID' : 'INVALID'} ${JSON.stringify(v.counts)} (${v.errors.length} errors, ${v.warnings.length} warnings)`); process.exit(v.ok ? 0 : 1);
