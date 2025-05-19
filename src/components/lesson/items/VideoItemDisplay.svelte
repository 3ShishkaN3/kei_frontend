<script>
    import { onMount, onDestroy } from 'svelte';
    import Plyr from 'plyr';
    import 'plyr/dist/plyr.css';

    export let contentDetails;
    // Ожидаемая структура от бэкенда (из твоего примера):
    // contentDetails: { title?: string, video_file?: string, video_url?: string, source_type?: string, transcript?: string }
    // video_file: "http://localhost:8000/media/material_video/1006_motion_background_abstract_hd1627720p5000br_7gc3m3E.mp4"
    // video_url: null (в твоем примере)
    // source_type: "url" (в твоем примере, что может означать "файл по URL")

    let videoElement;
    let player; // Экземпляр Plyr
    let showTranscript = false;

    $: finalVideoOptions = getVideoOptions();

    function getExtension(filename) {
        if (!filename || typeof filename !== 'string') return 'mp4'; // Default
        const parts = filename.split('?')[0].split('.'); // Убираем query params перед поиском расширения
        return parts.pop().toLowerCase();
    }

    function getProviderFromUrl(url) {
        if (!url) return null;
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('vimeo.com')) return 'vimeo';
        return null;
    }

    function getVideoOptions() {
        if (!contentDetails) return null;

        // Приоритет: если есть video_url и это известный провайдер (YouTube/Vimeo)
        const embedUrl = contentDetails.video_url;
        const embedProvider = getProviderFromUrl(embedUrl);

        if (embedUrl && embedProvider) {
            return {
                type: 'video',
                sources: [{
                    src: embedUrl,
                    provider: embedProvider,
                }],
                plyrProvider: embedProvider // Для выбора правильного рендера в HTML
            };
        }

        // Второе: если есть video_file (URL на загруженный файл)
        if (contentDetails.video_file) {
            return {
                type: 'video',
                title: contentDetails.title || 'Видео',
                sources: [{
                    src: contentDetails.video_file, // URL уже полный
                    type: `video/${getExtension(contentDetails.video_file)}`,
                }],
                plyrProvider: 'html5' // Plyr будет использовать HTML5 <video> тег
            };
        }
        
        return null; // Источник не найден
    }
    
    // Эта функция будет вызываться при изменении finalVideoOptions
    function initializeOrUpdatePlayer(options) {
        if (player) {
            player.destroy();
            player = null;
        }
        if (videoElement && options && options.sources && options.sources.length > 0) {
            // Для HTML5, Plyr ожидает <video> тег. Для YouTube/Vimeo - iframe.
            // Мы будем управлять этим в шаблоне. Здесь просто создаем Plyr.
            if (options.plyrProvider === 'html5') {
                // Убедимся, что videoElement это <video>, а не <div> от предыдущего iframe
                if (videoElement.tagName !== 'VIDEO') {
                    // Это сложный случай, если тип плеера меняется. Проще пересоздать компонент.
                    // Для простоты, предполагаем, что videoElement всегда будет нужного типа
                    // или что Svelte перерисует его правильно.
                }
            }
            player = new Plyr(videoElement, { /* опции Plyr */ });
            // Для HTML5, источник устанавливается через <source> тег.
            // Для YouTube/Vimeo, Plyr сам обрабатывает iframe.
            // Если нужно явно обновить источник для уже созданного плеера HTML5:
            if (options.plyrProvider === 'html5' && player && player.isHTML5) {
                 player.source = { type: 'video', title: options.title, sources: options.sources };
            }

        }
    }

    // Реактивно вызываем инициализацию/обновление плеера
    $: initializeOrUpdatePlayer(finalVideoOptions);

    onMount(() => {
        // Первичная инициализация, если finalVideoOptions уже есть
        // (хотя реактивный блок $: initializeOrUpdatePlayer должен это покрыть)
        if (!player && videoElement && finalVideoOptions) {
             initializeOrUpdatePlayer(finalVideoOptions);
        }
    });

    onDestroy(() => {
        if (player) {
            player.destroy();
            player = null;
        }
    });
</script>

      
<div class="video-item-display">
    {#if contentDetails?.title}
        <h3 class="item-title">{contentDetails.title}</h3>
    {/if}

    {#if finalVideoOptions}
        {#if finalVideoOptions.plyrProvider === 'html5'}
            <video bind:this={videoElement} controls crossorigin playsinline poster={contentDetails.poster_url || ''}>
                {#each finalVideoOptions.sources as source}
                    <source src={source.src} type={source.type} />
                {/each}
                Ваш браузер не поддерживает HTML5 видео.
            </video>
        {:else if finalVideoOptions.plyrProvider === 'youtube'}
            <div bind:this={videoElement} class="plyr__video-embed">
                <iframe
                    src="{finalVideoOptions.sources[0].src}?origin={typeof window !== 'undefined' ? window.location.origin : ''}&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1"
                    allowfullscreen
                    allowtransparency
                    allow="autoplay; fullscreen">
                </iframe>
            </div>
        {:else if finalVideoOptions.plyrProvider === 'vimeo'}
            <div bind:this={videoElement} class="plyr__video-embed">
                <iframe
                    src="{finalVideoOptions.sources[0].src}?loop=false&byline=false&portrait=false&title=false&speed=true&transparent=0&gesture=media"
                    allowfullscreen
                    allowtransparency
                    allow="autoplay; fullscreen">
                </iframe>
            </div>
        {/if}

        {#if contentDetails.transcript}
        <div class="transcript-section">
            <button class="transcript-toggle-enhanced" on:click={() => showTranscript = !showTranscript}>
                {showTranscript ? 'Скрыть' : 'Показать'} транскрипцию
            </button>
            {#if showTranscript}
                <div class="transcript-content">
                    <pre>{contentDetails.transcript}</pre>
                </div>
            {/if}
        </div>
        {/if}
    {:else}
        <p class="no-content-message-small">Видео не загружено или ссылка некорректна.</p>
    {/if}
</div>

    
<style>
    .video-item-display {
        padding: 10px 0;
    }
    .item-title {
        font-size: 1.3em;
        font-weight: var(--font-weight-semi-bold);
        color: var(--color-text-dark);
        margin-bottom: 12px;
    }
    /* Чтобы стили Plyr применялись корректно */
    .plyr__video-embed {
        border-radius: var(--spacing-border-radius-block);
        overflow: hidden; /* Для скругления углов у iframe */
        box-shadow: var(--color-shadow);
    }
     /* Для YouTube/Vimeo iframe, чтобы они занимали место, пока Plyr не инициализировался */
    .plyr__video-embed iframe {
        width: 100%;
        aspect-ratio: 16 / 9; /* Стандартное соотношение сторон для видео */
        border: none;
    }

    .transcript-section {
        margin-top: 15px;
    }
    .transcript-toggle {
        background-color: var(--color-bg-admin-button);
        color: var(--color-text-admin-button);
        border: 1px solid var(--color-border-admin-button);
        padding: 6px 12px;
        border-radius: var(--spacing-border-radius-button);
        cursor: pointer;
        font-size: 0.85rem;
    }
    .transcript-toggle:hover {
        background-color: var(--color-border-admin-button);
    }
    .transcript-content {
        margin-top: 10px;
        padding: 10px;
        background-color: var(--color-bg-ultra-light);
        border: 1px solid var(--color-border-light);
        border-radius: var(--spacing-border-radius-small);
        max-height: 200px;
        overflow-y: auto;
    }
    .transcript-content pre {
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: var(--font-family-secondary);
        font-size: 0.9rem;
        color: var(--color-text-muted);
        margin: 0;
    }
    .no-content-message-small {
        font-style: italic;
        color: #888;
        font-size: 0.9rem;
    }

    .transcript-toggle-enhanced {
    display: inline-flex; align-items: center; gap: 8px;
    background-color: var(--color-bg-light); color: var(--color-secondary);
    border: 1px solid var(--color-purple-light, #e0d8ff);
    padding: 8px 15px; border-radius: var(--spacing-border-radius-button);
    cursor: pointer; font-size: 0.9rem; font-weight: var(--font-weight-medium);
    transition: all 0.2s ease;
}
.transcript-toggle-enhanced:hover {
    background-color: var(--color-purple-light, #e0d8ff);
    color: var(--color-primary-dark); border-color: var(--color-secondary);
}
.transcript-toggle-enhanced > :global(svg):last-child {
    margin-left: auto; transition: transform 0.3s ease;
}
.transcript-toggle-enhanced[aria-expanded="true"] > :global(svg):last-child {
    transform: rotate(180deg);
}
</style>