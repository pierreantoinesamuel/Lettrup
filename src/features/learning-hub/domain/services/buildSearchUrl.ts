import { ResourceProvider } from '../types';

const PROVIDER_TEMPLATES: Record<ResourceProvider, string> = {
  coursera: 'https://www.coursera.org/search?query={q}',
  udemy: 'https://www.udemy.com/courses/search/?q={q}',
  edx: 'https://www.edx.org/search?q={q}',
  freecodecamp: 'https://www.freecodecamp.org/news/search/?query={q}',
  youtube: 'https://www.youtube.com/results?search_query={q}',
  vimeo: 'https://vimeo.com/search?q={q}',
  kaggle: 'https://www.kaggle.com/search?q={q}',
  leetcode: 'https://leetcode.com/problemset/?search={q}',
  hackerrank: 'https://www.hackerrank.com/domains/search?q={q}',
  exercism: 'https://exercism.org/tracks?query={q}',
  docs: 'https://www.google.com/search?q={q}+official+documentation',
  internal: '/learning-hub/resources/{q}',
};

export function buildSearchUrl(provider: ResourceProvider, title: string): string {
  const query = encodeURIComponent(title.trim());
  const template = PROVIDER_TEMPLATES[provider] || PROVIDER_TEMPLATES.youtube;
  return template.replace('{q}', query);
}
