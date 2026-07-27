import { useSyncExternalStore } from 'react';
import { uiStore } from '../store/ui';
export type { PageId } from '../store/ui';

export function useUIStore() {
  const state = useSyncExternalStore(uiStore.subscribe, uiStore.getState);
  return {
    currentPage: state.currentPage,
    sidebarOpen: state.sidebarOpen,
    setPage: uiStore.setPage,
    toggleSidebar: uiStore.toggleSidebar,
    setSidebar: uiStore.setSidebar,
  };
}
