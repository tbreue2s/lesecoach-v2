<script lang="ts">
  import { readingSessionStore } from '../stores/readingSessionStore';
  import { levelStore } from '../stores/levelStore';
  import { READING_LEVEL_INFOS } from '../data/readingLevels';

  $: session = $readingSessionStore;
  $: levelInfo = READING_LEVEL_INFOS[session.level || $levelStore];
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
          {#each sentence.words as token (token.id)}
            <span
              class="word-token"
              class:role-child={token.role === 'child'}
              class:role-app={token.role === 'app'}
              class:status-active={token.status === 'active' && sIndex === session.activeSentenceIndex}
              class:status-success={token.status === 'success'}
            >
              {token.word}
              {#if token.status === 'success' && token.role === 'child'}
                <span class="check-indicator" aria-hidden="true">✓</span>
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
  }

  /* Role Child Token: Highlighted badge style */
  .word-token.role-child {
    background: var(--color-surface-soft, #EDE5D8);
    border: 2px dashed var(--color-accent-gold, #C05621);
    color: var(--color-text-main, #2D3748);
    font-weight: 700;
  }

  /* Active Word Token */
  .word-token.status-active {
    background: #FEFCBF;
    border: 2.5px solid var(--color-accent-gold, #C05621);
    box-shadow: 0 0 12px rgba(192, 86, 33, 0.35);
    transform: scale(1.06);
    animation: pulseActive 1.8s infinite ease-in-out;
  }

  /* Success Word Token */
  .word-token.status-success {
    background: #C6F6D5;
    border: 2px solid var(--color-accent-green, #276749);
    color: #22543D;
    font-weight: 700;
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
      box-shadow: 0 0 14px rgba(192, 86, 33, 0.5);
    }
  }
</style>
