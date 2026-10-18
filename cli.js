#!/usr/bin/env node
// node cli.js <cuts|holds|slideshow|sync|all> <video> [--json]
import * as kf from './src/index.js';

const [check, file, flag] = process.argv.slice(2);
const checks = { cuts: kf.cuts, holds: kf.holds, slideshow: kf.slideshow, sync: kf.sync };
if (!file || !(check in checks || check === 'all')) {
  console.error('usage: node cli.js <cuts|holds|slideshow|sync|all> <video> [--json]');
  process.exit(2);
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const s = (x) => `${x.toFixed(2)}s`;

const print = {
  cuts: (r) => [
    `cuts      ${r.cuts.length} (${r.perMinute.toFixed(1)} a minute)`,
    r.rhythm.verdict === 'too few shots to tell' ? `rhythm    ${r.rhythm.verdict}`
      : `rhythm    ${r.rhythm.verdict}: shots ${s(r.rhythm.p25)} / ${s(r.rhythm.median)} / ${s(r.rhythm.p75)} (p25 / median / p75), spread ${r.rhythm.spread.toFixed(2)}`,
  ],
  holds: (r) => [`holds     ${r.cadence}${r.medianHold ? ` (median hold ${r.medianHold} frames at ${r.fps} fps)` : ''}`],
  slideshow: (r) => [`motion    ${r.verdict}: ${pct(r.movingShare)} of frames move, longest blank ${s(r.longestBlankSeconds)}`,
    ...r.problems.map((p) => `          ${p}`)],
  sync: (r) => [r.error ? `sync      ${r.error}`
    : `sync      ${pct(r.actual)} of cuts land on a sound, ${pct(r.chance)} by chance (${(r.margin * 100).toFixed(1)} points over chance)`],
};

const out = {};
for (const name of check === 'all' ? Object.keys(checks) : [check]) {
  out[name] = await checks[name](file);
  if (flag !== '--json') console.log(print[name](out[name]).join('\n'));
}
if (flag === '--json') console.log(JSON.stringify(out, null, 2));
