# Raw source assets

Drop originals here; `pnpm dither` writes three-colour versions to
`../dithered/`. Nothing in this folder ships — only the dithered output does.

- **Images** (`.png .jpg .webp .tif`) → lossless `.webp`
- **Video** (`.mp4 .mov .m4v`) → muted looping `.webm` — needs ffmpeg

Subfolders are preserved, so `raw/work/lrn.png` becomes `dithered/work/lrn.webp`.

## Before a batch

Run `pnpm dither:sample` to process a single image, look at it, then run the
full batch. Dithering changes a lot with the algorithm and dot size:

```
pnpm dither --algo=bayer     # regular grid, compresses much smaller
pnpm dither --algo=atkinson  # organic scatter (default, matches the portrait)
pnpm dither --scale=3        # chunkier dots
pnpm dither --force          # reprocess everything
```

Output is cached by content hash plus settings, so re-running only touches what
changed. Changing the palette in `tokens.css` invalidates everything, since the
palette is read from there rather than hard-coded.

## Licensing

Only put files here you have the right to publish. For public-domain images
(e.g. Wikimedia Commons), record the source and licence next to the file.
