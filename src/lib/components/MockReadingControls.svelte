<script lang="ts">
  import { readingSessionStore } from '../stores/readingSessionStore';
  import { levelStore } from '../stores/levelStore';
  import { profileStore } from '../stores/profileStore';
  import { routerStore } from '../stores/routerStore';
  import { SAMPLE_STORIES } from '../data/sampleStories';

  $: activeCompanion = $profileStore.companions.find(
    (c) => c.id === $profileStore.selectedCompanionId
  ) || $profileStore.companions[0];

  $: session = $readingSessionStore;

  function handleStartAudio() {
    if (session.turnState === 'PAUSED') {
      readingSessionStore.resumeAudio();
    } else {
      readingSessionStore.startSentenceReading();
    }
  }

  function handlePauseAudio() {
    readingSessionStore.pauseAudio();
  }

  function handleWordSuccess() {
    readingSessionStore.advanceWordSuccess();
  }

  function handleSimulateCorrectWord() {
    readingSessionStore.simulateSpokenWord();
  }

  function handleSentenceComplete() {
    readingSessionStore.completeCurrentSentence();
  }

  function handleTriggerRepeatedReading() {
    readingSessionStore.triggerRepeatedReading();
  }

  function handleRestartStory() {
    const currentStory = SAMPLE_STORIES.find((s) => s.id === session.storyId) || SAMPLE_STORIES[0];
    readingSessionStore.loadStory(
      currentStory,
      $levelStore,
      activeCompanion.customName
    );
  }

  function handleNextStory() {
    routerStore.goToAdventureSetup();
  }
</script>

<div class="mock-controls-card">
  <div class="controls-header">
    <span class="controls-badge">🧪 STT-Listener & Dev-Testleiste (WP06)</span>
    <div class="status-pills">
      {#if session.isListening}
        <span class="pill pill-mic-active">🎙️ STT Aktiv (de-DE)</span>
      {:else if session.isSpeaking}
        <span class="pill pill-tts-active">🔊 TTS Aktiv (Stumm)</span>
      {:else}
        <span class="pill pill-idle">⏸️ Bereit</span>
      {/if}
    </div>
  </div>

  <div class="buttons-row">
    {#if session.isSpeaking}
      <button
        type="button"
        id="mock-pause-audio-btn"
        class="btn-mock btn-audio"
        on:click={handlePauseAudio}
      >
        ⏸️ Pause
      </button>
    {:else}
      <button
        type="button"
        id="mock-start-audio-btn"
        class="btn-mock btn-audio"
        on:click={handleStartAudio}
      >
        🔊 Vorlesen
      </button>
    {/if}

    <button
      type="button"
      id="mock-simulate-correct-word-btn"
      class="btn-mock btn-word"
      title="Simuliert die korrekte Spracherkennung des Zielworts"
      on:click={handleSimulateCorrectWord}
    >
      ⭐ [Dev: Simuliere Wort]
    </button>

    <button
      type="button"
      id="mock-word-success-btn"
      class="btn-mock btn-advance"
      on:click={handleWordSuccess}
    >
      👉 Direkt weiter
    </button>

    <button
      type="button"
      id="mock-repeat-btn"
      class="btn-mock btn-repeat"
      on:click={handleTriggerRepeatedReading}
    >
      🔄 Repeated Reading
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
      ✨ Neues Abenteuer
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
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.85rem;
  }

  .controls-badge {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--color-primary, #2B6CB0);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-pills {
    display: flex;
    gap: 0.4rem;
  }

  .pill {
    font-size: 0.75rem;
    font-weight: 800;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
  }

  .pill-mic-active {
    background: #FED7D7;
    color: #9B2C2C;
    border: 1px solid #FEB2B2;
    animation: blinkGlow 1.2s infinite ease-in-out;
  }

  .pill-tts-active {
    background: #EBF8FF;
    color: #2B6CB0;
    border: 1px solid #90CDF4;
  }

  .pill-idle {
    background: #EDF2F7;
    color: #4A5568;
    border: 1px solid #CBD5E0;
  }

  .buttons-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }

  @media (max-width: 700px) {
    .buttons-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .btn-mock {
    padding: 0.65rem 0.4rem;
    font-size: 0.85rem;
    font-weight: 800;
    border-radius: var(--radius-sm, 0.5rem);
    cursor: pointer;
    border: 1.5px solid var(--color-border, #E2D9CC);
    transition: all 0.2s ease;
    text-align: center;
  }

  .btn-audio {
    background: #EBF8FF;
    color: #2B6CB0;
    border-color: #90CDF4;
  }

  .btn-audio:hover {
    background: #BEE3F8;
    transform: translateY(-2px);
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

  .btn-advance {
    background: #EDF2F7;
    color: #2D3748;
    border-color: #CBD5E0;
  }

  .btn-advance:hover {
    background: #E2E8F0;
    transform: translateY(-2px);
  }

  .btn-repeat {
    background: #FAF5FF;
    color: #6B46C1;
    border-color: #D6BCFA;
  }

  .btn-repeat:hover {
    background: #E9D8FD;
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

  @keyframes blinkGlow {
    0%, 100% {
      opacity: 0.8;
    }
    50% {
      opacity: 1;
      box-shadow: 0 0 8px rgba(229, 62, 62, 0.4);
    }
  }
</style>
