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
  pipelineScrub(gsap, ScrollTrigger).catch(() => {});

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
 * VOX pipeline: a dot travels SIP → tools as the section scrolls, lighting
 * each stage as it arrives.
 *
 * The diagram renders complete by default; `data-pipeline-anim` on <html> is
 * only set once DrawSVG has loaded and the scrub is wired, so a failed chunk
 * leaves a finished diagram rather than an empty one.
 */
async function pipelineScrub(
  gsap: typeof import("gsap").gsap,
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger,
) {
  const fig = document.querySelector<HTMLElement>("[data-pipeline]");
  if (!fig) return;

  const track = fig.querySelector<SVGPathElement>(".pipe__track");
  const dot = fig.querySelector<SVGCircleElement>(".pipe__dot");
  const stages = [...fig.querySelectorAll<SVGGElement>(".pipe__stage")];
  if (!track || !dot || !stages.length) return;

  const { DrawSVGPlugin } = await import("gsap/DrawSVGPlugin");
  const { MotionPathPlugin } = await import("gsap/MotionPathPlugin");
  gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin);

  // Safe to hide the finished state now: the scrub below will draw it.
  document.documentElement.dataset.pipelineAnim = "";

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: fig,
      start: "top 75%",
      end: "bottom 55%",
      scrub: 0.5,
    },
  });

  tl.fromTo(
    track,
    { drawSVG: "0%" },
    { drawSVG: "100%", ease: "none", duration: stages.length },
    0,
  );

  tl.to(
    dot,
    {
      motionPath: { path: track, align: track, alignOrigin: [0.5, 0.5] },
      ease: "none",
      duration: stages.length,
    },
    0,
  );

  // Stages light as the dot reaches them. Driven from progress rather than
  // timeline callbacks, because a scrub runs backwards too and callbacks would
  // leave stages lit on the way out.
  tl.eventCallback("onUpdate", () => {
    const reached = tl.progress() * stages.length;
    stages.forEach((stage, i) => {
      if (reached >= i - 0.15) stage.setAttribute("data-active", "");
      else stage.removeAttribute("data-active");
    });
  });

  ScrollTrigger.refresh();
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
