import { writable, get } from 'svelte/store';
import type { AppScreen, RouterState } from '../types/router';
import { profileStore } from './profileStore';

function getInitialScreen(): AppScreen {
  const profile = get(profileStore);
  return profile.isConfigured ? 'home' : 'settings';
}

function createRouterStore() {
  const { subscribe, set, update } = writable<RouterState>({
    currentScreen: getInitialScreen(),
    previousScreen: null,
  });

  return {
    subscribe,
    navigate: (target: AppScreen) => {
      const profile = get(profileStore);
      // Route Guard: If profile is not configured and user tries to navigate elsewhere, force settings
      const resolvedScreen = !profile.isConfigured && target !== 'settings' ? 'settings' : target;

      update((state) => ({
        previousScreen: state.currentScreen,
        currentScreen: resolvedScreen,
      }));
    },
    goHome: () => {
      const profile = get(profileStore);
      if (!profile.isConfigured) {
        update((state) => ({ ...state, currentScreen: 'settings' }));
        return;
      }
      update((state) => ({ previousScreen: state.currentScreen, currentScreen: 'home' }));
    },
    goToSettings: () => {
      update((state) => ({ previousScreen: state.currentScreen, currentScreen: 'settings' }));
    },
    goToReader: () => {
      const profile = get(profileStore);
      if (!profile.isConfigured) {
        update((state) => ({ ...state, currentScreen: 'settings' }));
        return;
      }
      update((state) => ({ previousScreen: state.currentScreen, currentScreen: 'reader' }));
    },
    reset: () => {
      set({
        currentScreen: getInitialScreen(),
        previousScreen: null,
      });
    },
  };
}

export const routerStore = createRouterStore();
