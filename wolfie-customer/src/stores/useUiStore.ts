import { create } from 'zustand';

interface UiState {
  isCartDrawerOpen: boolean;
  isCheckoutOpen: boolean;
  isHeaderMenuOpen: boolean;
  exploreSearch: string;
  exploreFilter: string;
  sidebarFilter: string | null;
  
  setCartDrawerOpen: (isOpen: boolean) => void;
  setCheckoutOpen: (isOpen: boolean) => void;
  setHeaderMenuOpen: (isOpen: boolean) => void;
  setExploreSearch: (search: string) => void;
  setExploreFilter: (filter: string) => void;
  setSidebarFilter: (filter: string | null) => void;
  resetFilters: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isCartDrawerOpen: false,
  isCheckoutOpen: false,
  isHeaderMenuOpen: false,
  exploreSearch: '',
  exploreFilter: 'All',
  sidebarFilter: null,

  setCartDrawerOpen: (isOpen) => set({ isCartDrawerOpen: isOpen }),
  setCheckoutOpen: (isOpen) => set({ isCheckoutOpen: isOpen }),
  setHeaderMenuOpen: (isOpen) => set({ isHeaderMenuOpen: isOpen }),
  setExploreSearch: (search) => set({ exploreSearch: search }),
  setExploreFilter: (filter) => set({ exploreFilter: filter }),
  setSidebarFilter: (filter) => set({ sidebarFilter: filter }),
  resetFilters: () => set({ exploreSearch: '', exploreFilter: 'All', sidebarFilter: null }),
}));
