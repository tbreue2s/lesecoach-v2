<script lang="ts">
  import ProfileSetup from '../ProfileSetup.svelte';
  import { profileStore } from '../../stores/profileStore';
</script>

<div class="screen-container">
  <ProfileSetup showBackButton={$profileStore.isConfigured} />
</div>

<style>
  .screen-container {
    max-width: 640px;
    margin: 0 auto;
  }
</style>
