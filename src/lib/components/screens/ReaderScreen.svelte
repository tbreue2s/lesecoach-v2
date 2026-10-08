<script lang="ts">
  import { profileStore } from '../../stores/profileStore';
  import { routerStore } from '../../stores/routerStore';
  import { speakText } from '../../utils/speech';

  $: activeCompanion = $profileStore.companions.find(
    (c) => c.id === $profileStore.selectedCompanionId
  ) || $profileStore.companions[0];

  $: childName = $profileStore.childName || 'Lese-Held';

  // Sample story sentence for reader layout scaffold
  const sampleSentence = `Der kleine Hund ${activeCompanion.customName} läuft fröhlich über die grüne Wiese.`;

  let isReading = false;

  function handleReadAloud() {
    isReading = true;
    speakText(sampleSentence);
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
      <span class="companion-title">{activeCompanion.customName} liest mit</span>
    </div>
  </header>

  <!-- Centered Book-Page Reading Container -->
  <main class="book-container">
    <div class="book-page">
      <div class="story-meta">
        <span class="level-tag">Klasse 1 & 2 • Fibel-Lesestufe</span>
        <h1 class="story-title">🐾 Ein schöner Tag im Park</h1>
      </div>

      <!-- Reader Text with Primer Font (Andika / Lexend), 28px+, 1.8 Line Height -->
      <article class="reader-content-box" aria-label="Lesetext">
        <p class="reader-text">
          {sampleSentence}
        </p>
      </article>

      <!-- Reader Interaction Bar -->
      <footer class="reader-controls">
        <button
          type="button"
          id="reader-speak-btn"
          class="btn-read-aloud"
          on:click={handleReadAloud}
        >
          <span class="btn-icon" aria-hidden="true">🔊</span>
          <span class="btn-label">Satz vorlesen</span>
        </button>
      </footer>
    </div>
  </main>
</div>

<style>
  .reader-screen {
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .reader-nav-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0.5rem;
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
    gap: 0.5rem;
    background: var(--color-surface-card, #F5EFE6);
    border: 1.5px solid var(--color-border, #E2D9CC);
    padding: 0.4rem 0.85rem;
    border-radius: 9999px;
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--color-text-main, #2D3748);
  }

  .companion-emoji {
    font-size: 1.35rem;
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
    margin-bottom: 1.75rem;
  }

  .level-tag {
    display: inline-block;
    background: var(--color-surface-soft, #EDE5D8);
    color: var(--color-primary, #2B6CB0);
    font-size: 0.85rem;
    font-weight: 700;
    padding: 0.3rem 0.75rem;
    border-radius: 9999px;
    margin-bottom: 0.5rem;
    border: 1px solid var(--color-border, #E2D9CC);
  }

  .story-title {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--color-text-main, #2D3748);
  }

  .reader-content-box {
    background: var(--color-page-bg, #FBF9F5);
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-md, 0.875rem);
    padding: 2rem 1.75rem;
    margin: 1.5rem 0;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.03);
  }

  /* Elementary Grade 1-2 Primer Typography: Andika/Lexend, 28px, 1.8 line height */
  .reader-text {
    font-family: 'Andika', 'Lexend', sans-serif;
    font-size: 1.75rem;
    line-height: 1.8;
    letter-spacing: 0.02em;
    color: var(--color-text-main, #2D3748);
    font-weight: 600;
    margin: 0;
    text-align: left;
  }

  .reader-controls {
    display: flex;
    justify-content: center;
    margin-top: 1.5rem;
  }

  .btn-read-aloud {
    background: var(--color-primary, #2B6CB0);
    color: var(--color-page-bg, #FBF9F5);
    border: none;
    padding: 1rem 1.75rem;
    font-size: 1.25rem;
    font-weight: 800;
    border-radius: var(--radius-md, 0.875rem);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    box-shadow: 0 4px 14px rgba(43, 108, 176, 0.3);
    transition: all 0.2s ease;
  }

  .btn-read-aloud:hover {
    background: var(--color-primary-hover, #23568B);
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(43, 108, 176, 0.4);
  }

  .btn-read-aloud:active {
    transform: translateY(0);
  }

  .btn-icon {
    font-size: 1.5rem;
  }
</style>
