/**
 * Progressive-enhancement UI behavior: the mobile nav and the hero portrait.
 *
 * This lives in a module imported by BaseLayout rather than in <script> tags
 * inside the components, because component-level scripts are not reliably
 * bundled when the component is rendered through a named slot.
 *
 * Everything here is additive — the nav links work without JS.
 */

export function initUI() {
  setupNav();
  setupPortrait();
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

/**
 * Hero portrait sharpen.
 *
 * On pointer devices the effect is pure CSS (:hover). Touch devices have no
 * hover, so the sharpen plays once shortly after load instead — otherwise the
 * portrait would stay permanently coarse there.
 */
function setupPortrait() {
  const portrait = document.querySelector<HTMLElement>("[data-portrait]");
  if (!portrait) return;
  if (!claim(portrait, "Portrait")) return;

  const canHover = window.matchMedia("(hover: hover)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (canHover || reduced) return;

  window.setTimeout(() => {
    portrait.dataset.sharpen = "";
  }, 400);
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
