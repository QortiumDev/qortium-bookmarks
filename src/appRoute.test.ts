import { describe, expect, it } from 'vitest';
import { hashForView, viewFromHash } from './appRoute';

describe('bookmark routes', () => {
  it('round-trips every manager view through a fragment', () => {
    for (const view of ['bookmarks', 'toolbar', 'pins', 'startPages'] as const) {
      expect(viewFromHash(hashForView(view))).toBe(view);
    }
  });

  it('falls back safely for old and unknown links', () => {
    expect(viewFromHash('')).toBe('bookmarks');
    expect(viewFromHash('#/unknown')).toBe('bookmarks');
  });
});
