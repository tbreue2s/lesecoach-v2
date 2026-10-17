import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { routerStore } from './routerStore';
import { profileStore } from './profileStore';

describe('Screen-Routing & Route Guard (WP02)', () => {
  beforeEach(() => {
    localStorage.clear();
    profileStore.resetProfile();
    routerStore.reset();
  });

  it('enforces Route Guard: unconfigured profile redirects to settings screen', () => {
    // Attempt navigating to home or reader without configured profile
    routerStore.goHome();
    expect(get(routerStore).currentScreen).toBe('settings');

    routerStore.goToReader();
    expect(get(routerStore).currentScreen).toBe('settings');

    routerStore.navigate('home');
    expect(get(routerStore).currentScreen).toBe('settings');
  });

  it('allows full navigation between Home, Reader, and Settings when profile is configured', () => {
    // Configure profile
    profileStore.setChildName('Mimi');
    profileStore.saveProfile();
    expect(get(profileStore).isConfigured).toBe(true);

    // Navigate to Home
    routerStore.goHome();
    expect(get(routerStore).currentScreen).toBe('home');

    // Navigate to Reader
    routerStore.goToReader();
    let state = get(routerStore);
    expect(state.currentScreen).toBe('reader');
    expect(state.previousScreen).toBe('home');

    // Navigate to Settings
    routerStore.goToSettings();
    state = get(routerStore);
    expect(state.currentScreen).toBe('settings');
    expect(state.previousScreen).toBe('reader');

    // Navigate back to Home
    routerStore.goHome();
    state = get(routerStore);
    expect(state.currentScreen).toBe('home');
    expect(state.previousScreen).toBe('settings');
  });

  it('consolidates adventure-setup route seamlessly into home screen (WP14)', () => {
    profileStore.setChildName('Lukas');
    profileStore.saveProfile();

    // Invoking goToAdventureSetup routes directly to home
    routerStore.goToAdventureSetup();
    expect(get(routerStore).currentScreen).toBe('home');

    // Invoking navigate('adventure-setup') also routes directly to home
    routerStore.navigate('adventure-setup');
    expect(get(routerStore).currentScreen).toBe('home');
  });
});
