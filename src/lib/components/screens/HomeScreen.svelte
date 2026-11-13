<script lang="ts">
  import { profileStore } from '../../stores/profileStore';
  import { storyConfigStore } from '../../stores/storyConfigStore';
  import { levelStore } from '../../stores/levelStore';
  import { routerStore } from '../../stores/routerStore';
  import { STORY_THEMES } from '../../data/storyThemes';
  import { speakUiText } from '../../services/uiSpeechService';
  import LevelSelector from '../LevelSelector.svelte';

  $: childName = $profileStore.childName || 'kleiner Lese-Held';
  $: activeCompanion = $profileStore.companions.find(
    (c) => c.id === $profileStore.selectedCompanionId
  ) || $profileStore.companions[0];

  $: welcomeMessage = `Hallo ${childName}! Dein Lese-Begleiter ${activeCompanion.icon} ${activeCompanion.customName} ist bereit!`;
  $: currentTheme = STORY_THEMES.find((t) => t.id === $storyConfigStore.selectedThemeId) || STORY_THEMES[0];

  let showLevelSelector = false;

  function handleSelectTheme(themeId: string) {
    storyConfigStore.selectTheme(themeId);
  }

  function handleStartAdventure() {
    storyConfigStore.buildPayload();
    storyConfigStore.startAdventure();
  }

  function playGreeting() {
    speakUiText(welcomeMessage, {
      childName: $profileStore.childName,
      companionId: activeCompanion.id,
    });
  }

</script>

<div class="home-screen-container">
  <!-- Unified Compact Top Header: Companion + Child + Level + Settings -->
  <header class="home-compact-header" aria-label="Profil und Lese-Stufe">
    <div class="header-left">
      <div class="companion-avatar" aria-hidden="true">
        {activeCompanion.icon}
      </div>
      <div class="header-info">
        <div class="greeting-row">
          <span class="child-hero-name">⭐ {childName} & {activeCompanion.customName}</span>
          <button
            type="button"
            class="btn-speak-greeting"
            title="Begrüßung vorlesen"
            aria-label="Begrüßung vorlesen"
            on:click={playGreeting}
          >
            🔊
          </button>
        </div>
        <span class="greeting-subtitle">Bereit für dein nächstes Lese-Abenteuer?</span>
      </div>
    </div>

    <div class="header-right">
      <div class="level-control-wrapper">
        <span id="home-level-heading" class="visually-hidden">🎯 Lese-Stufe:</span>
        <button
          type="button"
          class="level-toggle-btn"
          title="Lese-Stufe ändern"
          on:click={() => (showLevelSelector = !showLevelSelector)}
        >
          🎯 Stufe {$levelStore} {showLevelSelector ? '▲' : '▼'}
        </button>
      </div>

      <button
        type="button"
        id="goto-settings-btn"
        class="btn-settings-icon"
        title="Profil oder Begleiter ändern"
        aria-label="Profil oder Begleiter ändern"
        on:click={() => routerStore.goToSettings()}
      >
        ⚙️
      </button>
    </div>
  </header>

  {#if showLevelSelector}
    <div class="level-dropdown-card">
      <LevelSelector onLevelChange={() => (showLevelSelector = false)} />
    </div>
  {/if}

  <!-- 10 Theme Tiles Grid -->
  <section class="themes-section" aria-labelledby="home-themes-heading">
    <div class="themes-header-row">
      <h2 id="home-themes-heading" class="themes-title">📚 Wähle dein Thema:</h2>
      <span class="chosen-theme-tag">{currentTheme.icon} {currentTheme.label}</span>
    </div>

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

  <!-- Sticky Bottom Action Dock -->
  <footer class="sticky-action-dock">
    <button
      type="button"
      id="start-reading-btn"
      class="btn-primary-large"
      on:click={handleStartAdventure}
    >
      <span class="btn-icon" aria-hidden="true">{currentTheme.icon}</span>
      <span class="btn-text">Los geht's – Geschichte lesen!</span>
      <span class="btn-arrow" aria-hidden="true">➔</span>
    </button>
  </footer>
</div>

<style>
  .home-screen-container {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 1rem;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  /* Unified Compact Header */
  .home-compact-header {
    background: var(--color-surface-card, #F5EFE6);
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-lg, 1.25rem);
    padding: 0.85rem 1.15rem;
    box-shadow: var(--shadow-warm, 0 4px 14px rgba(74, 85, 104, 0.08));
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .companion-avatar {
    font-size: 2.25rem;
    line-height: 1;
    background: var(--color-page-bg, #FBF9F5);
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: 0.75rem;
    padding: 0.25rem 0.35rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .header-info {
    display: flex;
    flex-direction: column;
  }

  .greeting-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .child-hero-name {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--color-text-main, #2D3748);
  }

  .btn-speak-greeting {
    background: transparent;
    border: none;
    font-size: 1.1rem;
    cursor: pointer;
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    transition: transform 0.15s ease;
  }

  .btn-speak-greeting:hover {
    transform: scale(1.2);
  }

  .greeting-subtitle {
    font-size: 0.85rem;
    color: var(--color-text-muted, #4A5568);
    font-weight: 600;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.6rem;
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
    transition: all 0.2s ease;
  }

  .level-toggle-btn:hover {
    background: #D9EAFB;
  }

  .btn-settings-icon {
    background: var(--color-surface-soft, #EDE5D8);
    border: 1.5px solid var(--color-border, #E2D9CC);
    color: var(--color-text-main, #2D3748);
    padding: 0.45rem 0.65rem;
    font-size: 1.05rem;
    border-radius: var(--radius-sm, 0.5rem);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-settings-icon:hover {
    background: var(--color-primary-soft, #EBF2FA);
    border-color: var(--color-primary, #2B6CB0);
  }

  .level-dropdown-card {
    animation: fadeIn 0.2s ease;
  }

  /* Themes Section */
  .themes-section {
    background: var(--color-surface-card, #F5EFE6);
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-lg, 1.25rem);
    padding: 1.15rem 1.35rem;
    box-shadow: var(--shadow-warm, 0 4px 14px rgba(74, 85, 104, 0.08));
  }

  .themes-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.85rem;
  }

  .themes-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--color-text-main, #2D3748);
  }

  .chosen-theme-tag {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-primary, #2B6CB0);
    background: var(--color-primary-soft, #EBF2FA);
    padding: 0.25rem 0.65rem;
    border-radius: 9999px;
    border: 1px solid var(--color-border, #E2D9CC);
  }

  .themes-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.75rem;
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
    padding: 0.75rem 0.35rem;
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
    font-size: 2.2rem;
    margin-bottom: 0.25rem;
  }

  .theme-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text-main, #2D3748);
    text-align: center;
  }

  .selected-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    font-size: 0.65rem;
    font-weight: 800;
    background: var(--color-primary, #2B6CB0);
    color: var(--color-page-bg, #FBF9F5);
    padding: 1px 4px;
    border-radius: 4px;
  }

  /* Sticky Bottom Action Dock */
  .sticky-action-dock {
    position: sticky;
    bottom: 0.5rem;
    z-index: 10;
    margin-top: 0.25rem;
  }

  .btn-primary-large {
    width: 100%;
    background: var(--color-primary, #2B6CB0);
    color: var(--color-page-bg, #FBF9F5);
    border: none;
    border-radius: 1.25rem;
    padding: 1.15rem 1.5rem;
    font-size: 1.3rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.85rem;
    box-shadow: 0 6px 18px rgba(43, 108, 176, 0.35);
    transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
  }

  .btn-primary-large:hover {
    background-color: var(--color-primary-hover, #23568B);
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgba(43, 108, 176, 0.45);
  }

  .btn-primary-large:active {
    transform: translateY(0);
  }

  .btn-icon {
    font-size: 1.5rem;
  }

  .btn-arrow {
    font-size: 1.2rem;
    transition: transform 0.2s ease;
  }

  .btn-primary-large:hover .btn-arrow {
    transform: translateX(4px);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
