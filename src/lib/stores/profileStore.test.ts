import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { profileStore, STORAGE_KEY, DEFAULT_COMPANIONS } from './profileStore';

describe('Profile Store & LocalStorage Persistence (WP01)', () => {
  beforeEach(() => {
    localStorage.clear();
    profileStore.resetProfile();
  });

  it('initializes with default state and companions list', () => {
    const state = get(profileStore);
    expect(state.childName).toBe('');
    expect(state.selectedCompanionId).toBe('dog');
    expect(state.companions.length).toBe(DEFAULT_COMPANIONS.length);
    expect(state.isConfigured).toBe(false);
  });

  it('updates child name and syncs to localStorage', () => {
    profileStore.setChildName('Marlene');
    const state = get(profileStore);
    expect(state.childName).toBe('Marlene');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.childName).toBe('Marlene');
  });

  it('allows selecting exactly 1 active companion', () => {
    profileStore.selectCompanion('cat');
    let state = get(profileStore);
    expect(state.selectedCompanionId).toBe('cat');

    // Selecting another replaces the selection (max 1 active)
    profileStore.selectCompanion('owl');
    state = get(profileStore);
    expect(state.selectedCompanionId).toBe('owl');
  });

  it('allows customizing companion names', () => {
    profileStore.updateCompanionName('dog', 'Wuffi');
    const state = get(profileStore);
    const dog = state.companions.find((c) => c.id === 'dog');
    expect(dog?.customName).toBe('Wuffi');
    expect(dog?.defaultName).toBe('Bello');
  });

  it('validates before saving profile', () => {
    // Cannot save with empty child name
    let saved = profileStore.saveProfile();
    expect(saved).toBe(false);
    expect(get(profileStore).isConfigured).toBe(false);

    // Cannot save with invalid name containing space
    profileStore.setChildName('Böser Wolf');
    saved = profileStore.saveProfile();
    expect(saved).toBe(false);
    expect(get(profileStore).isConfigured).toBe(false);

    // Can save with valid name
    profileStore.setChildName('Lukas');
    saved = profileStore.saveProfile();
    expect(saved).toBe(true);
    expect(get(profileStore).isConfigured).toBe(true);
  });
});
