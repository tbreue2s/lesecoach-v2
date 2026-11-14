<script lang="ts">
  import { readingSessionStore } from '../stores/readingSessionStore';
  import { levelStore } from '../stores/levelStore';
  import type { WordToken } from '../types/reading';

  $: session = $readingSessionStore;

  // Phase A has default syllable coloring enabled for child words
  $: isPhaseA = (session.level || $levelStore) <= 3;

  let lastScrolledSentenceIndex = -1;

  function scrollToSentence(index: number, force = false) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!force && index === lastScrolledSentenceIndex) return;
    lastScrolledSentenceIndex = index;

    setTimeout(() => {
      const el = document.getElementById(`sentence-row-${index}`);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
    }, 60);
  }

  $: if (!session.isSessionComplete && session.activeSentenceIndex !== undefined) {
    scrollToSentence(session.activeSentenceIndex);
  }

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
  {#if session.isSessionComplete}
    <!-- Session Complete Celebration Card -->
    <div class="session-complete-card">
      <div class="trophy-icon" aria-hidden="true">🏆🎉</div>
      <h2 class="complete-title">Klasse gemacht!</h2>
      <p class="complete-subtitle">
        Du hast die gesamte Geschichte auf <strong>Stufe {session.level}</strong> gemeistert und
        <strong>{session.starsEarned} Sterne</strong> gesammelt!
      </p>
    </div>
  {/if}

  <!-- Sentences List with Teleprompter Focus Scroll -->
  <div class="sentences-list">
    {#each session.sentences as sentence, sIndex (sentence.id)}
      <section
        id={`sentence-row-${sIndex}`}
        class="sentence-row"
        class:is-phase-a={isPhaseA}
        class:current-sentence={sIndex === session.activeSentenceIndex && !session.isSessionComplete}
        class:completed-sentence={sIndex < session.activeSentenceIndex || sentence.isCompleted}
        class:upcoming-sentence={sIndex > session.activeSentenceIndex && !session.isSessionComplete}
        aria-label={`Satz ${sIndex + 1}`}
      >
        <!-- Repeated Reading Badge for Phase B -->
        {#if sentence.requiresRepeatedReading}
          <div class="repeated-reading-badge">
            <span class="badge-dot" aria-hidden="true">🔄</span>
            <span>Gemeinsam-Satz</span>
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
              class:flash-success={Boolean(session.isSuccessFlashingTokenId && session.isSuccessFlashingTokenId.split(',').includes(token.id))}
              class:karaoke-active={token.id === session.karaokeWordTokenId}
              class:status-success={token.role === 'child' && token.status === 'success'}
              class:has-syllables={shouldShowSyllables(token)}
              on:click|stopPropagation={() => handleWordClick(token)}
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
    gap: 1rem;
    width: 100%;
  }

  .session-complete-card {
    background: #F0FFF4;
    border: 2px solid var(--color-accent-green, #276749);
    border-radius: var(--radius-lg, 1.25rem);
    padding: 1.5rem;
    text-align: center;
    box-shadow: var(--shadow-warm, 0 4px 14px rgba(74, 85, 104, 0.08));
    margin-bottom: 1rem;
    animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
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
    gap: 1.15rem;
    padding-top: 0.5rem;
    padding-bottom: 25vh; /* Provides teleprompter scroll room for the last sentences */
  }

  .sentence-row {
    background: var(--color-page-bg, #FBF9F5);
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-md, 0.875rem);
    padding: 1.15rem 1.4rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
  }

  /* Current Active Sentence in Focus */
  .sentence-row.current-sentence {
    border-color: var(--color-primary, #2B6CB0);
    box-shadow: 0 4px 18px rgba(43, 108, 176, 0.16);
    background: var(--color-surface-highlight, #FAF7F0);
    transform: scale(1.02);
    opacity: 1;
    position: relative;
    z-index: 2;
  }

  /* Completed sentences step back gracefully */
  .sentence-row.completed-sentence {
    border-color: #D6E4D0;
    background: #F9FDF7;
    opacity: 0.55;
    transform: scale(0.99);
  }

  .sentence-row.completed-sentence:hover {
    opacity: 0.85;
  }

  /* Upcoming sentences remain readable but soft */
  .sentence-row.upcoming-sentence {
    opacity: 0.45;
    background: #FAF8F4;
    border-color: #EAE3D7;
  }

  .sentence-row.upcoming-sentence:hover {
    opacity: 0.75;
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
    margin-bottom: 0.6rem;
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

  @media (max-width: 600px) {
    .sentence-text {
      font-size: 1.45rem;
      line-height: 1.8;
    }
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

  /* Role Child Token: Default readable book text (Schiefergrau) */
  .word-token.role-child {
    color: var(--color-text-main, #2D3748);
    font-weight: 500;
    cursor: pointer;
  }

  /* Phase A (L1-L3): Highlighted dashed badge style for target child words */
  .sentence-row.is-phase-a .word-token.role-child {
    background: var(--color-surface-soft, #EDE5D8);
    border: 2px dashed var(--color-accent-gold, #C05621);
    font-weight: 700;
  }

  /* Connected Word Pair in Phase A (Level 2 Shared Seamless Box) */
  .sentence-row.is-phase-a .word-token.role-child.is-pair-start {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: none;
    margin-right: -0.3rem;
    padding-right: 0.35rem;
  }

  .sentence-row.is-phase-a .word-token.role-child.is-pair-end {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: none;
    margin-left: 0;
    padding-left: 0.35rem;
  }

  .sentence-row.is-phase-a .word-token.role-child.is-pair-middle {
    border-radius: 0;
    border-left: none;
    border-right: none;
    margin-left: 0;
    margin-right: -0.3rem;
    padding-left: 0.2rem;
    padding-right: 0.35rem;
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
    0%, 100% { box-shadow: 0 0 6px rgba(192, 86, 33, 0.25); }
    50% { box-shadow: 0 0 16px rgba(192, 86, 33, 0.55); }
  }

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
