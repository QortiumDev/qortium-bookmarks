import { describe, expect, it } from 'vitest';
import { hashForView, normalizeWorkspaceUrl, urlForWorkspace, viewFromHash, workspaceFromUrl } from './appRoute';

describe('bookmark routes', () => {
  it('round-trips every manager view through a fragment', () => {
    for (const view of ['bookmarks', 'toolbar', 'pins', 'startPages'] as const) {
      expect(viewFromHash(hashForView(view))).toBe(view);
    }
  });

  it('falls back safely for old and unknown links', () => {
    expect(viewFromHash('')).toBe('bookmarks');
    expect(viewFromHash('#/unknown')).toBe('bookmarks');
  });
});

describe('Developers and collection history', () => {
  const base = 'http://core/render/APP/Bookmarks/Bookmarks?theme=dark&future=a&future=b';
  it('gives developer aliases precedence without losing collection context', () => {
    for (const alias of ['developers', 'developer', 'reference']) {
      const input = `${base}&view=${alias}#/toolbar`;
      expect(workspaceFromUrl(input)).toBe('developers');
      const normalized = new URL(normalizeWorkspaceUrl(input), base);
      expect(normalized.searchParams.get('view')).toBe('developers');
      expect(normalized.hash).toBe('#/toolbar');
    }
    expect(workspaceFromUrl(`${base}&view=unknown#/pins`)).toBe('pins');
  });
  it('preserves host parameters and fragments entering Developers, including repeats', () => {
    const result = new URL(urlForWorkspace(`${base}&qdnHomeBridge=1&view=reference&view=developer#unowned`, 'developers'), base);
    expect(result.pathname).toBe('/render/APP/Bookmarks/Bookmarks');
    expect(result.searchParams.getAll('view')).toEqual(['developers']);
    expect(result.searchParams.getAll('future')).toEqual(['a', 'b']);
    expect(result.searchParams.get('qdnHomeBridge')).toBe('1');
    expect(result.searchParams.get('theme')).toBe('dark');
    expect(result.hash).toBe('#unowned');
  });
  it('round-trips collection / Developers / section URLs as history entries', () => {
    for (const view of ['bookmarks', 'toolbar', 'pins', 'startPages'] as const) {
      const collection = urlForWorkspace(base, view);
      const developers = urlForWorkspace(collection, 'developers');
      const section = developers.replace('view=developers', 'view=developers&section=opening');
      const returned = urlForWorkspace(section, view);
      expect(returned).toBe(collection);
      expect([collection, developers, section, returned].map(workspaceFromUrl)).toEqual([view, 'developers', 'developers', view]);
    }
  });
  it('normalizes only aliases/default collection, retaining deep section selection', () => {
    expect(normalizeWorkspaceUrl(`${base}&view=reference&section=opening#/pins`)).toContain('view=developers&section=opening#/pins');
    expect(normalizeWorkspaceUrl(base)).toContain('#/bookmarks');
    expect(normalizeWorkspaceUrl(`${base}&view=developers`)).not.toContain('#/');
  });
});
