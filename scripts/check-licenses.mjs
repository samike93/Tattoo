// Dependency rule: only MIT, Apache-2.0, BSD, ISC, CC0 (and equivalents) may ship in the app.
// Walks every production dependency (transitively) and fails on anything else.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED = /^(MIT|MIT-0|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|0BSD|ISC|CC0-1\.0|Unlicense|BlueOak-1\.0\.0|Zlib|Python-2\.0)$/;
const paths = execSync('npm ls --omit=dev --all --parseable', { encoding: 'utf8' }).trim().split('\n').slice(1);
const seen = new Map();
for (const path of new Set(paths)) {
  const pkg = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8'));
  const lic = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type ?? (pkg.licenses ?? []).map((l) => l.type ?? l).join(' OR ');
  seen.set(path, { name: pkg.name, version: pkg.version, license: lic || 'UNKNOWN' });
}

const ok = (expr) => expr.replace(/[()]/g, '').split(/\s+OR\s+/).some((alt) => alt.split(/\s+AND\s+/).every((p) => ALLOWED.test(p.trim())));
const bad = [...seen.values()].filter((p) => !ok(p.license));
const counts = {};
for (const p of seen.values()) counts[p.license] = (counts[p.license] ?? 0) + 1;
console.log(`${seen.size} production packages:`, counts);
if (bad.length) {
  console.error('Not allowed:', bad);
  process.exit(1);
}
console.log('All production dependency licenses are allowed.');
