<script>
    import { fade } from 'svelte/transition'; 
    export let contentDetails;
    $: finalFullImageUrl = contentDetails?.image;

    let lightboxOpen = false;
    let lightboxImageSrc = '';

    function openLightbox(src) {
        lightboxImageSrc = src;
        lightboxOpen = true;
        if (typeof document !== 'undefined') document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightboxOpen = false;
        if (typeof document !== 'undefined') document.body.style.overflow = '';
    }

    function handleKeydown(event) {
        if (lightboxOpen && event.key === 'Escape') {
            closeLightbox();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="image-item-display">
    {#if contentDetails?.title}
        <h3 class="item-title">{contentDetails.title}</h3>
    {/if}
    {#if finalFullImageUrl}
        <figure on:click={() => openLightbox(finalFullImageUrl)} style="cursor: zoom-in;">
            <img src={finalFullImageUrl} alt={contentDetails.alt_text || contentDetails.title || 'Изображение урока'} loading="lazy" />
            {#if contentDetails.alt_text && contentDetails.alt_text !== contentDetails.title}
                <figcaption>{contentDetails.alt_text}</figcaption>
            {/if}
        </figure>
    {:else}
        <p class="no-content-message-small">Изображение не загружено.</p>
    {/if}
</div>

{#if lightboxOpen}
    <div class="lightbox-overlay" on:click={closeLightbox} transition:fade={{duration: 200}}>
        <div class="lightbox-content" on:click|stopPropagation transition:fade={{duration: 200, delay: 50}}>
            <button class="lightbox-close" on:click={closeLightbox} aria-label="Закрыть">×</button>
            <img src={lightboxImageSrc} alt="Увеличенное изображение" />
        </div>
    </div>
{/if}


<style>
    .image-item-display {
        padding: 10px 0;
        text-align: center;
    }
    .item-title {
        font-size: 1.3em;
        font-weight: var(--font-weight-semi-bold);
        color: var(--color-text-dark);
        margin-bottom: 12px;
        text-align: left;
    }
    figure {
        margin: 0;
        padding: 0;
        display: inline-block;
    }
    img {
        max-width: 100%;
        height: auto;
        border-radius: var(--spacing-border-radius-block);
        box-shadow: var(--color-shadow);
        display: block;
    }
    figcaption {
        font-size: 0.9em;
        color: var(--color-text-muted);
        margin-top: 8px;
        font-style: italic;
    }
    .no-content-message-small {
        font-style: italic;
        color: #888;
        font-size: 0.9rem;
        text-align: left;
    }

    .lightbox-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: var(--z-index-lightbox, 1060);
        padding: 20px;
        box-sizing: border-box;
    }
    .lightbox-content {
        position: relative;
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .lightbox-content img {
        display: block;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 4px;
        box-shadow: 0 0 30px rgba(0,0,0,0.5);
    }
    .lightbox-close {
        position: absolute;
        top: -10px;
        right: -10px;
        background: white;
        color: #333;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        font-size: 20px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        line-height: 1;
        padding: 0;
    }
     .lightbox-close:hover {
        background: #f0f0f0;
     }
</style>