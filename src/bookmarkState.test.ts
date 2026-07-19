import { describe, expect, it } from 'vitest';
import { bookmarkManagerStateReducer, INITIAL_BOOKMARK_MANAGER_STATE, shouldRefreshForRevision } from './bookmarkState';
import type { BookmarkMutation, BookmarkSnapshot } from './bookmarkManager';

const snapshot = {
  schemaVersion: 1,
  revision: 3,
  activeAccountId: null,
  availableAccounts: [],
  bookmarks: [],
  toolbar: [],
  toolbarVisibility: 'hidden',
  dashboardPins: [],
  startPages: [],
} satisfies BookmarkSnapshot;
const mutation: BookmarkMutation = { type: 'setToolbarVisibility', toolbarVisibility: 'always' };

describe('bookmark manager state reducer', () => {
  it('keeps a stale mutation while accepting the refreshed snapshot', () => {
    const stale = bookmarkManagerStateReducer(
      bookmarkManagerStateReducer(INITIAL_BOOKMARK_MANAGER_STATE, { type: 'loaded', snapshot }),
      { type: 'stale', mutation },
    );
    const refreshed = bookmarkManagerStateReducer(stale, { type: 'loaded', snapshot: { ...snapshot, revision: 4 } });
    expect(refreshed.pendingMutation).toEqual(mutation);
    expect(refreshed.snapshot?.revision).toBe(4);
  });

  it('clears a pending retry after Home accepts it', () => {
    const state = { snapshot, pendingMutation: mutation };
    expect(bookmarkManagerStateReducer(state, { type: 'applied', snapshot: { ...snapshot, revision: 4 } })).toEqual({
      snapshot: { ...snapshot, revision: 4 }, pendingMutation: null,
    });
  });

  it('refreshes only for a different valid revision', () => {
    expect(shouldRefreshForRevision(snapshot, 4)).toBe(true);
    expect(shouldRefreshForRevision(snapshot, 3)).toBe(false);
    expect(shouldRefreshForRevision(snapshot, '4')).toBe(false);
  });
});
