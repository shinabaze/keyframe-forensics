// The measurements, as plain functions over numbers, so each one can be tested without a video.

export function meanAbsDiff(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

export function stdDev(px) {
  let sum = 0;
  for (const v of px) sum += v;
  const mean = sum / px.length;
  let sq = 0;
  for (const v of px) sq += (v - mean) ** 2;
  return Math.sqrt(sq / px.length);
}

export function quantile(values, q) {
  const s = [...values].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * q))];
}

// Otsu's method on log10 of the frame differences. A held drawing changes by almost nothing
// (compression noise) and a new drawing changes a lot, so in log space they form two clumps,
// and the best split is where the spread inside each clump is smallest. No magic number.
export function otsuLog(values) {
  const v = values.filter((x) => x > 1e-6).map(Math.log10);
  if (v.length < 8) return null;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  if (hi - lo < 0.5) return null;   // one clump: everything is a hold, or everything moves
  const bins = 64;
  const hist = new Array(bins).fill(0);
  for (const x of v) hist[Math.min(bins - 1, Math.floor(((x - lo) / (hi - lo)) * bins))]++;
  let total = 0;
  for (let i = 0; i < bins; i++) total += i * hist[i];
  let wB = 0;
  let sumB = 0;
  let best = -1;
  let split = 0;
  for (let i = 0; i < bins; i++) {
    wB += hist[i];
    const wF = v.length - wB;
    if (!wB || !wF) continue;
    sumB += i * hist[i];
    const between = wB * wF * (sumB / wB - (total - sumB) / wF) ** 2;
    if (between > best) { best = between; split = i; }
  }
  return 10 ** (lo + ((split + 1) / bins) * (hi - lo));
}

/**
 * How long each drawing is held, from the frame-to-frame differences.
 * Animation is drawn "on ones" (a new drawing every frame at 24 fps), "on twos" (every second
 * frame) or "on threes". Video from a camera is always on ones, so this only means something
 * for animation.
 */
export function holds(diffs, fps) {
  const threshold = otsuLog(diffs);
  if (threshold === null) {
    // One clump. If every frame changes, every frame is a new drawing: that is ones.
    if (diffs.length >= 8 && quantile(diffs, 0.25) > 1) return { threshold: null, holds: [], medianHold: 1, cadence: 'ones' };
    return { threshold: null, holds: [], cadence: 'still' };
  }
  const lengths = [];
  let run = 1;
  for (const d of diffs) {
    if (d > threshold) { lengths.push(run); run = 1; } else run++;
  }
  lengths.push(run);
  // Holds longer than a few frames are pauses, not the drawing rate.
  const working = lengths.filter((n) => n <= 4);
  const median = working.length ? quantile(working, 0.5) : null;
  const at24 = median === null ? null : Math.round((median * 24) / fps);
  const cadence = at24 === null ? 'still' : at24 <= 1 ? 'ones' : at24 === 2 ? 'twos' : at24 === 3 ? 'threes' : 'fours or slower';
  return { threshold, holds: lengths, medianHold: median, cadence };
}

/**
 * Is the cut rhythm varied, or a metronome? Every shot can be fine on its own while the edit
 * still thumps along at one length. The spread is the middle half of shot lengths divided by
 * the median, so it means the same for a slow edit and a fast one.
 */
export function rhythm(shotSeconds, { metronomeBelow = 0.2 } = {}) {
  if (shotSeconds.length < 4) return { shots: shotSeconds.length, verdict: 'too few shots to tell' };
  const p25 = quantile(shotSeconds, 0.25);
  const median = quantile(shotSeconds, 0.5);
  const p75 = quantile(shotSeconds, 0.75);
  const spread = (p75 - p25) / median;
  return { shots: shotSeconds.length, p25, median, p75, spread, verdict: spread < metronomeBelow ? 'metronome' : 'varied' };
}

export function shotLengths(cuts, duration) {
  const edges = [0, ...cuts.filter((t) => t > 0.05 && t < duration - 0.05), duration];
  return edges.slice(1).map((t, i) => t - edges[i]).filter((s) => s > 0.04);
}

/**
 * Does it move inside its shots, or is it a deck of slides? `pairs` are the frame-to-frame
 * differences at a fixed sample rate, with cut frames already removed.
 */
export function slideshow(pairs, flatRuns, { fps, movingAbove = 8, slideshowBelow = 0.03, blankRunSeconds = 0.5 } = {}) {
  const moving = pairs.filter((d) => d >= movingAbove).length;
  const share = pairs.length ? moving / pairs.length : 0;
  const longestBlank = flatRuns.length ? Math.max(...flatRuns) / fps : 0;
  const problems = [];
  if (share < slideshowBelow) problems.push(`only ${(share * 100).toFixed(1)}% of frames move: it reads as slides`);
  if (longestBlank >= blankRunSeconds) problems.push(`a blank stretch of ${longestBlank.toFixed(2)}s`);
  return { movingShare: share, longestBlankSeconds: longestBlank, verdict: problems.length ? 'slideshow' : 'moves', problems };
}

// Where sounds start: a 10 ms window much louder than the second before it.
export function onsets(samples, rate, { jump = 4, minGapMs = 80 } = {}) {
  const win = Math.round(rate / 100);
  const rms = [];
  for (let i = 0; i + win <= samples.length; i += win) {
    let s = 0;
    for (let j = i; j < i + win; j++) s += samples[j] * samples[j];
    rms.push(Math.sqrt(s / win));
  }
  const out = [];
  let last = -Infinity;
  for (let i = 1; i < rms.length; i++) {
    const before = rms.slice(Math.max(0, i - 100), i);
    const floor = Math.max(quantile(before, 0.5), 50);
    if (rms[i] > floor * jump && rms[i] > rms[i - 1] && (i - last) * 10 >= minGapMs) {
      out.push(i / 100);
      last = i;
    }
  }
  return out;
}

/**
 * Does the picture follow the sound? For each picture event, is there a sound onset within
 * `frames` frames? On its own that number flatters a busy soundtrack, so it is printed beside
 * the same figure for events moved to random times: only the margin over chance counts.
 */
export function sync(events, sounds, { fps, frames = 2, duration, trials = 200, seed = 1 } = {}) {
  const near = (t) => sounds.some((s) => Math.abs(s - t) <= frames / fps);
  const hit = (list) => (list.length ? list.filter(near).length / list.length : 0);
  let x = seed;
  const random = () => ((x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  let chance = 0;
  for (let k = 0; k < trials; k++) chance += hit(events.map(() => random() * duration));
  chance /= trials;
  const actual = hit(events);
  return { events: events.length, sounds: sounds.length, actual, chance, margin: actual - chance };
}
