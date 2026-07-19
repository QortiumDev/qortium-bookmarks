import { describe, expect, it, vi } from 'vitest';
import { BookmarkLoadGuard, runSingleFlight, type SingleFlight } from './bookmarkLoadGuard';

describe('BookmarkLoadGuard', () => {
  it('rejects a slow older request after the latest request has loaded', () => {
    const guard = new BookmarkLoadGuard();
    const olderRequest = guard.startRequest();
    const latestRequest = guard.startRequest();

    expect(guard.acceptResponse(latestRequest, 12)).toBe(true);
    expect(guard.acceptResponse(olderRequest, 11)).toBe(false);
  });

  it('does not let a GET started before an apply roll the revision back', () => {
    const guard = new BookmarkLoadGuard();
    const request = guard.startRequest();
    guard.observeRevision(14);
    expect(guard.acceptResponse(request, 13)).toBe(false);
  });

  it('accepts an equal revision from the latest request', () => {
    const guard = new BookmarkLoadGuard();
    guard.observeRevision(4);
    expect(guard.acceptResponse(guard.startRequest(), 4)).toBe(true);
  });
});

describe('permission prompt single flight', () => {
  it('shares one pending prompt GET across repeated requests', async () => {
    const state: SingleFlight<number> = { current: null };
    const task = vi.fn(async () => 7);
    const first = runSingleFlight(state, task);
    const second = runSingleFlight(state, task);
    expect(first).toBe(second);
    await expect(first).resolves.toBe(7);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
