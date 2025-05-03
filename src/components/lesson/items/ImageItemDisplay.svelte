<script>
    export let contentDetails = null; // { image: 'url', alt_text: '...', title: '...' }
</script>
{#if contentDetails?.image}
<div class="image-container">
    {#if contentDetails.title}<p class="image-title">{contentDetails.title}</p>{/if}
    <img src={contentDetails.image} alt={contentDetails.alt_text || ''} loading="lazy" />
</div>
{/if}
<style>/* ... стили ... */</style>