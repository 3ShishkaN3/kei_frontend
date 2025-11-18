<script>
  export let label = '';
  export let value = []; // массив выбранных значений
  export let name = '';
  export let disabled = false;
  export let options = []; // [{label, value}]
  const id = `multisel_${Math.random().toString(36).slice(2)}`;
  
  function toggleOption(optionValue) {
    if (disabled) return;
    const index = value.indexOf(optionValue);
    if (index === -1) {
      value = [...value, optionValue];
    } else {
      value = value.filter(v => v !== optionValue);
    }
  }
  
  function isSelected(optionValue) {
    return value.includes(optionValue);
  }
</script>

<div class="field">
  {#if label}
    <label class="label" for={id}>{label}</label>
  {/if}
  <div class="multiselect-container">
    <select id={id} class="control" multiple {name} {disabled} style="display: none;">
      {#each options as opt}
        <option value={opt.value} selected={isSelected(opt.value)}>{opt.label}</option>
      {/each}
    </select>
    <div class="multiselect-options">
      {#each options as opt}
        <label class="multiselect-option {isSelected(opt.value) ? 'selected' : ''}">
          <input
            type="checkbox"
            checked={isSelected(opt.value)}
            on:change={() => toggleOption(opt.value)}
            {disabled}
          />
          <span>{opt.label}</span>
        </label>
      {/each}
    </div>
    {#if value.length > 0}
      <div class="multiselect-selected">
        Выбрано: {value.length}
      </div>
    {/if}
  </div>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .label {
    font-weight: var(--font-weight-semi-bold);
    color: var(--color-label);
    font-size: 0.9rem;
  }
  .multiselect-container {
    position: relative;
  }
  .multiselect-options {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid var(--color-input-border);
    border-radius: 10px;
    background: var(--color-input-bg);
    padding: 8px;
  }
  .multiselect-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background var(--animation-duration-transition);
  }
  .multiselect-option:hover {
    background: rgba(109, 127, 201, 0.1);
  }
  .multiselect-option.selected {
    background: rgba(109, 127, 201, 0.15);
  }
  .multiselect-option input[type="checkbox"] {
    cursor: pointer;
    width: 18px;
    height: 18px;
  }
  .multiselect-option span {
    flex: 1;
    font-size: var(--input-font-size);
  }
  .multiselect-selected {
    margin-top: 6px;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }
</style>
