# keyframe-forensics

Measure how a video is cut and animated, with ffmpeg alone. Give it a clip and it tells you:

- where the hard cuts are, and whether the shot lengths vary or thump along like a metronome
- whether animation is drawn on ones, twos or threes
- whether anything moves inside the shots, or it reads as a deck of slides
- whether the cuts land on the sounds, measured against chance

I use this before I edit, to measure a reference instead of describing it, and after, to check
my own renders. "It feels fast" isn't something you can build to. A shot-length table is.

**Run it** (Node 22+, ffmpeg 6+ on your PATH, nothing to install):

```bash
node examples/demo.js                       # makes two test clips and measures them
node cli.js all your-video.mp4              # every check
node cli.js cuts your-video.mp4 --json      # one check, as JSON
node --test                                 # the tests make their own clips with ffmpeg
```

## How it works

```
video --ffmpeg--> small grey frames --> difference between each frame and the last
      |                                   +-> holds: split "same drawing" from "new drawing"
      |                                   +-> slideshow: how often the picture really moves
      +--ffmpeg scene score--> hard cuts --> shot lengths --> rhythm: spread of the middle half
      +--ffmpeg audio--> loudness every 10 ms --> sound onsets --> sync: cuts near a sound, vs chance
```

| Check | What it reports | Calls it a problem when |
|---|---|---|
| `cuts` | cut times, cuts a minute, shot lengths at p25 / median / p75 | the middle half of shot lengths spreads less than 20% of the median (a metronome) |
| `holds` | ones, twos, threes, or still | never: it's a description, not a verdict |
| `slideshow` | share of frame pairs (at 12 fps, cuts left out) that change by 8+ grey levels; longest blank stretch | under 3% moving, or a blank stretch of 0.5 s or more |
| `sync` | share of cuts within 2 frames of a sound onset, beside the same share for random times | reported only, since the right answer depends on the piece |

Every threshold is an option in `src/measure.js`. [docs/explained.md](docs/explained.md) covers
ones and twos, scene scores and why chance matters. [docs/decisions.md](docs/decisions.md) has
the reasons for each choice.

## A worked example

`node examples/demo.js` builds two clips with ffmpeg and measures them:

```
six one-second cards, a click on every cut
  cuts      5 (50.0 a minute)
  rhythm    metronome: shots 1.00s / 1.00s / 1.00s (p25 / median / p75), spread 0.00
  holds     still
  motion    slideshow: 0.0% of frames move, longest blank 0.00s
  sync      100.0% of cuts land on a sound, 13.2% by chance (86.8 points over chance)

a three-second camera pan
  cuts      0 (0.0 a minute)
  holds     ones (median hold 1 frames at 24 fps)
  motion    moves: 100.0% of frames move, longest blank 0.00s
```

The cards are the edit you don't want: a picture change every second on the second, and
nothing moving in between. The sync check still scores it 87 points over chance, which is right:
the cuts really are on the clicks. Being in sync doesn't make an edit good.

## What I learned

- **Every shot can pass while the edit fails.** An early render of mine passed every per-shot
  check, and every shot was almost exactly the same length. Nothing looked at the whole edit. The
  spread of shot lengths is the check that does.
- **A hit rate means nothing without chance beside it.** A busy soundtrack has a sound near
  almost every frame, so "80% of cuts land on a sound" can be pure luck. Moving the same cuts to
  random times gives the number to beat.
- **A fixed threshold breaks on the next source.** The change between two frames of the same
  drawing is compression noise, and a new drawing is a real change. The size of both depends on
  the video. In log space they always form two clumps, so Otsu's method finds the split per video.

## Limits

- Hard cuts only. Slow dissolves and whip pans are missed or counted twice.
- Holds only mean something for animation. Camera footage is always "on ones".
- The sync check needs sounds with sharp starts: effects, clicks, drums. Narration floods it
  with onsets, so measure a music-and-effects mix.
- It measures timing, not taste. Composition and colour are for your eyes.

## Files

```
cli.js        node cli.js <cuts|holds|slideshow|sync|all> <video> [--json]
src/          ffmpeg.js (the only file that runs ffmpeg), measure.js (plain maths), index.js
test/         clips.js makes the test videos; node:test
examples/     demo.js
docs/         explained.md, decisions.md
```

MIT licence. Copyright 2026 Shinabaze Ajiya.
