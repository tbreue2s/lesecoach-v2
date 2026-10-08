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
    if ($readingSessionStore.sentences.length > 0) {
      // Story is already loaded, only re-tokenize if level changed
      if ($readingSessionStore.level !== lvl) {
        const currentStory = $storyConfigStore.activeStory || SAMPLE_STORIES.find((s) => s.id === $readingSessionStore.storyId) || SAMPLE_STORIES[0];
        readingSessionStore.loadStory(
          currentStory,
          lvl,
          activeCompanion.customName
        );
      }
      return;
    }

    const currentStory = $storyConfigStore.activeStory || SAMPLE_STORIES[0];
    readingSessionStore.loadStory(
      currentStory,
      lvl,
      activeCompanion.customName
    );
  }

  onMount(() => {
    initStory();
  });

  function handleLevelChange(newLevel: number) {
    const currentStory = $storyConfigStore.activeStory || SAMPLE_STORIES.find((s) => s.id === $readingSessionStore.storyId) || SAMPLE_STORIES[0];
    readingSessionStore.loadStory(
      currentStory,
      newLevel as any,
      activeCompanion.customName
    );
  }

  function handlePrevLevel() {
    if ($levelStore > 1) {
      levelStore.prevLevel();
      initStory($levelStore);
    }
  }

  function handleNextLevel() {
    if ($levelStore < 9) {
      levelStore.nextLevel();
      initStory($levelStore);
    }
  }
</script>

<div class="reader-screen">
  <!-- Top Navigation & Companion Bar -->
  <header class="reader-nav-header">
    <button
      type="button"
      id="reader-back-btn"
      class="btn-back"
      on:click={() => routerStore.goHome()}
    >
      ← Übersicht
    </button>

    <div class="reader-companion-pill">
      <span class="companion-emoji" aria-hidden="true">{activeCompanion.icon}</span>
      <span class="companion-title">{activeCompanion.customName}</span>
    </div>
  </header>

  <!-- Level Stepper Bar (Leichtere Stufe | Stufe X | Nächste Stufe) -->
  <nav class="level-stepper-bar" aria-label="Stufen-Navigation">
    <button
      type="button"
      id="prev-level-btn"
      class="btn-step"
      disabled={$levelStore <= 1}
      on:click={handlePrevLevel}
    >
      ◀ Leichtere Stufe
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
      class="btn-step"
      disabled={$levelStore >= 9}
      on:click={handleNextLevel}
    >
      Nächste Stufe ▶
    </button>
  </nav>

  <!-- Level Selector Modal / Accordion -->
  {#if showLevelSelector}
    <LevelSelector onLevelChange={handleLevelChange} />
  {/if}

  <!-- Centered Book-Page Reading Container -->
  <main class="book-container">
    <div class="book-page">
      <div class="story-meta">
        <h1 class="story-title">🐾 {$readingSessionStore.storyTitle || SAMPLE_STORIES[0].title}</h1>
      </div>

      <!-- Tokenized Reading Session View -->
      <ReadingSessionView />

      <!-- Interactive Mock Controls Bar -->
      <MockReadingControls />
    </div>
  </main>
</div>

<style>
  .reader-screen {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .reader-nav-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0.25rem;
  }

  .btn-back {
    background: var(--color-surface-card, #F5EFE6);
    border: 1.5px solid var(--color-border, #E2D9CC);
    color: var(--color-primary, #2B6CB0);
    padding: 0.6rem 1rem;
    font-size: 1rem;
    font-weight: 700;
    border-radius: var(--radius-md, 0.875rem);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-back:hover {
    background: var(--color-surface-soft, #EDE5D8);
    transform: translateX(-2px);
  }

  .reader-companion-pill {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--color-surface-card, #F5EFE6);
    border: 1.5px solid var(--color-border, #E2D9CC);
    padding: 0.4rem 0.85rem;
    border-radius: 9999px;
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--color-text-main, #2D3748);
  }

  .companion-emoji {
    font-size: 1.25rem;
  }

  /* Level Stepper Bar */
  .level-stepper-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--color-surface-card, #F5EFE6);
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-md, 0.875rem);
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
  }

  .btn-step {
    background: var(--color-page-bg, #FBF9F5);
    border: 1.5px solid var(--color-border, #E2D9CC);
    color: var(--color-text-main, #2D3748);
    padding: 0.5rem 0.85rem;
    border-radius: var(--radius-sm, 0.5rem);
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-step:hover:not(:disabled) {
    background: var(--color-primary-soft, #EBF2FA);
    border-color: var(--color-primary, #2B6CB0);
    color: var(--color-primary, #2B6CB0);
  }

  .btn-step:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-current-level {
    background: var(--color-primary, #2B6CB0);
    border: none;
    color: var(--color-page-bg, #FBF9F5);
    padding: 0.55rem 1.15rem;
    border-radius: var(--radius-sm, 0.5rem);
    font-weight: 800;
    font-size: 0.95rem;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(43, 108, 176, 0.25);
    transition: all 0.2s ease;
  }

  .btn-current-level:hover {
    background: var(--color-primary-hover, #23568B);
    transform: translateY(-1px);
  }

  .book-container {
    perspective: 1000px;
  }

  .book-page {
    background: var(--color-surface-card, #F5EFE6);
    border: 3px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-lg, 1.25rem);
    padding: 2.25rem 2rem;
    box-shadow: var(--shadow-warm-lg, 0 10px 25px rgba(74, 85, 104, 0.12));
    position: relative;
  }

  .story-meta {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .story-title {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--color-text-main, #2D3748);
  }
</style>
