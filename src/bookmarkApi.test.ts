import { describe, expect, it } from 'vitest';
import { OPEN_ACTION, planOpenAction, REQUIRED_ACTIONS } from './bookmarkApi';

describe('Bookmarks Home bridge surface', () => {
  it('feature-detects every action needed by the app', () => {
    expect(REQUIRED_ACTIONS).toEqual([
      'BOOKMARKS_HAS_PERMISSION',
      'BOOKMARKS_GET',
      'BOOKMARKS_APPLY',
    ]);
  });

  it('exposes BOOKMARKS_OPEN as a feature-discoverable action name', () => {
    expect(OPEN_ACTION).toBe('BOOKMARKS_OPEN');
    expect(REQUIRED_ACTIONS).not.toContain(OPEN_ACTION);
  });
});

describe('planOpenAction', () => {
  it('prefers BOOKMARKS_OPEN with the saved account when Home supports it', () => {
    expect(planOpenAction(['BOOKMARKS_OPEN'], 'qdn://APP/Help/Help', 'account-1')).toEqual({
      action: 'BOOKMARKS_OPEN', address: 'qdn://APP/Help/Help', accountId: 'account-1',
    });
  });

  it('sends null accountId for Current so Home opens under the inherited tab account', () => {
    expect(planOpenAction(['BOOKMARKS_OPEN'], 'qdn://APP/Help/Help', null)).toEqual({
      action: 'BOOKMARKS_OPEN', address: 'qdn://APP/Help/Help', accountId: null,
    });
    expect(planOpenAction(['BOOKMARKS_OPEN'], 'qdn://APP/Help/Help', '')).toEqual({
      action: 'BOOKMARKS_OPEN', address: 'qdn://APP/Help/Help', accountId: null,
    });
  });

  it('never discards a saved account by falling back to OPEN_NEW_TAB on older Home', () => {
    expect(planOpenAction(['OPEN_NEW_TAB'], 'qdn://APP/Help/Help', 'account-1')).toEqual({
      action: 'ACCOUNT_UNSUPPORTED', address: 'qdn://APP/Help/Help', accountId: 'account-1',
    });
  });

  it('falls back to OPEN_NEW_TAB, then window.open, when there is no saved account', () => {
    expect(planOpenAction(['OPEN_NEW_TAB'], 'qdn://APP/Help/Help', null)).toEqual({
      action: 'OPEN_NEW_TAB', address: 'qdn://APP/Help/Help',
    });
    expect(planOpenAction([], 'qdn://APP/Help/Help', null)).toEqual({
      action: 'WINDOW_OPEN', address: 'qdn://APP/Help/Help',
    });
  });
});
