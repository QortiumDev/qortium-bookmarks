export const BOOKMARK_VIEWS = ['bookmarks', 'toolbar', 'pins', 'startPages'] as const;
export type BookmarkView = (typeof BOOKMARK_VIEWS)[number];

export function viewFromHash(hash: string): BookmarkView {
  const route = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return BOOKMARK_VIEWS.includes(route as BookmarkView) ? (route as BookmarkView) : 'bookmarks';
}

export function hashForView(view: BookmarkView) {
  return `#/${view}`;
}

export type BookmarkWorkspace = BookmarkView | 'developers';
const DEVELOPER_ALIASES = ['developers', 'developer', 'reference'];

/** Developers takes precedence; the fragment retains the manager collection. */
export function workspaceFromUrl(input: string): BookmarkWorkspace {
  const url = new URL(input, 'http://localhost');
  return DEVELOPER_ALIASES.includes(url.searchParams.get('view') ?? '')
    ? 'developers' : viewFromHash(url.hash);
}

export function urlForWorkspace(input: string, view: BookmarkWorkspace): string {
  const url = new URL(input, 'http://localhost');
  url.searchParams.delete('section');
  if (view === 'developers') url.searchParams.set('view', 'developers');
  else {
    url.searchParams.delete('view');
    url.hash = hashForView(view);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function normalizeWorkspaceUrl(input: string): string {
  const url = new URL(input, 'http://localhost');
  if (workspaceFromUrl(input) === 'developers') url.searchParams.set('view', 'developers');
  else if (!url.hash) url.hash = hashForView('bookmarks');
  return `${url.pathname}${url.search}${url.hash}`;
}
