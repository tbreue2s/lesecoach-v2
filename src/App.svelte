<script lang="ts">
  import { routerStore } from './lib/stores/routerStore';
  import HomeScreen from './lib/components/screens/HomeScreen.svelte';
  import SettingsScreen from './lib/components/screens/SettingsScreen.svelte';
  import ReaderScreen from './lib/components/screens/ReaderScreen.svelte';
</script>

<div class="app-viewport">
  <main class="main-content">
    {#if $routerStore.currentScreen === 'home'}
      <HomeScreen />
    {:else if $routerStore.currentScreen === 'reader'}
      <ReaderScreen />
    {:else}
      <SettingsScreen />
    {/if}
  </main>
</div>

<style>
  .app-viewport {
    min-height: 100vh;
    background-color: var(--color-page-bg, #FBF9F5);
    padding: 1.5rem 1rem;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  .main-content {
    width: 100%;
    max-width: 760px;
  }
</style>
