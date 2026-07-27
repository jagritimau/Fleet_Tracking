export type PageId = 'home' | 'dashboard' | 'fleet' | 'shipments' | 'drivers' | 'analytics' | 'live-map' | 'routes' | 'alerts' | 'settings';

type Listener = () => void;

interface UIState {
  currentPage: PageId;
  sidebarOpen: boolean;
}

let state: UIState = {
  currentPage: 'home',
  sidebarOpen: true,
};

const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export const uiStore = {
  getState: () => state,
  setPage: (page: PageId) => { state = { ...state, currentPage: page }; notify(); },
  toggleSidebar: () => { state = { ...state, sidebarOpen: !state.sidebarOpen }; notify(); },
  setSidebar: (open: boolean) => { state = { ...state, sidebarOpen: open }; notify(); },
  subscribe: (fn: Listener) => { listeners.add(fn); return () => listeners.delete(fn); },
};
