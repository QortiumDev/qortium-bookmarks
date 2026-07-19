import { describe, expect, it } from 'vitest';
import { REQUIRED_ACTIONS } from './bookmarkApi';

describe('Bookmarks Home bridge surface', () => {
  it('feature-detects every action needed by the app', () => {
    expect(REQUIRED_ACTIONS).toEqual([
      'BOOKMARKS_HAS_PERMISSION',
      'BOOKMARKS_GET',
      'BOOKMARKS_APPLY',
    ]);
  });
});
