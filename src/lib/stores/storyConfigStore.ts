import { writable, get } from 'svelte/store';
import type { StoryConfigPayload, StoryConfigState, StoryTheme } from '../types/storyConfig';
import type { ReadingLevelNumber, StoryData } from '../types/reading';
import { STORY_THEMES } from '../data/storyThemes';
import { profileStore } from './profileStore';
import { levelStore } from './levelStore';
import { readingSessionStore } from './readingSessionStore';
import { routerStore } from './routerStore';
import { generateStoryFromConfig } from '../utils/mockStoryGenerator';

const initialConfigState: StoryConfigState = {
  selectedThemeId: 'theme_forest',
  selectedLevel: 1,
  includeCompanion: true,
  generatedPayload: null,
  activeStory: null,
};

function createStoryConfigStore() {
  const { subscribe, set, update } = writable<StoryConfigState>(initialConfigState);

  return {
    subscribe,

    selectTheme: (themeId: string) => {
      update((state) => {
        const themeExists = STORY_THEMES.some((t) => t.id === themeId);
        if (!themeExists) return state;
        return { ...state, selectedThemeId: themeId };
      });
    },

    setLevel: (level: ReadingLevelNumber) => {
      update((state) => ({ ...state, selectedLevel: level }));
      levelStore.setLevel(level);
    },

    setIncludeCompanion: (include: boolean) => {
      update((state) => ({ ...state, includeCompanion: include }));
    },

    buildPayload: (): StoryConfigPayload => {
      const state = get({ subscribe });
      const profile = get(profileStore);
      const level = get(levelStore);

      const activeTheme: StoryTheme =
        STORY_THEMES.find((t) => t.id === state.selectedThemeId) || STORY_THEMES[0];

      const activeCompanionObj = profile.companions.find(
        (c) => c.id === profile.selectedCompanionId
      );

      const companionPayload = state.includeCompanion && activeCompanionObj
        ? {
            id: activeCompanionObj.id,
            name: activeCompanionObj.customName || activeCompanionObj.defaultName,
            type: activeCompanionObj.type,
            icon: activeCompanionObj.icon,
          }
        : null;

      const payload: StoryConfigPayload = {
        level: level,
        childName: profile.childName || 'Lese-Held',
        companion: companionPayload,
        theme: activeTheme,
      };

      update((s) => ({ ...s, generatedPayload: payload }));
      return payload;
    },

    startAdventure: (): StoryData => {
      const payload = get({ subscribe }).generatedPayload || (createStoryConfigStore().buildPayload());
      // Re-build fresh payload
      const freshPayload = get(profileStore).childName
        ? (() => {
            const profile = get(profileStore);
            const level = get(levelStore);
            const state = get({ subscribe });
            const activeTheme = STORY_THEMES.find((t) => t.id === state.selectedThemeId) || STORY_THEMES[0];
            const activeCompanionObj = profile.companions.find((c) => c.id === profile.selectedCompanionId);

            return {
              level,
              childName: profile.childName || 'Lese-Held',
              companion: state.includeCompanion && activeCompanionObj ? {
                id: activeCompanionObj.id,
                name: activeCompanionObj.customName || activeCompanionObj.defaultName,
                type: activeCompanionObj.type,
                icon: activeCompanionObj.icon,
              } : null,
              theme: activeTheme,
            };
          })()
        : payload;

      const story = generateStoryFromConfig(freshPayload);

      // Load story into readingSessionStore with companion name
      readingSessionStore.loadStory(
        story,
        freshPayload.level,
        freshPayload.companion?.name || ''
      );

      update((s) => ({ ...s, generatedPayload: freshPayload, activeStory: story }));

      // Navigate to reader
      routerStore.goToReader();

      return story;
    },

    reset: () => {
      set(initialConfigState);
    },
  };
}

export const storyConfigStore = createStoryConfigStore();
