<script>
    import PdfViewer from 'svelte-pdf';
    import ChevronLeft from 'svelte-material-icons/ChevronLeft.svelte';
    import ChevronRight from 'svelte-material-icons/ChevronRight.svelte';
    import { onMount } from 'svelte';

    export let contentDetails = null;

    let totalPage = 0;
    let currentPage = 1;
    let pdfScale = 2.0; 
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
        if (currentPage > 1) currentPage--;
    }

    function goToNextPage() {
        if (currentPage < totalPage) currentPage++;
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
        if(fullScreenContainer) {
             fullScreenContainer.addEventListener('touchstart', handleTouchStart);
             fullScreenContainer.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if(fullScreenContainer) {
                fullScreenContainer.removeEventListener('touchstart', handleTouchStart);
                fullScreenContainer.removeEventListener('touchend', handleTouchEnd);
            }
        };
    });

    function enterFullScreen() {
        if (!fullScreenContainer) return;
        fullScreenContainer.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
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
        gap: 8px; 
        padding-bottom: 1.5rem; 
        background: var(--color-bg-light, #f8fafc);
    }

    .nav-button {
        background: var(--color-bg-card, #ffffff);
        border: 2px solid var(--color-border-light, #e2e8f0);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: var(--color-button-shadow, 0 2px 8px rgba(0, 0, 0, 0.1));
        flex-shrink: 0;
        z-index: 10; 
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
        background: var(--color-bg-card, #ffffff);
        border-radius: var(--spacing-border-radius-medium, 8px);
        overflow: hidden; 
        position: relative;
    }

    .pdf-content :global(.svelte-pdf-container) {
        width: 100%;
        height: 100%;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
    }

    .pdf-content :global(canvas) {
        display: block;
        max-width: 100%; 
        height: auto; 
        max-height: 85vh; 
        object-fit: contain;
        background: white;
    }


    .pdf-content:fullscreen {
        width: 100vw;
        height: 100vh;
        margin: 0;
        padding: 0;
        border-radius: 0;
        background: white; 
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .pdf-content:fullscreen :global(canvas) {
        max-width: 100%;
        max-height: 100%;
        
        width: auto; 
        height: auto;
        
        object-fit: contain; 
    }

    .pdf-content :global(.pdf-controls),
    .pdf-content :global(.page-info),
    .pdf-content :global(.button-control) {
        display: none !important;
    }

    .loading-placeholder, 
    .error-message, 
    .no-file-message {
        text-align: center;
        padding: 20px;
        color: var(--color-text-secondary, #64748b);
        font-size: 16px;
        border-radius: 8px;
        margin: 16px;
    }

    .error-message {
        background: #fee2e2;
        color: #dc2626;
        border: 1px solid #fecaca;
    }

    .loading-placeholder {
        background: #f0f9ff;
        color: #0369a1;
        border: 1px solid #bae6fd;
    }

    .no-file-message {
        background: #f9fafb;
        color: #6b7280;
        border: 1px solid #e5e7eb;
    }

    @media (max-width: 768px) {
        .pdf-viewer-wrapper {
            padding: 4px;
            gap: 4px;
        }

        .nav-button {
            width: 32px;
            height: 32px;
        }

        .pdf-content :global(canvas) {
            max-height: 70vh;
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
        z-index: 9999;
    }
    .fullscreen-hint.visible {
        opacity: 1;
    }
</style>