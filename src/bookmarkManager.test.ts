import { describe, expect, it } from 'vitest';
import {
  countTreeItems,
  buildAccountChoices,
  buildDropMoveMutation,
  buildMoveMutation,
  decodeDragPayload,
  dropTargetFromDataset,
  encodeDragPayload,
  findTreeItem,
  flattenTree,
  friendlyLabelFor,
  getErrorCode,
  isDescendant,
  isDuplicateDisplayUrl,
  isInvalidAddressError,
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

describe('drag-and-drop move building', () => {
  const treeSnapshot: BookmarkSnapshot = {
    ...snapshot,
    bookmarks: [
      {
        type: 'folder', id: 'folder-a', title: 'Apps', createdAt: 1,
        children: [
          { type: 'bookmark', id: 'boards', title: 'Boards', displayUrl: 'qdn://APP/Boards/Boards', createdAt: 2 },
          { type: 'folder', id: 'folder-b', title: 'Nested', createdAt: 3, children: [] },
        ],
      },
      { type: 'bookmark', id: 'chat', title: 'Chat', displayUrl: 'qdn://APP/Chat/Chat', createdAt: 4 },
    ],
  };

  it('round-trips the drag payload and rejects malformed payload data', () => {
    const payload = { itemId: 'boards', sourceRootId: 'bookmarks' } as const;
    expect(decodeDragPayload(encodeDragPayload(payload))).toEqual(payload);
    expect(decodeDragPayload('not json')).toBeNull();
    expect(decodeDragPayload(JSON.stringify({ itemId: 'boards', sourceRootId: 'desktop' }))).toBeNull();
    expect(decodeDragPayload(JSON.stringify({ sourceRootId: 'bookmarks' }))).toBeNull();
  });

  it('parses drop targets from data attributes and rejects unknown roots', () => {
    expect(dropTargetFromDataset({ dropRoot: 'bookmarks', dropFolder: 'folder-a', dropItem: 'boards', dropPosition: 'before' }))
      .toEqual({ rootId: 'bookmarks', folderId: 'folder-a', itemId: 'boards', position: 'before' });
    expect(dropTargetFromDataset({ dropRoot: 'pins', dropItem: 'chat' }))
      .toEqual({ rootId: 'pins', folderId: null, itemId: 'chat', position: 'after' });
    expect(dropTargetFromDataset({ dropRoot: 'desktop', dropItem: 'boards' })).toBeNull();
    expect(dropTargetFromDataset({})).toBeNull();
  });

  it('builds a before/after move relative to a sibling in the same folder', () => {
    expect(buildDropMoveMutation(treeSnapshot, { itemId: 'chat', sourceRootId: 'bookmarks' }, {
      rootId: 'bookmarks', folderId: 'folder-a', itemId: 'boards', position: 'before',
    })).toEqual({
      type: 'moveItem', itemId: 'chat', sourceRootId: 'bookmarks', targetRootId: 'bookmarks',
      targetFolderId: 'folder-a', targetItemId: 'boards', targetPosition: 'before',
    });
  });

  it('builds an inside-folder move that appends without a target item', () => {
    expect(buildDropMoveMutation(treeSnapshot, { itemId: 'chat', sourceRootId: 'bookmarks' }, {
      rootId: 'bookmarks', folderId: 'folder-a', itemId: null, position: 'inside',
    })).toEqual({
      type: 'moveItem', itemId: 'chat', sourceRootId: 'bookmarks', targetRootId: 'bookmarks', targetFolderId: 'folder-a',
    });
  });

  it('refuses dropping an item onto itself or a folder into its own subtree', () => {
    expect(buildDropMoveMutation(treeSnapshot, { itemId: 'chat', sourceRootId: 'bookmarks' }, {
      rootId: 'bookmarks', folderId: null, itemId: 'chat', position: 'after',
    })).toBeNull();
    expect(buildDropMoveMutation(treeSnapshot, { itemId: 'folder-a', sourceRootId: 'bookmarks' }, {
      rootId: 'bookmarks', folderId: 'folder-a', itemId: null, position: 'inside',
    })).toBeNull();
    expect(buildDropMoveMutation(treeSnapshot, { itemId: 'folder-a', sourceRootId: 'bookmarks' }, {
      rootId: 'bookmarks', folderId: 'folder-b', itemId: null, position: 'inside',
    })).toBeNull();
  });

  it('builds flat-list moves for pins and requires a sibling row there', () => {
    expect(buildDropMoveMutation(snapshot, { itemId: 'chat', sourceRootId: 'pins' }, {
      rootId: 'pins', folderId: null, itemId: 'other-pin', position: 'after',
    })).toEqual({
      type: 'moveItem', itemId: 'chat', sourceRootId: 'pins', targetRootId: 'pins',
      targetItemId: 'other-pin', targetPosition: 'after',
    });
    expect(buildDropMoveMutation(snapshot, { itemId: 'chat', sourceRootId: 'pins' }, {
      rootId: 'pins', folderId: null, itemId: null, position: 'after',
    })).toBeNull();
  });
});

describe('duplicate address pre-check', () => {
  const duplicateSnapshot: BookmarkSnapshot = {
    ...snapshot,
    bookmarks: [
      {
        type: 'folder', id: 'folder-a', title: 'Apps', createdAt: 1,
        children: [{ type: 'bookmark', id: 'boards', title: 'Boards', displayUrl: 'qdn://APP/Boards/Boards', createdAt: 2 }],
      },
      { type: 'bookmark', id: 'chat', title: 'Chat', displayUrl: 'qdn://APP/Chat/Chat', createdAt: 3 },
    ],
  };

  it('flags a trimmed duplicate only within the same target folder', () => {
    expect(isDuplicateDisplayUrl(duplicateSnapshot, { rootId: 'bookmarks', mode: 'add', parentFolderId: 'folder-a' }, '  qdn://APP/Boards/Boards  ')).toBe(true);
    expect(isDuplicateDisplayUrl(duplicateSnapshot, { rootId: 'bookmarks', mode: 'add', parentFolderId: null }, 'qdn://APP/Boards/Boards')).toBe(false);
    expect(isDuplicateDisplayUrl(duplicateSnapshot, { rootId: 'bookmarks', mode: 'add', parentFolderId: null }, 'qdn://APP/Chat/Chat')).toBe(true);
  });

  it('lets an edit keep its own address but not take a sibling one', () => {
    expect(isDuplicateDisplayUrl(duplicateSnapshot, { rootId: 'bookmarks', mode: 'edit', itemId: 'boards' }, 'qdn://APP/Boards/Boards')).toBe(false);
    const twoLinks: BookmarkSnapshot = {
      ...duplicateSnapshot,
      bookmarks: [
        { type: 'bookmark', id: 'chat', title: 'Chat', displayUrl: 'qdn://APP/Chat/Chat', createdAt: 1 },
        { type: 'bookmark', id: 'help', title: 'Help', displayUrl: 'qdn://APP/Help/Help', createdAt: 2 },
      ],
    };
    expect(isDuplicateDisplayUrl(twoLinks, { rootId: 'bookmarks', mode: 'edit', itemId: 'help' }, 'qdn://APP/Chat/Chat')).toBe(true);
  });

  it('checks pins and start pages against their whole list', () => {
    expect(isDuplicateDisplayUrl(snapshot, { rootId: 'pins', mode: 'add' }, 'qdn://APP/Chat/Chat')).toBe(true);
    expect(isDuplicateDisplayUrl(snapshot, { rootId: 'pins', mode: 'edit', itemId: 'chat' }, 'qdn://APP/Chat/Chat')).toBe(false);
    expect(isDuplicateDisplayUrl(snapshot, { rootId: 'startPages', mode: 'add' }, 'home://dashboard')).toBe(true);
    expect(isDuplicateDisplayUrl(snapshot, { rootId: 'startPages', mode: 'edit', itemId: 'home://dashboard' }, 'home://dashboard')).toBe(false);
    expect(isDuplicateDisplayUrl(snapshot, { rootId: 'startPages', mode: 'add' }, 'home://settings')).toBe(false);
  });

  it('never flags a blank address; Home handles empty input', () => {
    expect(isDuplicateDisplayUrl(snapshot, { rootId: 'pins', mode: 'add' }, '   ')).toBe(false);
  });
});

describe('invalid address error mapping', () => {
  it('recognizes INVALID_ADDRESS from direct and bridged errors only', () => {
    expect(isInvalidAddressError({ code: 'INVALID_ADDRESS' })).toBe(true);
    expect(isInvalidAddressError({ cause: { code: 'INVALID_ADDRESS' } })).toBe(true);
    expect(isInvalidAddressError({ code: 'HOME_DATA_STALE' })).toBe(false);
    expect(isInvalidAddressError(new Error('INVALID_ADDRESS'))).toBe(false);
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
