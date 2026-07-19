import { getBridgeState, hasAction, qdnRequest } from './qdnRequest';
import { parseBookmarkSnapshot, type BookmarkApplyResult, type BookmarkMutation, type BookmarkSnapshot } from './bookmarkManager';

export const REQUIRED_ACTIONS = ['BOOKMARKS_HAS_PERMISSION', 'BOOKMARKS_GET', 'BOOKMARKS_APPLY'] as const;

/**
 * Feature-discoverable: older Home builds won't report this action, so callers
 * must check for it (via hasAction) rather than assuming it exists like the
 * REQUIRED_ACTIONS above.
 */
export const OPEN_ACTION = 'BOOKMARKS_OPEN';
export const QDN_RESOURCE_URL_ACTION = 'GET_QDN_RESOURCE_URL';

export type OpenPlan =
  | { action: typeof OPEN_ACTION; address: string; accountId: string | null }
  | { action: 'OPEN_NEW_TAB'; address: string }
  | { action: 'WINDOW_OPEN'; address: string }
  | { action: 'ACCOUNT_UNSUPPORTED'; address: string; accountId: string };

/**
 * Decides how to open a saved address without ever silently dropping a saved
 * account assignment: if Home can't honor BOOKMARKS_OPEN, an item with a
 * saved accountId reports ACCOUNT_UNSUPPORTED instead of falling back to the
 * generic OPEN_NEW_TAB action, which has no way to carry the account.
 */
export function planOpenAction(actions: string[], address: string, accountId: string | null | undefined): OpenPlan {
  const normalizedAccountId = accountId || null;
  if (hasAction(actions, OPEN_ACTION)) {
    return { action: OPEN_ACTION, address, accountId: normalizedAccountId };
  }
  if (normalizedAccountId) {
    return { action: 'ACCOUNT_UNSUPPORTED', address, accountId: normalizedAccountId };
  }
  if (hasAction(actions, 'OPEN_NEW_TAB')) {
    return { action: 'OPEN_NEW_TAB', address };
  }
  return { action: 'WINDOW_OPEN', address };
}

export async function openSavedAddress(actions: string[], address: string, accountId: string | null | undefined): Promise<OpenPlan> {
  const plan = planOpenAction(actions, address, accountId);
  switch (plan.action) {
    case OPEN_ACTION:
      await qdnRequest({ action: OPEN_ACTION, address: plan.address, accountId: plan.accountId });
      break;
    case 'OPEN_NEW_TAB':
      await qdnRequest({ action: 'OPEN_NEW_TAB', address: plan.address });
      break;
    case 'WINDOW_OPEN':
      window.open(plan.address, '_blank', 'noopener,noreferrer');
      break;
    case 'ACCOUNT_UNSUPPORTED':
      break;
  }
  return plan;
}

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
