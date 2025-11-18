<script>
  export let src = '';
  export let alt = '';
  export let size = 40; // px
  export let username = '';
  
  // Генерируем инициалы из username
  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  
  $: initials = getInitials(username || alt);
</script>

<div class="avatar" style="width: {size}px; height: {size}px; font-size: {size * 0.4}px;">
  {#if src}
    <img src={src} alt={alt || username} />
  {:else}
    <div class="avatar-placeholder">{initials}</div>
  {/if}
</div>

<style>
  .avatar {
    border-radius: 50%;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--color-purple-light);
    border: 2px solid var(--color-avatar-border);
    box-shadow: 0 2px 8px var(--color-avatar-shadow);
    flex-shrink: 0;
  }
  
  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .avatar-placeholder {
    font-weight: var(--font-weight-semi-bold);
    color: var(--color-text-dark);
    text-transform: uppercase;
    user-select: none;
  }
</style>

