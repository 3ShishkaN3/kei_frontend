<script>
  import { onDestroy } from 'svelte';
  
  export let open = false;
  export let title = '';
  export let width = 680; // px
  export let onClose = () => {};
  
  // Prevent body scroll when modal is open
  $: if (open) {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  } else {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }
  
  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  });
</script>

{#if open}
  <div class="modal-backdrop" on:click={onClose}>
    <div class="modal" style={`width:min(${width}px, 92vw)`} on:click|stopPropagation>
      {#if title}
        <h3 class="modal-title">{title}</h3>
      {/if}
      <div class="modal-body">
        <slot />
      </div>
      <div class="modal-actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop { 
    position: fixed; 
    inset: 0; 
    background: rgba(0,0,0,0.35); 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    z-index: 1000; 
    animation: fadeIn var(--animation-duration-transition) ease;
    overflow: hidden;
    padding: 20px;
  }
  .modal { 
    background: var(--color-block-bg); 
    border: 1px solid var(--color-block-border); 
    border-radius: 12px; 
    padding: 18px; 
    box-shadow: 0 10px 30px var(--color-shadow); 
    animation: zoomIn var(--animation-duration-transition) ease;
    max-height: calc(100vh - 40px);
    max-width: calc(100vw - 40px);
    display: flex;
    flex-direction: column;
    margin: auto;
    overflow: hidden;
  }
  .modal-title { 
    margin: 0 0 10px 0; 
    color: var(--color-block-title);
    flex-shrink: 0;
  }
  .modal-body { 
    display: flex; 
    flex-direction: column; 
    gap: 10px;
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    min-height: 0;
    padding-right: 4px;
  }
  .modal-body::-webkit-scrollbar {
    width: 8px;
  }
  .modal-body::-webkit-scrollbar-track {
    background: var(--color-input-bg);
    border-radius: 4px;
  }
  .modal-body::-webkit-scrollbar-thumb {
    background: var(--color-input-border);
    border-radius: 4px;
  }
  .modal-body::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-muted);
  }
  .modal-actions { 
    display: flex; 
    justify-content: flex-end; 
    gap: 10px; 
    margin-top: 12px;
    flex-shrink: 0;
    padding-top: 12px;
    border-top: 1px solid var(--color-border-light);
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes zoomIn { from { transform: scale(.98); opacity: .9; } to { transform: scale(1); opacity: 1; } }
</style>


