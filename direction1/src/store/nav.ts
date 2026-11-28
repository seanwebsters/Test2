import { create } from 'zustand';

export type Tab = 'journey' | 'explore' | 'play' | 'scout' | 'you';
export type Route =
  | { name: 'career'; id: string }
  | { name: 'world'; id: string }
  | { name: 'sim'; id: string }
  | { name: 'lesson'; careerId: string }
  | { name: 'episode'; id: string }
  | { name: 'plus' }
  | { name: 'roadmap'; careerId?: string }
  | { name: 'achievements' }
  | { name: 'wardrobe' }
  | { name: 'settings' };

interface Nav {
  tab: Tab;
  stack: Route[];
  exploreSeg: 'worlds' | 'careers' | 'stories';
  setTab: (t: Tab) => void;
  push: (r: Route) => void;
  replace: (r: Route) => void;
  back: () => void;
  reset: () => void;
  setExploreSeg: (s: Nav['exploreSeg']) => void;
}

export const useNav = create<Nav>((set) => ({
  tab: 'journey',
  stack: [],
  exploreSeg: 'worlds',
  setTab: (tab) => set({ tab, stack: [] }),
  push: (r) => set((s) => ({ stack: [...s.stack, r] })),
  replace: (r) => set((s) => ({ stack: [...s.stack.slice(0, -1), r] })),
  back: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  reset: () => set({ stack: [], tab: 'journey' }),
  setExploreSeg: (exploreSeg) => set({ exploreSeg }),
}));
