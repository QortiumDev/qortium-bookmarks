export type QdnAddress = {
  identifier: string | null;
  name: string;
  service: 'APP' | 'WEBSITE';
};

export type IconCandidate = {
  identifier?: string;
  name: string;
  path?: string;
  service: string;
};

const QDN_ADDRESS_PATTERN = /^qdn:\/\/(app|website)\/([^/?#]+)(?:\/([^/?#]+))?/i;
const AVATAR_IDENTIFIER = 'avatar';

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Parses a saved address into its QDN resource identity, or null for non-QDN addresses (home://, core://, ...). */
export function parseQdnAddress(displayUrl: string): QdnAddress | null {
  const match = QDN_ADDRESS_PATTERN.exec(displayUrl.trim());
  if (!match) return null;
  return {
    service: match[1].toUpperCase() as 'APP' | 'WEBSITE',
    name: decodeSegment(match[2]),
    identifier: match[3] ? decodeSegment(match[3]) : null,
  };
}

/**
 * Established icon fallback order: the resource's own favicon.ico, then the
 * publisher's THUMBNAIL avatar, then (handled by the caller) a name monogram.
 */
export function buildIconCandidates(address: QdnAddress): IconCandidate[] {
  return [
    {
      service: address.service,
      name: address.name,
      path: 'favicon.ico',
      ...(address.identifier ? { identifier: address.identifier } : {}),
    },
    { service: 'THUMBNAIL', name: address.name, identifier: AVATAR_IDENTIFIER },
  ];
}

/** A stable cache key so repeated rows for the same resource share one resolution. */
export function iconCacheKeyFor(address: QdnAddress): string {
  return `${address.service}/${address.name}/${address.identifier ?? ''}`;
}

/** 1-2 letter fallback shown while an icon loads or once every candidate fails. */
export function monogramFor(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => Array.from(word)[0] ?? '').join('');
  return (initials || Array.from(trimmed)[0] || '?').toUpperCase();
}

export type QdnResourceUrlResolver = (candidate: IconCandidate) => Promise<string | null>;
export type IconProbe = (url: string) => Promise<boolean>;

/** Tries each candidate in order, keeping the first one whose image actually loads. */
export async function resolveQdnIconUrl(
  candidates: IconCandidate[],
  getResourceUrl: QdnResourceUrlResolver,
  probe: IconProbe,
): Promise<string | null> {
  for (const candidate of candidates) {
    let url: string | null = null;
    try {
      url = await getResourceUrl(candidate);
    } catch {
      url = null;
    }
    if (!url) continue;
    const loads = await probe(url).catch(() => false);
    if (loads) return url;
  }
  return null;
}

const iconUrlCache = new Map<string, Promise<string | null>>();

/** Caches by resource identity (not by row) so folders full of the same app resolve once. */
export function getCachedQdnIconUrl(cacheKey: string, resolve: () => Promise<string | null>): Promise<string | null> {
  const cached = iconUrlCache.get(cacheKey);
  if (cached) return cached;
  const pending = resolve();
  iconUrlCache.set(cacheKey, pending);
  return pending;
}

export function clearQdnIconCache() {
  iconUrlCache.clear();
}
