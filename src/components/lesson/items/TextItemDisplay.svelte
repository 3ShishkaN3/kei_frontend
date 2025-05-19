<script>
    import { marked } from 'marked'; // Убедитесь, что marked установлен: npm install marked
    
    export let contentDetails; // { title: string, content: string, is_markdown: boolean }
    
    // Рекомендуется настроить marked глобально, если это нужно, например, в main.js или App.svelte
    // import { marked } from 'marked';
    // marked.setOptions({
    //   gfm: true, // Включить GitHub Flavored Markdown
    //   breaks: true, // Преобразовывать одиночные переносы строк в <br>
    //   // sanitize: false, // НЕ ИСПОЛЬЗУЙТЕ ЭТО В MARKED 5+, используйте DOMPurify или аналоги на выходе.
    //                    // Для HTML, вставленного нашим редактором, мы ему доверяем.
    // });
    
    
    $: htmlContent = contentDetails?.is_markdown && contentDetails?.content
      ? marked.parse(contentDetails.content) // marked.parse() для marked v4+
      : contentDetails?.content;
    
    // Функция sanitizeHtml должна быть очень осторожной, если is_markdown=true,
    // т.к. marked.parse уже может содержать HTML (<u>, <span style="...">), который мы хотим сохранить.
    // Если is_markdown=false, то мы просто экранируем HTML и заменяем переносы строк.
    function sanitizeHtmlForDisplay(rawHtml, isMarkdownContent) {
      if (!rawHtml) return '';
      if (isMarkdownContent) {
        // Если это Markdown, мы доверяем выводу marked и нашему редактору.
        // Для более строгой безопасности на выходе можно использовать DOMPurify.
        // В данном случае, так как наш редактор вставляет только <u> и <span style="color">,
        // и marked обрабатывает остальное, этот подход допустим.
        return rawHtml;
      }
      // Для не-Markdown текста, экранируем HTML и заменяем переносы строк.
      const tempDiv = document.createElement('div');
      tempDiv.textContent = rawHtml; // Экранирует <, >, & и т.д.
      return tempDiv.innerHTML.replace(/\n/g, '<br>'); // Сохраняем переносы строк
    }
    
    $: safeHtmlContent = sanitizeHtmlForDisplay(htmlContent, contentDetails?.is_markdown);
    
    </script>
    
    <div class="text-item-display">
      {#if contentDetails?.title}
        <h3 class="item-title">{contentDetails.title}</h3>
      {/if}
      {#if safeHtmlContent}
        <div class="item-content markdown-content">
            {@html safeHtmlContent}
        </div>
      {:else}
        <p class="no-content-message-small">Текстовый блок пуст.</p>
      {/if}
    </div>
    
    <style>
    /* Ваши существующие стили из первого сообщения */
    .text-item-display {
        padding: 10px 0;
    }
    .item-title {
        font-size: 1.3em;
        font-weight: var(--font-weight-semi-bold);
        color: var(--color-text-dark);
        margin-bottom: 12px;
    }
    .item-content {
        font-size: 1rem;
        line-height: 1.7;
        color: var(--color-text-muted);
        /* Для не-markdown контента, чтобы переносы строк работали и текст переносился */
        white-space: pre-wrap;
        word-wrap: break-word;
    }
    /* Стили для Markdown контента */
    .markdown-content :global(h1),
    .markdown-content :global(h2),
    .markdown-content :global(h3),
    .markdown-content :global(h4),
    .markdown-content :global(h5),
    .markdown-content :global(h6) {
        margin-top: 1.2em;
        margin-bottom: 0.6em;
        font-weight: var(--font-weight-semi-bold);
        color: var(--color-text-dark);
    }
    .markdown-content :global(h1) { font-size: 1.8em; }
    .markdown-content :global(h2) { font-size: 1.6em; }
    .markdown-content :global(h3) { font-size: 1.4em; }
    .markdown-content :global(p) { margin-bottom: 1em; }
    .markdown-content :global(ul),
    .markdown-content :global(ol) {
        margin-left: 20px;
        margin-bottom: 1em;
    }
    .markdown-content :global(li) { margin-bottom: 0.3em; }
    .markdown-content :global(blockquote) {
        border-left: 4px solid var(--color-primary-light);
        padding-left: 15px;
        margin-left: 0;
        margin-right: 0;
        font-style: italic;
        color: var(--color-text-muted);
    }
    .markdown-content :global(pre) {
        background-color: var(--color-bg-ultra-light);
        padding: 10px;
        border-radius: var(--spacing-border-radius-small);
        overflow-x: auto;
        font-family: 'Courier New', Courier, monospace;
        white-space: pre; /* Для <pre> важен pre, а не pre-wrap из родителя */
    }
    .markdown-content :global(code) {
        background-color: #f0f0f0;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'Courier New', Courier, monospace;
    }
    .markdown-content :global(pre code) {
        background-color: transparent;
        padding: 0;
        /* white-space: pre;  Наследуется от pre */
    }
    .markdown-content :global(a) {
        color: var(--color-secondary);
        text-decoration: none;
    }
    .markdown-content :global(a:hover) {
        text-decoration: underline;
    }
    .markdown-content :global(img) {
        max-width: 100%;
        height: auto;
        border-radius: var(--spacing-border-radius-small);
        margin: 0.5em 0;
    }
    .markdown-content :global(u) {
        text-decoration: underline;
    }
    /* span[style*="color"] будет отрендерен с инлайн-стилем, обычно не требует глобального правила */
    
    .no-content-message-small {
        font-style: italic;
        color: #888;
        font-size: 0.9rem;
    }
    </style>