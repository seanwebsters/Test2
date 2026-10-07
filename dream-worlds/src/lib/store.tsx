"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Dream, DreamEngineInput, ListeningSession, StoryHistoryEntry, UserPreferences } from "./types";
import { repository, type PersistedState } from "./services/storage";
import { DEFAULT_PREFS, curatedToDream, resolveDream, toFullInput, uid } from "./services/dreams";
import { curatedById } from "./data/catalog";
import { dreamEngine } from "./engine/dreamEngine";
import { generateMockDream, totalMinutesFor } from "./engine/mockGenerator";

/* ---------------- seed: a lived-in demo account ---------------- */

function seedState(): PersistedState {
  const now = Date.now();
  const day = 86_400_000;
  const mk = (curatedId: string, daysAgo: number, minutes: number, chapter: number): [Dream, ListeningSession] => {
    const cd = curatedById(curatedId)!;
    const base = curatedToDream(cd);
    const dream: Dream = { ...base, id: `seed-${curatedId}`, seriesId: `seed-${curatedId}`, createdAt: now - daysAgo * day, author: undefined, saved: true };
    const ch = dream.output.chapters[Math.min(chapter, dream.output.chapters.length - 1)];
    return [
      dream,
      {
        id: uid(),
        dreamId: dream.id,
        startedAt: now - daysAgo * day - minutes * 60_000,
        endedAt: now - daysAgo * day,
        minutesListened: minutes,
        stoppedAtChapter: ch.index,
        stoppedAtStage: ch.stage,
        lastHeard: ch.narration[0],
      },
    ];
  };
  const a = mk("orig-midnight-ship", 1, 31, 4);
  const b = mk("orig-lost-library", 3, 26, 3);
  const c = mk("pop-second-chance", 6, 36, 5);
  return {
    version: 1,
    dreams: [a[0], b[0], c[0]],
    sessions: [a[1], b[1], c[1]],
    prefs: DEFAULT_PREFS,
    savedCuratedIds: ["orig-aurora"],
    onboarded: false,
  };
}

/* ---------------- context ---------------- */

interface Store extends PersistedState {
  hydrated: boolean;
  getDream: (id: string) => Dream | undefined;
  createDream: (input: DreamEngineInput) => Promise<Dream>;
  continueDream: (dreamId: string) => Promise<Dream>;
  remixDream: (dreamId: string) => Promise<Dream>;
  toggleSave: (dreamId: string) => void;
  isSaved: (dreamId: string) => boolean;
  recordSession: (s: Omit<ListeningSession, "id">) => ListeningSession;
  updatePrefs: (p: Partial<UserPreferences>) => void;
  toggleFavWorld: (id: string) => void;
  toggleFavCharacter: (id: string) => void;
  seriesOf: (dream: Dream) => Dream[];
  latestSessionFor: (dreamId: string) => ListeningSession | undefined;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export function DreamStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => seedState());
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const loaded = repository.load();
    if (loaded) setState(loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) repository.save(state);
  }, [state, hydrated]);

  const getDream = useCallback((id: string) => resolveDream(id, stateRef.current.dreams), []);

  const addDream = useCallback((d: Dream) => setState((s) => ({ ...s, dreams: [d, ...s.dreams.filter((x) => x.id !== d.id)] })), []);

  const createDream = useCallback(
    async (input: DreamEngineInput) => {
      const output = await dreamEngine.generate(input);
      const id = uid();
      const d: Dream = { id, createdAt: Date.now(), request: input, output, seriesId: id, episode: output.continuity_data.episode, totalMinutes: totalMinutesFor(input.length), saved: false };
      addDream(d);
      return d;
    },
    [addDream],
  );

  const seriesOf = useCallback((dream: Dream) => stateRef.current.dreams.filter((d) => d.seriesId === dream.seriesId).sort((a, b) => a.episode - b.episode), []);

  const continueDream = useCallback(
    async (dreamId: string) => {
      const prev = resolveDream(dreamId, stateRef.current.dreams)!;
      const series = stateRef.current.dreams.filter((d) => d.seriesId === prev.seriesId).sort((a, b) => a.episode - b.episode);
      const chain = series.length ? series : [prev];
      const history: StoryHistoryEntry[] = chain.map((d) => ({ dreamId: d.id, episode: d.episode, title: d.output.dream_title, summary: d.output.summary, continuity: d.output.continuity_data }));
      const input: DreamEngineInput = { ...prev.request, story_history: history, user_prompt: "", user_preferences: stateRef.current.prefs };
      const output = await dreamEngine.generate(input);
      const d: Dream = { id: uid(), createdAt: Date.now(), request: input, output, seriesId: prev.seriesId, episode: output.continuity_data.episode, totalMinutes: totalMinutesFor(input.length), saved: true };
      addDream(d);
      return d;
    },
    [addDream],
  );

  const remixDream = useCallback(
    async (dreamId: string) => {
      const prev = resolveDream(dreamId, stateRef.current.dreams)!;
      const input = { ...prev.request, seed: Math.floor(Math.random() * 1e6) };
      const output = generateMockDream(input);
      await new Promise((r) => setTimeout(r, 900));
      const d: Dream = { ...prev, id: uid(), createdAt: Date.now(), request: input, output, seriesId: uid(), saved: false, author: undefined };
      d.seriesId = d.id;
      addDream(d);
      return d;
    },
    [addDream],
  );

  const isSaved = useCallback((id: string) => {
    const s = stateRef.current;
    return s.dreams.some((d) => d.id === id && d.saved) || s.savedCuratedIds.includes(id);
  }, []);

  const toggleSave = useCallback((id: string) => {
    setState((s) => {
      if (s.dreams.some((d) => d.id === id)) return { ...s, dreams: s.dreams.map((d) => (d.id === id ? { ...d, saved: !d.saved } : d)) };
      const has = s.savedCuratedIds.includes(id);
      return { ...s, savedCuratedIds: has ? s.savedCuratedIds.filter((x) => x !== id) : [id, ...s.savedCuratedIds] };
    });
  }, []);

  const recordSession = useCallback((s: Omit<ListeningSession, "id">) => {
    const session = { ...s, id: uid() };
    setState((st) => {
      // listening to a curated dream adds it to the user's history as their own copy
      let dreams = st.dreams;
      if (!dreams.some((d) => d.id === s.dreamId)) {
        const cd = curatedById(s.dreamId);
        if (cd) dreams = [{ ...curatedToDream(cd) }, ...dreams];
      }
      return { ...st, dreams, sessions: [session, ...st.sessions] };
    });
    return session;
  }, []);

  const updatePrefs = useCallback((p: Partial<UserPreferences>) => setState((s) => ({ ...s, prefs: { ...s.prefs, ...p } })), []);
  const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  const toggleFavWorld = useCallback((id: string) => setState((s) => ({ ...s, prefs: { ...s.prefs, favouriteWorlds: toggle(s.prefs.favouriteWorlds, id) } })), []);
  const toggleFavCharacter = useCallback((id: string) => setState((s) => ({ ...s, prefs: { ...s.prefs, favouriteCharacters: toggle(s.prefs.favouriteCharacters, id) } })), []);
  const latestSessionFor = useCallback((dreamId: string) => stateRef.current.sessions.find((s) => s.dreamId === dreamId), []);
  const resetDemo = useCallback(() => {
    repository.clear();
    setState(seedState());
  }, []);

  const value = useMemo<Store>(
    () => ({ ...state, hydrated, getDream, createDream, continueDream, remixDream, toggleSave, isSaved, recordSession, updatePrefs, toggleFavWorld, toggleFavCharacter, seriesOf, latestSessionFor, resetDemo }),
    [state, hydrated, getDream, createDream, continueDream, remixDream, toggleSave, isSaved, recordSession, updatePrefs, toggleFavWorld, toggleFavCharacter, seriesOf, latestSessionFor, resetDemo],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDreamStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDreamStore must be used inside DreamStoreProvider");
  return v;
}

export { toFullInput };
