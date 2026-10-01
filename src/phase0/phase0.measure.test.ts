import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { parseBodyGlb, prepareBody } from '../body/loadBody';
import type { BodyId, Skeleton } from '../body/skeleton';
import { runStudy, type StudyRow } from './study';

const root = resolve(import.meta.dirname, '../..');
const pct = (x: number | undefined) => (x === undefined || !Number.isFinite(x) ? '–' : `${(100 * x).toFixed(1)}%`);

it('Phase 0 distortion study on the real bodies', async () => {
  const rows: StudyRow[] = [];
  for (const id of ['male', 'female'] as BodyId[]) {
    const buf = readFileSync(resolve(root, `public/models/${id}.glb`));
    const sk = JSON.parse(readFileSync(resolve(root, `public/models/${id}.skeleton.json`), 'utf8')) as Skeleton;
    const raw = await parseBodyGlb(id, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, sk);
    rows.push(...runStudy(prepareBody(raw)));
  }
  mkdirSync(resolve(root, 'docs/phase0'), { recursive: true });
  writeFileSync(resolve(root, 'docs/phase0/metrics.json'), JSON.stringify(rows, null, 1));

  const lines = [
    '| Body | Scenario | Method | Within 5% | Size error mean / p95 / max | Not square, mean / p95 | Mirrored | Seam | Time |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    const s = r.stats;
    lines.push(
      `| ${r.body} | ${r.scenario} | ${r.method} | ${pct(s?.within5)} | ${s ? `${pct(s.sizeErrMean)} / ${pct(s.sizeErrP95)} / ${pct(s.sizeErrMax)}` : '–'} | ${s ? `${pct(s.anisoMean)} / ${pct(s.anisoP95)}` : '–'} | ${pct(s?.flippedFraction)} | ${r.seamMismatchMm === undefined ? '–' : `${r.seamMismatchMm.toFixed(2)} mm`} | ${r.ms === undefined ? '–' : `${r.ms.toFixed(1)} ms`} |${r.note ? ` ${r.note}` : ''}`,
    );
  }
  writeFileSync(resolve(root, 'docs/phase0/metrics.md'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  expect(rows.length).toBeGreaterThan(10);
});
