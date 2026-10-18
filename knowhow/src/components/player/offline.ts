"use client";

const CACHE = "kh-offline-v1";
const KEY = "kh_downloads";

export const offlineSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "caches" in window;

export function registerOffline() {
  if (!offlineSupported()) return;
  navigator.serviceWorker.register("/sw.js").catch(() => undefined);
}

export function downloadedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function setIds(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("kh-downloads"));
}

/** Saves an episode's audio for offline playback. The server still checks entitlement on download. */
export async function downloadEpisode(audioPath: string, id: string) {
  const res = await fetch(audioPath);
  if (!res.ok) throw new Error(res.status === 402 ? "This episode is locked" : "Download failed");
  const cache = await caches.open(CACHE);
  await cache.put(audioPath, res);
  setIds([...new Set([...downloadedIds(), id])]);
}

export async function removeDownload(audioPath: string, id: string) {
  const cache = await caches.open(CACHE);
  await cache.delete(audioPath);
  setIds(downloadedIds().filter((x) => x !== id));
}
