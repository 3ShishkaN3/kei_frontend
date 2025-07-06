<script>
    import PdfViewer from 'svelte-pdf';
    import DownloadOutline from 'svelte-material-icons/DownloadOutline.svelte';
    import ChevronLeft from 'svelte-material-icons/ChevronLeft.svelte';
    import ChevronRight from 'svelte-material-icons/ChevronRight.svelte';
    import { onMount } from 'svelte';

    export let contentDetails = null; // { document_file: 'url', title: '...' }

    let numPages = 0;
    let pageNum = 1;
    let loading = true;
    let error = null;

    let viewer; // Ссылка на компонент PdfViewer
    let prevScale = 1; // Для отслеживания предыдущего масштаба

    onMount(() => {
        if (contentDetails && contentDetails.document_file) {
            // Дополнительная инициализация, если нужна
        } else {
            error = "Файл документа не предоставлен или недействителен.";
            loading = false;
        }
    });

    function onDocumentLoad({ numPages: newNumPages }) {
        numPages = newNumPages;
        loading = false;
        error = null;
    }

    function onDocumentError(err) {
        error = "Не удалось загрузить документ: " + err.message;
        loading = false;
        console.error("PDF loading error:", err);
    }

    function goToPrevPage() {
        if (pageNum > 1) {
            pageNum--;
        }
    }

    function goToNextPage() {
        if (pageNum < numPages) {
            pageNum++;
        }
    }

    // Хелпер для отслеживания изменения масштаба, если PdfViewer не предоставляет колбэк
    // $: {
    //     if (viewer && viewer.scale !== prevScale) {
    //         console.log("Scale changed to:", viewer.scale);
    //         prevScale = viewer.scale;
    //     }
    // }

</script>

<div class="document-item-display-wrapper" aria-live="polite">
    {#if contentDetails?.title}
        <h4 class="document-title">{contentDetails.title}</h4>
    {/if}

    {#if loading}
        <p>Загрузка документа...</p>
    {:else if error}
        <p class="error-message">Ошибка: {error}</p>
    {:else if contentDetails?.document_file}
        <div class="pdf-viewer-container">
            <PdfViewer
                bind:this={viewer}
                url={contentDetails.document_file}
                scale={1.25}
                rotation={0}
                {pageNum}
                on:documentLoad={onDocumentLoad}
                on:documentError={onDocumentError}
                use = "pdfjs-dist"
            />
        </div>

        <div class="pdf-controls">
            <button on:click={goToPrevPage} disabled={pageNum === 1} class="control-button" aria-label="Предыдущая страница">
                <ChevronLeft size="24px" />
            </button>
            <span class="page-info">
                Страница {pageNum} из {numPages}
            </span>
            <button on:click={goToNextPage} disabled={pageNum === numPages} class="control-button" aria-label="Следующая страница">
                <ChevronRight size="24px" />
            </button>

            {#if contentDetails.document_file}
                <a href={contentDetails.document_file} download class="download-button" aria-label="Скачать документ">
                    <DownloadOutline size="24px" /> Скачать
                </a>
            {/if}
        </div>
    {:else}
        <p class="error-message">Документ для отображения отсутствует.</p>
    {/if}
</div>

<style>
.document-item-display-wrapper {
    background-color: #fff;
    border: 1px solid var(--color-border-light, #e7eaf3);
    border-radius: var(--spacing-border-radius-block, 12px);
    padding: clamp(15px, 3vw, 20px);
    margin-bottom: 25px;
    box-shadow: 0 3px 8px rgba(var(--color-primary-rgb, 175, 164, 255), 0.05);
    display: flex;
    flex-direction: column;
    align-items: center; /* Центрируем содержимое */
}
.document-title {
    font-size: clamp(1.2em, 2.8vw, 1.5em);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-dark);
    margin-top: 0;
    margin-bottom: 15px;
    text-align: center;
}

.error-message {
    color: var(--color-danger-red, #e74c3c);
    font-weight: var(--font-weight-medium);
    text-align: center;
}

.pdf-viewer-container {
    width: 100%; /* Занимаем всю доступную ширину */
    max-width: 800px; /* Ограничиваем максимальную ширину PDF */
    height: auto; /* Высота будет подстраиваться */
    margin-bottom: 20px;
    border: 1px solid var(--color-border-light, #e7eaf3);
    border-radius: var(--spacing-border-radius-small);
    overflow: hidden; /* Скрываем излишки, если PDF больше контейнера */
}

/* Стили для PdfViewer, если нужно переопределить внутренние стили */
.pdf-viewer-container :global(canvas) {
    width: 100% !important;
    height: auto !important;
    display: block; /* Убираем лишнее пространство под canvas */
}

.pdf-controls {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-top: 10px;
    padding: 10px 15px;
    background-color: var(--color-bg-light, #f8f8f8);
    border-radius: var(--spacing-border-radius-button);
    border: 1px solid var(--color-border-light);
}

.control-button, .download-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    border: 1px solid var(--color-border-admin-button, #d1c9ff);
    border-radius: var(--spacing-border-radius-button);
    background-color: var(--color-bg-ultra-light, #fff);
    color: var(--color-primary-dark, #6D7FC9);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s, color 0.2s;
    text-decoration: none; /* Для ссылки */
}
.control-button:hover:not(:disabled), .download-button:hover {
    background-color: var(--color-primary-light, #e0d9ff);
    border-color: var(--color-primary, #AFA4FF);
    color: var(--color-primary-dark, #6D7FC9);
}
.control-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.page-info {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-dark);
    font-size: 0.95em;
    min-width: 80px; /* Чтобы не прыгало при изменении числа страниц */
    text-align: center;
}

/* Иконки внутри кнопок */
.control-button :global(svg), .download-button :global(svg) {
    margin-right: 5px;
}
</style>