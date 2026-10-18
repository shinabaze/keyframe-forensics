// The checks, each one reading a video file and returning plain numbers.
import { cutTimes, greyFrames, monoSamples, probe } from './ffmpeg.js';
import * as m from './measure.js';

export { probe };

export async function cuts(file, { threshold = 0.3 } = {}) {
  const { duration } = probe(file);
  const times = cutTimes(file, threshold);
  const shots = m.shotLengths(times, duration);
  return { cuts: times, shots, perMinute: (times.length / duration) * 60, rhythm: m.rhythm(shots) };
}

export async function holds(file) {
  const { fps } = probe(file);
  const diffs = [];
  let prev = null;
  await greyFrames(file, (px) => { if (prev) diffs.push(m.meanAbsDiff(prev, px)); prev = Buffer.from(px); });
  return { fps, ...m.holds(diffs, fps) };
}

export async function slideshow(file, { fps = 12 } = {}) {
  const { duration } = probe(file);
  const cutFrames = new Set(cutTimes(file).map((t) => Math.round(t * fps)));
  const pairs = [];
  const flatRuns = [];
  let flat = 0;
  let prev = null;
  await greyFrames(file, (px, i) => {
    // A frame with almost no tonal range is blank: black, white or one flat colour.
    if (m.stdDev(px) < 4) flat++; else { if (flat) flatRuns.push(flat); flat = 0; }
    if (prev && !cutFrames.has(i)) pairs.push(m.meanAbsDiff(prev, px));
    prev = Buffer.from(px);
  }, { fps });
  if (flat && flat / fps < duration - 0.1) flatRuns.push(flat);
  return m.slideshow(pairs, flatRuns, { fps });
}

export async function sync(file, { frames = 2 } = {}) {
  const { fps, duration } = probe(file);
  const samples = monoSamples(file);
  if (!samples) return { error: 'no audio stream' };
  return m.sync(cutTimes(file), m.onsets(samples, 8000), { fps, frames, duration });
}
