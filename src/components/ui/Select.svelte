<script>
  export let label = '';
  export let value;
  export let name = '';
  export let disabled = false;
  export let options = []; // [{label, value}]
  const id = `sel_${Math.random().toString(36).slice(2)}`;
</script>

<div class="field">
  {#if label}
    <label class="label" for={id}>{label}</label>
  {/if}
  <select id={id} class="control" bind:value {name} {disabled}>
    <slot>
      {#each options as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </slot>
  </select>
  
</div>

<style>
  .field { display:flex; flex-direction: column; gap: 6px; }
  .label { font-weight: var(--font-weight-semi-bold); color: var(--color-label); font-size: 0.9rem; }
  .control { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--color-input-border); background: var(--color-input-bg); transition: border-color var(--animation-duration-transition), box-shadow var(--animation-duration-transition); font-size: var(--input-font-size); }
  .control:focus { outline: none; border-color: var(--color-input-focus-border); box-shadow: 0 0 0 4px var(--color-input-focus-shadow); }
</style>


