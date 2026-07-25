import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPublisherAvatarCache, fetchPublisherAvatar, parseAccountAvatarResponse } from './publisherAvatar';
import { hasHomeBridge, qdnRequest } from './qdnRequest';

vi.mock('./qdnRequest', () => ({
  hasAction: (actions: string[], action: string) => actions.some((candidate) => candidate.toUpperCase() === action.toUpperCase()),
  hasHomeBridge: vi.fn(),
  qdnRequest: vi.fn(),
}));

const ADDRESS = 'QT4zHex8JEULmBhYmKd5UhpiNA46T5wUko';
const actions = ['GET_NAME_DATA', 'FETCH_ACCOUNT_AVATAR'];

describe('pointer-aware publisher avatar client', () => {
  const hasHomeBridgeMock = vi.mocked(hasHomeBridge);
  const qdnRequestMock = vi.mocked(qdnRequest);

  beforeEach(() => {
    clearPublisherAvatarCache();
    hasHomeBridgeMock.mockReset();
    qdnRequestMock.mockReset();
    hasHomeBridgeMock.mockReturnValue(true);
  });

  it('resolves the publisher name to its owner before requesting a bounded account avatar', async () => {
    qdnRequestMock
      .mockResolvedValueOnce({ name: 'Help', owner: ADDRESS })
      .mockResolvedValueOnce({
        address: ADDRESS,
        body: 'AQIDBA==',
        contentLength: 4,
        contentType: 'image/png',
        descriptor: { identifier: '', name: 'Help', service: 'THUMBNAIL' },
        encoding: 'base64',
        source: 'POINTER',
      });

    await expect(fetchPublisherAvatar('Help', actions)).resolves.toMatchObject({ kind: 'ready' });
    expect(qdnRequestMock.mock.calls).toEqual([
      [{ action: 'GET_NAME_DATA', name: 'Help' }],
      [{ action: 'FETCH_ACCOUNT_AVATAR', address: ADDRESS, maxBytes: 500 * 1024 }],
    ]);
  });

  it('accepts a bounded pending result and rejects malformed or mismatched payloads', () => {
    expect(parseAccountAvatarResponse({
      address: ADDRESS,
      descriptor: { identifier: '', name: 'Help', service: 'THUMBNAIL' },
      retryAfterSeconds: 99,
      source: 'POINTER',
      status: 'PENDING',
    }, ADDRESS)).toEqual({ kind: 'pending', retryAfterSeconds: 30 });
    expect(parseAccountAvatarResponse({ address: 'Qother' }, ADDRESS)).toEqual({ kind: 'unavailable' });
    expect(parseAccountAvatarResponse({
      address: ADDRESS,
      body: 'https://node.invalid/avatar.png',
      contentLength: 4,
      contentType: 'image/png',
      encoding: 'base64',
      source: 'LEGACY',
    }, ADDRESS)).toEqual({ kind: 'unavailable' });
  });

  it('does not call the bridge when Home has not advertised both required actions', async () => {
    await expect(fetchPublisherAvatar('Help', [])).resolves.toEqual({ kind: 'unavailable' });
    expect(qdnRequestMock).not.toHaveBeenCalled();
  });
});
