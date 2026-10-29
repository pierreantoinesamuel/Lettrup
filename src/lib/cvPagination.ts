/**
 * Pure pagination algorithm for the CV PDF exporter (src/lib/cvPdfExport.tsx).
 *
 * Deliberately has no DOM dependency — it just bin-packs pre-measured block
 * heights into pages, so it can be unit-tested without a browser. The caller
 * measures real DOM heights (see cvPdfExport.tsx) and feeds them in here.
 *
 * Policy (see project decision): page 1 keeps the two-column layout
 * (header + sidebar + as much main-column content as fits); page 2+ renders
 * only the overflowing main-column content, at full width, with no header.
 * A block taller than a full page on its own still gets its own page rather
 * than being dropped or truncated — see cvPdfExport.tsx's oversized-block
 * fallback for how that page is actually rendered (canvas-sliced).
 */

export interface MeasuredBlock {
  id: string;
  heightPx: number;
}

export interface CvPage {
  blockIds: string[];
  /** True when this page contains a single block too tall to share a page with anything else. */
  oversizedBlockId?: string;
}

export function paginateBlocks(
  blocks: MeasuredBlock[],
  pageHeightPx: number,
  firstPageHeightPx: number
): CvPage[] {
  const pages: CvPage[] = [];
  let current: string[] = [];
  let currentHeight = 0;
  let isFirstPage = true;

  const budgetFor = () => (isFirstPage ? firstPageHeightPx : pageHeightPx);

  const flush = () => {
    if (current.length > 0) {
      pages.push({ blockIds: current });
      current = [];
      currentHeight = 0;
      isFirstPage = false;
    }
  };

  for (const block of blocks) {
    // A block taller than even a full, empty page can never "fit" — give it
    // a dedicated page instead of looping forever trying to make room.
    if (block.heightPx > pageHeightPx && block.heightPx > firstPageHeightPx) {
      flush();
      pages.push({ blockIds: [block.id], oversizedBlockId: block.id });
      isFirstPage = false;
      continue;
    }

    if (currentHeight + block.heightPx > budgetFor() && current.length > 0) {
      flush();
    }

    current.push(block.id);
    currentHeight += block.heightPx;
  }

  flush();

  // No main-column content at all is still a valid single page (page 1,
  // header + sidebar only).
  if (pages.length === 0) {
    pages.push({ blockIds: [] });
  }

  return pages;
}
