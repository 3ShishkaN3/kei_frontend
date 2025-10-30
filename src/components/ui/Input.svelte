<script>
  export let label = '';
  export let placeholder = '';
  export let type = 'text';
  export let value = '';
  export let name = '';
  export let disabled = false;
  export let readonly = false;
  export let required = false;
  export let min;
  export let max;
  export let step;
  export let error = '';
  export let inputClass = '';
  const id = `inp_${Math.random().toString(36).slice(2)}`;
</script>

<div class="field">
  {#if label}
    <label class="label" for={id}>{label}</label>
  {/if}
  {#if type === 'text'}
    <input id={id} class={`control ${inputClass}`} type="text" {placeholder} bind:value {name} {disabled} {readonly} {required} />
  {:else if type === 'number'}
    <input id={id} class={`control ${inputClass}`} type="number" {placeholder} bind:value {name} {disabled} {readonly} {required} {min} {max} {step} />
  {:else if type === 'date'}
    <input id={id} class={`control ${inputClass}`} type="date" {placeholder} bind:value {name} {disabled} {readonly} {required} />
  {:else if type === 'datetime-local'}
    <input id={id} class={`control ${inputClass}`} type="datetime-local" {placeholder} bind:value {name} {disabled} {readonly} {required} />
  {:else if type === 'email'}
    <input id={id} class={`control ${inputClass}`} type="email" {placeholder} bind:value {name} {disabled} {readonly} {required} />
  {:else if type === 'password'}
    <input id={id} class={`control ${inputClass}`} type="password" {placeholder} bind:value {name} {disabled} {readonly} {required} />
  {:else}
    <input id={id} class={`control ${inputClass}`} type="text" {placeholder} bind:value {name} {disabled} {readonly} {required} />
  {/if}
  {#if error}
    <div class="error">{error}</div>
  {/if}
  
</div>

<style>
  .field { display:flex; flex-direction: column; gap: 6px; }
  .label { font-weight: var(--font-weight-semi-bold); color: var(--color-label); font-size: 0.9rem; }
  .control { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--color-input-border); background: var(--color-input-bg); transition: border-color var(--animation-duration-transition), box-shadow var(--animation-duration-transition); font-size: var(--input-font-size); }
  .control:focus { outline: none; border-color: var(--color-input-focus-border); box-shadow: 0 0 0 4px var(--color-input-focus-shadow); }
  .error { color: var(--color-error); background: var(--color-error-bg); padding: 6px 8px; border-radius: 6px; font-size: 0.85rem; }
</style>


