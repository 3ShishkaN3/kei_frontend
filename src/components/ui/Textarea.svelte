<script>
  export let label = '';
  export let placeholder = '';
  export let value = '';
  export let name = '';
  export let disabled = false;
  export let readonly = false;
  export let required = false;
  export let rows = 5;
  export let error = '';
  const id = `ta_${Math.random().toString(36).slice(2)}`;
</script>

<div class="field">
  {#if label}
    <label class="label" for={id}>{label}</label>
  {/if}
  <textarea id={id} class="control" {rows} {placeholder} bind:value {name} {disabled} {readonly} {required}></textarea>
  {#if error}
    <div class="error">{error}</div>
  {/if}
  
</div>

<style>
  .field { display:flex; flex-direction: column; gap: 6px; }
  .label { font-weight: var(--font-weight-semi-bold); color: var(--color-label); font-size: 0.9rem; }
  .control { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--color-input-border); background: var(--color-input-bg); transition: border-color var(--animation-duration-transition), box-shadow var(--animation-duration-transition); font-size: var(--input-font-size); min-height: 120px; }
  .control:focus { outline: none; border-color: var(--color-input-focus-border); box-shadow: 0 0 0 4px var(--color-input-focus-shadow); }
  .error { color: var(--color-error); background: var(--color-error-bg); padding: 6px 8px; border-radius: 6px; font-size: 0.85rem; }
</style>


