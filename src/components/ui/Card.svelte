<script>
  export let title = '';
</script>

<div class="card">
  {#if title}
    <div class="card-title">{title}</div>
  {/if}
  <div class="card-body">
    <slot />
  </div>
</div>

<style>
  .card { background: var(--color-block-bg); border: 1px solid var(--color-block-border); border-radius: var(--spacing-border-radius-card); padding: var(--spacing-block-padding); box-shadow: 0 4px 20px var(--color-block-shadow); transition: box-shadow var(--animation-duration-block-hover); }
  .card:hover { box-shadow: 0 4px 20px var(--color-block-shadow-hover); }
  .card-title { color: var(--color-block-title); font-weight: var(--font-weight-semi-bold); margin-bottom: 10px; }
  .card-body { display: block; }
</style>


