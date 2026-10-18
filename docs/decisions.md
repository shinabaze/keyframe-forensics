# Decisions

**ffmpeg only.** It is already on every machine that edits video, it decodes everything, and its
scene score and raw frame output are all this needs. No Python, no OpenCV, no install step.

**Small grey frames.** Colour and resolution don't change when a drawing changes. 160 pixels wide
keeps a ten-minute video to seconds of work.

**Otsu, not a fixed number, for holds.** The size of a "same drawing" difference depends on the
codec and the bitrate, and the size of a "new drawing" depends on the style. One fixed threshold
reads one source right and the next one wrong. Otsu finds the gap in each video. When there is no
gap (every frame changes, or none does), it says ones or still instead of inventing a split.

**Long holds are left out of the drawing rate.** A character standing still for two seconds is a
pause, not the drawing rate. Only holds of 4 frames or fewer count toward ones, twos or threes.

**Spread is relative.** An edit of 9-second shots that are all 9 seconds is as much a metronome
as an edit of 1-second shots that are all 1 second. Dividing the middle half by the median treats
them the same.

**Cut frames are left out of the motion share.** A cut is a big change between frames but it is
not movement. Counting cuts would let a fast slideshow pass as motion.

**Blank means flat, not dark.** A frame counts as blank when its brightness barely varies (a
standard deviation under 4), so a dark but detailed shot still counts as picture.

**Sync is reported against chance, and never gated.** Whether cuts should land on sounds depends
on the piece. The number is only worth reading beside what random cuts would score on the same
soundtrack, so both are printed.

**Test clips are made, not shipped.** ffmpeg draws the test videos when the tests run (moving test
patterns, coloured cards, clicks), so the expected answer for each one is known exactly and the
repo holds no footage.
