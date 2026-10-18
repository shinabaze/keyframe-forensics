import { spawn, spawnSync } from 'node:child_process';

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`${cmd} not found: install ffmpeg (it ships ffprobe too)`);
  if (r.status !== 0) throw new Error(`${cmd} failed: ${(r.stderr || '').trim().split('\n').pop()}`);
  return r.stdout + r.stderr;
}

export function probe(file) {
  const out = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=r_frame_rate,width,height:format=duration', '-of', 'json', file]);
  const j = JSON.parse(out.slice(out.indexOf('{')));
  const [a, b] = j.streams[0].r_frame_rate.split('/').map(Number);
  return { fps: a / (b || 1), width: j.streams[0].width, height: j.streams[0].height, duration: Number(j.format.duration) };
}

// Hard cuts: ffmpeg scores how different each frame is from the last (0..1) and we keep the
// frames above the threshold. Slow dissolves score low and are missed, on purpose.
export function cutTimes(file, threshold = 0.3) {
  const out = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-an', '-vf',
    `select='gt(scene,${threshold})',metadata=print`, '-f', 'null', '-']);
  return [...out.matchAll(/pts_time:([0-9.]+)/g)].map((m) => Number(m[1]));
}

// Every frame as small greyscale pixels, one Buffer at a time. 160 px wide is plenty to see
// motion, and keeps a 10 minute video to a few seconds of work.
export function greyFrames(file, onFrame, { width = 160, fps } = {}) {
  const { width: w0, height: h0 } = probe(file);
  const height = Math.max(2, Math.round((h0 * width) / w0 / 2) * 2);
  const vf = [fps ? `fps=${fps}` : null, `scale=${width}:${height}`].filter(Boolean).join(',');
  const size = width * height;
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', file, '-an', '-vf', vf, '-pix_fmt', 'gray', '-f', 'rawvideo', '-']);
  let carry = Buffer.alloc(0);
  let n = 0;
  return new Promise((resolve, reject) => {
    ff.stdout.on('data', (chunk) => {
      const buf = carry.length ? Buffer.concat([carry, chunk]) : chunk;
      let off = 0;
      for (; buf.length - off >= size; off += size) onFrame(buf.subarray(off, off + size), n++);
      carry = Buffer.from(buf.subarray(off));
    });
    ff.on('error', () => reject(new Error('ffmpeg not found: install ffmpeg')));
    ff.on('close', (code) => (code === 0 ? resolve({ frames: n, width, height }) : reject(new Error(`ffmpeg exited ${code}`))));
  });
}

// The soundtrack as 16-bit mono samples at a low rate: enough to find where sounds start.
export function monoSamples(file, rate = 8000) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(rate), '-f', 's16le', '-'],
    { maxBuffer: 512 * 1024 * 1024 });
  if (r.error) throw new Error('ffmpeg not found: install ffmpeg');
  if (r.status !== 0 || !r.stdout.length) return null;   // no audio stream
  return new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 2);
}
