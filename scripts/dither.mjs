/**
 * Build-time dithering pipeline.
 *
 *   src/assets/raw/**        images (.png .jpg .webp) and short clips (.mp4 .mov)
 *   src/assets/dithered/**   images as WebP, video as looping muted WebM
 *
 * Every image on the site uses the same three-colour treatment, so the palette
 * is read from src/styles/tokens.css rather than copied here — the design
 * system stays the single source of truth.
 *
 * Usage:
 *   pnpm dither            process everything that is out of date
 *   pnpm dither --force    reprocess everything
 *   pnpm dither --sample   process ONE image and stop, for iterating on look
 *   pnpm dither --algo=bayer|atkinson
 *   pnpm dither --scale=N  pixel size (default 2: one dither dot = N device px)
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const run = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW = path.join(ROOT, "src/assets/raw");
const OUT = path.join(ROOT, "src/assets/dithered");
const TOKENS = path.join(ROOT, "src/styles/tokens.css");
const MANIFEST = path.join(OUT, ".manifest.json");

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm"]);

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const FORCE = flag("force");
const SAMPLE = flag("sample");
const ALGO = opt("algo", "atkinson");
const SCALE = Math.max(1, Number(opt("scale", "2")));

/* ---------- palette ---------- */

/** Reads brand/ink/accent out of tokens.css so the two cannot drift. */
async function readPalette() {
  const css = await fs.readFile(TOKENS, "utf8");
  const pick = (name) => {
    const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{3,8})`, "i"));
    if (!m) throw new Error(`--color-${name} not found in tokens.css`);
    return hexToRgb(m[1]);
  };
  return [pick("brand"), pick("ink"), pick("accent")];
}

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* ---------- dithering ---------- */

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => v / 16 - 0.5));

/** Perceptual-ish distance; weights green the way the eye does. */
function nearest(palette, r, g, b) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const [pr, pg, pb] = palette[i];
    const d = 0.3 * (r - pr) ** 2 + 0.59 * (g - pg) ** 2 + 0.11 * (b - pb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return palette[best];
}

/**
 * Atkinson dithering. Pushes only 3/4 of the error, which keeps highlights and
 * shadows clean — the classic early-Macintosh look, and the reason it reads
 * better than Floyd–Steinberg at three colours.
 */
function atkinson(data, w, h, palette) {
  const err = new Float32Array(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const r = clamp(data[i] + err[i]);
      const g = clamp(data[i + 1] + err[i + 1]);
      const b = clamp(data[i + 2] + err[i + 2]);
      const [nr, ng, nb] = nearest(palette, r, g, b);
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;

      const er = (r - nr) / 8;
      const eg = (g - ng) / 8;
      const eb = (b - nb) / 8;
      for (const [dx, dy] of [
        [1, 0],
        [2, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
        [0, 2],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const j = (ny * w + nx) * 3;
        err[j] += er;
        err[j + 1] += eg;
        err[j + 2] += eb;
      }
    }
  }
}

/** Ordered Bayer 4x4: no error diffusion, so it holds a regular grid. */
function bayer(data, w, h, palette) {
  const spread = 56;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const t = BAYER4[y % 4][x % 4] * spread;
      const [nr, ng, nb] = nearest(
        palette,
        clamp(data[i] + t),
        clamp(data[i + 1] + t),
        clamp(data[i + 2] + t),
      );
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
    }
  }
}

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

/**
 * Dither one image buffer.
 *
 * The image is reduced by SCALE first, dithered, then scaled back with nearest
 * neighbour. That is what makes the dots chunky and keeps them aligned to a
 * grid; dithering at full resolution gives a fine noise that disappears at
 * normal viewing size.
 */
async function ditherImage(input, palette, { width } = {}) {
  let pipe = sharp(input).rotate();
  const meta = await pipe.metadata();

  const targetW = width ?? meta.width;
  const smallW = Math.max(1, Math.round(targetW / SCALE));

  const small = await pipe
    .resize({ width: smallW, fit: "inside", withoutEnlargement: false })
    .removeAlpha()
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = small;
  if (ALGO === "bayer") bayer(data, info.width, info.height, palette);
  else atkinson(data, info.width, info.height, palette);

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    .resize({
      width: info.width * SCALE,
      height: info.height * SCALE,
      kernel: "nearest",
    })
    .webp({ lossless: true, effort: 6 });
}

/* ---------- video ---------- */

async function hasFfmpeg() {
  try {
    await run("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Video path: explode to frames, dither each, reassemble as muted looping WebM.
 * Slow by nature — every frame goes through the same per-pixel pass.
 */
async function ditherVideo(src, dest, palette, tmpDir) {
  await fs.mkdir(tmpDir, { recursive: true });
  const framesDir = path.join(tmpDir, "frames");
  await fs.mkdir(framesDir, { recursive: true });

  await run("ffmpeg", [
    "-y",
    "-i", src,
    "-vf", "fps=12,scale=640:-2:flags=lanczos",
    path.join(framesDir, "f%05d.png"),
  ]);

  const frames = (await fs.readdir(framesDir)).filter((f) => f.endsWith(".png"));
  for (const f of frames) {
    const p = path.join(framesDir, f);
    const out = await ditherImage(p, palette);
    await out.toFile(p.replace(/\.png$/, ".webp"));
    await fs.rm(p);
  }

  await run("ffmpeg", [
    "-y",
    "-framerate", "12",
    "-i", path.join(framesDir, "f%05d.webp"),
    "-an",
    "-c:v", "libvpx-vp9",
    "-b:v", "0",
    "-crf", "34",
    "-pix_fmt", "yuv420p",
    dest,
  ]);

  await fs.rm(tmpDir, { recursive: true, force: true });
}

/* ---------- driver ---------- */

async function walk(dir, base = dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full));
  }
  return out;
}

async function fingerprint(file, extra) {
  const buf = await fs.readFile(file);
  return createHash("sha1")
    .update(buf)
    .update(JSON.stringify(extra))
    .digest("hex")
    .slice(0, 16);
}

async function main() {
  const palette = await readPalette();
  const paletteHex = palette.map(
    (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join(""),
  );

  await fs.mkdir(RAW, { recursive: true });
  await fs.mkdir(OUT, { recursive: true });

  const files = await walk(RAW);
  if (!files.length) {
    console.log(
      `No source files. Drop images or clips into src/assets/raw/ and run again.\n` +
        `Palette: ${paletteHex.join("  ")}   algo: ${ALGO}   scale: ${SCALE}`,
    );
    return;
  }

  let manifest = {};
  if (!FORCE) {
    try {
      manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
    } catch {
      /* first run */
    }
  }

  const images = files.filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()));
  const videos = files.filter((f) => VIDEO_EXT.has(path.extname(f).toLowerCase()));
  // Docs and dotfiles live alongside the sources; they are not "unsupported".
  const skipped = files.filter(
    (f) =>
      !images.includes(f) &&
      !videos.includes(f) &&
      !/^(\.|.*\.(md|txt|json)$)/i.test(path.basename(f)),
  );

  const ffmpegOk = videos.length ? await hasFfmpeg() : true;
  if (videos.length && !ffmpegOk) {
    console.warn(
      `\n  ffmpeg not found — ${videos.length} clip(s) skipped.\n` +
        `  Install it and re-run to process video:  winget install Gyan.FFmpeg\n`,
    );
  }

  const queue = SAMPLE ? images.slice(0, 1) : images;
  if (SAMPLE) {
    console.log(`Sample mode: processing one image only.\n`);
  }

  let done = 0;
  let fresh = 0;

  for (const rel of queue) {
    const src = path.join(RAW, rel);
    const dest = path.join(OUT, rel.replace(/\.[^.]+$/, ".webp"));
    const fp = await fingerprint(src, { ALGO, SCALE, paletteHex });

    if (!FORCE && manifest[rel] === fp) {
      fresh++;
      continue;
    }

    await fs.mkdir(path.dirname(dest), { recursive: true });
    const out = await ditherImage(src, palette);
    const info = await out.toFile(dest);
    manifest[rel] = fp;
    done++;
    console.log(
      `  ${rel} → ${path.relative(ROOT, dest)}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`,
    );
  }

  if (!SAMPLE && ffmpegOk) {
    for (const rel of videos) {
      const src = path.join(RAW, rel);
      const dest = path.join(OUT, rel.replace(/\.[^.]+$/, ".webm"));
      const fp = await fingerprint(src, { ALGO, SCALE, paletteHex });
      if (!FORCE && manifest[rel] === fp) {
        fresh++;
        continue;
      }
      await fs.mkdir(path.dirname(dest), { recursive: true });
      console.log(`  ${rel} → dithering frames…`);
      await ditherVideo(src, dest, palette, path.join(OUT, ".tmp", rel));
      const st = await fs.stat(dest);
      manifest[rel] = fp;
      done++;
      console.log(
        `  ${rel} → ${path.relative(ROOT, dest)}  ${(st.size / 1024).toFixed(1)} KB`,
      );
    }
  }

  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2));

  console.log(
    `\n${done} processed, ${fresh} already up to date` +
      (skipped.length ? `, ${skipped.length} unsupported` : "") +
      `\nPalette: ${paletteHex.join("  ")}   algo: ${ALGO}   scale: ${SCALE}`,
  );

  if (SAMPLE && images.length > 1) {
    console.log(
      `\nCheck the sample before processing the rest. Try --algo=bayer or` +
        ` --scale=3 to change the look, then run: pnpm dither`,
    );
  }
}

main().catch((err) => {
  console.error(`\ndither failed: ${err.message}`);
  process.exitCode = 1;
});
