<script lang="ts">
  import { profileStore } from '../stores/profileStore';
  import { validateName } from '../utils/validation';
  import OtterFeedback from './OtterFeedback.svelte';

  let rawChildName = $profileStore.childName;
  let childError: string | null = null;
  let companionError: string | null = null;
  let isSavedSuccess = false;

  $: activeCompanion = $profileStore.companions.find(
    (c) => c.id === $profileStore.selectedCompanionId
  ) || $profileStore.companions[0];

  function handleChildNameInput(event: Event) {
    const target = event.target as HTMLInputElement;
    rawChildName = target.value;
    profileStore.setChildName(rawChildName);

    if (rawChildName.length > 0) {
      const validation = validateName(rawChildName);
      childError = validation.isValid ? null : validation.errorMessage;
    } else {
      childError = null;
    }
    isSavedSuccess = false;
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

    if (value.length > 0) {
      const validation = validateName(value);
      companionError = validation.isValid ? null : validation.errorMessage;
    } else {
      companionError = null;
    }
    isSavedSuccess = false;
  }

  function handleSaveProfile() {
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
      isSavedSuccess = true;
      childError = null;
      companionError = null;
    }
  }

  $: currentFeedbackMessage = childError || companionError;
  $: feedbackType = currentFeedbackMessage ? 'error' : isSavedSuccess ? 'success' : 'idle';
</script>

<div class="profile-card">
  <header class="card-header">
    <h1 class="title">✨ Wer liest heute mit? ✨</h1>
    <p class="subtitle">Richte dein persönliches Lese-Profil ein</p>
  </header>

  <!-- Otter feedback with head-shake on error -->
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
        maxlength={16}
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
          maxlength={16}
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </section>
  {/if}

  <!-- Action Button -->
  <footer class="action-footer">
    <button
      type="button"
      id="save-profile-btn"
      class="save-btn"
      on:click={handleSaveProfile}
    >
      🚀 Los geht's – Ab ins Lese-Abenteuer!
    </button>
  </footer>
</div>

<style>
  .profile-card {
    max-width: 640px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 1.5rem;
    padding: 2rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    border: 3px solid #e0e7ff;
  }

  .card-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .title {
    font-size: 1.85rem;
    font-weight: 800;
    color: #312e81;
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    font-size: 1.05rem;
    color: #64748b;
    margin: 0;
  }

  .section {
    margin-bottom: 1.75rem;
  }

  .label {
    display: block;
    font-size: 1.15rem;
    font-weight: 700;
    color: #1e1b4b;
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
    border: 2.5px solid #cbd5e1;
    border-radius: 0.875rem;
    outline: none;
    background: #f8fafc;
    color: #0f172a;
    transition: all 0.2s ease;
  }

  .text-input:focus {
    border-color: #6366f1;
    background: #ffffff;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
  }

  .text-input.input-error {
    border-color: #ef4444;
    background: #fff5f5;
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
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 1rem;
    cursor: pointer;
    position: relative;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .companion-tile:hover {
    transform: translateY(-2px);
    border-color: #a5b4fc;
    background: #f1f5f9;
  }

  .companion-tile.selected {
    border-color: #4f46e5;
    background: #eef2ff;
    box-shadow: 0 4px 14px rgba(79, 70, 229, 0.2);
    transform: scale(1.02);
  }

  .companion-icon {
    font-size: 2.5rem;
    margin-bottom: 0.35rem;
  }

  .companion-default-label {
    font-size: 0.95rem;
    font-weight: 700;
    color: #334155;
  }

  .selected-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    font-size: 0.7rem;
    font-weight: 800;
    background: #4f46e5;
    color: #ffffff;
    padding: 2px 6px;
    border-radius: 6px;
  }

  .companion-custom-section {
    background: #f8fafc;
    padding: 1.25rem;
    border-radius: 1rem;
    border: 1.5px dashed #cbd5e1;
  }

  .action-footer {
    margin-top: 2rem;
    text-align: center;
  }

  .save-btn {
    width: 100%;
    padding: 1rem 1.5rem;
    font-size: 1.25rem;
    font-weight: 800;
    color: #ffffff;
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    border: none;
    border-radius: 1rem;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(79, 70, 229, 0.35);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .save-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(79, 70, 229, 0.45);
  }

  .save-btn:active {
    transform: translateY(0);
  }
</style>
