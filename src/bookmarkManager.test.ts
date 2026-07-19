import { describe, expect, it } from 'vitest';
import {
  countTreeItems,
  buildAccountChoices,
  buildMoveMutation,
  findTreeItem,
  flattenTree,
  friendlyLabelFor,
  getErrorCode,
  isDescendant,
  parseBookmarkSnapshot,
  qdnNameFromAddress,
  rootCount,
  type BookmarkSnapshot,
} from './bookmarkManager';

const snapshot: BookmarkSnapshot = {
  schemaVersion: 1,
  revision: 7,
  activeAccountId: 'account-1',
  availableAccounts: [{ id: 'account-1', label: 'Main' }],
  bookmarks: [
    {
      type: 'folder', id: 'folder-a', title: 'Apps', createdAt: 1,
      children: [{ type: 'bookmark', id: 'boards', title: 'Boards', displayUrl: 'qdn://APP/Boards/Boards', createdAt: 2 }],
    },
  ],
  toolbar: [{ type: 'bookmark', id: 'help', title: 'Help', displayUrl: 'qdn://APP/Help/Help', createdAt: 3 }],
  toolbarVisibility: 'dashboard',
  dashboardPins: [{ id: 'chat', label: 'Chat', displayUrl: 'qdn://APP/Chat/Chat', createdAt: 4 }],
  startPages: [{ displayUrl: 'home://dashboard', title: 'Home', accountId: null }],
};

describe('bookmark manager contract', () => {
  it('parses the complete Home snapshot and preserves its revision', () => {
    expect(parseBookmarkSnapshot(snapshot)).toEqual(snapshot);
  });

  it('rejects unsupported schema versions and malformed trees', () => {
    expect(() => parseBookmarkSnapshot({ ...snapshot, schemaVersion: 2 })).toThrow(/unsupported/i);
    expect(() => parseBookmarkSnapshot({ ...snapshot, bookmarks: [{ type: 'folder' }] })).toThrow();
  });

  it('counts and finds nested items without flattening away hierarchy', () => {
    expect(countTreeItems(snapshot.bookmarks)).toBe(2);
    expect(rootCount(snapshot, 'pins')).toBe(1);
    expect(findTreeItem(snapshot.bookmarks, 'boards')?.title).toBe('Boards');
    expect(flattenTree(snapshot.bookmarks).map(({ depth, item }) => [depth, item.id])).toEqual([
      [0, 'folder-a'], [1, 'boards'],
    ]);
  });

  it('detects descendant folders so the move UI cannot create a cycle', () => {
    expect(isDescendant(snapshot.bookmarks, 'folder-a', 'boards')).toBe(true);
    expect(isDescendant(snapshot.bookmarks, 'boards', 'folder-a')).toBe(false);
  });

  it('reads stale revision codes from direct and bridged errors', () => {
    expect(getErrorCode({ code: 'HOME_DATA_STALE' })).toBe('HOME_DATA_STALE');
    expect(getErrorCode({ cause: { code: 'HOME_DATA_STALE' } })).toBe('HOME_DATA_STALE');
  });

  it('maps At end to after the last other dashboard pin', () => {
    const withPins: BookmarkSnapshot = {
      ...snapshot,
      dashboardPins: [
        { id: 'first', label: 'First', displayUrl: 'home://first', createdAt: 1 },
        { id: 'second', label: 'Second', displayUrl: 'home://second', createdAt: 2 },
      ],
    };
    expect(buildMoveMutation(withPins, {
      itemId: 'first', sourceRootId: 'pins', targetRootId: 'pins',
      targetFolderId: '', targetItemId: '', targetPosition: 'before',
    })).toMatchObject({ targetItemId: 'second', targetPosition: 'after' });
  });

  it('maps At end for start pages and rejects an impossible one-item reorder', () => {
    const withPages: BookmarkSnapshot = {
      ...snapshot,
      startPages: [
        { displayUrl: 'home://first', accountId: null },
        { displayUrl: 'home://second', accountId: null },
      ],
    };
    expect(buildMoveMutation(withPages, {
      itemId: 'home://first', sourceRootId: 'startPages', targetRootId: 'startPages',
      targetFolderId: '', targetItemId: '', targetPosition: 'before',
    })).toMatchObject({ targetItemId: 'home://second', targetPosition: 'after' });
    expect(buildMoveMutation(snapshot, {
      itemId: 'home://dashboard', sourceRootId: 'startPages', targetRootId: 'startPages',
      targetFolderId: '', targetItemId: '', targetPosition: 'after',
    })).toBeNull();
  });

  it('defaults availableAccounts and activeAccountId for older Home responses', () => {
    const { availableAccounts, activeAccountId, ...legacySnapshot } = snapshot;
    expect(parseBookmarkSnapshot(legacySnapshot)).toMatchObject({ availableAccounts: [], activeAccountId: null });
  });

  it('rejects an availableAccounts entry missing an id or label', () => {
    expect(() => parseBookmarkSnapshot({ ...snapshot, availableAccounts: [{ id: 'a' }] })).toThrow();
  });
});

describe('account choices', () => {
  it('lists Home-provided accounts as-is when the saved id matches one', () => {
    const accounts = [{ id: 'a', label: 'Main' }, { id: 'b', label: 'Alt' }];
    expect(buildAccountChoices(accounts, 'a')).toEqual([
      { id: 'a', label: 'Main' },
      { id: 'b', label: 'Alt' },
    ]);
  });

  it('appends an unavailable choice for a saved id Home no longer reports, without dropping it', () => {
    const accounts = [{ id: 'a', label: 'Main' }];
    expect(buildAccountChoices(accounts, 'removed-account')).toEqual([
      { id: 'a', label: 'Main' },
      { id: 'removed-account', label: 'removed-account', unavailable: true },
    ]);
  });

  it('adds no unavailable choice when nothing was saved', () => {
    expect(buildAccountChoices([{ id: 'a', label: 'Main' }], null)).toEqual([{ id: 'a', label: 'Main' }]);
    expect(buildAccountChoices([{ id: 'a', label: 'Main' }], '')).toEqual([{ id: 'a', label: 'Main' }]);
  });
});

describe('friendly labels from QDN addresses', () => {
  it('extracts the registered name from APP and WEBSITE addresses', () => {
    expect(qdnNameFromAddress('qdn://APP/Help/Help')).toBe('Help');
    expect(qdnNameFromAddress('qdn://APP/Trust/Trust')).toBe('Trust');
    expect(qdnNameFromAddress('qdn://WEBSITE/Node')).toBe('Node');
    expect(qdnNameFromAddress('home://dashboard')).toBeNull();
  });

  it('derives a friendly label only when the title is blank or duplicates the address', () => {
    expect(friendlyLabelFor('', 'qdn://APP/Help/Help')).toBe('Help');
    expect(friendlyLabelFor('qdn://APP/Help/Help', 'qdn://APP/Help/Help')).toBe('Help');
    expect(friendlyLabelFor('My favorite help page', 'qdn://APP/Help/Help')).toBe('My favorite help page');
    expect(friendlyLabelFor(undefined, 'home://dashboard')).toBe('home://dashboard');
  });
});
