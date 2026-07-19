# Home bookmarks bridge

Bookmarks depends on these Home 1.5 `qdnRequest` actions:

- `BOOKMARKS_HAS_PERMISSION` checks access without prompting.
- `BOOKMARKS_GET` asks for access when needed and returns the current snapshot.
- `BOOKMARKS_APPLY` applies one typed mutation at an exact snapshot revision.

The app verifies all three with `SHOW_ACTIONS` before presenting its manager.
It does not fall back to local storage because that would be a different data
set from the bookmarks the user asked Home to manage.

Every update sends the displayed `revision` as `expectedRevision`. A
`HOME_DATA_STALE` response causes the app to fetch the new snapshot while
retaining the pending mutation. The user can review the current data and retry;
the app never silently overwrites a newer Home edit.

The `qortiumBookmarkManagerChanged` event carries only a revision. When it
differs from the displayed revision, the app refetches the complete snapshot.
Quick events may be coalesced by Home.

## Data covered

- Nested ordinary bookmark and toolbar trees.
- Dashboard pins.
- Start pages.
- Toolbar visibility: `hidden`, `dashboard`, or `always`.

Tree links, dashboard pins, and start pages may contain a Home account ID. It
is displayed only in the editor for that saved place. The manager permission
is app-scoped, device-local, and can be revoked in Home settings.
