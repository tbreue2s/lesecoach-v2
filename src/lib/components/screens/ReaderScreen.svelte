<script lang="ts">
  import { onMount } from 'svelte';
  import { profileStore } from '../../stores/profileStore';
  import { routerStore } from '../../stores/routerStore';
  import { levelStore } from '../../stores/levelStore';
  import { storyConfigStore } from '../../stores/storyConfigStore';
  import { readingSessionStore } from '../../stores/readingSessionStore';
  import { SAMPLE_STORIES } from '../../data/sampleStories';
  import LevelSelector from '../LevelSelector.svelte';
  import ReadingSessionView from '../ReadingSessionView.svelte';
  import MockReadingControls from '../MockReadingControls.svelte';

  $: activeCompanion = $profileStore.companions.find(
    (c) => c.id === $profileStore.selectedCompanionId
  ) || $profileStore.companions[0];

  let showLevelSelector = false;

  function initStory(lvl = $levelStore) {
    const isStudio = $profileStore.audioEngine === 'studio-audio';
    const targetLevel = isStudio ? 1 : lvl;
    if (
      $readingSessionStore.sentences.length > 0 &&
      $readingSessionStore.level === targetLevel &&
      (!isStudio || $readingSessionStore.storyId === 'story-theme_forest-lvl1-ep1')
    ) {
      return;
    }
    storyConfigStore.setLevel(targetLevel as any);
    storyConfigStore.startAdventure();
  }

  onMount(() => {
    initStory();
  });

  function handleLevelChange(newLevel: number) {
    storyConfigStore.setLevel(newLevel as any);
    storyConfigStore.startAdventure();
    showLevelSelector = false;
  }

  function handlePrevLevel() {
    if ($levelStore > 1) {
      storyConfigStore.setLevel(($levelStore - 1) as any);
      storyConfigStore.startAdventure();
    }
  }

  function handleNextLevel() {
    if ($levelStore < 9) {
      storyConfigStore.setLevel(($levelStore + 1) as any);
      storyConfigStore.startAdventure();
    }
  }
</script>

<div class="reader-screen">
  <!-- Unified Top Bar: Back + Level Stepper + Companion/Stars -->
  <header class="reader-unified-header">
    <button
      type="button"
      id="reader-back-btn"
      class="btn-back"
      title="Zurück zur Themen-Auswahl"
      on:click={() => routerStore.goHome()}
    >
      ← Themen
    </button>

    <!-- Compact Level Stepper Cluster -->
    <div class="level-stepper-cluster" aria-label="Lese-Stufe wählen">
      <button
        type="button"
        id="prev-level-btn"
        class="btn-step-arrow"
        title="Leichtere Stufe"
        aria-label="Leichtere Stufe"
        disabled={$levelStore <= 1}
        on:click={handlePrevLevel}
      >
        ◀
      </button>

      <button
        type="button"
        id="toggle-level-btn"
        class="btn-current-level"
        on:click={() => (showLevelSelector = !showLevelSelector)}
      >
        🎯 Stufe {$levelStore} {showLevelSelector ? '▲' : '▼'}
      </button>

      <button
        type="button"
        id="next-level-btn"
        class="btn-step-arrow"
        title="Nächste Stufe"
        aria-label="Nächste Stufe"
        disabled={$levelStore >= 9}
        on:click={handleNextLevel}
      >
        ▶
      </button>
    </div>

    <!-- Companion and Stars Counter Pill -->
    <div class="companion-stars-pill">
      <span class="companion-icon" aria-hidden="true">{activeCompanion.icon}</span>
      <span class="stars-counter" title="Gesammelte Sterne">⭐ {$readingSessionStore.starsEarned}</span>
    </div>
  </header>

  <!-- Level Selector Dropdown Card (Overlay) -->
  {#if showLevelSelector}
    <div class="level-dropdown-overlay">
      <LevelSelector onLevelChange={handleLevelChange} />
    </div>
  {/if}

  <!-- Middle Scrollable Reading Stage -->
  <main class="reading-scroll-stage">
    <div class="book-page">
      <div class="story-meta">
        <h1 class="story-title">🐾 {$readingSessionStore.storyTitle || SAMPLE_STORIES[0].title}</h1>
      </div>

      <!-- Tokenized Reading Session View -->
      <ReadingSessionView />
    </div>
  </main>

  <!-- Permanently Visible Bottom Control Dock -->
  <footer class="reader-dock-wrapper">
    <MockReadingControls />
  </footer>
</div>

<style>
  .reader-screen {
    width: 100%;
    max-width: 860px;
    height: 100dvh;
    max-height: 100dvh;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background: var(--color-page-bg, #FBF9F5);
  }

  /* Unified Top Bar */
  .reader-unified-header {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.85rem;
    background: var(--color-surface-card, #F5EFE6);
    border-bottom: 2px solid var(--color-border, #E2D9CC);
    gap: 0.5rem;
    box-shadow: 0 2px 8px rgba(74, 85, 104, 0.06);
    z-index: 20;
  }

  .btn-back {
    background: var(--color-page-bg, #FBF9F5);
    border: 1.5px solid var(--color-border, #E2D9CC);
    color: var(--color-primary, #2B6CB0);
    padding: 0.45rem 0.75rem;
    font-size: 0.95rem;
    font-weight: 700;
    border-radius: var(--radius-sm, 0.5rem);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .btn-back:hover {
    background: var(--color-surface-soft, #EDE5D8);
    transform: translateX(-2px);
  }

  /* Level Stepper Cluster */
  .level-stepper-cluster {
    display: flex;
    align-items: center;
    background: var(--color-page-bg, #FBF9F5);
    border: 1.5px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-sm, 0.5rem);
    overflow: hidden;
  }

  .btn-step-arrow {
    background: transparent;
    border: none;
    color: var(--color-text-main, #2D3748);
    padding: 0.45rem 0.65rem;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .btn-step-arrow:hover:not(:disabled) {
    background: var(--color-primary-soft, #EBF2FA);
    color: var(--color-primary, #2B6CB0);
  }

  .btn-step-arrow:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .btn-current-level {
    background: var(--color-primary, #2B6CB0);
    border: none;
    color: var(--color-page-bg, #FBF9F5);
    padding: 0.45rem 0.85rem;
    font-weight: 800;
    font-size: 0.9rem;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.2s ease;
  }

  .btn-current-level:hover {
    background: var(--color-primary-hover, #23568B);
  }

  /* Companion and Stars Pill */
  .companion-stars-pill {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--color-page-bg, #FBF9F5);
    border: 1.5px solid var(--color-border, #E2D9CC);
    padding: 0.35rem 0.65rem;
    border-radius: 9999px;
  }

  .companion-icon {
    font-size: 1.25rem;
    line-height: 1;
  }

  .stars-counter {
    font-weight: 800;
    font-size: 0.95rem;
    color: var(--color-accent-gold, #C05621);
    white-space: nowrap;
  }

  /* Level Dropdown Overlay */
  .level-dropdown-overlay {
    position: absolute;
    top: 3.5rem;
    left: 1rem;
    right: 1rem;
    z-index: 30;
    background: var(--color-page-bg, #FBF9F5);
    border: 2px solid var(--color-primary, #2B6CB0);
    border-radius: var(--radius-lg, 1.25rem);
    padding: 0.5rem;
    box-shadow: var(--shadow-warm-lg, 0 10px 25px rgba(74, 85, 104, 0.18));
    animation: slideDown 0.2s ease;
    max-height: 80vh;
    overflow-y: auto;
  }

  /* Middle Scrollable Reading Stage */
  .reading-scroll-stage {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scroll-behavior: smooth;
    padding: 1rem 1rem 0;
    display: flex;
    justify-content: center;
  }

  .book-page {
    width: 100%;
    max-width: 760px;
    background: var(--color-surface-card, #F5EFE6);
    border: 2.5px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-lg, 1.25rem);
    padding: 1.5rem 1.6rem 2rem;
    box-shadow: var(--shadow-warm, 0 4px 14px rgba(74, 85, 104, 0.08));
    min-height: calc(100% - 1rem);
  }

  .story-meta {
    text-align: center;
    margin-bottom: 1.25rem;
    border-bottom: 1px dashed var(--color-border, #E2D9CC);
    padding-bottom: 0.75rem;
  }

  .story-title {
    margin: 0;
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--color-text-main, #2D3748);
  }

  /* Bottom Control Dock */
  .reader-dock-wrapper {
    flex-shrink: 0;
    z-index: 20;
    width: 100%;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
