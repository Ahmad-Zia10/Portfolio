/**
 * GSAP scroll/motion layer. Loaded dynamically and only when
 * `prefers-reduced-motion: no-preference` matches — see BaseLayout.
 */
let started = false;

export async function init() {
  if (started) return;
  started = true;

  const { gsap } = await import("gsap");
  const { ScrollTrigger } = await import("gsap/ScrollTrigger");
  gsap.registerPlugin(ScrollTrigger);

  // Only now is it safe to hide reveal targets: GSAP is loaded and will
  // animate them back in. Before this point the content renders normally.
  document.documentElement.dataset.motion = "on";

  const ctx = gsap.context(() => {
    revealOnScroll(gsap);
    sectionWords(gsap);
    heroParallax(gsap);
    marquees(gsap);
  });

  watchForStranded();

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
 * Safety net for the reveal animation.
 *
 * Setting up ScrollTrigger is not the same as it firing: a tab that is hidden
 * or backgrounded gets no animation frames, so triggers never run and any
 * [data-reveal] element scrolled into view would stay at opacity 0 — content
 * silently lost. This watches for an element that is on screen but still
 * hidden and, if it finds one, drops the motion flag so CSS renders everything
 * normally. It costs one bounding-box check per scroll (throttled to a frame)
 * and stops watching once the page has been seen working.
 */
function watchForStranded() {
  const root = document.documentElement;
  let queued = false;
  let clean = 0;

  const check = () => {
    queued = false;
    if (root.dataset.motion !== "on") return stop();

    const els = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    const onScreen = els.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });

    if (!onScreen.length) return;

    if (onScreen.some((el) => getComputedStyle(el).opacity === "0")) {
      delete root.dataset.motion;
      // Dropping the flag only removes the CSS rule. GSAP may already have
      // written inline opacity/transform onto these elements, so clear those
      // too or they stay invisible.
      els.forEach((el) => {
        el.style.removeProperty("opacity");
        el.style.removeProperty("transform");
        el.style.removeProperty("visibility");
      });
      return stop();
    }

    // Seen a screenful reveal correctly several times: motion works here.
    if (++clean > 3) stop();
  };

  const onScroll = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(check);
  };

  let timer = 0;

  const stop = () => {
    window.removeEventListener("scroll", onScroll);
    window.clearInterval(timer);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  // Also poll, because a hidden tab delivers no scroll events either.
  timer = window.setInterval(check, 1000);
  window.setTimeout(check, 1200);
}

function revealOnScroll(gsap: typeof import("gsap").gsap) {
  const groups = new Map<Element, Element[]>();

  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    const parent = el.closest("[data-reveal-group]") ?? el.parentElement ?? el;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent)!.push(el);
  });

  groups.forEach((els, parent) => {
    gsap.to(els, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.08,
      scrollTrigger: { trigger: parent, start: "top 85%", once: true },
    });
  });
}

function sectionWords(gsap: typeof import("gsap").gsap) {
  document.querySelectorAll<HTMLElement>("[data-section-word]").forEach((el) => {
    gsap.from(el, {
      yPercent: 110,
      duration: 0.9,
      ease: "power4.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });
}

function heroParallax(gsap: typeof import("gsap").gsap) {
  const scene = document.querySelector("[data-hero-scene]");
  if (!scene) return;

  scene.querySelectorAll<SVGElement>("[data-depth]").forEach((layer) => {
    const depth = Number(layer.dataset.depth ?? 0);
    gsap.to(layer, {
      yPercent: depth * 18,
      ease: "none",
      scrollTrigger: {
        trigger: scene,
        start: "top top",
        end: "bottom top",
        scrub: 0.6,
      },
    });
  });
}

/** Swap the CSS marquee for a GSAP one so hover-pause is frame-accurate. */
function marquees(gsap: typeof import("gsap").gsap) {
  document.querySelectorAll<HTMLElement>("[data-marquee]").forEach((el) => {
    const track = el.querySelector<HTMLElement>(".marquee__track");
    if (!track) return;

    const tracks = el.querySelectorAll<HTMLElement>(".marquee__track");
    tracks.forEach((t) => (t.style.animation = "none"));

    const loop = gsap.to(tracks, {
      xPercent: -100,
      duration: 40,
      ease: "none",
      repeat: -1,
    });

    el.addEventListener("pointerenter", () => loop.pause());
    el.addEventListener("pointerleave", () => loop.play());
    el.addEventListener("focusin", () => loop.pause());
    el.addEventListener("focusout", () => loop.play());
  });
}
