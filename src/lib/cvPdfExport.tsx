/**
 * Real A4 multi-page PDF export for the CV.
 *
 * Root cause this replaces: the previous exporter snapshotted the live,
 * continuously-scrolling preview as ONE image and stretched a single PDF
 * page to match its height — so long CVs never "paginated," they just
 * produced one arbitrarily-tall page. This measures actual rendered block
 * heights off the live preview, bin-packs them into real 210mm×297mm pages
 * (see cvPagination.ts), and renders + captures each page independently so
 * jsPDF assembles a genuine multi-page A4 document.
 *
 * Policy (see project decision, 2026-08-09): page 1 keeps the two-column
 * layout (header + sidebar + as much main-column content as fits);
 * continuation pages render only the overflowing main-column content, at
 * full width, with no repeated header. Pagination is computed only at
 * export time — the live editor keeps its existing continuous-scroll
 * preview unchanged.
 *
 * The page plan is computed by `planCvPages`, which the export dialog also
 * uses to preview the exact pages that will be downloaded.
 */

import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { toPng, toCanvas } from 'html-to-image';
import React from 'react';
import { ResumePreview, ResumeData, ResumeSectionId } from '../components/resume-preview/ResumePreview';
import { TemplateType, TEMPLATES } from '../templates';
import { paginateBlocks, MeasuredBlock } from './cvPagination';

export interface ExportResumeToPdfParams {
  data: ResumeData;
  template: TemplateType;
  layout: 'single' | 'double';
  singleColumnOrder: ResumeSectionId[];
  mainColumnOrder: ResumeSectionId[];
  sideColumnOrder: ResumeSectionId[];
  fileName: string;
}

/** What one exported page is made of: the props to hand to ResumePreview (minus its DOM id). */
export interface CvPageSpec {
  props: {
    data: ResumeData;
    template: TemplateType;
    showHeader: boolean;
    layout: 'single' | 'double';
    singleColumnOrder: ResumeSectionId[];
    mainColumnOrder: ResumeSectionId[];
    sideColumnOrder: ResumeSectionId[];
  };
  /** A single block taller than a page: exported by slicing its canvas over several PDF pages. */
  oversized: boolean;
}

interface CollectedBlock extends MeasuredBlock {
  sectionId: ResumeSectionId;
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const EXPORT_PAGE_ID = 'resume-preview-export-page';

/**
 * Measures the true printable height (content box, in px) of an A4 page at
 * the browser's current zoom/DPI, via an empty probe sharing the page's own
 * padding — avoids hardcoding a 96dpi mm->px conversion that would drift
 * from what actually gets rendered.
 */
function measureUsablePageHeightPx(pageEl: HTMLElement): number {
  const computed = window.getComputedStyle(pageEl);
  const paddingTop = parseFloat(computed.paddingTop) || 0;
  const paddingBottom = parseFloat(computed.paddingBottom) || 0;

  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.left = '-99999px';
  probe.style.top = '0';
  probe.style.width = `${A4_WIDTH_MM}mm`;
  probe.style.height = `${A4_HEIGHT_MM}mm`;
  probe.style.boxSizing = 'border-box';
  document.body.appendChild(probe);
  const fullPageHeightPx = probe.getBoundingClientRect().height;
  document.body.removeChild(probe);

  return fullPageHeightPx - paddingTop - paddingBottom;
}

/**
 * Walks the main column's rendered sections in order and derives each
 * block's height from the *distance to the next block's top* rather than
 * summing guessed margins/header heights — this automatically captures
 * every section header, gap, and margin exactly as rendered, for any
 * template's spacing, with no template-specific constants to maintain.
 * The very first block of each section starts its measurement at that
 * section's header (not the item itself), so "Expérience" never gets
 * stranded alone at the bottom of a page separated from its first entry.
 */
function collectMainColumnBlocks(mainRegionEl: HTMLElement, order: ResumeSectionId[]): CollectedBlock[] {
  const boundaries: { top: number; blockId: string; sectionId: ResumeSectionId }[] = [];

  for (const sectionId of order) {
    const headerEl = mainRegionEl.querySelector<HTMLElement>(`[data-cv-section-header="${sectionId}"]`);
    const itemEls = Array.from(mainRegionEl.querySelectorAll<HTMLElement>(`[data-cv-item="${sectionId}"]`));
    if (!headerEl || itemEls.length === 0) continue;

    itemEls.forEach((el, i) => {
      const itemId = el.dataset.cvItemId || String(i);
      const top = i === 0 ? headerEl.getBoundingClientRect().top : el.getBoundingClientRect().top;
      boundaries.push({ top, blockId: `${sectionId}:${itemId}`, sectionId });
    });
  }

  const regionBottom = mainRegionEl.getBoundingClientRect().bottom;
  return boundaries.map((boundary, i) => {
    const nextTop = i + 1 < boundaries.length ? boundaries[i + 1].top : regionBottom;
    return { id: boundary.blockId, heightPx: Math.max(0, nextTop - boundary.top), sectionId: boundary.sectionId };
  });
}

/**
 * Filters main-column-paginated sections down to whichever items landed on
 * this page. Sections that live in the sidebar (not part of `paginatedSectionIds`)
 * pass through unfiltered — their visibility on a given page is controlled
 * entirely by whether that page's column-order props include them at all
 * (only page 1 does; see planCvPages).
 */
function buildPageData(fullData: ResumeData, blockIdsOnThisPage: Set<string>, paginatedSectionIds: Set<ResumeSectionId>): ResumeData {
  const filterArray = <T extends { id: string }>(sectionId: ResumeSectionId, items: T[]): T[] =>
    paginatedSectionIds.has(sectionId)
      ? items.filter((item) => blockIdsOnThisPage.has(`${sectionId}:${item.id}`))
      : items;

  const filterWhole = (sectionId: ResumeSectionId, value: string): string =>
    paginatedSectionIds.has(sectionId)
      ? (blockIdsOnThisPage.has(`${sectionId}:__whole__`) ? value : '')
      : value;

  return {
    ...fullData,
    experience: filterArray('experience', fullData.experience),
    education: filterArray('education', fullData.education),
    projets: filterArray('projets', fullData.projets),
    competences: filterWhole('competences', fullData.competences),
    langues: filterWhole('langues', fullData.langues),
    interets: filterWhole('interets', fullData.interets),
    customSections: (fullData.customSections || []).map((section) => ({
      ...section,
      content: paginatedSectionIds.has(section.id)
        ? section.content.filter((_, index) =>
          blockIdsOnThisPage.has(`${section.id}:${section.id}-${index}`)
        )
        : section.content,
    })),
  };
}

function createOffscreenRoot() {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = `${A4_WIDTH_MM}mm`;
  document.body.appendChild(container);
  return { container, root: createRoot(container) };
}

/**
 * Splits the CV into the A4 pages that get exported. Used by the PDF export
 * and by the export dialog's preview, so both always show the same pages.
 */
export async function planCvPages(params: Omit<ExportResumeToPdfParams, 'fileName'>): Promise<CvPageSpec[]> {
  const { data, template, layout, singleColumnOrder, mainColumnOrder, sideColumnOrder } = params;

  const t = TEMPLATES[template];
  const isTwoColumn = template !== 'classic-compact' && (
    layout === 'double' ||
    t?.layoutVariant === 'left-sidebar' ||
    t?.layoutVariant === 'two-column'
  );
  const orderForMain = isTwoColumn ? mainColumnOrder : singleColumnOrder;
  const paginatedSectionIds = new Set(orderForMain);

  // Callers may start this from a React effect, where flushSync is not allowed:
  // let the current render finish first. Also wait for the web fonts, so the
  // blocks are measured with the same glyph widths the exported page will have.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  if (document.fonts?.ready) await document.fonts.ready;

  const { container, root } = createOffscreenRoot();
  try {
    // Measure off a dedicated offscreen, always-100%-scale instance — never
    // the live editor preview. The live preview sits inside a user-controlled
    // `transform: scale(zoom)` wrapper, and getBoundingClientRect() reports
    // *scaled* geometry through a transform, which silently corrupted every
    // block height by the current zoom factor (e.g. 62%) while the page
    // budget was measured unscaled — the mismatch caused massive over-packing
    // (everything crammed onto page 1). This instance is also unaffected by
    // the live preview being hidden behind a mobile tab.
    flushSync(() => {
      root.render(
        React.createElement(ResumePreview, {
          id: 'resume-preview-measure',
          data,
          template,
          layout,
          singleColumnOrder,
          mainColumnOrder,
          sideColumnOrder,
          showHeader: true,
        })
      );
    });
    const measureEl = container.querySelector<HTMLElement>('#resume-preview-measure');
    if (!measureEl) {
      throw new Error('Aperçu du CV introuvable pour la mesure de pagination.');
    }

    const usablePageHeightPx = measureUsablePageHeightPx(measureEl);
    const headerEl = measureEl.querySelector<HTMLElement>('[data-cv-region="header"]');
    const headerHeightPx = headerEl ? headerEl.getBoundingClientRect().height : 0;
    // A degenerate header taller than a whole page would leave zero/negative
    // budget for page 1 and infinite-loop the packer — floor it to a fraction
    // of the page so page 1 always makes progress; the real content is never
    // dropped, it just starts continuing onto page 2 sooner.
    const firstPageMainBudgetPx = Math.max(usablePageHeightPx - headerHeightPx, usablePageHeightPx * 0.15);

    const mainRegionEl = measureEl.querySelector<HTMLElement>('[data-cv-region="main"]');
    const collected = mainRegionEl ? collectMainColumnBlocks(mainRegionEl, orderForMain) : [];
    const blockHeights: MeasuredBlock[] = collected.map((b) => ({ id: b.id, heightPx: b.heightPx }));

    const pagePlan = paginateBlocks(blockHeights, usablePageHeightPx, firstPageMainBudgetPx);

    // If everything fits on a single page, return the full unadulterated resume data
    // so the export preview and downloaded PDF are 100% faithful to the live editor preview.
    if (pagePlan.length === 1) {
      return [
        {
          oversized: Boolean(pagePlan[0].oversizedBlockId),
          props: {
            data,
            template,
            showHeader: true,
            layout,
            singleColumnOrder,
            mainColumnOrder,
            sideColumnOrder,
          },
        },
      ];
    }

    return pagePlan.map((page, pageIndex) => {
      const isFirstPage = pageIndex === 0;
      return {
        oversized: Boolean(page.oversizedBlockId),
        props: {
          data: buildPageData(data, new Set(page.blockIds), paginatedSectionIds),
          template,
          showHeader: isFirstPage,
          layout: (isFirstPage ? layout : 'single') as 'single' | 'double',
          singleColumnOrder: isFirstPage ? singleColumnOrder : orderForMain,
          mainColumnOrder: isFirstPage ? mainColumnOrder : orderForMain,
          sideColumnOrder: isFirstPage ? (isTwoColumn ? sideColumnOrder : []) : [],
        },
      };
    });
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

export async function exportResumeToPdf(params: ExportResumeToPdfParams): Promise<void> {
  const { fileName, ...planParams } = params;

  // jsPDF is only needed at the moment of export, not just because the
  // builder page loaded — deferring it keeps it out of the builder's route
  // chunk for everyone who edits but never downloads a PDF this session.
  const { jsPDF } = await import('jspdf');

  const pages = await planCvPages(planParams);

  const { container, root } = createOffscreenRoot();
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let isFirstPdfPage = true;

  try {
    for (const page of pages) {
      flushSync(() => {
        root.render(React.createElement(ResumePreview, { id: EXPORT_PAGE_ID, ...page.props }));
      });
      const pageEl = container.querySelector<HTMLElement>(`#${EXPORT_PAGE_ID}`);
      if (!pageEl) continue;

      if (page.oversized) {
        // A single block alone is taller than a full page (e.g. one
        // extraordinarily long description) — never truncate it: canvas-slice
        // it across as many physical pages as it actually needs, the same
        // technique already used for cover letters (CoverLetterGenerator.tsx).
        const canvas = await toCanvas(pageEl, { quality: 0.98, pixelRatio: 2, backgroundColor: '#ffffff' });
        const pxPerMm = canvas.width / A4_WIDTH_MM;
        const pageHeightPxOnCanvas = A4_HEIGHT_MM * pxPerMm;
        let renderedPx = 0;
        while (renderedPx < canvas.height) {
          const sliceHeightPx = Math.min(pageHeightPxOnCanvas, canvas.height - renderedPx);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeightPx;
          const ctx = sliceCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
            if (!isFirstPdfPage) pdf.addPage();
            pdf.addImage(sliceCanvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, A4_WIDTH_MM, sliceHeightPx / pxPerMm);
            isFirstPdfPage = false;
          }
          renderedPx += sliceHeightPx;
        }
        continue;
      }

      const dataUrl = await toPng(pageEl, { quality: 0.98, pixelRatio: 2, backgroundColor: '#ffffff' });
      if (!isFirstPdfPage) pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
      isFirstPdfPage = false;
    }
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }

  pdf.save(`${fileName}.pdf`);
}
