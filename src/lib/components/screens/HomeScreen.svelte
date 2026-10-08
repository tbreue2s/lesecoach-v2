<script lang="ts">
  import { profileStore } from '../../stores/profileStore';
  import { routerStore } from '../../stores/routerStore';
  import OtterFeedback from '../OtterFeedback.svelte';

  $: childName = $profileStore.childName || 'kleiner Lese-Held';
  $: activeCompanion = $profileStore.companions.find(
    (c) => c.id === $profileStore.selectedCompanionId
  ) || $profileStore.companions[0];

  $: welcomeMessage = `Hallo ${childName}! Dein Lese-Begleiter ${activeCompanion.icon} ${activeCompanion.customName} ist bereit!`;
</script>

<div class="screen-container">
  <!-- Top Otter Greeting -->
  <header class="home-header">
    <OtterFeedback message={welcomeMessage} type="idle" />
  </header>

  <!-- Child & Companion Hero Card -->
  <section class="hero-card" aria-label="Profilübersicht">
    <div class="hero-companion-badge">
      <span class="hero-icon" aria-hidden="true">{activeCompanion.icon}</span>
      <div class="hero-info">
        <h2 class="hero-companion-name">{activeCompanion.customName}</h2>
        <span class="hero-companion-type">Dein Lese-Begleiter</span>
      </div>
    </div>

    <div class="child-badge">
      <span class="child-label">Lese-Profi:</span>
      <span class="child-name">⭐ {childName}</span>
    </div>
  </section>

  <!-- Big Start Action Button -->
  <section class="action-section">
    <button
      type="button"
      id="start-reading-btn"
      class="btn-primary-large"
      on:click={() => routerStore.goToReader()}
    >
      <span class="btn-icon" aria-hidden="true">📖</span>
      <span class="btn-text">Jetzt Geschichte lesen!</span>
    </button>
  </section>

  <!-- Settings / Switch Companion Navigation -->
  <footer class="home-footer">
    <button
      type="button"
      id="goto-settings-btn"
      class="btn-secondary"
      on:click={() => routerStore.goToSettings()}
    >
      ⚙️ Begleiter oder Name ändern
    </button>
  </footer>
</div>

<style>
  .screen-container {
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .hero-card {
    background: var(--color-surface-card, #F5EFE6);
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: var(--radius-lg, 1.25rem);
    padding: 1.75rem;
    box-shadow: var(--shadow-warm, 0 4px 14px rgba(74, 85, 104, 0.08));
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .hero-companion-badge {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .hero-icon {
    font-size: 3.25rem;
    line-height: 1;
    background: var(--color-page-bg, #FBF9F5);
    border: 2px solid var(--color-border, #E2D9CC);
    border-radius: 1rem;
    padding: 0.5rem;
  }

  .hero-info {
    display: flex;
    flex-direction: column;
  }

  .hero-companion-name {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text-main, #2D3748);
  }

  .hero-companion-type {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-primary, #2B6CB0);
  }

  .child-badge {
    background: var(--color-page-bg, #FBF9F5);
    border: 1.5px solid var(--color-border, #E2D9CC);
    padding: 0.6rem 1rem;
    border-radius: var(--radius-md, 0.875rem);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .child-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-subtle, #718096);
  }

  .child-name {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--color-text-main, #2D3748);
  }

  .action-section {
    margin-top: 0.5rem;
  }

  .btn-primary-large {
    width: 100%;
    background: var(--color-primary, #2B6CB0);
    color: var(--color-page-bg, #FBF9F5);
    border: none;
    border-radius: 1.25rem;
    padding: 1.35rem 1.5rem;
    font-size: 1.45rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.85rem;
    box-shadow: 0 6px 18px rgba(43, 108, 176, 0.3);
    transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
  }

  .btn-primary-large:hover {
    background-color: var(--color-primary-hover, #23568B);
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgba(43, 108, 176, 0.4);
  }

  .btn-primary-large:active {
    transform: translateY(0);
  }

  .btn-icon {
    font-size: 1.75rem;
  }

  .home-footer {
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .btn-secondary {
    background: var(--color-surface-soft, #EDE5D8);
    color: var(--color-text-main, #2D3748);
    border: 1.5px solid var(--color-border, #E2D9CC);
    padding: 0.75rem 1.25rem;
    font-size: 1.05rem;
    font-weight: 700;
    border-radius: var(--radius-md, 0.875rem);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover {
    background: var(--color-surface-card, #F5EFE6);
    border-color: var(--color-primary, #2B6CB0);
    color: var(--color-primary, #2B6CB0);
  }
</style>
