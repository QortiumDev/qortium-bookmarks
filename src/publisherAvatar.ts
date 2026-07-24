import { hasAction, hasHomeBridge, qdnRequest } from './qdnRequest';
import type { QdnAction } from './types';

const AVATAR_MAX_BYTES = 500 * 1024;
const RASTER_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/webp']);
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export type PublisherAvatarResult =
  | { kind: 'pending'; retryAfterSeconds: number }
  | { bytes: Uint8Array; contentType: string; kind: 'ready' }
  | { kind: 'unavailable' };

const ownerCache = new Map<string, string | null>();
const ownerInFlight = new Map<string, Promise<string | null>>();
const avatarInFlight = new Map<string, Promise<PublisherAvatarResult>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isAccountAddress(value: string) {
  return /^Q[1-9A-HJ-NP-Za-km-z]{20,80}$/.test(value);
}

function isPointerDescriptor(value: unknown) {
  return isRecord(value) && !!text(value.service) && !!text(value.name) && typeof value.identifier === 'string';
}

function decodeBase64(value: string) {
  if (!value || !BASE64_PATTERN.test(value)) {
    return null;
  }

  try {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function supportsPublisherAvatars(actions: QdnAction[]) {
  return hasHomeBridge() && hasAction(actions, 'GET_NAME_DATA') && hasAction(actions, 'FETCH_ACCOUNT_AVATAR');
}

export function parseAccountAvatarResponse(value: unknown, address: string): PublisherAvatarResult {
  if (!isRecord(value) || value.address !== address) {
    return { kind: 'unavailable' };
  }

  const source = value.source;

  if ((source !== 'POINTER' && source !== 'LEGACY') || (source === 'POINTER' && !isPointerDescriptor(value.descriptor))) {
    return { kind: 'unavailable' };
  }

  if (value.status === 'PENDING') {
    const delay = typeof value.retryAfterSeconds === 'number' && Number.isFinite(value.retryAfterSeconds)
      ? value.retryAfterSeconds
      : 1;
    return { kind: 'pending', retryAfterSeconds: Math.min(30, Math.max(1, Math.floor(delay))) };
  }

  const contentType = text(value.contentType)?.toLowerCase().split(';', 1)[0] ?? '';
  const contentLength = value.contentLength;
  const bytes = typeof value.body === 'string' ? decodeBase64(value.body) : null;

  if (
    value.encoding !== 'base64' ||
    !RASTER_IMAGE_MIME_TYPES.has(contentType) ||
    typeof contentLength !== 'number' ||
    !Number.isSafeInteger(contentLength) ||
    contentLength < 1 ||
    contentLength > AVATAR_MAX_BYTES ||
    !bytes ||
    bytes.byteLength !== contentLength
  ) {
    return { kind: 'unavailable' };
  }

  return { bytes, contentType, kind: 'ready' };
}

function resolveNameOwner(name: string, actions: QdnAction[]) {
  const normalizedName = name.trim();

  if (!normalizedName || !supportsPublisherAvatars(actions)) {
    return Promise.resolve(null);
  }

  if (ownerCache.has(normalizedName)) {
    return Promise.resolve(ownerCache.get(normalizedName) ?? null);
  }

  const existing = ownerInFlight.get(normalizedName);

  if (existing) {
    return existing;
  }

  const request = qdnRequest<unknown>({ action: 'GET_NAME_DATA', name: normalizedName })
    .then((response) => (isRecord(response) && typeof response.owner === 'string' && isAccountAddress(response.owner) ? response.owner : null))
    .catch(() => null)
    .then((owner) => {
      ownerCache.set(normalizedName, owner);
      ownerInFlight.delete(normalizedName);
      return owner;
    });

  ownerInFlight.set(normalizedName, request);
  return request;
}

async function fetchAccountAvatar(address: string): Promise<PublisherAvatarResult> {
  try {
    return parseAccountAvatarResponse(
      await qdnRequest<unknown>({ action: 'FETCH_ACCOUNT_AVATAR', address, maxBytes: AVATAR_MAX_BYTES }),
      address,
    );
  } catch {
    return { kind: 'unavailable' };
  }
}

/** Resolve one QDN publisher name to its account-bound avatar; no direct thumbnail URL is used. */
export async function fetchPublisherAvatar(name: string, actions: QdnAction[]): Promise<PublisherAvatarResult> {
  if (!supportsPublisherAvatars(actions)) {
    return { kind: 'unavailable' };
  }

  const owner = await resolveNameOwner(name, actions);

  if (!owner) {
    return { kind: 'unavailable' };
  }

  const existing = avatarInFlight.get(owner);

  if (existing) {
    return existing;
  }

  const request = fetchAccountAvatar(owner).finally(() => avatarInFlight.delete(owner));
  avatarInFlight.set(owner, request);
  return request;
}

export function clearPublisherAvatarCache() {
  ownerCache.clear();
  ownerInFlight.clear();
  avatarInFlight.clear();
}
