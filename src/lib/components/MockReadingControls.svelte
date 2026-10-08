<script lang="ts">
  import { readingSessionStore } from '../stores/readingSessionStore';
  import { levelStore } from '../stores/levelStore';
  import { profileStore } from '../stores/profileStore';
  import { SAMPLE_STORIES } from '../data/sampleStories';

  $: activeCompanion = $profileStore.companions.find(
    (c) => c.id === $profileStore.selectedCompanionId
  ) || $profileStore.companions[0];

  function handleWordSuccess() {
    readingSessionStore.advanceWordSuccess();
  }

  function handleSentenceComplete() {
    readingSessionStore.completeCurrentSentence();
  }

  function handleRestartStory() {
    const currentStory = SAMPLE_STORIES.find((s) => s.id === $readingSessionStore.storyId) || SAMPLE_STORIES[0];
    readingSessionStore.loadStory(
      currentStory,
      $levelStore,
      activeCompanion.customName
    );
  }

  function handleNextStory() {
    readingSessionStore.loadNextStory(
      $levelStore,
      activeCompanion.customName
    );
  }
</script>

<div class="mock-controls-card">
  <div class="controls-header">
    <span class="controls-badge">🧪 Test- & Lese-Leiste</span>
  </div>

  <div class="buttons-row">
    <button
      type="button"
      id="mock-word-success-btn"
      class="btn-mock btn-word"
      on:click={handleWordSuccess}
    >
      ⭐ Wort richtig
    </button>

    <button
      type="button"
      id="mock-sentence-success-btn"
      class="btn-mock btn-sentence"
      on:click={handleSentenceComplete}
    >
      ✅ Satz geschafft
    </button>

    <button
      type="button"
      id="mock-restart-btn"
      class="btn-mock btn-restart"
      on:click={handleRestartStory}
    >
      🔄 Neustart
    </button>

    <button
      type="button"
      id="mock-next-story-btn"
      class="btn-mock btn-story"
      on:click={handleNextStory}
    >
      ✨ Neue Geschichte
    </button>
  </div>
</div>

<style>
  .mock-controls-card {
    background: var(--color-surface-soft, #EDE5D8);
    border: 2px dashed var(--color-primary, #2B6CB0);
    border-radius: var(--radius-md, 0.875rem);
    padding: 1rem 1.25rem;
    margin-top: 1.5rem;
  }

  .controls-header {
    margin-bottom: 0.75rem;
    text-align: center;
  }

  .controls-badge {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--color-primary, #2B6CB0);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .buttons-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.6rem;
  }

  @media (max-width: 600px) {
    .buttons-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .btn-mock {
    padding: 0.75rem 0.5rem;
    font-size: 0.95rem;
    font-weight: 800;
    border-radius: var(--radius-sm, 0.5rem);
    cursor: pointer;
    border: 1.5px solid var(--color-border, #E2D9CC);
    transition: all 0.2s ease;
    text-align: center;
  }

  .btn-word {
    background: #FEFCBF;
    color: #744210;
    border-color: #D69E2E;
  }

  .btn-word:hover {
    background: #FAF089;
    transform: translateY(-2px);
  }

  .btn-sentence {
    background: #C6F6D5;
    color: #22543D;
    border-color: #38A169;
  }

  .btn-sentence:hover {
    background: #9AE6B4;
    transform: translateY(-2px);
  }

  .btn-restart {
    background: var(--color-surface-card, #F5EFE6);
    color: var(--color-text-main, #2D3748);
  }

  .btn-restart:hover {
    background: var(--color-page-bg, #FBF9F5);
    transform: translateY(-2px);
  }

  .btn-story {
    background: var(--color-primary, #2B6CB0);
    color: var(--color-page-bg, #FBF9F5);
    border-color: var(--color-primary-hover, #23568B);
  }

  .btn-story:hover {
    background: var(--color-primary-hover, #23568B);
    transform: translateY(-2px);
  }
</style>
