<script>
    import PdfViewer from 'svelte-pdf';
    import ChevronLeft from 'svelte-material-icons/ChevronLeft.svelte';
    import ChevronRight from 'svelte-material-icons/ChevronRight.svelte';
    import { onMount } from 'svelte';

    export let contentDetails = null; // { document_file: 'url', title: '...' }

    let totalPage = 0;
    let currentPage = 1;
    let pdfScale = 1.5;
    let loading = true;
    let error = null;

    $: isPdf = contentDetails?.document_file && 
               contentDetails.document_file.toLowerCase().includes('.pdf');

    $: if (totalPage > 0) {
        loading = false;
        error = null;
    }

    $: {        
        if (!contentDetails?.document_file) {
            error = "Файл документа не найден.";
            loading = false;
        } else if (!isPdf) {
            error = "Файл не является PDF документом.";
            loading = false;
        } else if (isPdf) {
            error = null;
        }
    }

    function goToPrevPage() {
        if (currentPage > 1) {
            currentPage--;
        }
    }

    function goToNextPage() {
        if (currentPage < totalPage) {
            currentPage++;
        }
    }

    let fullScreenContainer;
    let hintVisible = false;
    let hintMessage = '';
    let isTouch = false;
    let touchStartX = 0;
    let touchEndX = 0;
    let hintTimeout;

    onMount(() => {
        isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        const handleKeyDown = (e) => {
            if (document.fullscreenElement === fullScreenContainer) {
                if (e.key === 'ArrowLeft') goToPrevPage();
                else if (e.key === 'ArrowRight') goToNextPage();
            }
        };

        const handleTouchStart = (e) => { if (document.fullscreenElement === fullScreenContainer) touchStartX = e.touches[0].clientX; };
        const handleTouchEnd = (e) => {
            if (document.fullscreenElement !== fullScreenContainer) return;
            touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;
            if (diff > 50) goToNextPage();
            else if (diff < -50) goToPrevPage();
        };

        document.addEventListener('keydown', handleKeyDown);
        fullScreenContainer.addEventListener('touchstart', handleTouchStart);
        fullScreenContainer.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            fullScreenContainer.removeEventListener('touchstart', handleTouchStart);
            fullScreenContainer.removeEventListener('touchend', handleTouchEnd);
        };
    });

    function enterFullScreen() {
        if (!fullScreenContainer) return;
        fullScreenContainer.requestFullscreen();
        hintMessage = isTouch
            ? 'Перелистните экран, чтобы перелистывать слайды'
            : 'Листайте стрелками на клавиатуре, чтобы перелистывать слайды';
        hintVisible = true;
        clearTimeout(hintTimeout);
        hintTimeout = setTimeout(() => { hintVisible = false; }, 3000);
    }
</script>

<div class="document-item">
    {#if error}
        <div class="error-message">Ошибка: {error}</div>
    {:else if contentDetails?.document_file && isPdf}
        <div class="pdf-container">
            {#if totalPage > 0}
                <div class="page-counter">
                    Страница {currentPage} из {totalPage}
                </div>
            {/if}
            
            <div class="pdf-viewer-wrapper">
                <button class="nav-button nav-left" on:click={goToPrevPage} disabled={currentPage <= 1 || totalPage === 0} aria-label="Предыдущая страница">
                    <ChevronLeft size="24px"/>
                </button>
                
                <div class="pdf-content"
                     on:click={enterFullScreen}
                     on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') enterFullScreen(); }}
                     bind:this={fullScreenContainer}
                     role="button"
                     tabindex="0"
                     aria-label="Открыть слайды в полноэкранном режиме"
                >
                    {#if loading && totalPage === 0}
                        <div class="loading-placeholder">Загрузка документа...</div>
                    {/if}
                    
                    <PdfViewer
                        url={contentDetails.document_file}
                        bind:pageNum={currentPage}
                        bind:totalPage
                        bind:scale={pdfScale}
                        showButtons={[]}
                    />
                </div>
                
                <button class="nav-button nav-right" on:click={goToNextPage} disabled={currentPage >= totalPage || totalPage === 0} aria-label="Следующая страница">
                    <ChevronRight size="24px"/>
                </button>
            </div>
        </div>
    {:else}
        <div class="no-file-message">
            <p>Файл документа не найден.</p>
        </div>
    {/if}
</div>
<div class="fullscreen-hint" class:visible={hintVisible}>{hintMessage}</div>

<style>
    .document-item {
        margin-bottom: var(--spacing-margin-bottom-medium, 20px);
        border-radius: var(--spacing-border-radius-large, 12px);
        background-color: var(--color-bg-card, #ffffff);
        box-shadow: var(--color-card-shadow, 0 2px 8px rgba(0, 0, 0, 0.1));
        overflow: hidden;
    }

    .pdf-container {
        background-color: var(--color-bg-card, #ffffff);
    }

    .page-counter {
        background: linear-gradient(135deg, var(--color-primary, #667eea) 0%, var(--color-primary-dark, #764ba2) 100%);
        color: white;
        text-align: center;
        padding: var(--spacing-padding-medium, 12px);
        font-weight: 600;
        font-size: var(--font-size-medium, 16px);
        letter-spacing: 0.5px;
    }

    .pdf-viewer-wrapper {
        display: flex;
        align-items: center;
        gap: var(--spacing-gap-medium, 16px);
        padding: var(--spacing-padding-large, 20px);
        background: var(--color-bg-light, #f8fafc);
    }

    .nav-button {
        background: var(--color-bg-card, #ffffff);
        border: 2px solid var(--color-border-light, #e2e8f0);
        border-radius: 50%;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: var(--color-button-shadow, 0 2px 8px rgba(0, 0, 0, 0.1));
        flex-shrink: 0;
    }

    .nav-button:hover:not(:disabled) {
        background: var(--color-primary, #667eea);
        border-color: var(--color-primary, #667eea);
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .nav-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
    }

    .pdf-content {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 500px;
        background: var(--color-bg-card, #ffffff);
        border-radius: var(--spacing-border-radius-medium, 8px);
        box-shadow: var(--color-card-shadow-large, 0 8px 24px rgba(0, 0, 0, 0.12));
        overflow: hidden;
    }

    .pdf-content :global(.svelte-pdf-container) {
        max-width: 100%;
        max-height: 100%;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
    }

    .pdf-content :global(canvas) {
        max-width: 100%;
        max-height: 80vh;
        object-fit: contain;
        border-radius: var(--spacing-border-radius-medium, 8px);
        background: white;
    }

    .pdf-content :global(.pdf-controls),
    .pdf-content :global(.page-info),
    .pdf-content :global(.button-control) {
        display: none !important;
    }

    .pdf-mock {
        width: 100%;
        max-width: 600px;
        background: white;
        border-radius: var(--spacing-border-radius-medium, 8px);
        box-shadow: var(--color-card-shadow, 0 4px 12px rgba(0, 0, 0, 0.1));
        overflow: hidden;
    }

    .pdf-page {
        padding: var(--spacing-padding-xl, 32px);
        text-align: center;
    }

    .pdf-page h3 {
        color: var(--color-primary, #6D7FC9);
        margin-bottom: var(--spacing-margin-bottom-medium, 16px);
        font-size: 1.5rem;
        font-weight: var(--font-weight-bold, 700);
    }

    .pdf-page p {
        margin-bottom: var(--spacing-margin-bottom-small, 12px);
        color: var(--color-text-primary, #333);
        line-height: 1.6;
    }

    .mock-content {
        background: var(--color-bg-light, #f9fafb);
        border-radius: var(--spacing-border-radius-small, 6px);
        padding: var(--spacing-padding-large, 24px);
        margin-top: var(--spacing-margin-top-large, 24px);
        border-left: 4px solid var(--color-primary, #6D7FC9);
    }

    .mock-content p {
        margin-bottom: var(--spacing-margin-bottom-small, 8px);
        font-size: 0.95rem;
    }

    .loading-placeholder, 
    .error-message, 
    .no-file-message, 
    .non-pdf-message {
        text-align: center;
        padding: var(--spacing-padding-xl, 40px) var(--spacing-padding-large, 20px);
        color: var(--color-text-secondary, #64748b);
        font-size: var(--font-size-medium, 16px);
        border-radius: var(--spacing-border-radius-medium, 8px);
        margin: var(--spacing-margin-medium, 16px);
    }

    .error-message {
        background: var(--color-error-bg, #fee2e2);
        color: var(--color-error, #dc2626);
        border: 1px solid var(--color-error-border, #fecaca);
    }

    .loading-placeholder {
        background: var(--color-info-bg, #f0f9ff);
        color: var(--color-info, #0369a1);
        border: 1px solid var(--color-info-border, #bae6fd);
    }

    .no-file-message, 
    .non-pdf-message {
        background: var(--color-bg-light, #f9fafb);
        color: var(--color-text-secondary, #6b7280);
        border: 1px solid var(--color-border-light, #e5e7eb);
    }

    @media (max-width: 768px) {
        .pdf-viewer-wrapper {
            flex-direction: column;
            gap: var(--spacing-gap-small, 12px);
            padding: var(--spacing-padding-medium, 16px);
        }

        .nav-button {
            width: 40px;
            height: 40px;
        }

        .page-counter {
            font-size: var(--font-size-small, 14px);
            padding: var(--spacing-padding-small, 10px);
        }

        .pdf-content {
            min-height: 400px;
            width: 100%;
        }

        .pdf-content :global(canvas) {
            max-height: 60vh;
        }
    }

    @media (max-width: 480px) {
        .document-item {
            margin-bottom: var(--spacing-margin-bottom-small, 16px);
            border-radius: var(--spacing-border-radius-medium, 8px);
        }

        .pdf-viewer-wrapper {
            padding: var(--spacing-padding-small, 12px);
        }

        .pdf-content {
            min-height: 300px;
        }

        .pdf-content :global(canvas) {
            max-height: 50vh;
        }
    }
.fullscreen-hint {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px 16px;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.5s ease;
    pointer-events: none;
    z-index: 1000;
}
.fullscreen-hint.visible {
    opacity: 1;
}
</style>