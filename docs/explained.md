# Measuring an edit, explained from scratch

## Frames and differences

A video is a list of pictures, usually 24, 25 or 30 a second. To see what changes, this tool
asks ffmpeg for every frame as a small grey picture (160 pixels wide) and works out how
different each one is from the one before: the average, over all pixels, of how far each pixel's
brightness moved (0 to 255). Two identical frames score 0. A cut from a black frame to a white
one scores 255.

## On ones, twos and threes

Hand-drawn animation is usually shown at 24 frames a second, but a new drawing isn't made for
every frame. "On twos" means each drawing is shown for 2 frames, so 12 new drawings a second.
"On threes" is 8. Action often goes to ones for smoothness, and quiet moments sit on threes.

In the frame differences that looks like this, on twos:

```
diff:  0.1  31  0.1  29  0.2  30  0.1  ...
        |   new  |   new  |   new
       same     same     same
```

The "same drawing" values are compression noise. The "new drawing" values are real change. On a
log scale they sit far apart, and Otsu's method picks the split between the two clumps. Count
the frames between splits and the most common gap (ignoring long pauses) is the drawing rate.

## Hard cuts

ffmpeg gives every frame a scene score from 0 to 1: how unlike the previous frame it is. A hard
cut scores high, usually over 0.3, and ordinary motion scores low. The cut times give the shot
lengths.

## Is the rhythm varied?

Take the shot lengths, sort them, and look at the middle half: the 25th percentile (p25) and the
75th (p75). For shots of 0.4, 0.6, 0.8, 1.6, 2 and 3 seconds that is 0.6 s to 2 s around a median
of 1.6 s. The spread is (2 - 0.6) / 1.6 = 0.875, a varied edit. Six shots of exactly 1 s give a
spread of 0: a metronome. Dividing by the median means a slow edit and a fast edit compare fairly.

## Does it move inside the shots?

Sample at 12 frames a second, leave out the frames where a cut happens, and count how many
neighbouring frames differ by 8 grey levels or more. A camera pan scores near 100%. A deck of
still cards scores 0%. Below 3%, the video reads as slides, however good each slide is.

## Does the picture follow the sound?

Find where sounds start (onsets): 10 ms windows that are 4 times louder than the second before.
For each cut, is there an onset within 2 frames? That gives a hit rate. Then move the cuts to
random times 200 times and take the average hit rate, which is what luck gives on this
soundtrack. The margin between the two is what counts. With clicks once a second and 6 cuts
exactly on them, the hit rate is 100% and chance is about 13%, a margin of 87 points.
