import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SIDEBAR_COLLAPSED_STORAGE_KEY, useSidebarState } from './useSidebarState';

describe('useSidebarState hook', () => {
  it('initializes from localStorage and persists collapsed toggles cleanly', () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, 'true');
    const { result } = renderHook(() => useSidebarState());

    expect(result.current.collapsed).toBe(true);
    expect(result.current.mobileOpen).toBe(false);

    act(() => {
      result.current.toggleCollapsed();
    });

    expect(result.current.collapsed).toBe(false);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('false');

    act(() => {
      result.current.setCollapsed(true);
    });

    expect(result.current.collapsed).toBe(true);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('true');
  });

  it('toggles collapsed state on Ctrl+B / Cmd+B and closes mobile drawer on Escape', () => {
    const { result } = renderHook(() => useSidebarState());
    expect(result.current.collapsed).toBe(false);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));
    });
    expect(result.current.collapsed).toBe(true);

    act(() => {
      result.current.openMobile();
    });
    expect(result.current.mobileOpen).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.mobileOpen).toBe(false);
  });
});
