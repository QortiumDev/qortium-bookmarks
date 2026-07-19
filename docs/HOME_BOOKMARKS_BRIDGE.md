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

Tree links, dashboard pins, and start pages may contain a Home account ID.
Both `BOOKMARKS_GET` and `BOOKMARKS_APPLY` snapshots also compatibly add
`availableAccounts: [{ id, label }]` (the Home accounts on this device) and
`activeAccountId: string | null` (the account showing in the Bookmarks tab).
Older Home builds that omit these fields are treated as reporting no known
accounts; the app never clears a saved account ID just because Home didn't
report it back — it keeps it selectable as an explicit "unavailable" choice
instead. The manager permission is app-scoped, device-local, and can be
revoked in Home settings.

## Opening a saved place

`BOOKMARKS_OPEN` is a feature-discoverable action (checked via `SHOW_ACTIONS`,
not required to enter the manager) accepting
`{ action: 'BOOKMARKS_OPEN', address, accountId }`. `accountId: null` means
Current — open under the account already active in the Bookmarks tab.
A non-null `accountId` is validated by Home and opens the address under that
exact account.

If Home doesn't report `BOOKMARKS_OPEN`, the app never silently falls back to
the generic `OPEN_NEW_TAB` action for an item with a saved account, since that
action has no way to carry the account and would discard the assignment.
Instead it shows a compatibility notice asking the user to update Home. Items
with no saved account still fall back to `OPEN_NEW_TAB`, then `window.open`.

## Icons

For saved `qdn://APP/...` and `qdn://WEBSITE/...` places, the app resolves an
icon through the `GET_QDN_RESOURCE_URL` action, trying (in order) the
resource's own `favicon.ico`, then the publisher's `THUMBNAIL` avatar
(`avatar`), then falling back to a name monogram if neither loads.
Resolutions are cached per resource and loaded lazily as rows scroll into
view. Non-QDN addresses (`home://...`) keep their generic icon.
