<script lang="ts">
  import { storyConfigStore } from '../stores/storyConfigStore';
  import { profileStore } from '../stores/profileStore';
  import { levelStore } from '../stores/levelStore';
  import { routerStore } from '../stores/routerStore';
  import { STORY_THEMES } from '../data/storyThemes';
  import { READING_LEVEL_INFOS } from '../data/readingLevels';
  import LevelSelector from './LevelSelector.svelte';

  let showLevelSelector = false;

  $: childName = $profileStore.childName || 'Lese-Held';
  $: activeCompanion = $profileStore.companions.find(
    (c) => c.id === $profileStore.selectedCompanionId
  ) || $profileStore.companions[0];

  $: currentTheme = STORY_THEMES.find((t) => t.id === $storyConfigStore.selectedThemeId) || STORY_THEMES[0];
  $: levelInfo = READING_LEVEL_INFOS[$levelStore];

  function handleSelectTheme(themeId: string) {
    storyConfigStore.selectTheme(themeId);
  }

  function handleStartAdventure() {
    storyConfigStore.buildPayload();
    storyConfigStore.startAdventure();
  }
</script>

<div class="adventure-setup-card">
  <header class="setup-header">
    <div class="header-top-row">
      <button
        type="button"
        class="back-btn"
        on:click={() => routerStore.goHome()}
      >
        ← Zurück
      </button>
      <div class="character-preview-pill">
        <span>⭐ <strong>{childName}</strong></span>
        {#if $storyConfigStore.includeCompanion}
          <span>& {activeCompanion.icon} <strong>{activeCompanion.customName}</strong></span>
        {/if}
      </div>
    </div>

    <h1 class="setup-title">✨ Neues Lese-Abenteuer ✨</h1>
    <p class="setup-subtitle">Worüber möchtest du heute eine Geschichte lesen?</p>
  </header>

  <!-- Level Quick Stepper Bar -->
  <section class="level-bar-section" aria-labelledby="level-heading">
    <div class="level-bar-header">
      <span id="level-heading" class="section-label">Lese-Stufe:</span>
      <button
        type="button"
        class="level-toggle-btn"
        on:click={() => (showLevelSelector = !showLevelSelector)}
      >
        🎯 Stufe {$levelStore}: {levelInfo.title} {showLevelSelector ? '▲' : '▼'}
      </button>
    </div>

    {#if showLevelSelector}
      <div class="level-dropdown-wrapper">
        <LevelSelector onLevelChange={() => (showLevelSelector = false)} />
      </div>
    {/if}
  </section>

  <!-- 10 Theme Tiles Grid -->
  <section class="themes-section" aria-labelledby="themes-heading">
    <h2 id="themes-heading" class="section-label">1. Wähle dein Thema:</h2>

    <div class="themes-grid" role="radiogroup" aria-label="Geschichten-Themen Auswahl">
      {#each STORY_THEMES as theme (theme.id)}
        <button
          type="button"
          class="theme-card"
          class:selected={$storyConfigStore.selectedThemeId === theme.id}
          on:click={() => handleSelectTheme(theme.id)}
          role="radio"
          aria-checked={$storyConfigStore.selectedThemeId === theme.id}
        >
          <span class="theme-icon" aria-hidden="true">{theme.icon}</span>
          <span class="theme-name">{theme.label}</span>
          {#if $storyConfigStore.selectedThemeId === theme.id}
            <span class="selected-badge" aria-hidden="true">✓ Gewählt</span>
          {/if}
        </button>
      {/each}
    </div>
  </section>

  <!-- Companion inclusion toggle -->
  <section class="companion-toggle-section">
    <label class="toggle-label">
      <input
        type="checkbox"
        class="toggle-checkbox"
        checked={$storyConfigStore.includeCompanion}
        on:change={(e) => storyConfigStore.setIncludeCompanion(e.currentTarget.checked)}
      />
      <span class="toggle-text">
        {activeCompanion.icon} <strong>{activeCompanion.customName}</strong> soll mit in der Geschichte mitspielen!
      </span>
    </label>
  </section>

  <!-- Action Start Button -->
  <footer class="setup-footer">
    <button
      type="button"
      id="start-adventure-btn"
      class="btn-start-adventure"
      on:click={handleStartAdventure}
    >
      <span class="btn-icon" aria-hidden="true">{currentTheme.icon}</span>
      <span class="btn-text">Los geht's – Geschichte lesen!</span>
      <span class="btn-arrow" aria-hidden="true">➔</span>
    </button>
  </footer>
</div>

<style>
  .adventure-setup-card {
    max-width: 720px;
    margin: 0 auto;
    background: var(--color-surface-card, #F5EFE6);
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-lg, 1.25rem);
    padding: 1.75rem 2rem;
    box-shadow: var(--shadow-warm-lg, 0 10px 25px rgba(74, 85, 104, 0.12));
  }

  .setup-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .header-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.85rem;
  }

  .back-btn {
    background: var(--color-page-bg, #FBF9F5);
    border: 1.5px solid var(--color-border, #E2D9CC);
    color: var(--color-primary, #2B6CB0);
    padding: 0.4rem 0.85rem;
    font-size: 0.95rem;
    font-weight: 700;
    border-radius: var(--radius-sm, 0.5rem);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .back-btn:hover {
    background: var(--color-surface-soft, #EDE5D8);
  }

  .character-preview-pill {
    background: var(--color-page-bg, #FBF9F5);
    border: 1.5px solid var(--color-border, #E2D9CC);
    padding: 0.35rem 0.85rem;
    border-radius: 9999px;
    font-size: 0.9rem;
    color: var(--color-text-main, #2D3748);
    display: flex;
    gap: 0.5rem;
  }

  .setup-title {
    margin: 0 0 0.35rem 0;
    font-size: 1.85rem;
    font-weight: 800;
    color: var(--color-text-main, #2D3748);
  }

  .setup-subtitle {
    margin: 0;
    font-size: 1.1rem;
    color: var(--color-text-muted, #4A5568);
  }

  .level-bar-section {
    background: var(--color-page-bg, #FBF9F5);
    border: 1.5px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-md, 0.875rem);
    padding: 0.85rem 1.15rem;
    margin-bottom: 1.5rem;
  }

  .level-bar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .section-label {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-text-main, #2D3748);
    display: block;
    margin-bottom: 0.6rem;
  }

  .level-toggle-btn {
    background: var(--color-primary-soft, #EBF2FA);
    border: 1.5px solid var(--color-primary, #2B6CB0);
    color: var(--color-primary, #2B6CB0);
    padding: 0.45rem 0.85rem;
    border-radius: var(--radius-sm, 0.5rem);
    font-weight: 800;
    font-size: 0.95rem;
    cursor: pointer;
  }

  .level-dropdown-wrapper {
    margin-top: 1rem;
  }

  .themes-section {
    margin-bottom: 1.5rem;
  }

  .themes-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.85rem;
  }

  @media (max-width: 680px) {
    .themes-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 440px) {
    .themes-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .theme-card {
    background: var(--color-page-bg, #FBF9F5);
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-md, 0.875rem);
    padding: 1rem 0.4rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .theme-card:hover {
    transform: translateY(-2px);
    border-color: var(--color-primary, #2B6CB0);
    background: var(--color-surface-highlight, #FAF7F0);
  }

  .theme-card.selected {
    background: var(--color-primary-soft, #EBF2FA);
    border-color: var(--color-primary, #2B6CB0);
    box-shadow: 0 4px 14px rgba(43, 108, 176, 0.22);
    transform: scale(1.03);
  }

  .theme-icon {
    font-size: 2.35rem;
    margin-bottom: 0.35rem;
  }

  .theme-name {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text-main, #2D3748);
    text-align: center;
  }

  .selected-badge {
    position: absolute;
    top: 5px;
    right: 5px;
    font-size: 0.65rem;
    font-weight: 800;
    background: var(--color-primary, #2B6CB0);
    color: var(--color-page-bg, #FBF9F5);
    padding: 2px 5px;
    border-radius: 4px;
  }

  .companion-toggle-section {
    background: var(--color-surface-soft, #EDE5D8);
    border: 1.5px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-md, 0.875rem);
    padding: 0.85rem 1.15rem;
    margin-bottom: 1.75rem;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
  }

  .toggle-checkbox {
    width: 1.35rem;
    height: 1.35rem;
    accent-color: var(--color-primary, #2B6CB0);
    cursor: pointer;
  }

  .toggle-text {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-main, #2D3748);
  }

  .setup-footer {
    text-align: center;
  }

  .btn-start-adventure {
    width: 100%;
    background: var(--color-primary, #2B6CB0);
    color: var(--color-page-bg, #FBF9F5);
    border: none;
    border-radius: var(--radius-md, 0.875rem);
    padding: 1.25rem 1.75rem;
    font-size: 1.35rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.85rem;
    box-shadow: 0 6px 18px rgba(43, 108, 176, 0.3);
    transition: all 0.2s ease;
  }

  .btn-start-adventure:hover {
    background: var(--color-primary-hover, #23568B);
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgba(43, 108, 176, 0.4);
  }

  .btn-start-adventure:active {
    transform: translateY(0);
  }

  .btn-icon {
    font-size: 1.75rem;
  }

  .btn-arrow {
    font-size: 1.25rem;
    transition: transform 0.2s ease;
  }

  .btn-start-adventure:hover .btn-arrow {
    transform: translateX(4px);
  }
</style>
