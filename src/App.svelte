<script lang="ts">
  import ProfileSetup from './lib/components/ProfileSetup.svelte';
  import { profileStore } from './lib/stores/profileStore';

  $: activeCompanion = $profileStore.companions.find(
    (c) => c.id === $profileStore.selectedCompanionId
  );
</script>

<main class="app-shell">
  <div class="container">
    <ProfileSetup />

    {#if $profileStore.isConfigured}
      <div class="profile-preview-card">
        <h3>🎉 Bereit zum Lesen!</h3>
        <p>
          Hallo <strong>{$profileStore.childName}</strong>! Dein Begleiter
          <strong>{activeCompanion?.icon} {activeCompanion?.customName}</strong>
          freut sich schon auf deine ersten Geschichten!
        </p>
        <button
          class="reset-btn"
          on:click={() => profileStore.resetProfile()}
        >
          🔄 Profil ändern / zurücksetzen
        </button>
      </div>
    {/if}
  </div>
</main>

<style>
  .app-shell {
    min-height: 100vh;
    padding: 2rem 1rem;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  .container {
    width: 100%;
    max-width: 680px;
  }

  .profile-preview-card {
    margin-top: 1.5rem;
    background: #ecfdf5;
    border: 2px solid #10b981;
    border-radius: 1.25rem;
    padding: 1.25rem 1.5rem;
    text-align: center;
    color: #065f46;
  }

  .profile-preview-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.3rem;
  }

  .profile-preview-card p {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
  }

  .reset-btn {
    background: #ffffff;
    border: 1.5px solid #10b981;
    color: #047857;
    font-weight: 700;
    padding: 0.5rem 1rem;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .reset-btn:hover {
    background: #d1fae5;
  }
</style>
