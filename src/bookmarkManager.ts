export const TREE_ROOT_IDS = ['bookmarks', 'toolbar'] as const;
export const ROOT_IDS = ['bookmarks', 'toolbar', 'pins', 'startPages'] as const;

export type TreeRootId = (typeof TREE_ROOT_IDS)[number];
export type RootId = (typeof ROOT_IDS)[number];
export type ToolbarVisibility = 'hidden' | 'dashboard' | 'always';
export type DropPosition = 'before' | 'after' | 'inside';

export type BookmarkLink = {
  accountId?: string | null;
  createdAt: number;
  displayUrl: string;
  id: string;
  title: string;
  type: 'bookmark';
};

export type BookmarkFolder = {
  children: BookmarkTreeItem[];
  createdAt: number;
  id: string;
  title: string;
  type: 'folder';
};

export type BookmarkTreeItem = BookmarkLink | BookmarkFolder;

export type DashboardPin = {
  accountId?: string | null;
  createdAt: number;
  customLabel?: string;
  displayUrl: string;
  id: string;
  label: string;
};

export type StartPage = {
  accountId: string | null;
  displayUrl: string;
  title?: string;
};

export type HomeAccountOption = {
  id: string;
  label: string;
};

export type BookmarkSnapshot = {
  activeAccountId: string | null;
  availableAccounts: HomeAccountOption[];
  bookmarks: BookmarkTreeItem[];
  dashboardPins: DashboardPin[];
  revision: number;
  schemaVersion: 1;
  startPages: StartPage[];
  toolbar: BookmarkTreeItem[];
  toolbarVisibility: ToolbarVisibility;
};

export type LinkDraft = {
  accountId?: string | null;
  displayUrl: string;
  title: string;
};

export type BookmarkMutation =
  | { type: 'addTreeLink'; rootId: TreeRootId; parentFolderId?: string | null; link: LinkDraft }
  | { type: 'addTreeFolder'; rootId: TreeRootId; parentFolderId?: string | null; title: string }
  | { type: 'updateTreeLink'; rootId: TreeRootId; itemId: string; link: LinkDraft }
  | { type: 'updateTreeFolder'; rootId: TreeRootId; itemId: string; title: string }
  | { type: 'removeTreeItem'; rootId: TreeRootId; itemId: string }
  | { type: 'addDashboardPin'; pin: LinkDraft }
  | { type: 'updateDashboardPin'; pinId: string; pin: LinkDraft }
  | { type: 'removeDashboardPin'; pinId: string }
  | { type: 'addStartPage'; page: LinkDraft }
  | { type: 'updateStartPage'; displayUrl: string; page: LinkDraft }
  | { type: 'removeStartPage'; displayUrl: string }
  | {
      type: 'moveItem';
      itemId: string;
      sourceRootId: RootId;
      targetRootId: RootId;
      targetFolderId?: string | null;
      targetItemId?: string | null;
      targetPosition?: DropPosition;
    }
  | { type: 'setToolbarVisibility'; toolbarVisibility: ToolbarVisibility };

export type BookmarkApplyResult = { changed: boolean; snapshot: BookmarkSnapshot };

export type BookmarkMoveDraft = {
  itemId: string;
  sourceRootId: RootId;
  targetFolderId: string;
  targetItemId: string;
  targetPosition: 'before' | 'after';
  targetRootId: RootId;
};

export type FlatTreeItem = {
  depth: number;
  item: BookmarkTreeItem;
  parentFolderId: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function requireString(value: unknown, field: string) {
  if (typeof value !== 'string') throw new Error(`${field} is invalid.`);
  return value;
}

function parseTreeItem(value: unknown, depth = 0): BookmarkTreeItem {
  if (!isRecord(value) || depth > 32) throw new Error('Bookmark tree is invalid.');
  const type = value.type;
  const base = {
    createdAt: typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) ? value.createdAt : 0,
    id: requireString(value.id, 'Bookmark id'),
    title: requireString(value.title, 'Bookmark title'),
  };
  if (type === 'folder') {
    if (!Array.isArray(value.children)) throw new Error('Folder children are invalid.');
    return { ...base, type, children: value.children.map((child) => parseTreeItem(child, depth + 1)) };
  }
  if (type !== 'bookmark') throw new Error('Bookmark type is invalid.');
  return {
    ...base,
    type,
    displayUrl: requireString(value.displayUrl, 'Bookmark address'),
    accountId: value.accountId === null || typeof value.accountId === 'string' ? value.accountId : undefined,
  };
}

export function parseBookmarkSnapshot(value: unknown): BookmarkSnapshot {
  if (!isRecord(value)) throw new Error('Home returned an invalid bookmark response.');
  if (value.schemaVersion !== 1 || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0) {
    throw new Error('Home returned an unsupported bookmark response.');
  }
  if (!Array.isArray(value.bookmarks) || !Array.isArray(value.toolbar) || !Array.isArray(value.dashboardPins) || !Array.isArray(value.startPages)) {
    throw new Error('Home returned incomplete bookmark data.');
  }
  if (!['hidden', 'dashboard', 'always'].includes(String(value.toolbarVisibility))) {
    throw new Error('Home returned an invalid toolbar setting.');
  }

  return {
    schemaVersion: 1,
    revision: value.revision as number,
    bookmarks: value.bookmarks.map((item) => parseTreeItem(item)),
    toolbar: value.toolbar.map((item) => parseTreeItem(item)),
    toolbarVisibility: value.toolbarVisibility as ToolbarVisibility,
    // Home 1.5 additions: older Home responses omit these, so default to "no accounts known".
    availableAccounts: Array.isArray(value.availableAccounts)
      ? value.availableAccounts.filter(isRecord).map((account) => ({
          id: requireString(account.id, 'Account id'),
          label: requireString(account.label, 'Account label'),
        }))
      : [],
    activeAccountId: typeof value.activeAccountId === 'string' ? value.activeAccountId : null,
    dashboardPins: value.dashboardPins.map((pin) => {
      if (!isRecord(pin)) throw new Error('Dashboard pin is invalid.');
      return {
        id: requireString(pin.id, 'Pin id'),
        label: requireString(pin.label, 'Pin label'),
        customLabel: typeof pin.customLabel === 'string' ? pin.customLabel : undefined,
        displayUrl: requireString(pin.displayUrl, 'Pin address'),
        accountId: pin.accountId === null || typeof pin.accountId === 'string' ? pin.accountId : undefined,
        createdAt: typeof pin.createdAt === 'number' && Number.isFinite(pin.createdAt) ? pin.createdAt : 0,
      };
    }),
    startPages: value.startPages.map((page) => {
      if (!isRecord(page)) throw new Error('Start page is invalid.');
      return {
        displayUrl: requireString(page.displayUrl, 'Start page address'),
        title: typeof page.title === 'string' ? page.title : undefined,
        accountId: typeof page.accountId === 'string' ? page.accountId : null,
      };
    }),
  };
}

export function flattenTree(items: BookmarkTreeItem[], depth = 0, parentFolderId: string | null = null): FlatTreeItem[] {
  return items.flatMap((item) => [
    { item, depth, parentFolderId },
    ...(item.type === 'folder' ? flattenTree(item.children, depth + 1, item.id) : []),
  ]);
}

export function findTreeItem(items: BookmarkTreeItem[], itemId: string): BookmarkTreeItem | null {
  for (const item of items) {
    if (item.id === itemId) return item;
    if (item.type === 'folder') {
      const nested = findTreeItem(item.children, itemId);
      if (nested) return nested;
    }
  }
  return null;
}

export function countTreeItems(items: BookmarkTreeItem[]): number {
  return items.reduce((count, item) => count + 1 + (item.type === 'folder' ? countTreeItems(item.children) : 0), 0);
}

export function rootCount(snapshot: BookmarkSnapshot, rootId: RootId) {
  if (rootId === 'bookmarks' || rootId === 'toolbar') return countTreeItems(snapshot[rootId]);
  return rootId === 'pins' ? snapshot.dashboardPins.length : snapshot.startPages.length;
}

export function isDescendant(items: BookmarkTreeItem[], parentId: string, candidateId: string): boolean {
  const parent = findTreeItem(items, parentId);
  return parent?.type === 'folder' ? !!findTreeItem(parent.children, candidateId) : false;
}

export function getErrorCode(error: unknown): string {
  if (!isRecord(error)) return '';
  if (typeof error.code === 'string') return error.code;
  if (isRecord(error.cause) && typeof error.cause.code === 'string') return error.cause.code;
  return '';
}

export function buildMoveMutation(snapshot: BookmarkSnapshot, draft: BookmarkMoveDraft): BookmarkMutation | null {
  const treeTarget = draft.targetRootId === 'bookmarks' || draft.targetRootId === 'toolbar';
  let targetItemId = draft.targetItemId;
  let targetPosition = draft.targetPosition;

  if (
    !targetItemId &&
    draft.sourceRootId === draft.targetRootId &&
    (draft.targetRootId === 'pins' || draft.targetRootId === 'startPages')
  ) {
    const candidates = draft.targetRootId === 'pins'
      ? snapshot.dashboardPins.map((item) => item.id)
      : snapshot.startPages.map((item) => item.displayUrl);
    const lastOtherItem = candidates.filter((itemId) => itemId !== draft.itemId).at(-1);
    if (!lastOtherItem) return null;
    targetItemId = lastOtherItem;
    targetPosition = 'after';
  }

  return {
    type: 'moveItem',
    itemId: draft.itemId,
    sourceRootId: draft.sourceRootId,
    targetRootId: draft.targetRootId,
    ...(treeTarget ? { targetFolderId: draft.targetFolderId || null } : {}),
    ...(targetItemId ? { targetItemId, targetPosition } : {}),
  };
}

export type AccountChoice = HomeAccountOption & { unavailable?: boolean };

/**
 * Builds the Current + Home-provided account list for the account picker. If
 * the item's saved accountId no longer matches any Home account (removed or
 * from a different device), it is kept as a trailing "unavailable" choice
 * instead of being silently dropped so unrelated edits don't clear it.
 */
export function buildAccountChoices(availableAccounts: HomeAccountOption[], savedAccountId: string | null | undefined): AccountChoice[] {
  const choices: AccountChoice[] = availableAccounts.map((account) => ({ ...account }));
  if (savedAccountId && !availableAccounts.some((account) => account.id === savedAccountId)) {
    choices.push({ id: savedAccountId, label: savedAccountId, unavailable: true });
  }
  return choices;
}

const QDN_NAME_PATTERN = /^qdn:\/\/(?:app|website)\/([^/?#]+)/i;

/** Extracts the registered QDN name (e.g. "Help") from a qdn://APP/Help/Help style address. */
export function qdnNameFromAddress(displayUrl: string): string | null {
  const match = QDN_NAME_PATTERN.exec(displayUrl.trim());
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * Resolves the label shown for a saved place. When a saved title is blank or
 * just repeats the address, this derives a friendlier label from the QDN name
 * instead of rendering the same address twice in the row.
 */
export function friendlyLabelFor(title: string | undefined, displayUrl: string): string {
  const trimmed = (title ?? '').trim();
  if (trimmed && trimmed !== displayUrl) return trimmed;
  return qdnNameFromAddress(displayUrl) ?? displayUrl;
}
