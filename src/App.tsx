import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Bookmark,
  ExternalLink,
  Folder,
  FolderPlus,
  GripVertical,
  Home,
  Link as LinkIcon,
  LoaderCircle,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import {
  applyBookmarkMutation,
  getBookmarks,
  getBookmarksCapability,
  hasBookmarksPermission,
  openSavedAddress,
  QDN_RESOURCE_URL_ACTION,
} from './bookmarkApi';
import { hashForView, viewFromHash, type BookmarkView } from './appRoute';
import {
  buildAccountChoices,
  findTreeItem,
  flattenTree,
  buildMoveMutation,
  friendlyLabelFor,
  getErrorCode,
  isDescendant,
  rootCount,
  type BookmarkFolder,
  type BookmarkMutation,
  type BookmarkSnapshot,
  type BookmarkTreeItem,
  type DashboardPin,
  type HomeAccountOption,
  type LinkDraft,
  type RootId,
  type StartPage,
  type ToolbarVisibility,
  type TreeRootId,
} from './bookmarkManager';
import {
  applyDisplaySettings,
  getDisplaySettingsUpdateFromMessage,
  getInitialDisplaySettings,
  normalizeHomeSettingsHostMessage,
  type QdnDisplaySettings,
} from './displaySettings';
import { createTranslator, type TranslateFunction } from './i18n';
import {
  buildIconCandidates,
  getCachedQdnIconUrl,
  iconCacheKeyFor,
  monogramFor,
  parseQdnAddress,
  resolveQdnIconUrl,
} from './qdnIcon';
import { hasAction, qdnRequest } from './qdnRequest';
import { bookmarkManagerStateReducer, INITIAL_BOOKMARK_MANAGER_STATE, shouldRefreshForRevision } from './bookmarkState';
import { BookmarkLoadGuard, runSingleFlight, type SingleFlight } from './bookmarkLoadGuard';

type ViewId = BookmarkView;
type Phase = 'booting' | 'permission' | 'ready' | 'unsupported';
type LinkEditor = {
  kind: 'link';
  mode: 'add' | 'edit';
  rootId: RootId;
  itemId?: string;
  originalUrl?: string;
  parentFolderId?: string | null;
  title: string;
  displayUrl: string;
  accountId: string;
};
type FolderEditor = {
  kind: 'folder';
  mode: 'add' | 'edit';
  rootId: TreeRootId;
  itemId?: string;
  parentFolderId?: string | null;
  title: string;
};
type MoveEditor = {
  kind: 'move';
  itemId: string;
  isFolder: boolean;
  sourceRootId: RootId;
  targetRootId: RootId;
  targetFolderId: string;
  targetItemId: string;
  targetPosition: 'before' | 'after';
};
type Editor = LinkEditor | FolderEditor | MoveEditor;

const APP_VERSION = __APP_VERSION__;

function routeFromLocation(): ViewId {
  return viewFromHash(window.location.hash);
}

function navigate(view: ViewId) {
  const nextHash = hashForView(view);
  if (window.location.hash !== nextHash) window.history.pushState({ view }, '', nextHash);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isPermissionError(error: unknown) {
  return /permission|denied|access/i.test(errorMessage(error));
}

function itemMatches(item: BookmarkTreeItem, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  if (item.title.toLocaleLowerCase().includes(normalized)) return true;
  if (item.type === 'bookmark' && item.displayUrl.toLocaleLowerCase().includes(normalized)) return true;
  return item.type === 'folder' && item.children.some((child) => itemMatches(child, normalized));
}

function directChildren(snapshot: BookmarkSnapshot, rootId: RootId, folderId: string) {
  if (rootId !== 'bookmarks' && rootId !== 'toolbar') return [];
  if (!folderId) return snapshot[rootId];
  const folder = findTreeItem(snapshot[rootId], folderId);
  return folder?.type === 'folder' ? folder.children : [];
}

function specialItemId(item: DashboardPin | StartPage): string {
  return 'id' in item ? item.id : item.displayUrl;
}

function specialTitle(item: DashboardPin | StartPage): string {
  const provided = ('label' in item ? item.customLabel || item.label : item.title) ?? '';
  return friendlyLabelFor(provided, item.displayUrl);
}

function AccountBadge({ accountId, availableAccounts, t }: { accountId?: string | null; availableAccounts: HomeAccountOption[]; t: TranslateFunction }) {
  if (!accountId) return null;
  const label = availableAccounts.find((account) => account.id === accountId)?.label ?? t('label.accountUnavailable');
  return <span className="account-badge" title={label}>{label}</span>;
}

function QdnPlaceIcon({ address, label, actions, fallback }: { address: string; label: string; actions: string[]; fallback: React.ReactNode }) {
  const parsed = useMemo(() => parseQdnAddress(address), [address]);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const hostRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setIconUrl(null);
    setFailed(false);
    setVisible(false);
  }, [address]);

  useEffect(() => {
    const node = hostRef.current;
    if (!node || visible) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
    }, { rootMargin: '120px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !parsed || !hasAction(actions, QDN_RESOURCE_URL_ACTION)) return;
    let cancelled = false;
    const candidates = buildIconCandidates(parsed);
    void getCachedQdnIconUrl(iconCacheKeyFor(parsed), () => resolveQdnIconUrl(
      candidates,
      async (candidate) => {
        const url = await qdnRequest<unknown>({ action: QDN_RESOURCE_URL_ACTION, ...candidate });
        return typeof url === 'string' && url ? url : null;
      },
      (url) => new Promise((resolve) => {
        const image = new window.Image();
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
        image.src = url;
      }),
    )).then((url) => {
      if (cancelled) return;
      if (url) setIconUrl(url);
      else setFailed(true);
    });
    return () => { cancelled = true; };
  }, [visible, parsed, actions]);

  if (!parsed) return <>{fallback}</>;
  return (
    <span className="item-icon__media" ref={hostRef}>
      {iconUrl && !failed
        ? <img src={iconUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
        : <span className="item-icon__monogram" aria-hidden="true">{monogramFor(label)}</span>}
    </span>
  );
}

function IconButton({ label, onClick, children, danger = false, disabled = false }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button className={`icon-button${danger ? ' icon-button--danger' : ''}`} type="button" onClick={onClick} aria-label={label} title={label} disabled={disabled}>
      {children}
    </button>
  );
}

function Modal({ title, closeLabel, onClose, children }: { title: string; closeLabel: string; onClose: () => void; children: React.ReactNode }) {
  const modalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(modalRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) {
        event.preventDefault();
        modalRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!modalRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const initialFocus = modalRef.current?.querySelector<HTMLElement>('[autofocus]') ?? focusables()[0] ?? modalRef.current;
    initialFocus?.focus();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={modalRef} tabIndex={-1}>
        <header className="modal__header">
          <h2 id="modal-title">{title}</h2>
          <IconButton label={closeLabel} onClick={onClose}><X /></IconButton>
        </header>
        {children}
      </section>
    </div>
  );
}

function EmptyState({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="empty-state">{icon}<span>{children}</span></div>;
}

export function App() {
  const [displaySettings, setDisplaySettings] = useState<QdnDisplaySettings>(() => getInitialDisplaySettings());
  const [phase, setPhase] = useState<Phase>('booting');
  const [managerState, dispatchManagerState] = useReducer(bookmarkManagerStateReducer, INITIAL_BOOKMARK_MANAGER_STATE);
  const snapshot = managerState.snapshot;
  const [view, setView] = useState<ViewId>(() => routeFromLocation());
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const pendingMutation = managerState.pendingMutation;
  const [actions, setActions] = useState<string[]>([]);
  const [isPermissionPending, setIsPermissionPending] = useState(false);
  const refreshAfterSaveRef = useRef(false);
  const loadGuardRef = useRef(new BookmarkLoadGuard());
  const permissionFlightRef = useRef<SingleFlight<void>>({ current: null });
  const t = useMemo(() => createTranslator(displaySettings.language), [displaySettings.language]);
  const closeEditor = useCallback(() => setEditor(null), []);

  const loadSnapshot = useCallback((promptForPermission = false): Promise<void> => {
    if (permissionFlightRef.current.current) return permissionFlightRef.current.current;
    const run = async () => {
      const requestId = loadGuardRef.current.startRequest();
      setError('');
      try {
        if (!promptForPermission && !(await hasBookmarksPermission())) {
          if (!loadGuardRef.current.isLatestRequest(requestId)) return;
          setPhase('permission');
          dispatchManagerState({ type: 'clear' });
          return;
        }
        const next = await getBookmarks();
        if (!loadGuardRef.current.acceptResponse(requestId, next.revision)) return;
        dispatchManagerState({ type: 'loaded', snapshot: next });
        setPhase('ready');
      } catch (loadError) {
        if (!loadGuardRef.current.isLatestRequest(requestId)) return;
        if (isPermissionError(loadError)) {
          setPhase('permission');
          dispatchManagerState({ type: 'clear' });
        } else {
          setError(errorMessage(loadError));
        }
      }
    };
    if (!promptForPermission) return run();
    return runSingleFlight(permissionFlightRef.current, async () => {
      setIsPermissionPending(true);
      try { await run(); } finally { setIsPermissionPending(false); }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const capability = await getBookmarksCapability();
        if (cancelled) return;
        setActions(capability.bridge.actions);
        if (!capability.bridge.isHomeBridge || !capability.supported) {
          setPhase('unsupported');
          return;
        }
        await loadSnapshot(false);
      } catch (bootError) {
        if (!cancelled) {
          setError(errorMessage(bootError));
          setPhase('unsupported');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [loadSnapshot]);

  useEffect(() => {
    const onRoute = () => setView(routeFromLocation());
    window.addEventListener('hashchange', onRoute);
    window.addEventListener('popstate', onRoute);
    if (!window.location.hash) window.history.replaceState({ view: 'bookmarks' }, '', '#/bookmarks');
    return () => {
      window.removeEventListener('hashchange', onRoute);
      window.removeEventListener('popstate', onRoute);
    };
  }, []);

  useEffect(() => {
    const applyHostSettings = (value: unknown) => {
      const next = getDisplaySettingsUpdateFromMessage(value, displaySettings);
      if (next) {
        setDisplaySettings(next);
        applyDisplaySettings(next);
      }
    };
    const onMessage = (event: MessageEvent) => applyHostSettings(normalizeHomeSettingsHostMessage(event.data));
    const onSettingsChanged = (event: Event) => applyHostSettings({
      action: 'DISPLAY_SETTINGS_CHANGED',
      ...(event as CustomEvent<Record<string, unknown>>).detail,
    });
    window.addEventListener('message', onMessage);
    window.addEventListener('qortiumHomeSettingsChanged', onSettingsChanged);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('qortiumHomeSettingsChanged', onSettingsChanged);
    };
  }, [displaySettings]);

  useEffect(() => {
    if (!hasAction(actions, 'GET_HOME_SETTINGS')) return;
    void qdnRequest<Record<string, unknown>>({ action: 'GET_HOME_SETTINGS' }).then((settings) => {
      const next = getDisplaySettingsUpdateFromMessage({ action: 'DISPLAY_SETTINGS_CHANGED', ...settings }, displaySettings);
      if (next) {
        setDisplaySettings(next);
        applyDisplaySettings(next);
      }
    }).catch(() => undefined);
  }, [actions]);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const revision = (event as CustomEvent<{ revision?: unknown }>).detail?.revision;
      if (phase === 'ready' && shouldRefreshForRevision(snapshot, revision)) {
        if (isSaving) refreshAfterSaveRef.current = true;
        else void loadSnapshot(false);
      }
    };
    window.addEventListener('qortiumBookmarkManagerChanged', onChanged);
    return () => window.removeEventListener('qortiumBookmarkManagerChanged', onChanged);
  }, [isSaving, loadSnapshot, phase, snapshot?.revision]);

  const runMutation = useCallback(async (mutation: BookmarkMutation) => {
    if (!snapshot) return;
    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await applyBookmarkMutation(snapshot, mutation);
      loadGuardRef.current.observeRevision(result.snapshot.revision);
      dispatchManagerState({ type: 'applied', snapshot: result.snapshot });
      setEditor(null);
      setNotice(result.changed ? t('status.saved') : t('status.noChanges'));
    } catch (saveError) {
      if (getErrorCode(saveError) === 'HOME_DATA_STALE') {
        dispatchManagerState({ type: 'stale', mutation });
        setNotice(t('error.stale'));
        await loadSnapshot(false);
      } else if (isPermissionError(saveError)) {
        setPhase('permission');
        dispatchManagerState({ type: 'clear' });
        setError(t('error.access'));
      } else {
        setError(errorMessage(saveError));
      }
    } finally {
      setIsSaving(false);
      if (refreshAfterSaveRef.current) {
        refreshAfterSaveRef.current = false;
        await loadSnapshot(false);
      }
    }
  }, [loadSnapshot, snapshot, t]);

  const retryMutation = useCallback(() => {
    if (pendingMutation) void runMutation(pendingMutation);
  }, [pendingMutation, runMutation]);

  const openItem = useCallback(async (address: string, accountId?: string | null) => {
    const plan = await openSavedAddress(actions, address, accountId);
    if (plan.action === 'ACCOUNT_UNSUPPORTED') setNotice(t('notice.openAccountUnsupported'));
  }, [actions, t]);

  const openAddLink = (rootId: RootId, parentFolderId: string | null = null) => setEditor({
    kind: 'link', mode: 'add', rootId, parentFolderId, title: '', displayUrl: '', accountId: '',
  });

  const openEditTreeItem = (rootId: TreeRootId, item: BookmarkTreeItem) => {
    if (item.type === 'folder') {
      setEditor({ kind: 'folder', mode: 'edit', rootId, itemId: item.id, title: item.title });
    } else {
      setEditor({
        kind: 'link', mode: 'edit', rootId, itemId: item.id, title: item.title,
        displayUrl: item.displayUrl, accountId: item.accountId ?? '',
      });
    }
  };

  const openEditSpecial = (rootId: 'pins' | 'startPages', item: DashboardPin | StartPage) => setEditor({
    kind: 'link', mode: 'edit', rootId, itemId: specialItemId(item), originalUrl: item.displayUrl,
    title: specialTitle(item), displayUrl: item.displayUrl, accountId: item.accountId ?? '',
  });

  const openMove = (sourceRootId: RootId, itemId: string, isFolder = false) => setEditor({
    kind: 'move', sourceRootId, itemId, isFolder, targetRootId: sourceRootId,
    targetFolderId: '', targetItemId: '', targetPosition: 'after',
  });

  const removeTreeItem = (rootId: TreeRootId, item: BookmarkTreeItem) => {
    if (window.confirm(t('confirm.remove'))) void runMutation({ type: 'removeTreeItem', rootId, itemId: item.id });
  };

  const removeSpecial = (rootId: 'pins' | 'startPages', item: DashboardPin | StartPage) => {
    if (!window.confirm(t('confirm.remove'))) return;
    void runMutation(rootId === 'pins'
      ? { type: 'removeDashboardPin', pinId: (item as DashboardPin).id }
      : { type: 'removeStartPage', displayUrl: item.displayUrl });
  };

  const renderTree = (rootId: TreeRootId, items: BookmarkTreeItem[], depth = 0): React.ReactNode => items
    .filter((item) => itemMatches(item, query))
    .map((item) => (
      <div className="tree-branch" key={item.id}>
        <article className="item-row" style={{ '--depth': depth } as React.CSSProperties}>
          <span className="item-row__grip" aria-hidden="true"><GripVertical /></span>
          <span className={`item-icon${item.type === 'folder' ? ' item-icon--folder' : parseQdnAddress(item.displayUrl) ? ' item-icon--qdn' : ''}`}>
            {item.type === 'folder'
              ? <Folder />
              : <QdnPlaceIcon address={item.displayUrl} label={friendlyLabelFor(item.title, item.displayUrl)} actions={actions} fallback={<Bookmark />} />}
          </span>
          <div className="item-row__body">
            <strong>{item.type === 'folder' ? item.title : friendlyLabelFor(item.title, item.displayUrl)}</strong>
            <span>{item.type === 'folder' ? t('label.folderItems', { count: item.children.length }) : item.displayUrl}</span>
            {item.type === 'bookmark' ? <AccountBadge accountId={item.accountId} availableAccounts={snapshot?.availableAccounts ?? []} t={t} /> : null}
          </div>
          <div className="item-row__actions">
            {item.type === 'bookmark' ? <IconButton label={t('aria.openItem', { title: friendlyLabelFor(item.title, item.displayUrl) })} onClick={() => void openItem(item.displayUrl, item.accountId)}><ExternalLink /></IconButton> : null}
            {item.type === 'folder' ? <>
              <IconButton label={t('aria.addLinkTo', { title: item.title })} onClick={() => openAddLink(rootId, item.id)}><Plus /></IconButton>
              <IconButton label={t('aria.addFolderTo', { title: item.title })} onClick={() => setEditor({ kind: 'folder', mode: 'add', rootId, parentFolderId: item.id, title: '' })}><FolderPlus /></IconButton>
            </> : null}
            <IconButton label={t('aria.moveItem', { title: item.title })} onClick={() => openMove(rootId, item.id, item.type === 'folder')}><GripVertical /></IconButton>
            <IconButton label={t('aria.editItem', { title: item.title })} onClick={() => openEditTreeItem(rootId, item)}><Pencil /></IconButton>
            <IconButton danger label={t('aria.deleteItem', { title: item.title })} onClick={() => removeTreeItem(rootId, item)}><Trash2 /></IconButton>
          </div>
        </article>
        {item.type === 'folder' ? renderTree(rootId, item.children, depth + 1) : null}
      </div>
    ));

  const currentCount = snapshot ? rootCount(snapshot, view === 'pins' ? 'pins' : view) : 0;
  const currentTree = snapshot && (view === 'bookmarks' || view === 'toolbar') ? snapshot[view] : [];
  const visibleSpecial = snapshot && view === 'pins'
    ? snapshot.dashboardPins.filter((item) => `${specialTitle(item)} ${item.displayUrl}`.toLowerCase().includes(query.toLowerCase()))
    : snapshot && view === 'startPages'
      ? snapshot.startPages.filter((item) => `${specialTitle(item)} ${item.displayUrl}`.toLowerCase().includes(query.toLowerCase()))
      : [];

  const folderOptions = useMemo(() => {
    if (!snapshot || editor?.kind !== 'move' || (editor.targetRootId !== 'bookmarks' && editor.targetRootId !== 'toolbar')) return [];
    return flattenTree(snapshot[editor.targetRootId]).filter(({ item }) => {
      if (item.type !== 'folder' || item.id === editor.itemId) return false;
      if (!editor.isFolder || editor.sourceRootId !== editor.targetRootId) return true;
      return !isDescendant(snapshot[editor.sourceRootId as TreeRootId], editor.itemId, item.id);
    }) as Array<{ depth: number; item: BookmarkFolder; parentFolderId: string | null }>;
  }, [editor, snapshot]);

  const moveTargets = useMemo(() => {
    if (!snapshot || editor?.kind !== 'move') return [];
    if (editor.targetRootId === 'bookmarks' || editor.targetRootId === 'toolbar') {
      if (editor.sourceRootId !== 'bookmarks' && editor.sourceRootId !== 'toolbar') return [];
      return directChildren(snapshot, editor.targetRootId, editor.targetFolderId)
        .filter((item) => item.id !== editor.itemId)
        .map((item) => ({ id: item.id, title: item.title }));
    }
    if (editor.sourceRootId !== editor.targetRootId) return [];
    const items = editor.targetRootId === 'pins' ? snapshot.dashboardPins : snapshot.startPages;
    return items.filter((item) => specialItemId(item) !== editor.itemId).map((item) => ({ id: specialItemId(item), title: specialTitle(item) }));
  }, [editor, snapshot]);

  const preparedMoveMutation = useMemo(() => {
    if (!snapshot || editor?.kind !== 'move') return null;
    return buildMoveMutation(snapshot, editor);
  }, [editor, snapshot]);

  const accountChoices = useMemo(() => {
    if (!snapshot || editor?.kind !== 'link') return [];
    return buildAccountChoices(snapshot.availableAccounts, editor.accountId || null);
  }, [editor, snapshot]);

  function submitEditor(event: React.FormEvent) {
    event.preventDefault();
    if (!editor) return;
    if (editor.kind === 'folder') {
      const mutation: BookmarkMutation = editor.mode === 'add'
        ? { type: 'addTreeFolder', rootId: editor.rootId, parentFolderId: editor.parentFolderId || null, title: editor.title }
        : { type: 'updateTreeFolder', rootId: editor.rootId, itemId: editor.itemId!, title: editor.title };
      void runMutation(mutation);
      return;
    }
    if (editor.kind === 'move') {
      if (preparedMoveMutation) void runMutation(preparedMoveMutation);
      else { setEditor(null); setNotice(t('status.noChanges')); }
      return;
    }
    const draft: LinkDraft = { title: editor.title, displayUrl: editor.displayUrl, accountId: editor.accountId.trim() || null };
    let mutation: BookmarkMutation;
    if (editor.rootId === 'bookmarks' || editor.rootId === 'toolbar') {
      mutation = editor.mode === 'add'
        ? { type: 'addTreeLink', rootId: editor.rootId, parentFolderId: editor.parentFolderId || null, link: draft }
        : { type: 'updateTreeLink', rootId: editor.rootId, itemId: editor.itemId!, link: draft };
    } else if (editor.rootId === 'pins') {
      mutation = editor.mode === 'add' ? { type: 'addDashboardPin', pin: draft } : { type: 'updateDashboardPin', pinId: editor.itemId!, pin: draft };
    } else {
      mutation = editor.mode === 'add'
        ? { type: 'addStartPage', page: draft }
        : { type: 'updateStartPage', displayUrl: editor.originalUrl!, page: draft };
    }
    void runMutation(mutation);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand__icon"><Bookmark /></span>
          <div><h1>{t('app.title')}</h1><p>{t('app.subtitle')}</p></div>
        </div>
        <div className="header-actions">
          <span className="version">{APP_VERSION}</span>
          <IconButton label={t('action.refresh')} onClick={() => void loadSnapshot(false)} disabled={isPermissionPending}><RefreshCw /></IconButton>
        </div>
      </header>

      {phase === 'booting' ? <section className="gate"><LoaderCircle className="spinner" /><h2>{t('label.loading')}</h2></section> : null}
      {phase === 'unsupported' ? (
        <section className="gate"><Home /><h2>{t('label.homeRequired')}</h2><p>{t('error.homeRequired')}</p></section>
      ) : null}
      {phase === 'permission' ? (
        <section className="gate"><Bookmark /><h2>{t('label.bookmarksAccess')}</h2><p>{t('label.permissionHelp')}</p>
          {error ? <div className="notice notice--error">{error}</div> : null}
          <button className="button button--primary" type="button" disabled={isPermissionPending} onClick={() => void loadSnapshot(true)}>{isPermissionPending ? <LoaderCircle className="spinner" /> : null}{isPermissionPending ? t('label.loading') : t('action.allow')}</button>
        </section>
      ) : null}

      {phase === 'ready' && snapshot ? (
        <div className="workspace">
          <nav className="tabs" aria-label={t('label.bookmarkCollections')}>
            {([
              ['bookmarks', t('label.bookmarks'), Bookmark],
              ['toolbar', t('label.toolbar'), LinkIcon],
              ['pins', t('label.dashboardPins'), Pin],
              ['startPages', t('label.startPages'), Home],
            ] as const).map(([id, label, Icon]) => (
              <button className={`tab${view === id ? ' tab--active' : ''}`} type="button" key={id} onClick={() => { navigate(id); setView(id); setQuery(''); }}>
                <Icon /><span>{label}</span><small>{rootCount(snapshot, id === 'pins' ? 'pins' : id)}</small>
              </button>
            ))}
          </nav>

          <section className="content-panel">
            <div className="content-toolbar">
              <div><h2>{view === 'pins' ? t('label.dashboardPins') : view === 'startPages' ? t('label.startPages') : view === 'toolbar' ? t('label.toolbar') : t('label.bookmarks')}</h2><p>{t('label.items', { count: currentCount })}</p></div>
              <div className="content-toolbar__actions">
                <label className="search-field"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('field.searchBookmarks')} aria-label={t('field.searchBookmarks')} /></label>
                {(view === 'bookmarks' || view === 'toolbar') ? <button className="button" type="button" onClick={() => setEditor({ kind: 'folder', mode: 'add', rootId: view, title: '' })}><Folder />{t('action.addFolder')}</button> : null}
                <button className="button button--primary" type="button" onClick={() => openAddLink(view === 'pins' ? 'pins' : view)}><Plus />{t('action.addLink')}</button>
              </div>
            </div>

            {view === 'toolbar' ? (
              <div className="setting-row"><span><Settings2 /><span><strong>{t('label.toolbarVisibility')}</strong><small>{t('label.toolbarDisplay')}</small></span></span>
                <select value={snapshot.toolbarVisibility} onChange={(event) => void runMutation({ type: 'setToolbarVisibility', toolbarVisibility: event.target.value as ToolbarVisibility })} disabled={isSaving}>
                  <option value="hidden">{t('label.hidden')}</option><option value="dashboard">{t('label.dashboard')}</option><option value="always">{t('label.always')}</option>
                </select>
              </div>
            ) : null}

            {error ? <div className="notice notice--error">{error}</div> : null}
            {notice ? <div className="notice"><span>{notice}</span>{pendingMutation ? <button className="button" type="button" onClick={retryMutation}>{t('action.retry')}</button> : null}</div> : null}
            {isSaving ? <div className="save-line" role="status"><LoaderCircle className="spinner" />{t('status.saving')}</div> : null}

            <div className="item-list">
              {(view === 'bookmarks' || view === 'toolbar') ? renderTree(view, currentTree) : null}
              {(view === 'pins' || view === 'startPages') ? visibleSpecial.map((item) => (
                <article className="item-row" key={specialItemId(item)}>
                  <span className="item-row__grip" aria-hidden="true"><GripVertical /></span>
                  <span className={`item-icon${parseQdnAddress(item.displayUrl) ? ' item-icon--qdn' : ''}`}>
                    <QdnPlaceIcon address={item.displayUrl} label={specialTitle(item)} actions={actions} fallback={view === 'pins' ? <Pin /> : <Home />} />
                  </span>
                  <div className="item-row__body">
                    <strong>{specialTitle(item)}</strong>
                    <span>{item.displayUrl}</span>
                    <AccountBadge accountId={item.accountId} availableAccounts={snapshot?.availableAccounts ?? []} t={t} />
                  </div>
                  <div className="item-row__actions">
                    <IconButton label={t('aria.openItem', { title: specialTitle(item) })} onClick={() => void openItem(item.displayUrl, item.accountId)}><ExternalLink /></IconButton>
                    <IconButton label={t('aria.moveItem', { title: specialTitle(item) })} onClick={() => openMove(view === 'pins' ? 'pins' : 'startPages', specialItemId(item))}><GripVertical /></IconButton>
                    <IconButton label={t('aria.editItem', { title: specialTitle(item) })} onClick={() => openEditSpecial(view === 'pins' ? 'pins' : 'startPages', item)}><Pencil /></IconButton>
                    <IconButton danger label={t('aria.deleteItem', { title: specialTitle(item) })} onClick={() => removeSpecial(view === 'pins' ? 'pins' : 'startPages', item)}><Trash2 /></IconButton>
                  </div>
                </article>
              )) : null}
              {currentCount === 0 ? <EmptyState icon={view === 'pins' ? <Pin /> : view === 'startPages' ? <Home /> : view === 'toolbar' ? <LinkIcon /> : <Bookmark />}>
                {view === 'pins' ? t('empty.pins') : view === 'startPages' ? t('empty.startPages') : view === 'toolbar' ? t('empty.toolbar') : t('empty.bookmarks')}
              </EmptyState> : null}
              {currentCount > 0 && ((view === 'bookmarks' || view === 'toolbar') ? !currentTree.some((item) => itemMatches(item, query)) : visibleSpecial.length === 0) ? <EmptyState icon={<Search />}>{t('empty.search')}</EmptyState> : null}
            </div>
          </section>
        </div>
      ) : null}

      {editor ? (
        <Modal title={editor.kind === 'move' ? t('action.move') : editor.mode === 'add' ? (editor.kind === 'folder' ? t('action.addFolder') : t('action.addLink')) : t('action.edit')} closeLabel={t('action.close')} onClose={closeEditor}>
          <form className="editor-form" onSubmit={submitEditor}>
            {editor.kind === 'folder' ? <label>{t('field.title')}<input autoFocus required value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} /></label> : null}
            {editor.kind === 'link' ? <>
              <label>{t('field.title')}<input autoFocus required value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} /></label>
              <label>{t('field.address')}<input required value={editor.displayUrl} onChange={(event) => setEditor({ ...editor, displayUrl: event.target.value })} placeholder={t('field.addressPlaceholder')} /></label>
              <label>{t('field.account')} <small>({t('label.optional')})</small>
                <select value={editor.accountId} onChange={(event) => setEditor({ ...editor, accountId: event.target.value })}>
                  <option value="">{t('label.currentAccount')}</option>
                  {accountChoices.map((choice) => (
                    <option key={choice.id} value={choice.id}>{choice.unavailable ? `${choice.label} (${t('label.accountUnavailable')})` : choice.label}</option>
                  ))}
                </select>
              </label>
            </> : null}
            {editor.kind === 'move' ? <>
              <label>{t('field.destination')}<select value={editor.targetRootId} onChange={(event) => setEditor({ ...editor, targetRootId: event.target.value as RootId, targetFolderId: '', targetItemId: '' })}>
                <option value="bookmarks">{t('label.bookmarks')}</option><option value="toolbar">{t('label.toolbar')}</option>
                {!editor.isFolder ? <option value="pins">{t('label.dashboardPins')}</option> : null}
                {!editor.isFolder ? <option value="startPages">{t('label.startPages')}</option> : null}
              </select></label>
              {(editor.targetRootId === 'bookmarks' || editor.targetRootId === 'toolbar') ? <label>{t('field.folder')}<select value={editor.targetFolderId} onChange={(event) => setEditor({ ...editor, targetFolderId: event.target.value, targetItemId: '' })}>
                <option value="">{t('move.topLevel')}</option>{folderOptions.map(({ depth, item }) => <option value={item.id} key={item.id}>{'— '.repeat(depth + 1)}{item.title}</option>)}
              </select></label> : null}
              <label>{t('field.position')}<select value={editor.targetItemId} onChange={(event) => setEditor({ ...editor, targetItemId: event.target.value })}>
                <option value="">{t('move.end')}</option>{moveTargets.map((target) => <option key={target.id} value={target.id}>{target.title}</option>)}
              </select></label>
              {editor.targetItemId ? <div className="segmented"><button type="button" className={editor.targetPosition === 'before' ? 'active' : ''} onClick={() => setEditor({ ...editor, targetPosition: 'before' })}>{t('move.before')}</button><button type="button" className={editor.targetPosition === 'after' ? 'active' : ''} onClick={() => setEditor({ ...editor, targetPosition: 'after' })}>{t('move.after')}</button></div> : null}
            </> : null}
            <footer className="modal__footer"><button className="button" type="button" onClick={closeEditor}>{t('action.cancel')}</button><button className="button button--primary" type="submit" disabled={isSaving || (editor.kind === 'move' && !preparedMoveMutation)}>{t('action.save')}</button></footer>
          </form>
        </Modal>
      ) : null}
    </main>
  );
}
