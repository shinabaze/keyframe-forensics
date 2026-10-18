// Test clips made by ffmpeg on the spot, so the repo ships no video and every result is known.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'kf-'));
const COLOURS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'gray'];

function ffmpeg(name, args) {
  const out = path.join(DIR, name);
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args, '-pix_fmt', 'yuv420p', out], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`could not make ${name}: ${r.stderr}`);
  return out;
}

// A moving test pattern drawn at `rate` new images a second, shown at 24 fps.
export const animation = (rate) => ffmpeg(`anim-${rate}.mp4`,
  ['-f', 'lavfi', '-i', `testsrc2=size=320x240:rate=${rate}`, '-t', '3', '-vf', 'fps=24']);

// A camera pan: the whole frame moves.
export const moving = () => ffmpeg('pan.mp4', ['-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=24,scroll=h=0.02', '-t', '3']);

// Still cards, one colour each, with a grid so a card is not mistaken for a blank frame.
export function cards(seconds, { blankAt = -1, clicks = null } = {}) {
  const parts = seconds.map((d, i) => (i === blankAt
    ? `color=c=black:s=320x240:r=24:d=${d}[v${i}]`
    : `color=c=${COLOURS[i % COLOURS.length]}:s=320x240:r=24:d=${d},drawgrid=w=40:h=40:t=4:c=white[v${i}]`));
  const join = `${seconds.map((_, i) => `[v${i}]`).join('')}concat=n=${seconds.length}`;
  const video = ['-f', 'lavfi', '-i', `${parts.join(';')};${join}`];
  const total = seconds.reduce((a, b) => a + b, 0);
  const name = `cards-${seconds.join('_')}-${blankAt}-${clicks ?? 'mute'}.mp4`;
  if (clicks === null) return ffmpeg(name, video);
  // A short 2 kHz click once a second, `clicks` seconds after each whole second.
  const audio = ['-f', 'lavfi', '-i', `aevalsrc='if(lt(mod(t-${clicks},1),0.01),0.8*sin(2*PI*2000*t),0)':s=8000:d=${total}`];
  return ffmpeg(name, [...video, ...audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-shortest']);
}

export const cleanup = () => fs.rmSync(DIR, { recursive: true, force: true });
