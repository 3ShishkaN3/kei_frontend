<script>
    import PdfViewer from 'svelte-pdf';
    import DownloadOutline from 'svelte-material-icons/DownloadOutline.svelte';
    import ChevronLeft from 'svelte-material-icons/ChevronLeft.svelte';
    import ChevronRight from 'svelte-material-icons/ChevronRight.svelte';
    import { onMount } from 'svelte';

    export let contentDetails = null; // { document_file: 'url', title: '...' }
    
    let pdfViewerComponent; // bind:this для доступа к API
    let numPages = 0;
    let currentPage = 1;
    let pdfScale = 1.5; // Начальный масштаб
    let pdfError = null;
    let isPdf = false;

    $: if (contentDetails?.document_file) {
        const url = contentDetails.document_file;
        // Простая проверка по расширению (можно улучшить проверкой MIME-типа, если бэкенд отдает)
        isPdf = url.toLowerCase().endsWith('.pdf');
        // Сбрасываем состояние при смене файла
        numPages = 0;
        currentPage = 1;
        pdfError = null;
    }

    function handlePdfError(event) {
        console.error("PDF Viewer Error:", event.detail);
        pdfError = "Не удалось загрузить или отобразить PDF файл.";
        isPdf = false; // Если ошибка, считаем что это не PDF для отображения
    }

    function handlePdfLoadSuccess(event) {
         console.log("PDF Loaded:", event.detail);
         numPages = event.detail.numPages;
         currentPage = 1; // Начинаем с первой страницы
         pdfError = null;
    }

    function nextPage() {
        if (currentPage < numPages) {
            currentPage++;
        }
    }

    function prevPage() {
        if (currentPage > 1) {
            currentPage--;
        }
    }

    // Масштабирование (можно добавить кнопки +/-)
    function zoomIn() {
         pdfScale = Math.min(pdfScale + 0.2, 3); // Ограничим макс зум
    }
     function zoomOut() {
         pdfScale = Math.max(pdfScale - 0.2, 0.5); // Ограничим мин зум
    }

</script>

<div class="document-item">
    {#if contentDetails?.document_file}
        {#if title}<h4 class="document-title">{contentDetails.title}</h4>{/if}

        {#if isPdf}
            <div class="pdf-viewer-container">
                {#if pdfError}
                     <p class="error-message">{pdfError}</p>
                {:else}
                    <div class="pdf-controls">
                         <button on:click={prevPage} disabled={currentPage <= 1} title="Предыдущая страница">
                             <ChevronLeft size="20px"/>
                         </button>
                         <span>Страница {currentPage} из {numPages || '...'}</span>
                         <button on:click={nextPage} disabled={currentPage >= numPages} title="Следующая страница">
                              <ChevronRight size="20px"/>
                         </button>
                          <span class="spacer"></span>
                         <button on:click={zoomOut} disabled={pdfScale <= 0.5} title="Уменьшить масштаб">-</button>
                         <span>{Math.round(pdfScale * 100)}%</span>
                         <button on:click={zoomIn} disabled={pdfScale >= 3} title="Увеличить масштаб">+</button>
                    </div>
                    <div class="pdf-viewer-wrapper">
                         <PdfViewer
                            url={contentDetails.document_file}
                            bind:this={pdfViewerComponent}
                            bind:page={currentPage}
                            bind:scale={pdfScale}
                            on:error={handlePdfError}
                            on:load={handlePdfLoadSuccess}
                            showLoading={true}
                        />
                        {#if !numPages && !pdfError}
                            <div class="loading-placeholder">Загрузка документа...</div>
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}

        <div class="download-link-container">
            <a href={contentDetails.document_file} target="_blank" rel="noopener noreferrer" download class="download-button">
                <DownloadOutline size="18px" />
                Скачать {isPdf ? 'PDF' : 'Документ'} ({contentDetails.title || 'файл'})
            </a>
        </div>

    {:else}
        <p>Файл документа не найден.</p>
    {/if}
</div>

<style>
    .document-item {
        margin-bottom: 15px;
        border: 1px solid #eee;
        border-radius: 6px;
        background-color: #fdfdfd;
    }
     .document-title {
         padding: 10px 15px;
         margin: 0;
         font-size: 1.1em;
         font-weight: 600;
         border-bottom: 1px solid #eee;
         background-color: #f9f9f9;
         border-top-left-radius: 6px;
         border-top-right-radius: 6px;
     }

    .pdf-viewer-container {
        padding: 10px;
    }

    .pdf-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-bottom: 10px;
        padding: 8px;
        background-color: #f0f0f0;
        border-radius: 4px;
        flex-wrap: wrap; /* Перенос на маленьких экранах */
    }
    .pdf-controls button {
        background-color: #fff;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 4px 8px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
    }
    .pdf-controls button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .pdf-controls button:hover:not(:disabled) {
         background-color: #eee;
    }
    .pdf-controls span {
        font-size: 0.9em;
        color: #333;
    }
     .pdf-controls .spacer {
         flex-grow: 1; /* Занимает место между пагинацией и зумом */
         min-width: 20px;
     }

    .pdf-viewer-wrapper {
        position: relative; /* Для позиционирования loading */
        border: 1px solid #ccc;
        background-color: #e8e8e8;
        min-height: 300px; /* Минимальная высота во время загрузки */
         max-height: 70vh; /* Ограничиваем высоту просмотра */
         overflow-y: auto; /* Добавляем скролл для высоких страниц */
    }
    /* svelte-pdf создает div внутри, к которому можно применить стили */
    .pdf-viewer-wrapper :global(div[style*="width"]) {
         margin: 0 auto; /* Центрируем страницу PDF */
         box-shadow: 0 0 8px rgba(0,0,0,0.2); /* Тень для страницы */
    }


    .loading-placeholder {
        text-align: center;
        padding: 50px;
        color: #666;
    }
     .error-message {
        color: var(--color-danger-red);
        text-align: center;
        padding: 15px;
        background-color: #ffebee;
        border: 1px solid var(--color-danger-red);
        border-radius: 4px;
     }

    .download-link-container {
        padding: 15px;
        text-align: center;
        border-top: 1px solid #eee;
        background-color: #f9f9f9;
        border-bottom-left-radius: 6px;
         border-bottom-right-radius: 6px;
    }
    .download-button {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 8px 15px; background-color: var(--color-primary-light);
        color: var(--color-primary-dark); border-radius: 4px; text-decoration: none;
        transition: background-color 0.2s; font-weight: 500;
    }
    .download-button:hover { background-color: var(--color-primary); color: white; }

</style>