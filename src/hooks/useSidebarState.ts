import { useCallback, useEffect, useState } from 'react';

export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'clearwinter.sidebarCollapsed.v1';

export function readStoredSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeStoredSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    // Ignore storage quota or private-mode errors gracefully
  }
}

export interface SidebarStateController {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (next: boolean) => void;
  openMobile: () => void;
  closeMobile: () => void;
}

/**
 * Manages persisted desktop sidebar rail collapse state, mobile drawer visibility,
 * and global Ctrl/Cmd+B + Escape keyboard shortcuts.
 */
export function useSidebarState(): SidebarStateController {
  const [collapsed, setCollapsedState] = useState<boolean>(() => readStoredSidebarCollapsed());
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    writeStoredSidebarCollapsed(next);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      writeStoredSidebarCollapsed(next);
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggleCollapsed();
      } else if (event.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, toggleCollapsed]);

  return {
    collapsed,
    mobileOpen,
    toggleCollapsed,
    setCollapsed,
    openMobile,
    closeMobile,
  };
}
