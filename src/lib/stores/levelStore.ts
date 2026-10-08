import { writable } from 'svelte/store';
import type { ReadingLevelNumber } from '../types/reading';
import { READING_LEVEL_INFOS } from '../data/readingLevels';

export const LEVEL_STORAGE_KEY = 'lesecoach_level_v1';

function getInitialLevel(): ReadingLevelNumber {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 1;
  }
  try {
    const raw = localStorage.getItem(LEVEL_STORAGE_KEY);
    const parsed = parseInt(raw || '1', 10);
    if (parsed >= 1 && parsed <= 9) {
      return parsed as ReadingLevelNumber;
    }
    return 1;
  } catch {
    return 1;
  }
}

function createLevelStore() {
  const { subscribe, set, update } = writable<ReadingLevelNumber>(getInitialLevel());

  function persist(level: ReadingLevelNumber) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(LEVEL_STORAGE_KEY, level.toString());
    }
  }

  return {
    subscribe,
    setLevel: (level: ReadingLevelNumber) => {
      set(level);
      persist(level);
    },
    nextLevel: () => {
      update((curr) => {
        const next = Math.min(9, curr + 1) as ReadingLevelNumber;
        persist(next);
        return next;
      });
    },
    prevLevel: () => {
      update((curr) => {
        const prev = Math.max(1, curr - 1) as ReadingLevelNumber;
        persist(prev);
        return prev;
      });
    },
    getInfo: (level: ReadingLevelNumber) => {
      return READING_LEVEL_INFOS[level];
    },
  };
}

export const levelStore = createLevelStore();
