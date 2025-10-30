<script>
  export let open = false;
  export let title = '';
  export let width = 680; // px
  export let onClose = () => {};
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
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; z-index: 1000; animation: fadeIn var(--animation-duration-transition) ease; }
  .modal { background: var(--color-block-bg); border: 1px solid var(--color-block-border); border-radius: 12px; padding: 18px; box-shadow: 0 10px 30px var(--color-shadow); animation: zoomIn var(--animation-duration-transition) ease; }
  .modal-title { margin: 0 0 10px 0; color: var(--color-block-title); }
  .modal-body { display:flex; flex-direction: column; gap: 10px; }
  .modal-actions { display:flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes zoomIn { from { transform: scale(.98); opacity: .9; } to { transform: scale(1); opacity: 1; } }
</style>


