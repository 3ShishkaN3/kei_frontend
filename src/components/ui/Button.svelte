<script>
  import { createEventDispatcher } from 'svelte';
  export let variant = 'primary'; // primary | secondary | danger | ghost
  export let size = 'md'; // sm | md | lg
  export let disabled = false;
  export let type = 'button';
  let classes = '';
  const dispatch = createEventDispatcher();

  $: classes = `btn btn--${variant} btn--${size}`;
</script>

<button class={classes} {type} {disabled} {...$$restProps} on:click={(e)=>dispatch('click', e)}>
  <slot />
  
</button>

<style>
  .btn { 
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    border: 1px solid transparent; border-radius: 10px; cursor: pointer;
    transition: background var(--animation-duration-transition), transform var(--animation-duration-transition), box-shadow var(--animation-duration-transition);
    font-weight: var(--font-weight-semi-bold);
  }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn--sm { padding: 6px 10px; font-size: 0.85rem; }
  .btn--md { padding: 8px 14px; font-size: 0.95rem; }
  .btn--lg { padding: 12px 18px; font-size: 1rem; }

  .btn--primary { background: #4D44B5; color: white; border-color: #443ca3; }
  .btn--primary:hover { background: #5f55d1; box-shadow: 0 6px 14px rgba(77,68,181,0.25); transform: translateY(-1px); }
  .btn--primary:active { transform: translateY(0); }

  .btn--secondary { background: #f5f5f8; color: #303972; border-color: #d9d9e6; }
  .btn--secondary:hover { background: #ebebf3; }

  .btn--danger { background: var(--color-danger-red); color: white; border-color: #e24747; }
  .btn--danger:hover { filter: brightness(0.95); }

  .btn--ghost { background: transparent; color: var(--color-text-dark); border-color: var(--color-border-light); }
  .btn--ghost:hover { background: var(--color-simple-button-hover-bg); }
</style>


