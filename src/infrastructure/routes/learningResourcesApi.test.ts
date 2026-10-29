import { mapYouTubeSearchItems } from './learningResourcesApi';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[TEST FAILED] ${message}`);
}

export function runLearningResourcesApiTests() {
  const resources = mapYouTubeSearchItems([
    {
      id: { videoId: 'abc123' },
      snippet: {
        title: 'Introduction à TypeScript',
        description: 'Cours pratique',
        channelTitle: 'Formation vérifiée',
        thumbnails: { medium: { url: 'https://img.youtube.com/thumbnail.jpg' } },
        publishedAt: '2026-01-15T00:00:00Z',
      },
    },
    { id: { channelId: 'not-a-video' }, snippet: { title: 'Invalid result' } },
  ], 'TypeScript');

  assert(resources.length === 1, 'Only valid video search results should be returned');
  assert(resources[0].title === 'Introduction à TypeScript', 'The real YouTube title should be preserved');
  assert(resources[0].channelName === 'Formation vérifiée', 'The actual channel should be included');
  assert(resources[0].searchUrl === 'https://www.youtube.com/watch?v=abc123', 'Links should point to the actual video, not a generic search page');
  assert(resources[0].thumbnailUrl?.includes('youtube.com') === true, 'The real thumbnail URL should be preserved');

  return { testCount: 5 };
}