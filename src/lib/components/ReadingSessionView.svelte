<script lang="ts">
  import { readingSessionStore } from '../stores/readingSessionStore';
  import { levelStore } from '../stores/levelStore';
  import { READING_LEVEL_INFOS } from '../data/readingLevels';
  import type { WordToken } from '../types/reading';

  $: session = $readingSessionStore;
  $: levelInfo = READING_LEVEL_INFOS[session.level || $levelStore];

  // Phase A has default syllable coloring enabled for child words
  $: isPhaseA = (session.level || $levelStore) <= 3;

  function shouldShowSyllables(token: WordToken): boolean {
    if (token.role !== 'child') return false;
    return isPhaseA || !!token.hasInterventionActive;
  }

  function handleWordClick(token: WordToken) {
    if (token.role === 'child' && session.turnState === 'CHILD_TURN' && token.id === session.activeWordTokenId) {
      readingSessionStore.advanceWordSuccess();
    }
  }

  function handleHelpClick(token: WordToken) {
    if (token.role === 'child') {
      readingSessionStore.triggerIntervention(token.id);
    }
  }
</script>

<div class="reading-session-view">
  <!-- Session Top Bar & Star Counter -->
  <div class="session-status-bar">
    <div class="level-indicator">
      <span class="level-tag">Stufe {session.level}: {levelInfo?.title}</span>
    </div>
    <div class="stars-counter">
      <span class="star-icon" aria-hidden="true">⭐</span>
      <span class="star-count">{session.starsEarned} Sterne</span>
    </div>
  </div>

  <!-- Turn State Banner -->
  {#if !session.isSessionComplete && session.sentences.length > 0}
    <div class="turn-banner turn-{session.turnState.toLowerCase()}">
      {#if session.turnState === 'APP_TURN'}
        <span class="turn-icon" aria-hidden="true">🔊</span>
        <span class="turn-text">Dein Begleiter liest vor...</span>
      {:else if session.turnState === 'CHILD_TURN'}
        <div class="child-turn-content">
          <div class="mic-listening-header">
            <span class="listening-otter" aria-hidden="true">🦦👂</span>
            <div class="listening-waves" aria-hidden="true">
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
            </div>
            <span class="turn-text"><strong>Ich höre dir zu!</strong> Lies das gelbe Wort laut vor.</span>
          </div>

          {#if session.lastSpokenTranscript}
            <div class="transcript-preview">
              <span class="preview-label">Gehört:</span> „{session.lastSpokenTranscript}“
            </div>
          {/if}

          {#if session.micError}
            <div class="mic-hint-badge" role="alert">
              <span>ℹ️ {session.micError}</span>
            </div>
          {/if}
        </div>
      {:else if session.turnState === 'REPEATED_READING'}
        <span class="turn-icon" aria-hidden="true">🔄</span>
        <span class="turn-text"><strong>Repeated Reading:</strong> Hör dir den ganzen Satz noch einmal an!</span>
      {:else if session.turnState === 'PAUSED'}
        <span class="turn-icon" aria-hidden="true">⏸️</span>
        <span class="turn-text">Pausiert</span>
      {:else}
        <span class="turn-icon" aria-hidden="true">📖</span>
        <span class="turn-text">Klicke auf "Vorlesen" oder lies selbst los!</span>
      {/if}
    </div>
  {/if}

  {#if session.isSessionComplete}
    <!-- Session Complete Celebration -->
    <div class="session-complete-card">
      <div class="trophy-icon" aria-hidden="true">🏆🎉</div>
      <h2 class="complete-title">Klasse gemacht!</h2>
      <p class="complete-subtitle">
        Du hast die gesamte Geschichte auf <strong>Stufe {session.level}</strong> gemeistert und
        <strong>{session.starsEarned} Sterne</strong> gesammelt!
      </p>
    </div>
  {/if}

  <!-- Sentences List -->
  <div class="sentences-list">
    {#each session.sentences as sentence, sIndex (sentence.id)}
      <section
        class="sentence-row"
        class:current-sentence={sIndex === session.activeSentenceIndex && !session.isSessionComplete}
        class:completed-sentence={sentence.isCompleted}
      >
        <!-- Repeated Reading Badge for Phase B -->
        {#if sentence.requiresRepeatedReading}
          <div class="repeated-reading-badge">
            <span class="badge-dot" aria-hidden="true">🔄</span>
            <span>Satz-Pionier (Repeated Reading)</span>
          </div>
        {/if}

        <!-- Word Tokens Container -->
        <p class="sentence-text">
          {#each sentence.words as token, wIndex (token.id)}
            <span
              id={`token-${token.id}`}
              class="word-token"
              class:role-child={token.role === 'child'}
              class:role-app={token.role === 'app'}
              class:is-pair-start={token.role === 'child' && wIndex < sentence.words.length - 1 && sentence.words[wIndex + 1].role === 'child' && (wIndex === 0 || sentence.words[wIndex - 1].role !== 'child')}
              class:is-pair-end={token.role === 'child' && wIndex > 0 && sentence.words[wIndex - 1].role === 'child' && (wIndex === sentence.words.length - 1 || sentence.words[wIndex + 1].role !== 'child')}
              class:is-pair-middle={token.role === 'child' && wIndex > 0 && sentence.words[wIndex - 1].role === 'child' && wIndex < sentence.words.length - 1 && sentence.words[wIndex + 1].role === 'child'}
              class:status-active={token.id === session.activeWordTokenId && session.turnState === 'CHILD_TURN'}
              class:flash-success={token.id === session.isSuccessFlashingTokenId}
              class:karaoke-active={token.id === session.karaokeWordTokenId}
              class:status-success={token.role === 'child' && token.status === 'success'}
              class:has-syllables={shouldShowSyllables(token)}
              on:click={() => handleWordClick(token)}
              role="button"
              tabindex="0"
              on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleWordClick(token)}
            >
              {#if shouldShowSyllables(token)}
                {#if token.syllables && token.syllables.length > 1}
                  {#each token.syllables as syl, sylIdx}
                    <span
                      class="syllable-part"
                      class:syl-blue={sylIdx % 2 === 0}
                      class:syl-red={sylIdx % 2 === 1}
                    >{syl}</span>
                  {/each}
                {:else}
                  <span class="syllable-part syl-blue">{token.word}</span>
                {/if}
              {:else}
                {token.word}
              {/if}

              {#if token.role === 'child' && token.status === 'success'}
                <span class="check-indicator" aria-hidden="true">✓</span>
              {/if}

              {#if token.role === 'child' && token.id === session.activeWordTokenId && session.turnState === 'CHILD_TURN' && !isPhaseA && !token.hasInterventionActive}
                <button
                  type="button"
                  class="btn-inline-help"
                  title="Silben-Hilfe aktivieren"
                  on:click|stopPropagation={() => handleHelpClick(token)}
                >
                  💡
                </button>
              {/if}
            </span>{' '}
          {/each}
        </p>
      </section>
    {/each}
  </div>
</div>

<style>
  .reading-session-view {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .session-status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.25rem;
  }

  .level-tag {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-primary, #2B6CB0);
    background: var(--color-primary-soft, #EBF2FA);
    padding: 0.35rem 0.75rem;
    border-radius: var(--radius-sm, 0.5rem);
    border: 1px solid var(--color-border, #E2D9CC);
  }

  .stars-counter {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--color-surface-soft, #EDE5D8);
    border: 1.5px solid var(--color-border, #E2D9CC);
    padding: 0.35rem 0.75rem;
    border-radius: 9999px;
    font-weight: 800;
    color: var(--color-accent-gold, #C05621);
    font-size: 1rem;
  }

  .star-icon {
    font-size: 1.15rem;
  }

  /* Turn State Banner */
  .turn-banner {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md, 0.875rem);
    font-size: 0.95rem;
    font-weight: 600;
    border: 1.5px solid var(--color-border, #E2D9CC);
    background: #FFFDF9;
    transition: all 0.25s ease;
  }

  .turn-banner.turn-app_turn {
    background: #EBF8FF;
    border-color: #bee3f8;
    color: #2b6cb0;
  }

  .turn-banner.turn-child_turn {
    background: #FFFAF0;
    border-color: #FBD38D;
    color: #9C4221;
    box-shadow: 0 4px 12px rgba(192, 86, 33, 0.12);
  }

  .child-turn-content {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    width: 100%;
  }

  .mic-listening-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .listening-otter {
    font-size: 1.4rem;
    display: inline-flex;
    animation: gentleWiggle 2s infinite ease-in-out;
  }

  /* Pulsating Audio Waves */
  .listening-waves {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    height: 18px;
  }

  .wave-bar {
    width: 3.5px;
    height: 8px;
    background: #DD6B20;
    border-radius: 3px;
    animation: wavePulse 1s infinite ease-in-out;
  }

  .wave-bar:nth-child(2) {
    animation-delay: 0.2s;
    height: 14px;
  }

  .wave-bar:nth-child(3) {
    animation-delay: 0.4s;
    height: 10px;
  }

  .transcript-preview {
    font-size: 0.85rem;
    color: #744210;
    background: #FEFCBF;
    padding: 0.25rem 0.6rem;
    border-radius: var(--radius-sm, 0.5rem);
    border: 1px dashed #D69E2E;
    align-self: flex-start;
  }

  .preview-label {
    font-weight: 700;
  }

  .mic-hint-badge {
    font-size: 0.8rem;
    color: #718096;
    background: var(--color-surface-soft, #EDE5D8);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }

  .turn-banner.turn-repeated_reading {
    background: #FAF5FF;
    border-color: #E9D8FD;
    color: #6B46C1;
  }

  .turn-icon {
    font-size: 1.25rem;
  }

  .session-complete-card {
    background: #F0FFF4;
    border: 2px solid var(--color-accent-green, #276749);
    border-radius: var(--radius-lg, 1.25rem);
    padding: 1.5rem;
    text-align: center;
    box-shadow: var(--shadow-warm, 0 4px 14px rgba(74, 85, 104, 0.08));
  }

  .trophy-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .complete-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.6rem;
    color: var(--color-accent-green, #276749);
    font-weight: 800;
  }

  .complete-subtitle {
    margin: 0;
    font-size: 1.15rem;
    color: #22543D;
    line-height: 1.5;
  }

  .sentences-list {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .sentence-row {
    background: var(--color-page-bg, #FBF9F5);
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-md, 0.875rem);
    padding: 1.25rem 1.5rem;
    transition: all 0.25s ease;
  }

  .sentence-row.current-sentence {
    border-color: var(--color-primary, #2B6CB0);
    box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.15);
    background: var(--color-surface-highlight, #FAF7F0);
  }

  .sentence-row.completed-sentence {
    border-color: var(--color-accent-green, #276749);
    background: #FAFDF7;
  }

  .repeated-reading-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: var(--color-surface-soft, #EDE5D8);
    color: var(--color-primary, #2B6CB0);
    font-size: 0.75rem;
    font-weight: 800;
    padding: 0.2rem 0.55rem;
    border-radius: 9999px;
    margin-bottom: 0.75rem;
    border: 1px solid var(--color-border, #E2D9CC);
  }

  .sentence-text {
    font-family: 'Andika', 'Lexend', sans-serif;
    font-size: 1.7rem;
    line-height: 1.9;
    letter-spacing: 0.02em;
    color: var(--color-text-main, #2D3748);
    margin: 0;
  }

  /* Word Tokens */
  .word-token {
    display: inline-block;
    padding: 0.1rem 0.35rem;
    margin: 0 0.05rem;
    border-radius: var(--radius-sm, 0.5rem);
    position: relative;
    transition: all 0.2s ease;
    cursor: default;
  }

  /* Role Child Token: Highlighted dashed badge style */
  .word-token.role-child {
    background: var(--color-surface-soft, #EDE5D8);
    border: 2px dashed var(--color-accent-gold, #C05621);
    color: var(--color-text-main, #2D3748);
    font-weight: 700;
    cursor: pointer;
  }

  /* Connected Word Pair (Level 2 Box) */
  .word-token.role-child.is-pair-start {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: none;
    margin-right: 0;
    padding-right: 0.2rem;
  }

  .word-token.role-child.is-pair-end {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: none;
    margin-left: 0;
    padding-left: 0.2rem;
  }

  .word-token.role-child.is-pair-middle {
    border-radius: 0;
    border-left: none;
    border-right: none;
    margin-left: 0;
    margin-right: 0;
    padding-left: 0.2rem;
    padding-right: 0.2rem;
  }

  /* Active Child Word Token: Soft warm pulsing glow */
  .word-token.status-active {
    background: #FEFCBF;
    border: 2.5px solid var(--color-accent-gold, #C05621);
    box-shadow: 0 0 14px rgba(192, 86, 33, 0.4);
    transform: scale(1.06);
    animation: pulseActive 1.6s infinite ease-in-out;
  }

  /* Syllable Colors */
  .syllable-part.syl-blue {
    color: #2B6CB0 !important;
    font-weight: 800;
  }

  .syllable-part.syl-red {
    color: #C53030 !important;
    font-weight: 800;
  }

  .btn-inline-help {
    font-size: 0.75rem;
    background: transparent;
    border: none;
    cursor: pointer;
    margin-left: 2px;
    padding: 0;
    vertical-align: super;
  }

  /* Instant Flash Success Animation */
  .word-token.flash-success {
    background: #48BB78 !important;
    color: #FFFFFF !important;
    border-color: #2F855A !important;
    box-shadow: 0 0 20px #48BB78 !important;
    transform: scale(1.15) !important;
    transition: all 0.15s ease-out !important;
  }

  .word-token.flash-success .syllable-part {
    color: #FFFFFF !important;
  }

  /* Karaoke Active Highlight: TTS reading */
  .word-token.karaoke-active {
    background-color: #FDE047 !important;
    color: #1A202C !important;
    border-radius: 0.35rem;
    box-shadow: 0 0 0 3px #FACC15 !important;
    font-weight: 700;
    transform: scale(1.06);
    transition: none !important;
    z-index: 2;
  }

  /* Success Word Token */
  .word-token.role-child.status-success {
    background: #C6F6D5;
    border: 2px solid var(--color-accent-green, #276749);
    color: #22543D;
    font-weight: 700;
  }

  .word-token.role-child.status-success .syllable-part {
    color: #22543D !important;
  }

  .check-indicator {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--color-accent-green, #276749);
    margin-left: 2px;
  }

  @keyframes pulseActive {
    0%, 100% {
      box-shadow: 0 0 6px rgba(192, 86, 33, 0.25);
    }
    50% {
      box-shadow: 0 0 16px rgba(192, 86, 33, 0.55);
    }
  }

  @keyframes wavePulse {
    0%, 100% {
      transform: scaleY(0.6);
      opacity: 0.7;
    }
    50% {
      transform: scaleY(1.3);
      opacity: 1;
    }
  }

  @keyframes gentleWiggle {
    0%, 100% {
      transform: rotate(0deg);
    }
    25% {
      transform: rotate(-5deg);
    }
    75% {
      transform: rotate(5deg);
    }
  }
</style>
