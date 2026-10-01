/**
 * GSAP motion layer.
 *
 * Simple reveals are NOT here — they run as native CSS scroll-driven
 * animations in global.css, which the browser drives off the main thread.
 * GSAP is reserved for effects CSS cannot express: scrubbed parallax tied to
 * scroll position, and the marquee, which needs frame-accurate pause/resume.
 *
 * Loaded dynamically and only when `prefers-reduced-motion: no-preference`
 * matches — see BaseLayout.
 */
let started = false;

export async function init() {
  if (started) return;
  started = true;

  const { gsap } = await import("gsap");
  const { ScrollTrigger } = await import("gsap/ScrollTrigger");
  gsap.registerPlugin(ScrollTrigger);

  const ctx = gsap.context(() => {
    heroParallax(gsap);
    marquees(gsap);
  });

  // Loaded separately so a failure here cannot take the rest down with it.
  scrambleCodes(gsap).catch(() => {});

  // Re-run after Astro view transitions swap the DOM.
  document.addEventListener(
    "astro:before-swap",
    () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      started = false;
    },
    { once: true },
  );

  document.addEventListener("astro:page-load", () => ScrollTrigger.refresh());

  // A tab that loads in the background gets no animation frames; recompute
  // triggers once it is actually shown.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) ScrollTrigger.refresh();
  });
}

/**
 * Work tile 3-letter codes scramble then settle on hover.
 *
 * The code is restored from `data-scramble` rather than read back out of the
 * DOM, so an interrupted animation can never leave a tile showing garbage.
 */
async function scrambleCodes(gsap: typeof import("gsap").gsap) {
  const codes = [...document.querySelectorAll<HTMLElement>("[data-scramble]")];
  if (!codes.length) return;

  const { ScrambleTextPlugin } = await import("gsap/ScrambleTextPlugin");
  gsap.registerPlugin(ScrambleTextPlugin);

  codes.forEach((el) => {
    const tile = el.closest(".tile");
    if (!tile) return;

    const text = el.dataset.scramble ?? el.textContent ?? "";
    let tween: gsap.core.Tween | null = null;

    const run = () => {
      tween?.kill();
      tween = gsap.to(el, {
        duration: 0.45,
        scrambleText: { text, chars: "upperCase", speed: 0.6 },
      });
    };

    const reset = () => {
      tween?.kill();
      el.textContent = text;
    };

    tile.addEventListener("pointerenter", run);
    tile.addEventListener("pointerleave", reset);
    tile.addEventListener("focusin", run);
    tile.addEventListener("focusout", reset);
  });
}

/** Decorative marks drift as the hero scrolls out; the portrait stays put. */
function heroParallax(gsap: typeof import("gsap").gsap) {
  const scene = document.querySelector("[data-hero-scene]");
  if (!scene) return;

  const marks = scene.querySelector(".hero__marks");
  if (!marks) return;

  gsap.to(marks, {
    yPercent: 12,
    ease: "none",
    scrollTrigger: {
      trigger: scene,
      start: "top top",
      end: "bottom top",
      scrub: 0.6,
    },
  });
}

/**
 * Swap the CSS marquee for a GSAP one.
 *
 * Kept on GSAP because pausing a CSS animation mid-cycle and resuming it
 * without a jump is not something CSS does cleanly.
 */
function marquees(gsap: typeof import("gsap").gsap) {
  document.querySelectorAll<HTMLElement>("[data-marquee]").forEach((el) => {
    const tracks = el.querySelectorAll<HTMLElement>(".marquee__track");
    if (!tracks.length) return;

    tracks.forEach((t) => (t.style.animation = "none"));

    const loop = gsap.to(tracks, {
      xPercent: -100,
      duration: 40,
      ease: "none",
      repeat: -1,
    });

    let hovered = false;
    let onScreen = false;

    const sync = () => {
      if (onScreen && !hovered) loop.play();
      else loop.pause();
    };

    // Only run while visible. Each track is ~2900px wide, so animating it
    // off-screen is wasted compositing on every frame.
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: "100px" },
    );
    io.observe(el);
    loop.pause();

    const setHover = (v: boolean) => {
      hovered = v;
      sync();
    };

    el.addEventListener("pointerenter", () => setHover(true));
    el.addEventListener("pointerleave", () => setHover(false));
    el.addEventListener("focusin", () => setHover(true));
    el.addEventListener("focusout", () => setHover(false));
  });
}
