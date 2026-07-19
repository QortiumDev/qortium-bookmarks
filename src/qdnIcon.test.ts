import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildIconCandidates,
  clearQdnIconCache,
  getCachedQdnIconUrl,
  iconCacheKeyFor,
  monogramFor,
  parseQdnAddress,
  resolveQdnIconUrl,
} from './qdnIcon';

describe('parseQdnAddress', () => {
  it('parses APP and WEBSITE addresses with and without an identifier', () => {
    expect(parseQdnAddress('qdn://APP/Help/Help')).toEqual({ service: 'APP', name: 'Help', identifier: 'Help' });
    expect(parseQdnAddress('qdn://WEBSITE/Node')).toEqual({ service: 'WEBSITE', name: 'Node', identifier: null });
    expect(parseQdnAddress('qdn://app/trust/trust')).toEqual({ service: 'APP', name: 'trust', identifier: 'trust' });
  });

  it('returns null for non-QDN addresses so folder/Home/Core icons stay generic', () => {
    expect(parseQdnAddress('home://dashboard')).toBeNull();
    expect(parseQdnAddress('https://example.com')).toBeNull();
    expect(parseQdnAddress('qdn://THUMBNAIL/name/qortal_avatar')).toBeNull();
  });
});

describe('buildIconCandidates', () => {
  it('orders favicon.ico before the publisher THUMBNAIL avatar', () => {
    expect(buildIconCandidates({ service: 'APP', name: 'Help', identifier: 'Help' })).toEqual([
      { service: 'APP', name: 'Help', path: 'favicon.ico', identifier: 'Help' },
      { service: 'THUMBNAIL', name: 'Help', identifier: 'avatar' },
    ]);
  });

  it('omits the identifier field for name-only addresses', () => {
    expect(buildIconCandidates({ service: 'WEBSITE', name: 'Node', identifier: null })).toEqual([
      { service: 'WEBSITE', name: 'Node', path: 'favicon.ico' },
      { service: 'THUMBNAIL', name: 'Node', identifier: 'avatar' },
    ]);
  });
});

describe('iconCacheKeyFor', () => {
  it('is stable for the same resource identity', () => {
    const a = iconCacheKeyFor({ service: 'APP', name: 'Help', identifier: 'Help' });
    const b = iconCacheKeyFor({ service: 'APP', name: 'Help', identifier: 'Help' });
    expect(a).toBe(b);
    expect(a).not.toBe(iconCacheKeyFor({ service: 'APP', name: 'Trust', identifier: 'Trust' }));
  });
});

describe('monogramFor', () => {
  it('takes initials from up to two words', () => {
    expect(monogramFor('Help')).toBe('H');
    expect(monogramFor('Qortium Trust')).toBe('QT');
    expect(monogramFor('  ')).toBe('?');
  });

  it('stays stable regardless of casing', () => {
    expect(monogramFor('minting')).toBe('M');
  });
});

describe('resolveQdnIconUrl', () => {
  const candidates = buildIconCandidates({ service: 'APP', name: 'Help', identifier: 'Help' });

  it('uses the favicon when it resolves and loads', async () => {
    const url = await resolveQdnIconUrl(
      candidates,
      async (candidate) => `resolved:${candidate.service}:${candidate.path ?? candidate.identifier}`,
      async (url) => url.includes('favicon.ico'),
    );
    expect(url).toBe('resolved:APP:favicon.ico');
  });

  it('falls back to the THUMBNAIL avatar when the favicon fails to load', async () => {
    const url = await resolveQdnIconUrl(
      candidates,
      async (candidate) => `resolved:${candidate.service}:${candidate.path ?? candidate.identifier}`,
      async (url) => url.includes('THUMBNAIL'),
    );
    expect(url).toBe('resolved:THUMBNAIL:avatar');
  });

  it('returns null (signalling the monogram) once every candidate fails', async () => {
    const url = await resolveQdnIconUrl(candidates, async () => null, async () => true);
    expect(url).toBeNull();
  });

  it('treats a resolver rejection as a missed candidate instead of throwing', async () => {
    const url = await resolveQdnIconUrl(
      candidates,
      async (candidate) => {
        if (candidate.path === 'favicon.ico') throw new Error('boom');
        return 'resolved:avatar';
      },
      async () => true,
    );
    expect(url).toBe('resolved:avatar');
  });
});

describe('getCachedQdnIconUrl', () => {
  beforeEach(() => clearQdnIconCache());

  it('resolves once per cache key and reuses the pending/settled promise', async () => {
    let calls = 0;
    const resolve = () => { calls += 1; return Promise.resolve('icon-url'); };
    const first = await getCachedQdnIconUrl('APP/Help/Help', resolve);
    const second = await getCachedQdnIconUrl('APP/Help/Help', resolve);
    expect(first).toBe('icon-url');
    expect(second).toBe('icon-url');
    expect(calls).toBe(1);
  });

  it('resolves independently per cache key', async () => {
    await getCachedQdnIconUrl('APP/Help/Help', () => Promise.resolve('help-icon'));
    const trust = await getCachedQdnIconUrl('APP/Trust/Trust', () => Promise.resolve('trust-icon'));
    expect(trust).toBe('trust-icon');
  });
});
