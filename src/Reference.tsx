import { useState } from 'react';
import { OPEN_ACTION, REQUIRED_ACTIONS } from './bookmarkApi';
import {
  BOOKMARK_SCHEMA_VERSION, MAX_PARSE_TREE_DEPTH, ROOT_IDS, TREE_ROOT_IDS, TOOLBAR_VISIBILITY,
  type BookmarkMutation, type BookmarkSnapshot,
} from './bookmarkManager';
import { copyTextToClipboard } from './clipboard';
import { ReferenceNavigation } from './ReferenceNavigation';

const exampleLink = { title: 'Qortal link', displayUrl: 'qortal://APP/xnetwork/default', accountId: null };
export const SNAPSHOT_EXAMPLE = {
  schemaVersion: BOOKMARK_SCHEMA_VERSION, revision: 7,
  bookmarks: [{ id: 'example-folder', type: 'folder', title: 'Links', createdAt: 1700000000000,
    children: [{ id: 'example-link', type: 'bookmark', ...exampleLink, createdAt: 1700000000000 }] }],
  toolbar: [], toolbarVisibility: TOOLBAR_VISIBILITY[1],
  dashboardPins: [{ id: 'example-pin', label: 'Help', displayUrl: 'qdn://APP/Help/Help', createdAt: 1700000000000, accountId: null }],
  startPages: [{ title: 'Home', displayUrl: 'home://dashboard', accountId: null }],
  availableAccounts: [], activeAccountId: null,
} satisfies BookmarkSnapshot;

/** Exhaustive type-checked inventory: adding or changing a mutation changes this contract. */
export const MUTATION_EXAMPLES = {
  addTreeLink: { type: 'addTreeLink', rootId: 'bookmarks', parentFolderId: 'example-folder', link: exampleLink },
  addTreeFolder: { type: 'addTreeFolder', rootId: 'toolbar', title: 'Links' },
  updateTreeLink: { type: 'updateTreeLink', rootId: 'bookmarks', itemId: 'example-link', link: exampleLink },
  updateTreeFolder: { type: 'updateTreeFolder', rootId: 'bookmarks', itemId: 'example-folder', title: 'Saved links' },
  removeTreeItem: { type: 'removeTreeItem', rootId: 'bookmarks', itemId: 'example-link' },
  addDashboardPin: { type: 'addDashboardPin', pin: exampleLink },
  updateDashboardPin: { type: 'updateDashboardPin', pinId: 'example-pin', pin: exampleLink },
  removeDashboardPin: { type: 'removeDashboardPin', pinId: 'example-pin' },
  addStartPage: { type: 'addStartPage', page: exampleLink },
  updateStartPage: { type: 'updateStartPage', displayUrl: 'home://dashboard', page: exampleLink },
  removeStartPage: { type: 'removeStartPage', displayUrl: 'home://dashboard' },
  moveItem: { type: 'moveItem', itemId: 'example-link', sourceRootId: 'bookmarks', targetRootId: 'toolbar', targetFolderId: null },
  setToolbarVisibility: { type: 'setToolbarVisibility', toolbarVisibility: TOOLBAR_VISIBILITY[2] },
} satisfies { [K in BookmarkMutation['type']]: Extract<BookmarkMutation, { type: K }> };

export const REFERENCE_SNIPPETS = {
  capabilities: `const actions = await qdnRequest({ action: 'SHOW_ACTIONS' });
const required = ${JSON.stringify(REQUIRED_ACTIONS)};
if (!Array.isArray(actions) || !required.every(action => actions.includes(action))) {
  throw new Error('Qortium Home bookmark manager is unavailable.');
}
const permission = await qdnRequest({ action: 'BOOKMARKS_HAS_PERMISSION' });
// This checks access without prompting. Read only after your user chooses to proceed.
if (permission.granted) {
  const snapshot = await qdnRequest({ action: 'BOOKMARKS_GET' });
  // Validate schemaVersion, revision and the complete snapshot before displaying it.
}`,
  snapshot: JSON.stringify(SNAPSHOT_EXAMPLE, null, 2),
  edit: `// Run only after the user has reviewed this edit. GET can ask for manager access.
const snapshot = await qdnRequest({ action: 'BOOKMARKS_GET' });
if (snapshot.schemaVersion !== ${BOOKMARK_SCHEMA_VERSION} || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0) {
  throw new Error('Unsupported snapshot');
}
const mutation = ${JSON.stringify(MUTATION_EXAMPLES.addTreeLink, null, 2)};
// Replace example-folder with a real folder ID from this snapshot.
const result = await qdnRequest({
  action: 'BOOKMARKS_APPLY', expectedRevision: snapshot.revision, mutation,
});
// Render result.snapshot even if result.changed is false.
// On HOME_DATA_STALE: fetch again, retain the draft, and ask the user to review.
// Never automatically retry a write after an ambiguous transport failure.`,
  mutations: JSON.stringify(Object.values(MUTATION_EXAMPLES), null, 2),
  opening: `const actions = await qdnRequest({ action: 'SHOW_ACTIONS' });
if (!Array.isArray(actions) || !actions.includes('${OPEN_ACTION}')) {
  throw new Error('Update Home to open a link with its account assignment.');
}
await qdnRequest({
  action: '${OPEN_ACTION}', address: '${exampleLink.displayUrl}', accountId: null,
});
// null uses the account active in this Bookmarks tab.
// A saved account ID must come from Home, never from a QDN name or address.`,
} as const;

export function Reference() {
  const [copied, setCopied] = useState('');
  async function copy(key: string, text: string, button: HTMLButtonElement) {
    setCopied(await copyTextToClipboard(text) ? key : 'unavailable');
    button.focus({ preventScroll: true });
  }
  return <article className="reference content-panel" lang="en" dir="ltr" aria-label="Bookmarks developer reference">
    <header className="reference-header">
      <h2>Developers</h2>
      <p>Qortium Home bookmark manager · snapshot schema {BOOKMARK_SCHEMA_VERSION}</p>
      <ReferenceNavigation />
      <p role="status" aria-live="polite" className="copy-status">{copied === 'unavailable' ? 'Clipboard unavailable. Select the code and copy it manually.' : copied ? `Copied ${copied} example.` : 'Code examples can be selected for manual copying.'}</p>
    </header>
    <div className="reference-scroll">
      <section id="reference-contract" tabIndex={-1}>
        <h3>Contract and privacy</h3>
        <p>The app is published on Qortium QDN as <code>APP/Bookmarks/Bookmarks</code>. The app bundle is public; saved places are held in Home’s device-local profile and are not published to QDN by this app. The manager permission exposes all saved Home links, including account IDs and labels, to the permitted app. These collections are not separate stores per chain or account.</p>
        <p>Use <code>qdnRequest</code> and <code>SHOW_ACTIONS</code> to discover {REQUIRED_ACTIONS.map((action, i) => <span key={action}>{i ? ', ' : ''}<code>{action}</code></span>)}. Home platform level 1.5 introduced the manager; capability discovery is authoritative. A plain browser or a host lacking these actions can display this reference but cannot manage Home’s bookmarks. No competing browser-local collection is created.</p>
        <p><code>BOOKMARKS_HAS_PERMISSION</code> returns <code>{'{ granted: boolean }'}</code> without a prompt. <code>BOOKMARKS_GET</code> can ask for durable <code>bookmarks.manage</code> access, scoped to the app on this device and revocable in Home settings. Apply and open also require that manager permission. This does not grant wallet keys or arbitrary signing authority; edits do not create blockchain transactions or require QDN confirmation.</p>
        <p>Opening saved destinations and fetching QDN icons can contact Home’s configured nodes. Device-local storage does not make destination visits private from their hosts.</p>
      </section>
      <section id="reference-snapshot" tabIndex={-1}>
        <h3>Snapshot schema</h3>
        <p><code>schemaVersion</code> is {BOOKMARK_SCHEMA_VERSION}; <code>revision</code> is a nonnegative safe integer used for exact-revision updates. The complete snapshot requires <code>bookmarks</code>, <code>toolbar</code>, <code>dashboardPins</code>, <code>startPages</code> arrays and <code>toolbarVisibility</code> ({TOOLBAR_VISIBILITY.join(', ')}). Unknown schema versions and malformed required fields are rejected.</p>
        <dl>
          <dt>Tree folder</dt><dd><code>type: 'folder'</code>, string <code>id</code>, string <code>title</code>, millisecond Unix <code>createdAt</code>, and recursive <code>children</code>. The app parser accepts depth through {MAX_PARSE_TREE_DEPTH}, starting at zero.</dd>
          <dt>Tree bookmark</dt><dd><code>type: 'bookmark'</code>, string <code>id</code>, <code>title</code> and <code>displayUrl</code>, millisecond Unix <code>createdAt</code>, optional nullable string <code>accountId</code>.</dd>
          <dt>Dashboard pin</dt><dd>String <code>id</code>, <code>label</code>, <code>displayUrl</code>; millisecond Unix <code>createdAt</code>; optional string <code>customLabel</code> and optional nullable string <code>accountId</code>.</dd>
          <dt>Start page</dt><dd>String <code>displayUrl</code> identifies the entry; optional string <code>title</code> and nullable string <code>accountId</code>. No separate ID or creation time.</dd>
          <dt>Account context</dt><dd><code>availableAccounts: [{'{ id: string, label: string }'}]</code> and <code>activeAccountId: string | null</code>. Older snapshots may omit these; the app defaults to no known accounts and null. Missing or invalid creation times render as zero. Unknown extra fields are not retained by the parser.</dd>
        </dl>
        <p>Home validates and normalizes writes. Its current schema-1 contract bounds a folder/root at 128 entries, each tree at 4096 total items, dashboard pins at 32 and start pages at 10. String limits are JavaScript string lengths: IDs 2048, titles 4096, stored addresses 16384, account IDs/labels 256. Opening has a separate 2048-character address limit. These host bounds are not permissions or guaranteed remaining capacity; refresh and report Home’s validation result.</p>
      </section>
      <section id="reference-mutations" tabIndex={-1}>
        <h3>Edits and revisions</h3>
        <p>Send <code>{'{ action: "BOOKMARKS_APPLY", expectedRevision, mutation }'}</code> with the revision of the displayed snapshot. A successful response is <code>{'{ changed: boolean, snapshot }'}</code>. Use the returned snapshot even for a no-op. Home is authoritative; the app does not increment revisions or invent IDs.</p>
        <p><code>HOME_DATA_STALE</code> means another edit won. Fetch the new snapshot, retain the pending mutation, and let the user review and explicitly retry. <code>qortiumBookmarkManagerChanged</code> carries <code>detail.revision</code> only; a differing revision triggers a complete read. Events can be coalesced. A transport error is not evidence that a write did not happen: refresh before deciding to retry.</p>
        <p>Mutation kinds: {Object.keys(MUTATION_EXAMPLES).map((kind, i) => <span key={kind}>{i ? ', ' : ''}<code>{kind}</code></span>)}. Copy the complete inventory below for field shapes; each object is one mutation, not a batch request.</p>
        <p>Tree roots are {TREE_ROOT_IDS.join(', ')}; movement roots are {ROOT_IDS.join(', ')}. <code>parentFolderId</code>/<code>targetFolderId</code> omitted or null select the root. <code>moveItem</code> accepts an optional <code>targetItemId</code> and <code>targetPosition</code> of before, after or inside. Folder cycles are invalid. Removing a folder removes its descendants. Home controls cross-collection conversion and capacity.</p>
        <p>Link drafts contain <code>title</code>, <code>displayUrl</code> and optional nullable <code>accountId</code>. Home trims and validates addresses; <code>INVALID_ADDRESS</code> is shown in the editor. The app prechecks exact address duplicates among siblings, or within pins/start pages, and leaves final acceptance to Home.</p>
      </section>
      <section id="reference-opening" tabIndex={-1}>
        <h3>Accounts and saved links</h3>
        <p>Saved <code>qortal://</code> links are supported alongside <code>qdn://</code> links. They remain address strings managed by Qortium Home. Bookmarks has no Qortal app bridge integration or Qortal QDN publication. Home selects the destination network when opening the address. Saving a link neither fetches nor publishes the target app.</p>
        <p><code>{OPEN_ACTION}</code> accepts <code>{'{ address, accountId }'}</code>. Null means Current, the account active in this Bookmarks tab. A non-null saved ID must match a Home account; unavailable IDs remain visible and selectable so unrelated edits never clear an assignment. Home 2 may expose its reserved guest choice in the supplied catalogue.</p>
        <p>Discover this optional action independently. If absent, an assigned link shows an update-Home notice; the app never drops that account assignment. Unassigned links may fall back to <code>OPEN_NEW_TAB</code>, then <code>window.open</code>; actual handling depends on the host/browser. Opening returns success only when Home accepts the open operation, not proof that the destination loaded.</p>
        <p>For <code>qdn://APP</code> and <code>qdn://WEBSITE</code> links, <code>GET_QDN_RESOURCE_URL</code> tries the resource favicon then the name’s <code>THUMBNAIL/avatar</code>, with lazy loading and a monogram fallback. Other schemes retain their generic icon.</p>
        <p>Canonical reference route: <code>qdn://APP/Bookmarks/Bookmarks?view=developers</code>. Developer/reference aliases normalize to developers. This query takes precedence over the existing <code>#/bookmarks</code>, <code>#/toolbar</code>, <code>#/pins</code> and <code>#/startPages</code> routes. Reference sections use the app-owned <code>section</code> query, preserving the collection fragment. Selecting a collection removes view/section and sets its hash; Home and unknown repeated query parameters survive. Back/Forward restores the workspace.</p>
      </section>
      <section id="reference-examples" tabIndex={-1}>
        <h3>Bridge examples</h3>
        <p>All data below is synthetic. Copying does not run a request. Replace example IDs with IDs from the current snapshot and obtain the user’s intent before modifying their collections.</p>
        {Object.entries(REFERENCE_SNIPPETS).map(([key, snippet]) => <div className="reference-example" key={key}>
          <h4>{key}</h4><button className="button" type="button" aria-label={`Copy ${key} example`} onClick={event => void copy(key, snippet, event.currentTarget)}>Copy</button>
          <pre aria-label={`${key} example`}><code>{snippet}</code></pre>
        </div>)}
      </section>
    </div>
  </article>;
}
