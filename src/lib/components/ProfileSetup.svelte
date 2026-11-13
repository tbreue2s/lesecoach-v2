<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { profileStore } from '../stores/profileStore';
  import { routerStore } from '../stores/routerStore';
  import { storyConfigStore } from '../stores/storyConfigStore';
  import { validateName } from '../utils/validation';
  import { getAvailableGermanVoices } from '../services/speechService';
  import {
    testAudioEngineVoice,
    ensurePiperInitialized,
    resetAudioOverrides,
    PIPER_VOICES,
  } from '../services/audioEngineService';
  import type { AudioEngineType, PiperVoiceId } from '../types/profile';
  import OtterFeedback from './OtterFeedback.svelte';

  export let showBackButton = false;

  let rawChildName = $profileStore.childName;
  let childError: string | null = null;
  let companionError: string | null = null;
  let isSavedSuccess = false;
  let availableVoices: SpeechSynthesisVoice[] = [];
  let selectedVoiceURI = $profileStore.preferredVoiceURI || '';

  let childDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let companionDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  function clearChildDebounce() {
    if (childDebounceTimer !== null) {
      clearTimeout(childDebounceTimer);
      childDebounceTimer = null;
    }
  }

  function clearCompanionDebounce() {
    if (companionDebounceTimer !== null) {
      clearTimeout(companionDebounceTimer);
      companionDebounceTimer = null;
    }
  }

  onDestroy(() => {
    clearChildDebounce();
    clearCompanionDebounce();
  });

  $: activeCompanion = $profileStore.companions.find(
    (c) => c.id === $profileStore.selectedCompanionId
  ) || $profileStore.companions[0];

  function handleChildNameInput(event: Event) {
    const target = event.target as HTMLInputElement;
    rawChildName = target.value;
    profileStore.setChildName(rawChildName);
    isSavedSuccess = false;

    clearChildDebounce();

    if (rawChildName.trim().length === 0) {
      childError = null;
      return;
    }

    const validation = validateName(rawChildName);
    if (validation.isValid) {
      childError = null;
    } else {
      // 1500ms debounce: do not pop up error message immediately while typing
      childDebounceTimer = setTimeout(() => {
        const freshValidation = validateName(rawChildName);
        childError = freshValidation.isValid ? null : freshValidation.errorMessage;
      }, 1500);
    }
  }

  function handleChildNameBlur() {
    clearChildDebounce();
    if (rawChildName.trim().length > 0) {
      const validation = validateName(rawChildName);
      childError = validation.isValid ? null : validation.errorMessage;
    }
  }

  function handleSelectCompanion(id: string) {
    profileStore.selectCompanion(id);
    const comp = $profileStore.companions.find((c) => c.id === id);
    if (comp) {
      const validation = validateName(comp.customName);
      companionError = validation.isValid ? null : validation.errorMessage;
    }
    isSavedSuccess = false;
  }

  function handleCompanionNameInput(id: string, event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    profileStore.updateCompanionName(id, value);
    isSavedSuccess = false;

    clearCompanionDebounce();

    if (value.trim().length === 0) {
      companionError = null;
      return;
    }

    const validation = validateName(value);
    if (validation.isValid) {
      companionError = null;
    } else {
      companionDebounceTimer = setTimeout(() => {
        const comp = $profileStore.companions.find((c) => c.id === id);
        const curVal = comp ? comp.customName : value;
        const freshVal = validateName(curVal);
        companionError = freshVal.isValid ? null : freshVal.errorMessage;
      }, 1500);
    }
  }

  function handleCompanionNameBlur(id: string) {
    clearCompanionDebounce();
    const comp = $profileStore.companions.find((c) => c.id === id);
    if (comp && comp.customName.trim().length > 0) {
      const validation = validateName(comp.customName);
      companionError = validation.isValid ? null : validation.errorMessage;
    }
  }

  function handleSaveProfile() {
    clearChildDebounce();
    clearCompanionDebounce();

    const childVal = validateName(rawChildName);
    if (!childVal.isValid) {
      childError = childVal.errorMessage;
      return;
    }

    if (activeCompanion) {
      const compVal = validateName(activeCompanion.customName);
      if (!compVal.isValid) {
        companionError = compVal.errorMessage;
        return;
      }
    }

    const ok = profileStore.saveProfile();
    if (ok) {
      resetAudioOverrides();
      if ($profileStore.audioEngine === 'studio-audio') {
        storyConfigStore.selectTheme('theme_forest');
        storyConfigStore.setLevel(1);
      }
      isSavedSuccess = true;
      childError = null;
      companionError = null;
      // Navigate to Home screen on save
      setTimeout(() => {
        routerStore.goHome();
      }, 500);
    }
  }

  function updateVoiceList() {
    availableVoices = getAvailableGermanVoices();
    if (!selectedVoiceURI && $profileStore.preferredVoiceURI) {
      selectedVoiceURI = $profileStore.preferredVoiceURI;
    }
  }

  onMount(() => {
    updateVoiceList();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        updateVoiceList();
      };
    }
    if (($profileStore.audioEngine || 'thorsten-pwa') === 'thorsten-pwa') {
      ensurePiperInitialized($profileStore.selectedPiperVoice || 'de_DE-thorsten-medium').catch(() => {});
    }
  });

  function handleSelectAudioEngine(engine: AudioEngineType) {
    profileStore.setAudioEngine(engine);
    resetAudioOverrides();
    if (engine === 'studio-audio') {
      storyConfigStore.selectTheme('theme_forest');
      storyConfigStore.setLevel(1);
    } else if (engine === 'thorsten-pwa') {
      ensurePiperInitialized($profileStore.selectedPiperVoice || 'de_DE-thorsten-medium').catch(() => {});
    }
  }

  function handleSelectPiperVoice(voiceId: PiperVoiceId) {
    profileStore.setPiperVoice(voiceId);
    resetAudioOverrides();
    ensurePiperInitialized(voiceId).catch(() => {});
  }

  function handleVoiceChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedVoiceURI = target.value;
    profileStore.setPreferredVoiceURI(selectedVoiceURI || undefined);
    if (typeof window !== 'undefined' && window.localStorage) {
      if (selectedVoiceURI) {
        localStorage.setItem('lesecoach_tts_preferred_voice', selectedVoiceURI);
      } else {
        localStorage.removeItem('lesecoach_tts_preferred_voice');
      }
    }
    handleTestVoice();
  }

  function handleTestVoice(engine?: AudioEngineType, voiceId?: string) {
    const compName = activeCompanion ? activeCompanion.customName : 'dein Begleiter';
    const childGreeting = rawChildName ? `Hallo ${rawChildName}!` : 'Hallo!';
    const text = `${childGreeting} Ich bin ${compName}. Lass uns zusammen lesen!`;
    const eng = engine || $profileStore.audioEngine || 'thorsten-pwa';
    const activeVoice =
      voiceId ||
      (eng === 'thorsten-pwa'
        ? $profileStore.selectedPiperVoice
        : eng === 'studio-audio'
          ? $profileStore.selectedStudioVoice
          : selectedVoiceURI);

    testAudioEngineVoice(eng, activeVoice, text);
  }


  $: currentFeedbackMessage = childError || companionError;
  $: feedbackType = (currentFeedbackMessage ? 'error' : isSavedSuccess ? 'success' : 'idle') as 'success' | 'error' | 'idle';
</script>

<div class="profile-card">
  {#if showBackButton}
    <div class="top-nav">
      <button
        type="button"
        class="back-btn"
        on:click={() => routerStore.goHome()}
      >
        ← Zurück zur Übersicht
      </button>
    </div>
  {/if}

  <header class="card-header">
    <h1 class="title">✨ Wer liest heute mit? ✨</h1>
    <p class="subtitle">Richte dein persönliches Lese-Profil ein</p>
  </header>

  <!-- Otter feedback with head-shake on error & speech playback -->
  <OtterFeedback message={currentFeedbackMessage} type={feedbackType} />

  <!-- Child Name Section -->
  <section class="section" aria-labelledby="child-name-heading">
    <label id="child-name-heading" for="child-name-input" class="label">
      1. Wie heißt du? (Dein Vorname)
    </label>
    <div class="input-wrapper">
      <input
        id="child-name-input"
        type="text"
        class="text-input"
        class:input-error={Boolean(childError)}
        placeholder="z. B. Anna oder Jonas"
        value={rawChildName}
        on:input={handleChildNameInput}
        on:blur={handleChildNameBlur}
        maxlength={20}
        autocomplete="off"
        spellcheck="false"
      />
    </div>
  </section>

  <!-- Companion Picker Section -->
  <section class="section" aria-labelledby="companion-heading">
    <h2 id="companion-heading" class="label">
      2. Wähle deinen Begleiter (genau 1 Begleiter)
    </h2>
    <div class="companion-grid" role="radiogroup" aria-label="Lese-Begleiter Auswahl">
      {#each $profileStore.companions as companion (companion.id)}
        <button
          type="button"
          class="companion-tile"
          class:selected={$profileStore.selectedCompanionId === companion.id}
          on:click={() => handleSelectCompanion(companion.id)}
          role="radio"
          aria-checked={$profileStore.selectedCompanionId === companion.id}
        >
          <span class="companion-icon" aria-hidden="true">{companion.icon}</span>
          <span class="companion-default-label">{companion.defaultName}</span>
          {#if $profileStore.selectedCompanionId === companion.id}
            <span class="selected-badge" aria-hidden="true">✓ Aktiv</span>
          {/if}
        </button>
      {/each}
    </div>
  </section>

  <!-- Custom Companion Name Section -->
  {#if activeCompanion}
    <section class="section companion-custom-section" aria-labelledby="companion-name-heading">
      <label id="companion-name-heading" for="companion-name-input" class="label">
        3. Name deines Begleiters ({activeCompanion.icon} {activeCompanion.defaultName}):
      </label>
      <div class="input-wrapper">
        <input
          id="companion-name-input"
          type="text"
          class="text-input"
          class:input-error={Boolean(companionError)}
          placeholder="Wie soll dein Begleiter heißen?"
          value={activeCompanion.customName}
          on:input={(e) => handleCompanionNameInput(activeCompanion.id, e)}
          on:blur={() => handleCompanionNameBlur(activeCompanion.id)}
          maxlength={20}
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </section>
  {/if}

  <!-- 4. Voice & Audio Engine Selection Section -->
  <section class="section" aria-labelledby="voice-heading">
    <div class="voice-header-row">
      <h2 id="voice-heading" class="label">
        4. Vorlese-Technologie & Stimme für {activeCompanion ? activeCompanion.customName : 'deinen Begleiter'}
      </h2>
      <button
        type="button"
        id="test-voice-btn"
        class="btn-test-voice"
        title="Aktive Stimme anhören"
        on:click={() => handleTestVoice()}
      >
        🔊 Probe hören
      </button>
    </div>

    <!-- 3-way Audio Engine Choice Cards -->
    <div class="engine-choice-cards" role="radiogroup" aria-label="Vorlese-Technologie">
      <button
        type="button"
        class="engine-card"
        class:selected={($profileStore.audioEngine || 'thorsten-pwa') === 'thorsten-pwa'}
        on:click={() => handleSelectAudioEngine('thorsten-pwa')}
        role="radio"
        aria-checked={($profileStore.audioEngine || 'thorsten-pwa') === 'thorsten-pwa'}
      >
        <span class="engine-card-icon">⚡</span>
        <div class="engine-card-text">
          <strong class="engine-card-title">PWA Offline-Stimmen (Piper WebAssembly)</strong>
          <span class="engine-card-desc">100% Offline in PWA, natürliche Stimmen (Thorsten & Kerstin)</span>
        </div>
      </button>

      <button
        type="button"
        class="engine-card"
        class:selected={$profileStore.audioEngine === 'system-tts'}
        on:click={() => handleSelectAudioEngine('system-tts')}
        role="radio"
        aria-checked={$profileStore.audioEngine === 'system-tts'}
      >
        <span class="engine-card-icon">📱</span>
        <div class="engine-card-text">
          <strong class="engine-card-title">Geräte-Stimme (System-TTS)</strong>
          <span class="engine-card-desc">Standard Web Speech API deines Smartphones oder Browsers</span>
        </div>
      </button>
    </div>

    {#if ($profileStore.audioEngine || 'thorsten-pwa') === 'thorsten-pwa'}
      <div class="voice-sub-selector">
        <span class="sublabel">Wähle deine Offline-Stimme:</span>
        <div class="voice-chips-grid">
          {#each PIPER_VOICES as pv}
            <div
              class="voice-chip-card"
              class:selected={($profileStore.selectedPiperVoice || 'de_DE-thorsten-medium') === pv.id}
            >
              <button
                type="button"
                class="btn-voice-chip"
                on:click={() => handleSelectPiperVoice(pv.id)}
              >
                <span class="voice-chip-icon">{pv.gender === 'female' ? '👧' : '👦'}</span>
                <div class="voice-chip-info">
                  <div class="voice-chip-title-row">
                    <strong>{pv.label}</strong>
                    <span class="voice-chip-size-tag">{pv.size}</span>
                  </div>
                  <span class="voice-chip-desc">{pv.desc}</span>
                </div>
              </button>
              <button
                type="button"
                class="btn-chip-sample"
                title="{pv.label} probe hören"
                on:click={() => handleTestVoice('thorsten-pwa', pv.id)}
              >
                🔊 Probe
              </button>
            </div>
          {/each}
        </div>
      </div>
    {:else if $profileStore.audioEngine === 'system-tts'}
      <div class="system-voice-picker-wrapper">
        <label for="voice-select" class="sublabel">Wähle die Stimme deines Betriebssystems:</label>
        {#if availableVoices.length > 0}
          <div class="input-wrapper">
            <select
              id="voice-select"
              class="voice-select"
              value={selectedVoiceURI}
              on:change={handleVoiceChange}
            >
              <option value="">✨ Automatisch beste natürliche Stimme (Empfohlen)</option>
              {#each availableVoices as v}
                <option value={v.voiceURI || v.name}>
                  {v.name} {v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('enhanced') || v.name.toLowerCase().includes('google') ? '⭐ (Empfohlen)' : ''}
                </option>
              {/each}
            </select>
          </div>
        {:else}
          <p class="voice-hint">✨ Die beste deutsche Vorlese-Stimme deines Geräts wird automatisch verwendet.</p>
        {/if}
      </div>
    {/if}
  </section>

  <!-- Action Button -->
  <footer class="action-footer">
    <button
      type="button"
      id="save-profile-btn"
      class="save-btn"
      on:click={handleSaveProfile}
    >
      🚀 Los geht's – Profil speichern!
    </button>
  </footer>
</div>

<style>
  .profile-card {
    max-width: 640px;
    margin: 0 auto;
    background: var(--color-surface-card, #F5EFE6);
    border-radius: var(--radius-lg, 1.25rem);
    padding: 2rem;
    box-shadow: var(--shadow-warm-lg, 0 10px 25px rgba(74, 85, 104, 0.12));
    border: 2px solid var(--color-border, #E2D9CC);
  }

  .top-nav {
    margin-bottom: 1rem;
  }

  .back-btn {
    background: var(--color-page-bg, #FBF9F5);
    border: 1.5px solid var(--color-border, #E2D9CC);
    color: var(--color-primary, #2B6CB0);
    padding: 0.5rem 0.85rem;
    font-size: 0.95rem;
    font-weight: 700;
    border-radius: var(--radius-sm, 0.5rem);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .back-btn:hover {
    background: var(--color-surface-soft, #EDE5D8);
  }

  .card-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .title {
    font-size: 1.85rem;
    font-weight: 800;
    color: var(--color-text-main, #2D3748);
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    font-size: 1.05rem;
    color: var(--color-text-muted, #4A5568);
    margin: 0;
  }

  .section {
    margin-bottom: 1.25rem;
  }

  .label {
    display: block;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--color-text-main, #2D3748);
    margin-bottom: 0.6rem;
  }

  .input-wrapper {
    position: relative;
  }

  .text-input {
    width: 100%;
    box-sizing: border-box;
    font-size: 1.25rem;
    font-weight: 600;
    padding: 0.85rem 1.15rem;
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-md, 0.875rem);
    outline: none;
    background: var(--color-page-bg, #FBF9F5);
    color: var(--color-text-main, #2D3748);
    transition: all 0.2s ease;
  }

  .text-input:focus {
    border-color: var(--color-primary, #2B6CB0);
    background: var(--color-surface-highlight, #FAF7F0);
    box-shadow: 0 0 0 4px rgba(43, 108, 176, 0.15);
  }

  .text-input.input-error {
    border-color: var(--color-accent-red, #9B2C2C);
    background: #FFF5F5;
  }

  .companion-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.85rem;
  }

  @media (max-width: 600px) {
    .companion-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 420px) {
    .companion-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .companion-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem 0.5rem;
    background: var(--color-page-bg, #FBF9F5);
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-md, 0.875rem);
    cursor: pointer;
    position: relative;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .companion-tile:hover {
    transform: translateY(-2px);
    border-color: var(--color-primary, #2B6CB0);
    background: var(--color-surface-highlight, #FAF7F0);
  }

  .companion-tile.selected {
    border-color: var(--color-primary, #2B6CB0);
    background: var(--color-primary-soft, #EBF2FA);
    box-shadow: 0 4px 14px rgba(43, 108, 176, 0.2);
    transform: scale(1.02);
  }

  .companion-icon {
    font-size: 2.5rem;
    margin-bottom: 0.35rem;
  }

  .companion-default-label {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-text-main, #2D3748);
  }

  .selected-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    font-size: 0.7rem;
    font-weight: 800;
    background: var(--color-primary, #2B6CB0);
    color: var(--color-page-bg, #FBF9F5);
    padding: 2px 6px;
    border-radius: 6px;
  }

  .companion-custom-section {
    background: var(--color-surface-soft, #EDE5D8);
    padding: 1.25rem;
    border-radius: var(--radius-md, 0.875rem);
    border: 1.5px dashed var(--color-border, #E2D9CC);
  }

  .voice-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.6rem;
    flex-wrap: wrap;
  }

  .btn-test-voice {
    background: var(--color-primary-soft, #EBF2FA);
    border: 1.5px solid var(--color-primary, #2B6CB0);
    color: var(--color-primary, #2B6CB0);
    padding: 0.4rem 0.75rem;
    font-size: 0.9rem;
    font-weight: 700;
    border-radius: var(--radius-sm, 0.5rem);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-test-voice:hover {
    background: #D9EAFB;
    transform: translateY(-1px);
  }

  .voice-select {
    width: 100%;
    box-sizing: border-box;
    font-size: 1.05rem;
    font-weight: 600;
    padding: 0.8rem 1rem;
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-md, 0.875rem);
    outline: none;
    background: var(--color-page-bg, #FBF9F5);
    color: var(--color-text-main, #2D3748);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .voice-select:focus {
    border-color: var(--color-primary, #2B6CB0);
    box-shadow: 0 0 0 4px rgba(43, 108, 176, 0.15);
  }

  .voice-hint {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-text-muted, #4A5568);
    font-style: italic;
  }

  /* Engine Choice Cards */
  .engine-choice-cards {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    margin-bottom: 0.85rem;
  }

  .engine-card {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-radius: var(--radius-md, 0.875rem);
    border: 2px solid var(--color-border, #E2D9CC);
    background: var(--color-page-bg, #FBF9F5);
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .engine-card:hover {
    background: #F5EFE6;
    border-color: #CBD5E0;
    transform: translateY(-1px);
  }

  .engine-card.selected {
    border-color: var(--color-primary, #2B6CB0);
    background: #EBF8FF;
    box-shadow: 0 4px 12px rgba(43, 108, 176, 0.15);
  }

  .engine-card-icon {
    font-size: 1.6rem;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .engine-card-text {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .engine-card-title {
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-text-main, #2D3748);
  }

  .engine-card-desc {
    font-size: 0.85rem;
    color: var(--color-text-muted, #4A5568);
    line-height: 1.35;
  }

  .system-voice-picker-wrapper {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .sublabel {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text-main, #2D3748);
  }

  .voice-sub-selector {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .voice-chips-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  @media (min-width: 520px) {
    .voice-chips-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .voice-chip-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem;
    background: var(--color-page-bg, #FBF9F5);
    border: 1.5px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-md, 0.75rem);
    transition: all 0.2s ease;
  }

  .voice-chip-card.selected {
    border-color: var(--color-primary, #2B6CB0);
    background: #EBF8FF;
    box-shadow: 0 2px 8px rgba(43, 108, 176, 0.15);
  }

  .btn-voice-chip {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    padding: 0;
  }

  .voice-chip-icon {
    font-size: 1.4rem;
    flex-shrink: 0;
  }

  .voice-chip-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .voice-chip-title-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .voice-chip-size-tag {
    font-size: 0.7rem;
    font-weight: 700;
    background: #E2E8F0;
    color: #4A5568;
    padding: 0.1rem 0.35rem;
    border-radius: 0.3rem;
  }

  .voice-chip-desc {
    font-size: 0.75rem;
    color: var(--color-text-muted, #4A5568);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .btn-chip-sample {
    flex-shrink: 0;
    background: #FFF;
    border: 1.5px solid var(--color-primary, #2B6CB0);
    color: var(--color-primary, #2B6CB0);
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.35rem 0.6rem;
    border-radius: var(--radius-sm, 0.4rem);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-chip-sample:hover {
    background: var(--color-primary-soft, #EBF2FA);
    transform: scale(1.03);
  }

  .action-footer {
    margin-top: 1.5rem;
    position: sticky;
    bottom: 0.75rem;
    z-index: 10;
    text-align: center;
  }

  .save-btn {
    width: 100%;
    padding: 1.15rem 1.5rem;
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--color-page-bg, #FBF9F5);
    background: var(--color-primary, #2B6CB0);
    border: none;
    border-radius: var(--radius-md, 0.875rem);
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(43, 108, 176, 0.3);
    transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
  }

  .save-btn:hover {
    background: var(--color-primary-hover, #23568B);
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgba(43, 108, 176, 0.4);
  }

  .save-btn:active {
    transform: translateY(0);
  }
</style>
