import type { BookmarkMutation, BookmarkSnapshot } from './bookmarkManager';

export type BookmarkManagerState = {
  pendingMutation: BookmarkMutation | null;
  snapshot: BookmarkSnapshot | null;
};

export type BookmarkManagerStateAction =
  | { type: 'clear' }
  | { type: 'loaded'; snapshot: BookmarkSnapshot }
  | { type: 'applied'; snapshot: BookmarkSnapshot }
  | { type: 'stale'; mutation: BookmarkMutation };

export const INITIAL_BOOKMARK_MANAGER_STATE: BookmarkManagerState = {
  pendingMutation: null,
  snapshot: null,
};

export function bookmarkManagerStateReducer(
  state: BookmarkManagerState,
  action: BookmarkManagerStateAction,
): BookmarkManagerState {
  switch (action.type) {
    case 'clear':
      return INITIAL_BOOKMARK_MANAGER_STATE;
    case 'loaded':
      return { ...state, snapshot: action.snapshot };
    case 'applied':
      return { snapshot: action.snapshot, pendingMutation: null };
    case 'stale':
      return { ...state, pendingMutation: action.mutation };
  }
}

export function shouldRefreshForRevision(snapshot: BookmarkSnapshot | null, revision: unknown) {
  return typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 0 && revision !== snapshot?.revision;
}
