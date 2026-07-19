export const BOOKMARK_VIEWS = ['bookmarks', 'toolbar', 'pins', 'startPages'] as const;
export type BookmarkView = (typeof BOOKMARK_VIEWS)[number];

export function viewFromHash(hash: string): BookmarkView {
  const route = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return BOOKMARK_VIEWS.includes(route as BookmarkView) ? (route as BookmarkView) : 'bookmarks';
}

export function hashForView(view: BookmarkView) {
  return `#/${view}`;
}
