<script>
    import { marked } from 'marked'; // Импортируем marked
    import { onMount } from 'svelte';

    export let contentDetails = null; // { content: '...', is_markdown: true/false }

    let renderedHtml = '';

    $: if (contentDetails) {
        if (contentDetails.is_markdown) {
            try {
                // Используем опции для безопасности и GitHub Flavored Markdown
                renderedHtml = marked.parse(contentDetails.content || '', { breaks: true, gfm: true });
            } catch (e) {
                console.error("Ошибка парсинга Markdown:", e);
                renderedHtml = '<p>Ошибка отображения Markdown</p>';
            }
        } else {
            // Простой текст, экранируем HTML на всякий случай (или просто выводим как есть, если доверяем источнику)
            // Для простоты выводим как есть, но с white-space: pre-wrap
            renderedHtml = contentDetails.content || '';
        }
    } else {
        renderedHtml = '';
    }
</script>

<div class="text-content {contentDetails?.is_markdown ? 'markdown' : 'plain'}">
    {#if contentDetails?.is_markdown}
        {@html renderedHtml}
    {:else}
        {renderedHtml}
    {/if}
</div>

<style>
    .text-content {
        word-wrap: break-word;
         line-height: 1.6;
    }
    .text-content.plain {
         white-space: pre-wrap; /* Сохраняет пробелы и переносы для простого текста */
    }
    .text-content.markdown :global(p) { margin-bottom: 1em; }
    .text-content.markdown :global(h1),
    .text-content.markdown :global(h2),
    .text-content.markdown :global(h3) { margin-top: 1.5em; margin-bottom: 0.5em; }
    .text-content.markdown :global(ul),
    .text-content.markdown :global(ol) { padding-left: 2em; margin-bottom: 1em; }
    .text-content.markdown :global(code) { background-color: #f0f0f0; padding: 0.2em 0.4em; border-radius: 3px; }
    .text-content.markdown :global(pre) { background-color: #f0f0f0; padding: 1em; border-radius: 4px; overflow-x: auto; }
    .text-content.markdown :global(pre code) { background-color: transparent; padding: 0; }
    .text-content.markdown :global(blockquote) { border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0; color: #555; }
    .text-content.markdown :global(img) { max-width: 100%; height: auto; }
    /* Добавьте другие стили для Markdown по необходимости */
</style>