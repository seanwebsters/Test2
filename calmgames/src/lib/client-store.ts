"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: "default" | "error";
}

interface StudioState {
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
  device: "desktop" | "mobile";
  setDevice: (d: "desktop" | "mobile") => void;
  sound: boolean;
  setSound: (on: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useStudio = create<StudioState>()(
  persist(
    (set) => ({
      toasts: [],
      toast: (t) => {
        const id = Date.now() + Math.random();
        set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), t.tone === "error" ? 8000 : 4500);
      },
      dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
      device: "desktop",
      setDevice: (device) => set({ device }),
      sound: true,
      setSound: (sound) => set({ sound }),
      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    { name: "calm-studio", partialize: (s) => ({ device: s.device, sound: s.sound }) },
  ),
);
