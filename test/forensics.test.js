import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import * as kf from '../src/index.js';
import { animation, cards, cleanup, moving } from './clips.js';

after(cleanup);

test('holds: drawn on ones, twos and threes', async () => {
  assert.equal((await kf.holds(animation(24))).cadence, 'ones');
  assert.equal((await kf.holds(animation(12))).cadence, 'twos');
  assert.equal((await kf.holds(animation(8))).cadence, 'threes');
});

test('cuts: every hard cut is found, at the right time', async () => {
  const r = await kf.cuts(cards([1, 1, 1, 1, 1, 1]));
  assert.equal(r.cuts.length, 5);
  r.cuts.forEach((t, i) => assert.ok(Math.abs(t - (i + 1)) < 0.05, `cut ${i} at ${t}`));
});

test('rhythm: shots all one length is a metronome, mixed lengths are varied', async () => {
  assert.equal((await kf.cuts(cards([1, 1, 1, 1, 1, 1]))).rhythm.verdict, 'metronome');
  assert.equal((await kf.cuts(cards([0.4, 2, 0.8, 3, 0.6, 1.6]))).rhythm.verdict, 'varied');
});

test('slideshow: still cards read as slides, a moving pattern does not', async () => {
  assert.equal((await kf.slideshow(cards([1, 1, 1, 1]))).verdict, 'slideshow');
  assert.equal((await kf.slideshow(moving())).verdict, 'moves');
});

test('slideshow: a blank stretch in the middle is caught', async () => {
  const r = await kf.slideshow(cards([1, 1, 1, 1], { blankAt: 1 }));
  assert.ok(r.problems.some((p) => /blank stretch/.test(p)), r.problems.join('; '));
});

test('sync: cuts on the clicks beat chance; cuts half a second off do not', async () => {
  const on = await kf.sync(cards([1, 1, 1, 1, 1, 1], { clicks: 0 }));
  const off = await kf.sync(cards([1, 1, 1, 1, 1, 1], { clicks: 0.5 }));
  assert.ok(on.margin > 0.5, `on the beat: ${JSON.stringify(on)}`);
  assert.ok(off.margin < 0.2, `half a second off: ${JSON.stringify(off)}`);
});
