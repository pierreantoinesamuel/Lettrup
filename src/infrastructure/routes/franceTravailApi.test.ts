import {
  createFranceTravailPageCacheKey,
  deduplicateFranceTravailJobs,
  normalizeFranceTravailDateFilter,
  parseFranceTravailTotalCount,
  resolveFranceTravailLocation,
} from './franceTravailApi';
import { FRANCE_TRAVAIL_PAGE_SIZE, getFranceTravailPageRange } from '../../domain/constants/franceTravailPagination';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[TEST FAILED] ${message}`);
}

export function runFranceTravailApiTests() {
  let testCount = 0;

  testCount++;
  assert(normalizeFranceTravailDateFilter('31') === '30', '31-day filter should normalize to the API-supported 30-day window');
  assert(normalizeFranceTravailDateFilter('14') === '14', '14-day filter should remain unchanged');
  assert(normalizeFranceTravailDateFilter('invalid') === undefined, 'Unsupported date filter values must be rejected');

  testCount++;
  const paris = resolveFranceTravailLocation('Paris');
  assert(Boolean(paris), 'Paris should resolve to a valid France Travail geographic filter');
  assert(paris?.type === 'commune' || paris?.type === 'departement', 'Resolved location should use a supported geographic identifier type');

  testCount++;
  const jobs = [
    { id: 'a', title: 'A' },
    { id: 'a', title: 'A duplicate' },
    { id: 'b', title: 'B' },
  ] as any;
  const unique = deduplicateFranceTravailJobs(jobs);
  assert(unique.length === 2, 'Duplicate France Travail offers must be collapsed by stable job id');
  assert(unique.every((job) => job.id !== 'undefined'), 'Deduplication must never create undefined IDs');

  testCount++;
  assert(parseFranceTravailTotalCount('offres 0-51/52') === 52, 'Total offers should be parsed from the France Travail Content-Range header');
  assert(parseFranceTravailTotalCount('offres 0-51/*') === undefined, 'Unknown total counts should remain undefined');

  testCount++;
  assert(FRANCE_TRAVAIL_PAGE_SIZE === 50, 'Each France Travail page should contain 50 offers');

  testCount++;
  assert(getFranceTravailPageRange(1)?.start === 0 && getFranceTravailPageRange(1)?.end === 49, 'Page 1 should fetch offers 0-49');
  assert(getFranceTravailPageRange(2)?.start === 50 && getFranceTravailPageRange(2)?.end === 99, 'Page 2 should fetch offers 50-99');
  assert(getFranceTravailPageRange(3)?.start === 100 && getFranceTravailPageRange(3)?.end === 149, 'Page 3 should fetch offers 100-149');
  assert(getFranceTravailPageRange(101) === null, 'Page numbers beyond the configured maximum should be rejected');

  testCount++;
  const searchUrl = new URL('https://api.francetravail.io/search?motsCles=Data%20Analyst&range=0-99');
  const sameSearchUrl = new URL('https://api.francetravail.io/search?range=100-199&motsCles=Data%20Analyst');
  const otherSearchUrl = new URL('https://api.francetravail.io/search?motsCles=Designer&range=0-99');
  assert(
    createFranceTravailPageCacheKey(searchUrl, 0) === createFranceTravailPageCacheKey(sameSearchUrl, 0),
    'Cache keys should not depend on query parameter order or the URL range value',
  );
  assert(
    createFranceTravailPageCacheKey(searchUrl, 0) !== createFranceTravailPageCacheKey(sameSearchUrl, 100),
    'Each paginated range should have a distinct cache key',
  );
  assert(
    createFranceTravailPageCacheKey(searchUrl, 0) !== createFranceTravailPageCacheKey(otherSearchUrl, 0),
    'Different searches should not share cached job pages',
  );

  return { testCount };
}
