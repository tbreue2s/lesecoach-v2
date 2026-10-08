import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { storyConfigStore } from './storyConfigStore';
import { profileStore } from './profileStore';
import { levelStore } from './levelStore';
import { routerStore } from './routerStore';
import { readingSessionStore } from './readingSessionStore';

describe('Story Config Store (WP04)', () => {
  beforeEach(() => {
    localStorage.clear();
    profileStore.resetProfile();
    levelStore.setLevel(1);
    routerStore.reset();
    storyConfigStore.reset();
    readingSessionStore.resetSession();
  });

  it('selects exactly 1 theme at a time (single-select)', () => {
    storyConfigStore.selectTheme('theme_dino');
    let state = get(storyConfigStore);
    expect(state.selectedThemeId).toBe('theme_dino');

    storyConfigStore.selectTheme('theme_unicorn');
    state = get(storyConfigStore);
    expect(state.selectedThemeId).toBe('theme_unicorn');
  });

  it('builds a complete StoryConfigPayload with child, companion, level, and theme', () => {
    profileStore.setChildName('Noah');
    profileStore.selectCompanion('cat');
    profileStore.updateCompanionName('cat', 'Mimi');
    profileStore.saveProfile();

    levelStore.setLevel(3);
    storyConfigStore.selectTheme('theme_pirate');

    const payload = storyConfigStore.buildPayload();

    expect(payload.childName).toBe('Noah');
    expect(payload.level).toBe(3);
    expect(payload.theme.id).toBe('theme_pirate');
    expect(payload.theme.label).toBe('Piraten');
    expect(payload.companion?.name).toBe('Mimi');
    expect(payload.companion?.icon).toBe('🐱');
  });

  it('starts adventure, generates story, initializes readingSession and navigates to reader', () => {
    profileStore.setChildName('Sophie');
    profileStore.saveProfile();

    storyConfigStore.selectTheme('theme_space');
    const story = storyConfigStore.startAdventure();

    expect(story).toBeTruthy();
    expect(story.title).toContain('Sophie');

    const session = get(readingSessionStore);
    expect(session.storyTitle).toBe(story.title);
    expect(session.sentences.length).toBeGreaterThan(0);

    const router = get(routerStore);
    expect(router.currentScreen).toBe('reader');
  });
});
