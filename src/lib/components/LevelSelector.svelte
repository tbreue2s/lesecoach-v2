<script lang="ts">
  import { levelStore } from '../stores/levelStore';
  import { READING_PHASES, READING_LEVEL_INFOS } from '../data/readingLevels';
  import type { ReadingLevelNumber } from '../types/reading';

  export let onLevelChange: ((level: ReadingLevelNumber) => void) | undefined = undefined;

  function handleSelectLevel(level: ReadingLevelNumber) {
    levelStore.setLevel(level);
    if (onLevelChange) {
      onLevelChange(level);
    }
  }

  $: currentLevelInfo = READING_LEVEL_INFOS[$levelStore];
</script>

<div class="level-selector-card">
  <header class="level-header">
    <h2 class="level-title">🎯 Wähle deine Lese-Stufe</h2>
    <p class="current-level-badge">
      Aktuell: <strong>{currentLevelInfo.title}</strong>
    </p>
    <p class="current-level-desc">{currentLevelInfo.description}</p>
  </header>

  <div class="phases-container">
    {#each READING_PHASES as phase (phase.id)}
      <div class="phase-column">
        <div class="phase-header">
          <span class="phase-icon" aria-hidden="true">{phase.badgeEmoji}</span>
          <span class="phase-name">{phase.title}</span>
        </div>

        <div class="level-button-group">
          {#each phase.levels as lvl}
            <button
              type="button"
              class="level-btn"
              class:selected={$levelStore === lvl}
              on:click={() => handleSelectLevel(lvl)}
            >
              <span class="lvl-num">Stufe {lvl}</span>
              {#if $levelStore === lvl}
                <span class="active-dot" aria-hidden="true">●</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .level-selector-card {
    background: var(--color-surface-card, #F5EFE6);
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-lg, 1.25rem);
    padding: 1.5rem;
    box-shadow: var(--shadow-warm, 0 4px 14px rgba(74, 85, 104, 0.08));
    margin-bottom: 1.5rem;
  }

  .level-header {
    text-align: center;
    margin-bottom: 1.25rem;
  }

  .level-title {
    margin: 0 0 0.4rem 0;
    font-size: 1.35rem;
    font-weight: 800;
    color: var(--color-text-main, #2D3748);
  }

  .current-level-badge {
    margin: 0;
    font-size: 1.05rem;
    color: var(--color-primary, #2B6CB0);
    font-weight: 700;
  }

  .current-level-desc {
    margin: 0.35rem 0 0 0;
    font-size: 0.95rem;
    color: var(--color-text-muted, #4A5568);
    font-style: italic;
  }

  .phases-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  @media (max-width: 620px) {
    .phases-container {
      grid-template-columns: 1fr;
    }
  }

  .phase-column {
    background: var(--color-page-bg, #FBF9F5);
    border: 1.5px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-md, 0.875rem);
    padding: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .phase-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 800;
    font-size: 0.9rem;
    color: var(--color-text-main, #2D3748);
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--color-border, #E2D9CC);
  }

  .phase-icon {
    font-size: 1.15rem;
  }

  .level-button-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .level-btn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.85rem;
    background: var(--color-surface-card, #F5EFE6);
    border: 1.5px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-sm, 0.5rem);
    color: var(--color-text-main, #2D3748);
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .level-btn:hover {
    background: var(--color-surface-soft, #EDE5D8);
    border-color: var(--color-primary, #2B6CB0);
  }

  .level-btn.selected {
    background: var(--color-primary, #2B6CB0);
    border-color: var(--color-primary-hover, #23568B);
    color: var(--color-page-bg, #FBF9F5);
    box-shadow: 0 2px 8px rgba(43, 108, 176, 0.25);
  }

  .active-dot {
    font-size: 0.85rem;
  }
</style>
