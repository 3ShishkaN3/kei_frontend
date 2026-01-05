<script>
  import { createEventDispatcher } from 'svelte';
  export let title = '';
  export let size = 28; // px
  export let variant = 'ghost'; // ghost | primary | secondary
  $: styles = `width:${size}px;height:${size}px`;
  const dispatch = createEventDispatcher();
</script>

<button class={`icon-btn icon-btn--${variant}`} {title} style={styles} {...$$restProps} on:click={(e)=>dispatch('click', e)}>
  <span class="icon-slot"><slot /></span>
  
</button>

<style>
  .icon-btn { display:flex; align-items:center; justify-content:center; border-radius: 50%; border: 1px solid var(--color-border-light); background: white; cursor: pointer; transition: transform var(--animation-duration-transition), box-shadow var(--animation-duration-transition), background var(--animation-duration-transition); overflow: hidden; }
  .icon-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 10px var(--color-shadow-hover); }
  .icon-btn--primary { background: #4D44B5; color: white; border-color: #443ca3; }
  .icon-btn--secondary { background: #f5f5f8; }
  .icon-slot { display:flex; align-items:center; justify-content:center; line-height: 1; font-size: 14px; }
</style>


