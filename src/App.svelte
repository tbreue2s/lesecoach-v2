<script lang="ts">
  import { routerStore } from './lib/stores/routerStore';
  import HomeScreen from './lib/components/screens/HomeScreen.svelte';
  import SettingsScreen from './lib/components/screens/SettingsScreen.svelte';
  import ReaderScreen from './lib/components/screens/ReaderScreen.svelte';
  import StoryAdventureScreen from './lib/components/screens/StoryAdventureScreen.svelte';
</script>

<div class="app-viewport" class:reader-mode={$routerStore.currentScreen === 'reader'}>
  <main class="main-content" class:reader-main={$routerStore.currentScreen === 'reader'}>
    {#if $routerStore.currentScreen === 'home' || $routerStore.currentScreen === 'adventure-setup'}
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

  .app-viewport.reader-mode {
    padding: 0;
    height: 100dvh;
    max-height: 100dvh;
    overflow: hidden;
    align-items: stretch;
  }

  .main-content {
    width: 100%;
    max-width: 780px;
  }

  .main-content.reader-main {
    max-width: 860px;
    height: 100%;
    display: flex;
    flex-direction: column;
    margin: 0 auto;
  }
</style>
