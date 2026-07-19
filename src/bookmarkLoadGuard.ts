export class BookmarkLoadGuard {
  private highestRevision = -1;
  private latestRequest = 0;

  startRequest() {
    this.latestRequest += 1;
    return this.latestRequest;
  }

  isLatestRequest(requestId: number) {
    return requestId === this.latestRequest;
  }

  observeRevision(revision: number) {
    if (Number.isSafeInteger(revision) && revision >= 0) {
      this.highestRevision = Math.max(this.highestRevision, revision);
    }
  }

  acceptResponse(requestId: number, revision: number) {
    if (requestId !== this.latestRequest || !Number.isSafeInteger(revision) || revision < this.highestRevision) {
      return false;
    }
    this.highestRevision = revision;
    return true;
  }
}

export type SingleFlight<T> = { current: Promise<T> | null };

export function runSingleFlight<T>(state: SingleFlight<T>, task: () => Promise<T>) {
  if (state.current) return state.current;
  const pending = task().finally(() => {
    if (state.current === pending) state.current = null;
  });
  state.current = pending;
  return pending;
}
