import { getBridgeState, hasAction, qdnRequest } from './qdnRequest';
import { parseBookmarkSnapshot, type BookmarkApplyResult, type BookmarkMutation, type BookmarkSnapshot } from './bookmarkManager';

export const REQUIRED_ACTIONS = ['BOOKMARKS_HAS_PERMISSION', 'BOOKMARKS_GET', 'BOOKMARKS_APPLY'] as const;

export async function getBookmarksCapability() {
  const bridge = await getBridgeState();
  return {
    bridge,
    supported: REQUIRED_ACTIONS.every((action) => hasAction(bridge.actions, action)),
  };
}

export async function hasBookmarksPermission() {
  const value = await qdnRequest<unknown>({ action: 'BOOKMARKS_HAS_PERMISSION' });
  return !!value && typeof value === 'object' && 'granted' in value && (value as { granted?: unknown }).granted === true;
}

export async function getBookmarks() {
  return parseBookmarkSnapshot(await qdnRequest({ action: 'BOOKMARKS_GET' }));
}

export async function applyBookmarkMutation(snapshot: BookmarkSnapshot, mutation: BookmarkMutation): Promise<BookmarkApplyResult> {
  const value = await qdnRequest<unknown>({
    action: 'BOOKMARKS_APPLY',
    expectedRevision: snapshot.revision,
    mutation,
  });
  if (!value || typeof value !== 'object' || !('snapshot' in value)) {
    throw new Error('Home returned an invalid bookmark update.');
  }
  return {
    changed: 'changed' in value && value.changed === true,
    snapshot: parseBookmarkSnapshot(value.snapshot),
  };
}
