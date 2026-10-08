import { writable } from 'svelte/store';
import type { Companion, ProfileState } from '../types/profile';
import { validateName } from '../utils/validation';

export const STORAGE_KEY = 'lesecoach_profile_v2';

export const DEFAULT_COMPANIONS: Companion[] = [
  {
    id: 'mom',
    type: 'mom',
    icon: '👩',
    defaultName: 'Mama',
    customName: 'Mama',
  },
  {
    id: 'dad',
    type: 'dad',
    icon: '👨',
    defaultName: 'Papa',
    customName: 'Papa',
  },
  {
    id: 'sister',
    type: 'sister',
    icon: '👧',
    defaultName: 'Lene',
    customName: 'Lene',
  },
  {
    id: 'brother',
    type: 'brother',
    icon: '👦',
    defaultName: 'Ben',
    customName: 'Ben',
  },
  {
    id: 'wizard',
    type: 'wizard',
    icon: '🧙‍♂️',
    defaultName: 'Merlin',
    customName: 'Merlin',
  },
  {
    id: 'fairy',
    type: 'fairy',
    icon: '🧚‍♀️',
    defaultName: 'Flora',
    customName: 'Flora',
  },
  {
    id: 'dog',
    type: 'dog',
    icon: '🐶',
    defaultName: 'Bello',
    customName: 'Bello',
  },
  {
    id: 'cat',
    type: 'cat',
    icon: '🐱',
    defaultName: 'Mimi',
    customName: 'Mimi',
  },
  {
    id: 'horse',
    type: 'horse',
    icon: '🐴',
    defaultName: 'Blitz',
    customName: 'Blitz',
  },
  {
    id: 'unicorn',
    type: 'unicorn',
    icon: '🦄',
    defaultName: 'Sternchen',
    customName: 'Sternchen',
  },
  {
    id: 'owl',
    type: 'owl',
    icon: '🦉',
    defaultName: 'Lulu',
    customName: 'Lulu',
  },
  {
    id: 'dino',
    type: 'dino',
    icon: '🦖',
    defaultName: 'Rexi',
    customName: 'Rexi',
  },
];

const initialState: ProfileState = {
  childName: '',
  selectedCompanionId: 'dog',
  companions: DEFAULT_COMPANIONS,
  isConfigured: false,
};

function loadStoredProfile(): ProfileState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return initialState;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);

    // Merge default companions with any saved custom names
    const storedCompanions = Array.isArray(parsed.companions) ? parsed.companions : [];
    const mergedCompanions = DEFAULT_COMPANIONS.map((def) => {
      const match = storedCompanions.find((c: Companion) => c.id === def.id);
      return match ? { ...def, customName: match.customName || def.defaultName } : def;
    });

    return {
      childName: typeof parsed.childName === 'string' ? parsed.childName : '',
      selectedCompanionId: parsed.selectedCompanionId || 'dog',
      companions: mergedCompanions,
      isConfigured: Boolean(parsed.isConfigured),
    };
  } catch (err) {
    console.error('Failed to load profile from localStorage:', err);
    return initialState;
  }
}

function createProfileStore() {
  const { subscribe, set, update } = writable<ProfileState>(loadStoredProfile());

  function persist(state: ProfileState) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (err) {
        console.error('Failed to persist profile:', err);
      }
    }
  }

  return {
    subscribe,
    setChildName: (name: string) => {
      update((state) => {
        const nextState = { ...state, childName: name };
        persist(nextState);
        return nextState;
      });
    },
    selectCompanion: (companionId: string) => {
      update((state) => {
        const exists = state.companions.some((c) => c.id === companionId);
        if (!exists) return state;
        const nextState = { ...state, selectedCompanionId: companionId };
        persist(nextState);
        return nextState;
      });
    },
    updateCompanionName: (companionId: string, customName: string) => {
      update((state) => {
        const updatedCompanions = state.companions.map((c) => {
          if (c.id === companionId) {
            return { ...c, customName };
          }
          return c;
        });
        const nextState = { ...state, companions: updatedCompanions };
        persist(nextState);
        return nextState;
      });
    },
    saveProfile: () => {
      let saved = false;
      update((state) => {
        const childValidation = validateName(state.childName);
        const activeCompanion = state.companions.find((c) => c.id === state.selectedCompanionId);
        const companionValidation = activeCompanion ? validateName(activeCompanion.customName) : { isValid: false };

        if (childValidation.isValid && companionValidation.isValid) {
          const nextState = { ...state, isConfigured: true };
          persist(nextState);
          saved = true;
          return nextState;
        }
        return state;
      });
      return saved;
    },
    resetProfile: () => {
      set(initialState);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
  };
}

export const profileStore = createProfileStore();
