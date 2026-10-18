// Two clips made by ffmpeg on the spot, measured with every check. Run: node examples/demo.js
import { spawnSync } from 'node:child_process';

import { cards, cleanup, moving } from '../test/clips.js';

const clips = {
  'six one-second cards, a click on every cut': cards([1, 1, 1, 1, 1, 1], { clicks: 0 }),
  'a three-second camera pan': moving(),
};
for (const [what, file] of Object.entries(clips)) {
  console.log(`\n${what}`);
  const r = spawnSync(process.execPath, ['cli.js', 'all', file], { encoding: 'utf8' });
  console.log((r.stdout || r.stderr).trim().replace(/^/gm, '  '));
}
cleanup();
