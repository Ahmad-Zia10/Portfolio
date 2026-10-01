/**
 * Shared-element transition names for the Work tile → case study morph.
 *
 * Both pages must agree on these exactly, so they are derived from the slug in
 * one place rather than written by hand on each side. A mismatch doesn't error —
 * the morph just silently degrades to a cross-fade — which makes it the kind of
 * bug that ships unnoticed.
 */
export const tx = (slug: string) => ({
  code: `code-${slug}`,
  title: `title-${slug}`,
  media: `media-${slug}`,
});
