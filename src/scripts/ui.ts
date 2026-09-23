/**
 * Progressive-enhancement UI behavior: mobile nav and the work carousel.
 *
 * This lives in a module imported by BaseLayout rather than in <script> tags
 * inside the components, because component-level scripts are not reliably
 * bundled when the component is rendered through a named slot.
 *
 * Everything here is additive: the nav links and the carousel track both work
 * without JS (the track is a native scroll-snap list).
 */

export function initUI() {
  setupNav();
  setupCarousel();
}

/**
 * True the first time this element is seen, false afterwards.
 *
 * initUI runs on first load and again on every view transition, and a
 * transition may reuse DOM (persisted islands) rather than replace it — so
 * binding must never stack. A toggle bound twice cancels itself out.
 */
function claim(el: Element, key: string) {
  const flag = `bound${key}`;
  if ((el as HTMLElement).dataset[flag] === "1") return false;
  (el as HTMLElement).dataset[flag] = "1";
  return true;
}

function setupNav() {
  const toggle = document.querySelector<HTMLButtonElement>("[data-nav-toggle]");
  const overlay = document.querySelector<HTMLElement>("[data-nav-overlay]");
  const label = document.querySelector<HTMLElement>("[data-nav-label]");
  if (!toggle || !overlay || !label) return;
  if (!claim(toggle, "Nav")) return;

  const setOpen = (open: boolean) => {
    overlay.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    label.textContent = open ? "Close" : "Menu";
    document.body.style.overflow = open ? "hidden" : "";
  };

  toggle.addEventListener("click", () =>
    setOpen(toggle.getAttribute("aria-expanded") !== "true"),
  );

  overlay
    .querySelectorAll("[data-nav-close]")
    .forEach((a) => a.addEventListener("click", () => setOpen(false)));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
}

function setupCarousel() {
  const track = document.querySelector<HTMLElement>("[data-carousel-track]");
  const controls = document.querySelector<HTMLElement>("[data-carousel-controls]");
  if (!track || !controls) return;

  const prev = controls.querySelector<HTMLButtonElement>("[data-carousel-prev]");
  const next = controls.querySelector<HTMLButtonElement>("[data-carousel-next]");
  const current = controls.querySelector<HTMLElement>("[data-carousel-current]");
  const items = [...track.querySelectorAll<HTMLElement>("[data-carousel-item]")];
  if (!prev || !next || !current || !items.length) return;
  if (!claim(track, "Carousel")) return;

  // The buttons are useless without JS, so they ship hidden and appear here.
  controls.hidden = false;

  // The track carries scroll padding from the page gutter, so item 0's snap
  // position is not scrollLeft 0 — always work from measured offsets.
  const offsets = () => {
    const base = track.getBoundingClientRect().left - track.scrollLeft;
    return items.map((el) => el.getBoundingClientRect().left - base);
  };

  const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);

  /**
   * Index of the card nearest the current scroll position.
   *
   * Note this is NOT simply "the last card once we hit maxScroll": when the
   * final cards share the viewport, several indices map to the same clamped
   * scroll position. `active` below is the source of truth for button
   * navigation; this is used to follow along with manual scrolling/swiping.
   */
  const nearestIndex = () => {
    const pos = track.scrollLeft;
    const o = offsets();
    let best = 0;
    let dist = Infinity;
    o.forEach((x, i) => {
      const d = Math.abs(x - pos);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    return best;
  };

  // The intended card. Kept separately from scroll position because the last
  // few cards can share one clamped scroll offset.
  let active = nearestIndex();

  const sync = () => {
    current.textContent = String(active + 1);
    prev.disabled = active <= 0;
    next.disabled = active >= items.length - 1;
  };

  // Animate scrollLeft ourselves. Native smooth scrolling is cancelled by the
  // mandatory snap engine (the track springs back to the current card), so the
  // track sets scroll-behavior:auto and we tween the value frame by frame.
  let raf = 0;
  let gliding = false;

  const glide = (to: number) => {
    window.cancelAnimationFrame(raf);
    const from = track.scrollLeft;
    const delta = to - from;
    if (Math.abs(delta) < 1) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Reduced motion, or a tab whose animation frames are suspended
    // (background/hidden), jumps straight to the target.
    if (reduce || document.hidden) {
      track.scrollLeft = to;
      return;
    }

    gliding = true;
    const dur = 420;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      // easeOutCubic
      track.scrollLeft = from + delta * (1 - Math.pow(1 - p, 3));
      if (p < 1) {
        raf = window.requestAnimationFrame(step);
      } else {
        gliding = false;
      }
    };
    raf = window.requestAnimationFrame(step);
  };

  const go = (dir: number) => {
    const target = Math.min(Math.max(active + dir, 0), items.length - 1);
    if (target === active) return;
    active = target;
    glide(Math.min(offsets()[target], maxScroll()));
    sync();
  };

  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));

  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  });

  // Follow manual scrolling and swiping, but don't fight our own tween.
  track.addEventListener("scroll", () => {
    if (gliding) return;
    active = nearestIndex();
    sync();
  });

  window.addEventListener("resize", () => {
    active = Math.min(active, items.length - 1);
    sync();
  });

  sync();
}
