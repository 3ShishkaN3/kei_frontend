<script>
  export let variant = 'default'; // default | primary | success | warning | danger | info
  export let size = 'md'; // sm | md | lg
</script>

<span class="badge badge--{variant} badge--{size}">
  <slot />
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 12px;
    font-weight: var(--font-weight-medium);
    font-size: 0.75rem;
    line-height: 1;
    white-space: nowrap;
  }
  
  .badge--sm {
    padding: 2px 6px;
    font-size: 0.7rem;
  }
  
  .badge--md {
    padding: 4px 8px;
    font-size: 0.75rem;
  }
  
  .badge--lg {
    padding: 6px 10px;
    font-size: 0.85rem;
  }
  
  .badge--default {
    background: var(--color-bg-ultra-light);
    color: var(--color-text-dark);
    border: 1px solid var(--color-border-light);
  }
  
  .badge--primary {
    background: var(--color-purple-light);
    color: var(--color-primary-dark);
    border: 1px solid var(--color-purple-active);
  }
  
  .badge--success {
    background: var(--color-pastel-green);
    color: #1f5f2b;
    border: 1px solid #7eb88a;
  }
  
  .badge--warning {
    background: var(--color-pastel-yellow);
    color: #6d5f00;
    border: 1px solid #d4c700;
  }
  
  .badge--danger {
    background: var(--color-mcq-incorrect);
    color: var(--color-mcq-incorrect-text);
    border: 1px solid var(--color-mcq-incorrect-border);
  }
  
  .badge--info {
    background: var(--color-pastel-cyan);
    color: #004066;
    border: 1px solid #3a9ee0;
  }
</style>

