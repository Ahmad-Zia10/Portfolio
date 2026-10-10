/**
 * Motion self-test runner.
 *
 * Each check drives a real animation inside the live iframes and asserts on a
 * measured value — computed opacity, text content, scroll-driven progress —
 * rather than on the presence of a CSS rule. A rule that exists but never
 * fires is exactly the failure mode this page is for.
 */

type Verdict = { pass: boolean; detail: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolves once the iframe's document is interactive. */
function frameDoc(name: string): Promise<Document> {
  const el = document.querySelector<HTMLIFrameElement>(`[data-frame="${name}"]`);
  if (!el) return Promise.reject(new Error(`no frame ${name}`));

  return new Promise((resolve, reject) => {
    const tryNow = () => {
      const doc = el.contentDocument;
      if (doc && doc.readyState === "complete" && doc.body?.childElementCount) {
        resolve(doc);
        return true;
      }
      return false;
    };
    if (tryNow()) return;
    const t = window.setInterval(() => {
      if (tryNow()) window.clearInterval(t);
    }, 200);
    window.setTimeout(() => {
      window.clearInterval(t);
      reject(new Error("frame never became ready"));
    }, 8000);
  });
}

/** Fires the events a real pointer would, so :hover rules and JS both react. */
function hover(el: Element, on: boolean) {
  const type = on ? "pointerenter" : "pointerleave";
  el.dispatchEvent(new PointerEvent(type, { bubbles: false }));
  el.dispatchEvent(new MouseEvent(on ? "mouseenter" : "mouseleave"));
  el.dispatchEvent(new MouseEvent(on ? "mouseover" : "mouseout", { bubbles: true }));
}

/* ---------- individual checks ---------- */

async function checkFrames(): Promise<Verdict> {
  let frames = 0;
  const t0 = performance.now();
  await new Promise<void>((res) => {
    const tick = () => {
      frames++;
      if (performance.now() - t0 < 400) requestAnimationFrame(tick);
      else res();
    };
    requestAnimationFrame(tick);
    window.setTimeout(res, 1500);
  });
  return frames > 5
    ? { pass: true, detail: `${frames} frames in 400ms` }
    : {
        pass: false,
        detail:
          `only ${frames} frames — this tab is hidden or throttled. ` +
          `Bring the window to the front and re-run.`,
      };
}

async function checkPortrait(): Promise<Verdict> {
  const doc = await frameDoc("home");
  const portrait = doc.querySelector(".portrait");
  const coarse = doc.querySelector(".portrait__img--coarse");
  if (!portrait || !coarse) return { pass: false, detail: "portrait not found" };

  const before = doc.defaultView!.getComputedStyle(coarse).opacity;
  hover(portrait, true);
  await wait(900);
  const after = doc.defaultView!.getComputedStyle(coarse).opacity;
  hover(portrait, false);

  const faded = Number(after) < Number(before) - 0.3;
  return faded
    ? { pass: true, detail: `coarse layer ${before} → ${after}` }
    : { pass: false, detail: `coarse layer stayed at ${after}` };
}

async function checkScramble(): Promise<Verdict> {
  const doc = await frameDoc("home");
  const tile = doc.querySelector(".tile");
  const code = tile?.querySelector(".tile__code");
  if (!tile || !code) return { pass: false, detail: "no work tile found" };

  const original = code.textContent ?? "";
  hover(tile, true);

  // Sample during the tween; scramble is 0.45s.
  let changed = false;
  let sample = original;
  for (let i = 0; i < 12; i++) {
    await wait(40);
    if (code.textContent !== original) {
      changed = true;
      sample = code.textContent ?? "";
      break;
    }
  }

  await wait(700);
  const settled = code.textContent;
  hover(tile, false);

  if (!changed) return { pass: false, detail: `"${original}" never scrambled` };
  if (settled !== original)
    return { pass: false, detail: `settled on "${settled}", expected "${original}"` };
  return { pass: true, detail: `"${original}" → "${sample}" → "${settled}"` };
}

async function checkDocGraph(): Promise<Verdict> {
  const doc = await frameDoc("home");
  const tile = [...doc.querySelectorAll(".tile")].find((t) =>
    t.querySelector(".graph__svg"),
  );
  const path = tile?.querySelector(".graph__path");
  const cite = tile?.querySelector(".graph__cite");
  if (!tile || !path || !cite) return { pass: false, detail: "DOC graph not found" };

  const view = doc.defaultView!;
  const beforeOffset = view.getComputedStyle(path).strokeDashoffset;
  hover(tile, true);
  await wait(800);
  const afterOffset = view.getComputedStyle(path).strokeDashoffset;
  const citeOpacity = view.getComputedStyle(cite).opacity;
  hover(tile, false);

  const drew = parseFloat(afterOffset) < parseFloat(beforeOffset) - 0.1;
  const labelled = Number(citeOpacity) > 0.5;
  if (drew && labelled)
    return { pass: true, detail: `path ${beforeOffset} → ${afterOffset}, CITE visible` };
  return {
    pass: false,
    detail: `path ${beforeOffset} → ${afterOffset}, CITE opacity ${citeOpacity}`,
  };
}

async function checkGeoRoute(): Promise<Verdict> {
  const doc = await frameDoc("home");
  const tile = [...doc.querySelectorAll(".tile")].find((t) =>
    t.querySelector(".route__svg"),
  );
  const marker = tile?.querySelector(".route__marker");
  if (!tile || !marker) return { pass: false, detail: "GEO route not found" };

  const view = doc.defaultView!;
  const beforeOpacity = view.getComputedStyle(marker).opacity;
  hover(tile, true);
  await wait(300);
  const opacity = view.getComputedStyle(marker).opacity;

  // Sample offset-distance across the loop; it must actually advance.
  const seen = new Set<string>();
  for (let i = 0; i < 10; i++) {
    seen.add(view.getComputedStyle(marker).getPropertyValue("offset-distance"));
    await wait(90);
  }
  hover(tile, false);

  const visible = Number(opacity) > 0.5;
  const moved = seen.size > 2;
  if (visible && moved)
    return { pass: true, detail: `marker ${beforeOpacity} → ${opacity}, ${seen.size} positions` };
  return {
    pass: false,
    detail: `marker opacity ${opacity}, ${seen.size} distinct positions`,
  };
}

async function checkMorph(): Promise<Verdict> {
  const doc = await frameDoc("home");
  const supported = typeof (doc as any).startViewTransition === "function";
  if (!supported)
    return { pass: false, detail: "browser does not support view transitions" };

  const names = new Set<string>();
  doc.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const n = doc.defaultView!.getComputedStyle(el).viewTransitionName;
    if (n && n !== "none") names.add(n);
  });

  const tileNames = [...names].filter((n) => /^(code|title|media)-/.test(n));
  return tileNames.length >= 12
    ? { pass: true, detail: `${tileNames.length} shared names across 5 projects` }
    : { pass: false, detail: `only ${tileNames.length} shared names found` };
}

async function checkPipeline(): Promise<Verdict> {
  const doc = await frameDoc("vox");
  const fig = doc.querySelector("[data-pipeline]");
  if (!fig) return { pass: false, detail: "pipeline not found" };

  const view = doc.defaultView!;
  const track = fig.querySelector(".pipe__track")!;
  const stages = [...fig.querySelectorAll(".pipe__stage")];

  // Scroll the figure through the viewport and watch the scrub respond.
  (doc.documentElement as HTMLElement).style.scrollBehavior = "auto";
  const top = fig.getBoundingClientRect().top + view.scrollY;

  view.scrollTo(0, top - view.innerHeight);
  await wait(400);
  const startOffset = view.getComputedStyle(track).strokeDashoffset;

  view.scrollTo(0, top - view.innerHeight * 0.3);
  await wait(600);
  const endOffset = view.getComputedStyle(track).strokeDashoffset;
  const lit = stages.filter((s) => s.hasAttribute("data-active")).length;

  const advanced = startOffset !== endOffset;
  if (advanced && lit > 0)
    return { pass: true, detail: `track ${startOffset} → ${endOffset}, ${lit}/5 stages lit` };
  return {
    pass: false,
    detail: `track ${startOffset} → ${endOffset}, ${lit}/5 stages lit`,
  };
}

async function checkFreeze(): Promise<Verdict> {
  const doc = await frameDoc("home");
  const view = doc.defaultView!;
  const about = doc.querySelector("#about");
  if (!about) return { pass: false, detail: "#about not found" };

  (doc.documentElement as HTMLElement).style.scrollBehavior = "auto";

  // A zero-delay timer that cannot fire means the main thread is blocked.
  const t0 = performance.now();
  let fired = -1;
  view.setTimeout(() => {
    fired = performance.now() - t0;
  }, 0);

  view.scrollTo(0, about.getBoundingClientRect().top + view.scrollY);
  await wait(1500);

  if (fired < 0) return { pass: false, detail: "timer never fired — thread blocked" };
  return fired < 150
    ? { pass: true, detail: `zero-delay timer fired in ${fired.toFixed(1)}ms` }
    : { pass: false, detail: `timer took ${fired.toFixed(0)}ms — thread blocked` };
}

/* ---------- runner ---------- */

const RUNNERS: Record<string, () => Promise<Verdict>> = {
  frames: checkFrames,
  portrait: checkPortrait,
  scramble: checkScramble,
  docgraph: checkDocGraph,
  georoute: checkGeoRoute,
  morph: checkMorph,
  pipeline: checkPipeline,
  freeze: checkFreeze,
};

export async function runMotionChecks() {
  const summary = document.querySelector<HTMLElement>("[data-summary]");
  const items = [...document.querySelectorAll<HTMLElement>("[data-check]")];

  items.forEach((li) => {
    li.querySelector("[data-status]")!.textContent = "…";
    li.querySelector("[data-status]")!.removeAttribute("data-state");
    const r = li.querySelector<HTMLElement>("[data-result]")!;
    r.textContent = "";
    r.removeAttribute("data-state");
  });
  if (summary) summary.textContent = "Running…";

  let passed = 0;

  for (const li of items) {
    const id = li.dataset.check!;
    const status = li.querySelector<HTMLElement>("[data-status]")!;
    const result = li.querySelector<HTMLElement>("[data-result]")!;

    let verdict: Verdict;
    try {
      verdict = await RUNNERS[id]();
    } catch (err) {
      verdict = { pass: false, detail: (err as Error).message };
    }

    status.textContent = verdict.pass ? "✓" : "✕";
    status.dataset.state = verdict.pass ? "pass" : "fail";
    result.textContent = verdict.detail;
    result.dataset.state = verdict.pass ? "pass" : "fail";
    if (verdict.pass) passed++;
  }

  if (summary) {
    summary.textContent = `${passed} of ${items.length} passed`;
  }
}
