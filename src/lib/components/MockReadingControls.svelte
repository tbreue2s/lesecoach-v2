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

  let showDevTools = false;

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

  function handleTriggerIntervention() {
    readingSessionStore.triggerIntervention();
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

<div class="dock-container">
  <!-- Turn State & Microphone Feedback Pill -->
  <div class="turn-status-banner turn-{session.turnState.toLowerCase()}">
    {#if session.isSessionComplete}
      <div class="status-message">
        <span class="status-icon" aria-hidden="true">🏆</span>
        <span class="status-text"><strong>Fantastisch!</strong> Geschichte abgeschlossen!</span>
      </div>
    {:else if session.turnState === 'CHILD_TURN'}
      <div class="child-turn-status">
        <div class="mic-wave-group" aria-hidden="true">
          <span class="otter-ear">🦦👂</span>
          <span class="wave w1"></span>
          <span class="wave w2"></span>
          <span class="wave w3"></span>
        </div>
        <div class="turn-desc">
          <span class="highlight-prompt"><strong>Ich höre dir zu!</strong> Lies das gelbe Wort laut.</span>
          {#if session.lastSpokenTranscript}
            <span class="heard-badge">Gehört: „{session.lastSpokenTranscript}“</span>
          {/if}
        </div>
      </div>
    {:else if session.turnState === 'APP_TURN'}
      <div class="status-message">
        <span class="status-icon speaking-pulse" aria-hidden="true">🔊</span>
        <span class="status-text"><strong>{activeCompanion.customName}</strong> liest vor...</span>
      </div>
    {:else if session.turnState === 'REPEATED_READING'}
      <div class="status-message">
        <span class="status-icon" aria-hidden="true">🔄</span>
        <span class="status-text"><strong>Gemeinsam-Satz:</strong> Hör noch einmal entspannt zu!</span>
      </div>
    {:else if session.turnState === 'PAUSED'}
      <div class="status-message">
        <span class="status-icon" aria-hidden="true">⏸️</span>
        <span class="status-text">Lesepause – tippe auf Weiterlesen</span>
      </div>
    {:else}
      <div class="status-message">
        <span class="status-icon" aria-hidden="true">📖</span>
        <span class="status-text">Tippe auf <strong>Vorlesen</strong> oder lies selbst laut los!</span>
      </div>
    {/if}

    {#if session.micError}
      <div class="mic-error-pill" role="alert">
        <span>ℹ️ {session.micError}</span>
      </div>
    {/if}
  </div>

  <!-- Primary 3-Button Child Ergonomics Dock -->
  <div class="primary-buttons-dock">
    {#if session.isSessionComplete}
      <!-- Celebration buttons when story is complete -->
      <button
        type="button"
        id="mock-next-story-btn"
        class="btn-dock-action btn-next-big"
        on:click={handleNextStory}
      >
        <span class="btn-symbol" aria-hidden="true">✨</span>
        <span class="btn-label">Nächstes Abenteuer</span>
        <span class="btn-symbol" aria-hidden="true">➔</span>
      </button>

      <button
        type="button"
        id="mock-restart-btn"
        class="btn-dock-action btn-restart-soft"
        on:click={handleRestartStory}
      >
        <span class="btn-symbol" aria-hidden="true">🔄</span>
        <span class="btn-label">Nochmal lesen</span>
      </button>
    {:else}
      <!-- 1. Play / Pause Button -->
      {#if session.isSpeaking}
        <button
          type="button"
          id="mock-pause-audio-btn"
          class="btn-dock-action btn-audio-pause"
          on:click={handlePauseAudio}
          title="Vorlesen anhalten"
        >
          <span class="btn-symbol" aria-hidden="true">⏸️</span>
          <span class="btn-label">Pause</span>
        </button>
      {:else}
        <button
          type="button"
          id="mock-start-audio-btn"
          class="btn-dock-action btn-audio-play"
          on:click={handleStartAudio}
          title="Vorlesen starten"
        >
          <span class="btn-symbol" aria-hidden="true">🔊</span>
          <span class="btn-label">{session.turnState === 'PAUSED' ? 'Weiter' : 'Vorlesen'}</span>
        </button>
      {/if}

      <!-- 2. Silben-Hilfe Button -->
      <button
        type="button"
        id="mock-syllable-help-btn"
        class="btn-dock-action btn-syllable-help"
        class:highlight-help={session.turnState === 'CHILD_TURN'}
        on:click={handleTriggerIntervention}
        title="Silben-Hilfe einschalten"
      >
        <span class="btn-symbol" aria-hidden="true">💡</span>
        <span class="btn-label">Silben-Hilfe</span>
      </button>

      <!-- 3. Wort weiter Button (Fallback if speech recognition doesn't catch child word) -->
      <button
        type="button"
        id="mock-word-success-btn"
        class="btn-dock-action btn-word-next"
        on:click={handleWordSuccess}
        title="Wort als geschafft abhaken"
      >
        <span class="btn-symbol" aria-hidden="true">👉</span>
        <span class="btn-label">Wort weiter</span>
      </button>
    {/if}

    <!-- Discreet Dev / Parent Tools Toggle -->
    <button
      type="button"
      class="btn-dev-toggle"
      class:active={showDevTools}
      on:click={() => (showDevTools = !showDevTools)}
      title="Entwickler- & Testleiste umschalten"
      aria-label="Entwickler-Werkzeuge"
    >
      🛠️
    </button>
  </div>

  <!-- Collapsible Dev & Test Leiste (Preserves all automated testing IDs in DOM) -->
  <div class="dev-tools-drawer" class:collapsed={!showDevTools}>
    <div class="dev-drawer-header">
      <span class="dev-title">🧪 Entwickler- & Test-Werkzeuge</span>
      <div class="dev-pills">
        {#if session.isListening}
          <span class="dev-pill mic-on">🎙️ STT Aktiv</span>
        {:else if session.isSpeaking}
          <span class="dev-pill tts-on">🔊 TTS Aktiv</span>
        {:else}
          <span class="dev-pill idle">Bereit</span>
        {/if}
      </div>
    </div>

    <div class="dev-buttons-grid">
      <button
        type="button"
        id="mock-simulate-correct-word-btn"
        class="btn-dev-item"
        on:click={handleSimulateCorrectWord}
      >
        ⭐ [Simuliere Wort]
      </button>

      <button
        type="button"
        id="mock-repeat-btn"
        class="btn-dev-item"
        on:click={handleTriggerRepeatedReading}
      >
        🔄 Repeated Reading
      </button>

      <button
        type="button"
        id="mock-sentence-success-btn"
        class="btn-dev-item"
        on:click={handleSentenceComplete}
      >
        ✅ Satz geschafft
      </button>

      {#if !session.isSessionComplete}
        <button
          type="button"
          id="mock-restart-btn"
          class="btn-dev-item"
          on:click={handleRestartStory}
        >
          🔄 Neustart
        </button>

        <button
          type="button"
          id="mock-next-story-btn"
          class="btn-dev-item"
          on:click={handleNextStory}
        >
          ✨ Neues Thema
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .dock-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: var(--color-surface-card, #F5EFE6);
    border-top: 2px solid var(--color-border, #E2D9CC);
    padding: 0.65rem 1rem 0.85rem;
    box-shadow: 0 -4px 16px rgba(74, 85, 104, 0.08);
  }

  /* Compact Turn State Banner */
  .turn-status-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.45rem 0.85rem;
    border-radius: var(--radius-md, 0.875rem);
    border: 1.5px solid var(--color-border, #E2D9CC);
    background: #FFFDF9;
    font-size: 0.95rem;
    min-height: 2.3rem;
    transition: all 0.2s ease;
  }

  .status-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text-main, #2D3748);
  }

  .turn-status-banner.turn-app_turn {
    background: #EBF8FF;
    border-color: #BEE3F8;
    color: #2B6CB0;
  }

  .speaking-pulse {
    animation: pulse 1.2s infinite ease-in-out;
  }

  .turn-status-banner.turn-child_turn {
    background: #FFFAF0;
    border-color: #FBD38D;
    box-shadow: 0 2px 10px rgba(192, 86, 33, 0.12);
  }

  .child-turn-status {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    flex-wrap: wrap;
  }

  .mic-wave-group {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .otter-ear {
    font-size: 1.25rem;
  }

  .wave {
    width: 3px;
    height: 8px;
    background: #DD6B20;
    border-radius: 2px;
    animation: waveBar 0.9s infinite ease-in-out;
  }

  .wave.w2 {
    animation-delay: 0.2s;
    height: 14px;
  }

  .wave.w3 {
    animation-delay: 0.4s;
    height: 10px;
  }

  .turn-desc {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .highlight-prompt {
    color: #9C4221;
    font-size: 0.95rem;
  }

  .heard-badge {
    background: #FEFCBF;
    border: 1px dashed #D69E2E;
    color: #744210;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 700;
  }

  .turn-status-banner.turn-repeated_reading {
    background: #FAF5FF;
    border-color: #E9D8FD;
    color: #6B46C1;
  }

  .mic-error-pill {
    font-size: 0.8rem;
    color: #C53030;
    background: #FFF5F5;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }

  /* Primary 3-Button Child Ergonomics Dock */
  .primary-buttons-dock {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .btn-dock-action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 0.6rem;
    border-radius: var(--radius-md, 0.875rem);
    font-size: 1.05rem;
    font-weight: 800;
    cursor: pointer;
    border: 2px solid var(--color-border, #E2D9CC);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 3px 8px rgba(74, 85, 104, 0.08);
  }

  .btn-dock-action:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 14px rgba(74, 85, 104, 0.14);
  }

  .btn-dock-action:active {
    transform: translateY(0);
  }

  /* Play / Pause styling */
  .btn-audio-play {
    background: var(--color-primary, #2B6CB0);
    border-color: var(--color-primary-hover, #23568B);
    color: #FFFFFF;
    flex: 1.25;
  }

  .btn-audio-play:hover {
    background: var(--color-primary-hover, #23568B);
  }

  .btn-audio-pause {
    background: #ED8936;
    border-color: #DD6B20;
    color: #FFFFFF;
    flex: 1.25;
  }

  .btn-audio-pause:hover {
    background: #DD6B20;
  }

  /* Help styling */
  .btn-syllable-help {
    background: var(--color-page-bg, #FBF9F5);
    border-color: #CBD5E0;
    color: var(--color-text-main, #2D3748);
  }

  .btn-syllable-help:hover {
    background: #FEFCBF;
    border-color: #D69E2E;
    color: #744210;
  }

  .btn-syllable-help.highlight-help {
    border-color: #D69E2E;
    background: #FFFFF0;
    color: #744210;
    animation: gentleGlow 2s infinite ease-in-out;
  }

  /* Next Word styling */
  .btn-word-next {
    background: var(--color-surface-soft, #EDE5D8);
    border-color: var(--color-border, #E2D9CC);
    color: var(--color-text-main, #2D3748);
  }

  .btn-word-next:hover {
    background: #C6F6D5;
    border-color: #38A169;
    color: #22543D;
  }

  /* Celebration styling */
  .btn-next-big {
    background: var(--color-primary, #2B6CB0);
    color: #FFFFFF;
    border-color: var(--color-primary-hover, #23568B);
    flex: 1.6;
    padding: 0.85rem 1rem;
    font-size: 1.15rem;
  }

  .btn-restart-soft {
    background: var(--color-surface-soft, #EDE5D8);
    border-color: var(--color-border, #E2D9CC);
    color: var(--color-text-main, #2D3748);
    flex: 1;
  }

  .btn-symbol {
    font-size: 1.25rem;
  }

  /* Dev toggle button */
  .btn-dev-toggle {
    background: var(--color-surface-soft, #EDE5D8);
    border: 1.5px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-sm, 0.5rem);
    padding: 0.75rem 0.6rem;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .btn-dev-toggle:hover,
  .btn-dev-toggle.active {
    background: #E2E8F0;
    border-color: #A0AEC0;
  }

  /* Collapsible Dev Drawer */
  .dev-tools-drawer {
    margin-top: 0.25rem;
    padding: 0.65rem 0.85rem;
    background: #FAF7F0;
    border: 1.5px dashed var(--color-primary, #2B6CB0);
    border-radius: var(--radius-md, 0.875rem);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: max-height 0.25s ease, opacity 0.25s ease;
  }

  .dev-tools-drawer.collapsed {
    display: none;
  }

  .dev-drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dev-title {
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--color-primary, #2B6CB0);
    letter-spacing: 0.04em;
  }

  .dev-pills {
    display: flex;
    gap: 0.35rem;
  }

  .dev-pill {
    font-size: 0.7rem;
    font-weight: 800;
    padding: 0.15rem 0.45rem;
    border-radius: 9999px;
  }

  .dev-pill.mic-on {
    background: #FED7D7;
    color: #9B2C2C;
  }

  .dev-pill.tts-on {
    background: #EBF8FF;
    color: #2B6CB0;
  }

  .dev-pill.idle {
    background: #EDF2F7;
    color: #718096;
  }

  .dev-buttons-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
  }

  @media (max-width: 600px) {
    .dev-buttons-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .btn-dev-item {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.4rem 0.3rem;
    border: 1px solid var(--color-border, #E2D9CC);
    border-radius: 4px;
    background: var(--color-page-bg, #FBF9F5);
    color: var(--color-text-main, #2D3748);
    cursor: pointer;
  }

  .btn-dev-item:hover {
    background: #E2E8F0;
  }

  @keyframes waveBar {
    0%, 100% { transform: scaleY(0.6); opacity: 0.7; }
    50% { transform: scaleY(1.3); opacity: 1; }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.15); }
  }

  @keyframes gentleGlow {
    0%, 100% { box-shadow: 0 0 0 rgba(214, 158, 46, 0); }
    50% { box-shadow: 0 0 10px rgba(214, 158, 46, 0.4); }
  }
</style>
