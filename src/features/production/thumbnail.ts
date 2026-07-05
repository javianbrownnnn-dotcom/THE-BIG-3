// The designed thumbnail image lives inside the production's asset_links under
// a reserved label — so it persists and syncs with no schema change. These
// helpers keep that detail in one place; the rest of the app sees a clean
// thumbnail URL and a separate list of "real" asset links.

import type { AssetLink, Production } from "@/types";

export const THUMB_LABEL = "__thumbnail__";

export function getThumbnail(production: Pick<Production, "assetLinks">): string | undefined {
  return production.assetLinks?.find((a) => a.label === THUMB_LABEL)?.url;
}

/** Asset links minus the reserved thumbnail entry (what the user edits). */
export function visibleAssetLinks(production: Pick<Production, "assetLinks">): AssetLink[] {
  return (production.assetLinks ?? []).filter((a) => a.label !== THUMB_LABEL);
}

/** Recombine edited visible links with the current thumbnail entry (if any). */
export function withThumbnail(visible: AssetLink[], thumbnailUrl: string | undefined): AssetLink[] {
  return thumbnailUrl ? [...visible, { label: THUMB_LABEL, url: thumbnailUrl }] : visible;
}
