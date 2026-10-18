import assert from 'node:assert/strict';
import { test } from 'node:test';

import { holds, otsuLog, rhythm, shotLengths, sync } from '../src/measure.js';

test('otsu splits holds from new drawings without being told where', () => {
  const diffs = [0.1, 0.2, 0.1, 30, 0.15, 25, 0.1, 0.12, 28, 0.2, 0.1, 31];
  const t = otsuLog(diffs);
  assert.ok(t > 0.2 && t < 25, `threshold ${t}`);
});

test('otsu gives up on one clump instead of inventing a split', () => {
  assert.equal(otsuLog([10, 11, 12, 10, 11, 12, 10, 11, 12]), null);
  // Every frame changes a lot: every frame is a new drawing.
  assert.equal(holds([10, 11, 12, 10, 11, 12, 10, 11], 24).cadence, 'ones');
  // Nothing changes at all: a still image, not animation.
  assert.equal(holds([0.1, 0.12, 0.1, 0.11, 0.1, 0.12, 0.1, 0.11], 24).cadence, 'still');
});

test('a pause is not the drawing rate', () => {
  // On twos, with one 12 frame hold in the middle (a pause).
  const twos = [0.1, 30, 0.1, 30, 0.1, 30, ...new Array(11).fill(0.1), 30, 0.1, 30, 0.1, 30];
  assert.equal(holds(twos, 24).cadence, 'twos');
});

test('rhythm spread is relative, so a slow edit and a fast edit compare fairly', () => {
  const slow = rhythm([8, 9, 8.5, 9, 8.8, 9.2]);
  const fast = rhythm([0.8, 0.9, 0.85, 0.9, 0.88, 0.92]);
  assert.equal(slow.verdict, 'metronome');
  assert.equal(fast.verdict, 'metronome');
  assert.ok(Math.abs(slow.spread - fast.spread) < 0.01);
});

test('shot lengths ignore cuts in the first and last frames', () => {
  assert.deepEqual(shotLengths([0.01, 1, 2, 2.99], 3).map((x) => +x.toFixed(2)), [1, 1, 1]);
});

test('sync reports the margin over chance, not the raw hit rate', () => {
  // A soundtrack with a sound every 0.1 s: everything "lands on a sound", and that means nothing.
  const busy = Array.from({ length: 100 }, (_, i) => i / 10);
  const r = sync([1, 2, 3, 4, 5], busy, { fps: 24, duration: 10 });
  assert.equal(r.actual, 1);
  assert.ok(r.chance > 0.8 && r.margin < 0.2, JSON.stringify(r));
});
