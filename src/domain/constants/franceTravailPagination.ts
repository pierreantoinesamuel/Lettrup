export const FRANCE_TRAVAIL_PAGE_SIZE = 50;
export const FRANCE_TRAVAIL_MAX_PAGES = 100;
export const FRANCE_TRAVAIL_MAX_RESULTS = FRANCE_TRAVAIL_PAGE_SIZE * FRANCE_TRAVAIL_MAX_PAGES;

export function getFranceTravailPageRange(page: number): { start: number; end: number } | null {
  if (!Number.isSafeInteger(page) || page < 1 || page > FRANCE_TRAVAIL_MAX_PAGES) return null;
  const start = (page - 1) * FRANCE_TRAVAIL_PAGE_SIZE;
  return { start, end: start + FRANCE_TRAVAIL_PAGE_SIZE - 1 };
}