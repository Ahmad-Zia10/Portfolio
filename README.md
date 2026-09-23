# Portfolio — Ahmad Zia

Static portfolio built with Astro 7, TypeScript (strict), and GSAP.
One brand colour, one monospaced typeface, a spec-sheet visual system.

## Commands

```bash
pnpm dev       # dev server on :4321
pnpm build     # static build to dist/
pnpm preview   # serve the built site
npx astro check  # typecheck (needs TypeScript 6.x — see Notes)
```

## Where things live

| Path | What |
|---|---|
| `src/styles/tokens.css` | **Every** colour, size, easing. Nothing is hard-coded elsewhere. |
| `src/site.ts` | Owner details, nav, credentials, departures-board rows. |
| `src/content/projects/` | One markdown file per project — frontmatter drives the cards. |
| `src/content/services/` | One file per capability domain. |
| `src/scripts/ui.ts` | Nav + carousel (progressive enhancement). |
| `src/scripts/animations.ts` | GSAP layer, loaded only when motion is allowed. |

Adding a project means adding a markdown file — nothing else. The carousel
count, detail page, and prev/next pager all derive from the collection.

## Things worth knowing before you change them

**The accent colour is gold, not the magenta in the original brief.**
`#B622C4` scored 1.19:1 on the brand blue and 3.79:1 on ink — both fail WCAG
AA, and no shade of magenta passes against both backgrounds. `#FFC864` scores
4.06:1 on brand (AA large) and 12.91:1 on ink (AAA). If you retune it, check
both pairings.

**Reveal animations hide content, so they are guarded twice.**
`[data-reveal]` elements are only hidden after GSAP has actually loaded
(`html[data-motion="on"]`), and `watchForStranded()` in `animations.ts` watches
for an element that is on screen but still invisible — if it finds one it drops
the flag and clears GSAP's inline styles. Without that, a failed chunk or a
suspended tab leaves the page blank. Don't remove it.

**The carousel does not use native smooth scrolling.**
Inside a `scroll-snap-type: mandatory` container, a smooth scroll gets cancelled
by the snap engine mid-flight and springs back. The track sets
`scroll-behavior: auto` and `ui.ts` tweens `scrollLeft` itself.

**The carousel tracks its index in a variable, not from scroll position.**
When the last cards share the viewport they also share one clamped scroll
offset, so deriving the index from `scrollLeft` breaks the counter and strands
the Prev button.

**UI scripts live in `src/scripts/ui.ts`, not in the components.**
Component-level `<script>` tags are not reliably bundled when the component is
rendered through a named slot (`<Nav slot="nav" />`) — they were silently
dropped from the build. `initUI()` is also idempotent: it runs again on every
view transition, and a toggle bound twice cancels itself out.

## Notes

- `astro check` needs TypeScript 6.x. TS 7 removed the programmatic API the
  checker uses; the dependency is pinned accordingly.
- Martian Mono is self-hosted (SIL OFL) as a single 24KB variable woff2 that
  covers weights 400–700.
- First-load JS is ~20KB. GSAP (~110KB) is dynamically imported and only when
  `prefers-reduced-motion: no-preference` matches.

## Still to fill in

- `site.calendly` in `src/site.ts` is a placeholder.
- `site.url` assumes `ahmadzia.dev` — used for canonical and OG tags.
- `public/og-image.svg` referenced in meta tags has not been created yet.
- Project cards have no thumbnail images; the layout is built for them
  (`thumbnail` exists in the schema) but none are wired in.

## Deploy

Static output in `dist/`. Netlify or Vercel with build `pnpm build`, publish
directory `dist`, no adapter needed.
