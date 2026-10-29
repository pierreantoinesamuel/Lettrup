import { paginateBlocks, MeasuredBlock } from './cvPagination';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

function allBlockIds(pages: ReturnType<typeof paginateBlocks>): string[] {
  return pages.flatMap((p) => p.blockIds);
}

export function runCvPaginationTests() {
  let testCount = 0;
  const PAGE = 1000;
  const FIRST_PAGE = 700; // simulates a shorter first page (header takes up room)

  // Test 1: everything fits on the first page (single experience, single bullet-ish block).
  testCount++;
  {
    const blocks: MeasuredBlock[] = [{ id: 'exp-1', heightPx: 200 }];
    const pages = paginateBlocks(blocks, PAGE, FIRST_PAGE);
    assert(pages.length === 1, 'Content that fits should stay on a single page');
    assert(allBlockIds(pages).join(',') === 'exp-1', 'The single block should be present');
  }

  // Test 2: many long blocks overflow the first page and continue onto more pages,
  // with no block ever silently dropped (TEST C from the spec: 5 experiences x 5 long bullets,
  // modeled here as 5 large blocks).
  testCount++;
  {
    const blocks: MeasuredBlock[] = Array.from({ length: 5 }, (_, i) => ({ id: `exp-${i}`, heightPx: 400 }));
    const pages = paginateBlocks(blocks, PAGE, FIRST_PAGE);
    assert(pages.length > 1, 'Content taller than one page must produce more than one page');
    assert(
      allBlockIds(pages).length === 5,
      'Every block must appear exactly once across all pages — none dropped, none duplicated'
    );
    assert(
      new Set(allBlockIds(pages)).size === 5,
      'No block id should be duplicated across pages'
    );
    // Verify order is preserved (experience 0 must render before experience 1, etc.)
    assert(
      allBlockIds(pages).join(',') === blocks.map((b) => b.id).join(','),
      'Block order must be preserved across the page split'
    );
  }

  // Test 3: a single block taller than an entire page (e.g. one absurdly long
  // description) still gets its own page instead of looping forever or being dropped.
  testCount++;
  {
    const blocks: MeasuredBlock[] = [
      { id: 'exp-short', heightPx: 100 },
      { id: 'exp-huge', heightPx: 5000 },
      { id: 'exp-after', heightPx: 100 },
    ];
    const pages = paginateBlocks(blocks, PAGE, FIRST_PAGE);
    assert(Number.isFinite(pages.length) && pages.length < 100, 'Pagination must terminate (finite page count)');
    assert(allBlockIds(pages).length === 3, 'All blocks (including the oversized one) must be present');
    const oversizedPage = pages.find((p) => p.oversizedBlockId === 'exp-huge');
    assert(!!oversizedPage, 'The oversized block must be flagged so the renderer can use a fallback capture strategy');
    assert(oversizedPage!.blockIds.length === 1, 'The oversized block must not share a page with other content');
  }

  // Test 4: empty input (e.g. a CV with no main-column sections at all) still
  // returns exactly one (empty) page rather than zero pages or throwing.
  testCount++;
  {
    const pages = paginateBlocks([], PAGE, FIRST_PAGE);
    assert(pages.length === 1, 'Empty content should still produce exactly one page');
    assert(pages[0].blockIds.length === 0, 'That page should have no blocks');
  }

  // Test 5: content that exactly fills the first page boundary should not
  // spill an empty block onto a needless extra page.
  testCount++;
  {
    const blocks: MeasuredBlock[] = [
      { id: 'a', heightPx: 350 },
      { id: 'b', heightPx: 350 }, // 350 + 350 = 700 === FIRST_PAGE, should exactly fit
    ];
    const pages = paginateBlocks(blocks, PAGE, FIRST_PAGE);
    assert(pages.length === 1, 'Content exactly matching the page budget should not overflow to a new page');
  }

  // Test 6: many small blocks (e.g. 10 short projects) correctly fill pages
  // without leaving early pages under-full when more content could fit.
  testCount++;
  {
    const blocks: MeasuredBlock[] = Array.from({ length: 10 }, (_, i) => ({ id: `proj-${i}`, heightPx: 150 }));
    const pages = paginateBlocks(blocks, PAGE, FIRST_PAGE);
    assert(allBlockIds(pages).length === 10, 'All 10 project blocks must be present across pages');
    // First page budget is 700px -> should fit 4 blocks of 150px (600px), a 5th would be 750px > 700.
    assert(pages[0].blockIds.length === 4, 'First page should pack as many blocks as fit its (smaller) budget');
  }

  return { testCount };
}
