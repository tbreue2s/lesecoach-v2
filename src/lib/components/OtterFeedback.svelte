<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import { speakText } from '../utils/speech';

  export let message: string | null = null;
  export let type: 'error' | 'success' | 'idle' = 'idle';

  // Set of texts that were already automatically spoken (to avoid repeated speech)
  const autoSpokenTexts = new Set<string>();

  $: currentDisplayText = message
    ? message
    : type === 'success'
    ? 'Super! Dein Profil ist bereit zum Lesen!'
    : 'Hallo! Wie heißt du und wer soll mit dir lesen?';

  function playAudioManual() {
    // Clicking the speaker icon always reads out the current text on demand
    speakText(currentDisplayText);
  }

  function autoSpeakOnce(text: string) {
    if (!text || autoSpokenTexts.has(text)) {
      return;
    }
    autoSpokenTexts.add(text);
    speakText(text);
  }

  onMount(() => {
    autoSpeakOnce(currentDisplayText);
  });

  afterUpdate(() => {
    if (currentDisplayText) {
      autoSpeakOnce(currentDisplayText);
    }
  });
</script>

<div
  class="otter-container"
  class:shake={type === 'error'}
  class:success={type === 'success'}
>
  <div class="otter-avatar" aria-hidden="true">
    {#if type === 'error'}
      🦦❌
    {:else}
      🦦
    {/if}
  </div>

  <!-- Speaker button between Otter and text -->
  <button
    type="button"
    class="speaker-btn"
    title="Text vorlesen"
    aria-label="Text vorlesen"
    on:click={playAudioManual}
  >
    🔊
  </button>

  <div class="speech-bubble" role="alert" aria-live="polite">
    <p class="bubble-text">{currentDisplayText}</p>
  </div>
</div>

<style>
  .otter-container {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 1rem 1.25rem;
    background: var(--color-surface-card, #F5EFE6);
    border-radius: var(--radius-lg, 1.25rem);
    border: 2px solid var(--color-border, #E2D9CC);
    box-shadow: var(--shadow-warm, 0 4px 14px rgba(74, 85, 104, 0.08));
    margin-bottom: 1.5rem;
    transition: border-color 0.3s ease, background-color 0.3s ease;
  }

  .otter-avatar {
    font-size: 2.75rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    flex-shrink: 0;
  }

  .speaker-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    background: var(--color-page-bg, #FBF9F5);
    border: 1.5px solid var(--color-border, #E2D9CC);
    border-radius: 50%;
    width: 2.75rem;
    height: 2.75rem;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s ease;
    box-shadow: 0 2px 6px rgba(74, 85, 104, 0.08);
  }

  .speaker-btn:hover {
    background: var(--color-surface-soft, #EDE5D8);
    transform: scale(1.1);
    border-color: var(--color-primary, #2B6CB0);
  }

  .speaker-btn:active {
    transform: scale(0.95);
  }

  .speech-bubble {
    flex: 1;
    background: var(--color-page-bg, #FBF9F5);
    border-radius: var(--radius-md, 0.875rem);
    padding: 0.75rem 1rem;
    position: relative;
    border: 1.5px solid var(--color-border, #E2D9CC);
  }

  .speech-bubble::before {
    content: '';
    position: absolute;
    left: -8px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 8px solid var(--color-border, #E2D9CC);
  }

  .bubble-text {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text-main, #2D3748);
    line-height: 1.4;
  }

  /* Error state with head shaking animation */
  .otter-container.shake {
    border-color: var(--color-accent-red, #9B2C2C);
    background: #FFF5F5;
    animation: headShake 0.6s ease-in-out;
  }

  .otter-container.shake .speaker-btn {
    border-color: #FEB2B2;
    background: #FED7D7;
  }

  .otter-container.shake .speech-bubble {
    background: #FED7D7;
    border-color: #FEB2B2;
  }

  .otter-container.shake .speech-bubble::before {
    border-right-color: #FEB2B2;
  }

  .otter-container.shake .bubble-text {
    color: #9B2C2C;
  }

  /* Success state */
  .otter-container.success {
    border-color: var(--color-accent-green, #276749);
    background: #F0FFF4;
  }

  .otter-container.success .speaker-btn {
    border-color: #9AE6B4;
    background: #C6F6D5;
  }

  .otter-container.success .speech-bubble {
    background: #C6F6D5;
    border-color: #9AE6B4;
  }

  .otter-container.success .speech-bubble::before {
    border-right-color: #9AE6B4;
  }

  .otter-container.success .bubble-text {
    color: #22543D;
  }

  @keyframes headShake {
    0% {
      transform: translateX(0);
    }
    15% {
      transform: translateX(-8px) rotate(-4deg);
    }
    30% {
      transform: translateX(8px) rotate(4deg);
    }
    45% {
      transform: translateX(-6px) rotate(-2deg);
    }
    60% {
      transform: translateX(6px) rotate(2deg);
    }
    75% {
      transform: translateX(-3px) rotate(-1deg);
    }
    100% {
      transform: translateX(0);
    }
  }
</style>
