import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Reference, MUTATION_EXAMPLES, REFERENCE_SNIPPETS, SNAPSHOT_EXAMPLE } from './Reference';
import { BOOKMARK_SCHEMA_VERSION, MAX_PARSE_TREE_DEPTH, parseBookmarkSnapshot, TOOLBAR_VISIBILITY } from './bookmarkManager';
import { OPEN_ACTION, REQUIRED_ACTIONS, planOpenAction } from './bookmarkApi';
import { REFERENCE_SECTIONS, referenceSectionUrl } from './ReferenceNavigation';

describe('developer contract', () => {
  it('renders source-bound schema, capabilities and exhaustive mutations in English', () => {
    const html = renderToStaticMarkup(<Reference />);
    for (const value of [...REQUIRED_ACTIONS, OPEN_ACTION, ...TOOLBAR_VISIBILITY, ...Object.keys(MUTATION_EXAMPLES), 'HOME_DATA_STALE', 'INVALID_ADDRESS', 'bookmarks.manage', `snapshot schema ${BOOKMARK_SCHEMA_VERSION}`, `depth through ${MAX_PARSE_TREE_DEPTH}`]) expect(html).toContain(value);
    expect(html).toContain('lang="en" dir="ltr"');
    expect(html).toContain('aria-label="Developer reference sections"');
    expect(html).toContain('role="status" aria-live="polite"');
    expect(html).toContain('not published to QDN');
    for (const [id] of REFERENCE_SECTIONS) expect(html).toContain(`id="reference-${id}" tabindex="-1"`);
    for (const key of Object.keys(REFERENCE_SNIPPETS)) expect(html).toContain(`aria-label="Copy ${key} example"`);
  });
  it('round-trips the complete synthetic snapshot without losing Qortal addresses', () => {
    expect(parseBookmarkSnapshot(JSON.parse(REFERENCE_SNIPPETS.snapshot))).toEqual(SNAPSHOT_EXAMPLE);
    expect(SNAPSHOT_EXAMPLE.bookmarks[0].children[0].displayUrl).toMatch(/^qortal:\/\//);
    const address = MUTATION_EXAMPLES.addTreeLink.link.displayUrl;
    expect(planOpenAction([OPEN_ACTION], address, 'saved-account')).toEqual({ action: OPEN_ACTION, address, accountId: 'saved-account' });
    expect(planOpenAction(['OPEN_NEW_TAB'], address, 'saved-account').action).toBe('ACCOUNT_UNSUPPORTED');
  });
  it('runs capability discovery without prompting or reading an ungranted profile', async () => {
    const run = new Function('qdnRequest', `return (async () => { ${REFERENCE_SNIPPETS.capabilities} })()`);
    const request = vi.fn(async ({ action }) => action === 'SHOW_ACTIONS' ? [...REQUIRED_ACTIONS] : { granted: false });
    await run(request);
    expect(request.mock.calls.map(([value]) => value.action)).toEqual(['SHOW_ACTIONS', 'BOOKMARKS_HAS_PERMISSION']);
    await expect(run(async () => [])).rejects.toThrow('unavailable');
  });
  it('uses the returned revision and preserves a Qortal address in the edit example', async () => {
    const request = vi.fn(async ({ action }) => action === 'BOOKMARKS_GET' ? { ...SNAPSHOT_EXAMPLE, revision: 91 } : { changed: true, snapshot: SNAPSHOT_EXAMPLE });
    await new Function('qdnRequest', `return (async () => { ${REFERENCE_SNIPPETS.edit}\n })()`)(request);
    expect(request.mock.calls[1][0]).toEqual({ action: 'BOOKMARKS_APPLY', expectedRevision: 91, mutation: MUTATION_EXAMPLES.addTreeLink });
  });
  it('keeps Core paths, collection hashes and repeated host queries in TOC links', () => {
    const result = new URL(referenceSectionUrl('http://core/render/APP/Bookmarks/Bookmarks?view=reference&theme=dark&future=a&future=b#/toolbar', 'mutations'), 'http://core');
    expect(result.pathname).toBe('/render/APP/Bookmarks/Bookmarks');
    expect(result.hash).toBe('#/toolbar');
    expect(result.searchParams.getAll('future')).toEqual(['a', 'b']);
    expect(result.searchParams.get('theme')).toBe('dark');
    expect(result.searchParams.get('view')).toBe('developers');
    expect(result.searchParams.get('section')).toBe('mutations');
  });
});
