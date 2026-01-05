
<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import ContextMenu from '../../utils/ContextMenu.svelte';
  import TextItemDisplay from '../items/TextItemDisplay.svelte';
  
  export let itemToEdit = null;
  export let isLoading = false;
  
  const dispatch = createEventDispatcher();
  
  let title = '';
  let content = '';
  let is_markdown = true;
  
  let currentView = 'edit'; // или 'preview'
  
  let textareaElement;
  let contextMenuVisible = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let selectionStart = 0;
  let selectionEnd = 0;
  
  let colorPickerVisible = false;
  let colorPickerInput;
  
  let longPressTimer = null;
  let touchStartX = 0;
  let touchStartY = 0;
  const LONG_PRESS_DURATION = 600;
  const MAX_TOUCH_MOVE_THRESHOLD = 15;
  
  const defaultColors = ['#D0021B', '#F5A623', '#F8E71C', '#7ED321', '#4A90E2', '#9013FE', '#000000', '#4A4A4A', '#9B9B9B', '#FFFFFF'];
  
  const contextMenuOptions = [
    { label: 'Жирный', action: 'bold' },
    { label: 'Курсив', action: 'italic' },
    { label: 'Подчеркнутый (HTML)', action: 'underline' },
    { label: 'Зачеркнутый', action: 'strikethrough' },
    { type: 'separator' },
    { label: 'Заголовок 1', action: 'h1' },
    { label: 'Заголовок 2', action: 'h2' },
    { label: 'Заголовок 3', action: 'h3' },
    { type: 'separator' },
    { label: 'Список (маркированный)', action: 'ul' },
    { label: 'Список (нумерованный)', action: 'ol' },
    { type: 'separator' },
    { label: 'Цитата', action: 'blockquote'},
    { label: 'Код (строчный)', action: 'inline_code' },
    { label: 'Код (блок)', action: 'code_block' },
    { type: 'separator' },
    {
      label: 'Цвет текста',
      type: 'color-palette',
      colors: defaultColors,
      allowMore: true
    },
    ...('EyeDropper' in window ? [{ label: 'Пипетка', action: 'eyedropper', type: 'eyedropper-trigger' }] : []),
    { type: 'separator' },
    { label: 'Ссылка', action: 'link' },
    { label: 'Изображение', action: 'image' },
  ];
  
  function adjustMenuPosition(x, y, menuElement) {
    if (!menuElement) return { x, y };
    const menuRect = menuElement.getBoundingClientRect();
    const menuWidth = menuRect.width || 200;
    const menuHeight = menuRect.height || 300;
    let newX = x;
    let newY = y;
    if (x + menuWidth > window.innerWidth) newX = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) newY = window.innerHeight - menuHeight - 10;
    if (newX < 10) newX = 10;
    if (newY < 10) newY = 10;
    return { x: newX, y: newY };
  }
  
  function showContextMenu(clientX, clientY) {
      selectionStart = textareaElement.selectionStart;
      selectionEnd = textareaElement.selectionEnd;
      contextMenuX = clientX;
      contextMenuY = clientY;
      contextMenuVisible = true;
      colorPickerVisible = false;
      setTimeout(() => {
          const menuEl = document.querySelector('.custom-context-menu');
          if(menuEl) {
              const pos = adjustMenuPosition(clientX, clientY, menuEl);
              contextMenuX = pos.x;
              contextMenuY = pos.y;
          }
      }, 0);
  }
  
  function handleTextareaContextMenu(event) {
    if (!is_markdown || currentView === 'preview') return;
    event.preventDefault();
    showContextMenu(event.clientX, event.clientY);
  }
  
  function handleTouchStart(event) {
    if (!is_markdown || event.touches.length > 1 || currentView === 'preview') return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    longPressTimer = setTimeout(() => {
      event.preventDefault();
      showContextMenu(touchStartX, touchStartY);
      longPressTimer = null;
    }, LONG_PRESS_DURATION);
  }
  
  function handleTouchMove(event) {
    if (longPressTimer) {
      const deltaX = Math.abs(touchStartX - event.touches[0].clientX);
      const deltaY = Math.abs(touchStartY - event.touches[0].clientY);
      if (deltaX > MAX_TOUCH_MOVE_THRESHOLD || deltaY > MAX_TOUCH_MOVE_THRESHOLD) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
  }
  
  function handleTouchEnd() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }
  
  function handleClickOutside(event) {
    if (contextMenuVisible && !event.target.closest('.custom-context-menu')) {
      contextMenuVisible = false;
    }
    if (colorPickerVisible && event.target !== colorPickerInput && !event.target.closest('.custom-context-menu')) {
       colorPickerVisible = false;
    }
  }
  
  function handleEscKey(event) {
    if (event.key === 'Escape') {
      if (colorPickerVisible) colorPickerVisible = false;
      else if (contextMenuVisible) contextMenuVisible = false;
      else if (currentView === 'preview') currentView = 'edit';
    }
  }
  
  function applyMarkdown(prefix, suffix = prefix, placeholder = "текст", block = false) {
    const currentContent = content;
    const selStart = selectionStart;
    const selEnd = selectionEnd;
    const selectedText = currentContent.substring(selStart, selEnd);
    let newText;
    let finalSelectionStart = selStart;
    let finalSelectionEnd = selEnd;
  
    if (block) {
        let startOfLine = currentContent.lastIndexOf('\n', selStart -1) + 1;
        let endOfLineSearchStart = selEnd > 0 ? selEnd -1 : 0;
        let endOfLine = currentContent.indexOf('\n', endOfLineSearchStart);
        if (endOfLine === -1 || endOfLine < selStart) endOfLine = currentContent.length;
        if (selEnd > startOfLine && currentContent[selEnd-1] === '\n' && endOfLine >= selEnd) {
          endOfLine = selEnd-1;
        }
        let lineText = currentContent.substring(startOfLine, endOfLine);
        const trimmedPrefix = prefix.trim();
        if (lineText.startsWith(trimmedPrefix + " ") && trimmedPrefix !== '') {
            lineText = lineText.substring(trimmedPrefix.length + 1);
        } else if (lineText.startsWith(prefix) && suffix === '') {
            lineText = lineText.substring(prefix.length);
        } else {
            lineText = prefix + lineText;
        }
        newText = currentContent.substring(0, startOfLine) + lineText + currentContent.substring(endOfLine);
        finalSelectionStart = startOfLine;
        finalSelectionEnd = startOfLine + lineText.length;
    } else if (selectedText) {
      if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length >= (prefix + suffix).length) {
          newText = selectedText.substring(prefix.length, selectedText.length - suffix.length);
      } else {
          newText = prefix + selectedText + suffix;
      }
      finalSelectionEnd = selStart + newText.length;
    } else {
      newText = prefix + placeholder + suffix;
      finalSelectionStart = selStart + prefix.length;
      finalSelectionEnd = finalSelectionStart + placeholder.length;
    }
  
    if (block) {
         content = newText;
    } else {
        content = currentContent.substring(0, selStart) + newText + currentContent.substring(selEnd);
    }
  
    setTimeout(() => {
      if (textareaElement) {
          textareaElement.focus();
          textareaElement.setSelectionRange(finalSelectionStart, finalSelectionEnd);
      }
      selectionStart = finalSelectionStart;
      selectionEnd = finalSelectionEnd;
    }, 0);
  }
  
  function applyList(marker) {
    const currentContent = content;
    let start = selectionStart;
    while(start > 0 && currentContent[start-1] !== '\n') { start--; }
    let end = selectionEnd;
    if (selectionStart === selectionEnd || currentContent.substring(selectionStart, selectionEnd).indexOf('\n') === -1) {
      while(end < currentContent.length && currentContent[end] !== '\n') { end++; }
    } else {
      while(end < currentContent.length && currentContent[end-1] !== '\n') { end++; }
      if (end < currentContent.length && currentContent[end-1] === '\n') end--;
    }
    const linesBlock = currentContent.substring(start, end);
    const lines = linesBlock.split('\n');
    let newLines = [];
    let counter = 1;
    let listPrefixRegex;
    if (marker === '1. ') { listPrefixRegex = /^\d+\. /; }
    else { listPrefixRegex = new RegExp(`^\\${marker.trim()} `); }
    let allLinesAreListItemsOfThisType = lines.length > 0;
    if (allLinesAreListItemsOfThisType) {
        for (const line of lines) {
            if (line.trim() !== '' && !listPrefixRegex.test(line)) {
                allLinesAreListItemsOfThisType = false; break;
            }
        }
    }
    lines.forEach(line => {
        const lineHasContent = line.trim() !== '';
        if (allLinesAreListItemsOfThisType && lineHasContent) {
            newLines.push(line.replace(listPrefixRegex, ''));
        } else if (lineHasContent) {
            const cleanLine = line.replace(/^(?:\* |- |\d+\. )/, '');
            if (marker === '1. ') { newLines.push(`${counter}. ${cleanLine}`); counter++; }
            else { newLines.push(`${marker.trim()} ${cleanLine}`); }
        } else if (lines.length === 1 && !lineHasContent) {
            if (marker === '1. ') { newLines.push(`${counter}. `); }
            else { newLines.push(`${marker.trim()} `); }
        } else { newLines.push(line); }
    });
    const newBlock = newLines.join('\n');
    content = currentContent.substring(0, start) + newBlock + currentContent.substring(end);
    const newSelectionEnd = start + newBlock.length;
    setTimeout(() => {
      if(textareaElement) {
          textareaElement.focus();
          textareaElement.setSelectionRange(start, newSelectionEnd);
      }
      selectionStart = start; selectionEnd = newSelectionEnd;
    }, 0);
  }
  
  function applyStyle(styleProperty, value, placeholder = "текст") {
    const currentContent = content;
    const selStart = selectionStart;
    const selEnd = selectionEnd;
    const selectedText = currentContent.substring(selStart, selEnd);
    let newText;
    const tagOpen = `<span style="${styleProperty}: ${value};">`;
    const tagClose = `</span>`;
    const textToCheckBefore = currentContent.substring(0, selStart);
    const textToCheckAfter = currentContent.substring(selEnd);
  
    if (selectedText && textToCheckBefore.endsWith(tagOpen) && textToCheckAfter.startsWith(tagClose)) {
        newText = selectedText;
        content = textToCheckBefore.slice(0, -tagOpen.length) + selectedText + textToCheckAfter.slice(tagClose.length);
        setTimeout(() => {
          if(textareaElement) textareaElement.focus();
          const finalSelStart = selStart - tagOpen.length;
          const finalSelEnd = finalSelStart + selectedText.length;
          if(textareaElement) textareaElement.setSelectionRange(finalSelStart, finalSelEnd);
          selectionStart = finalSelStart; selectionEnd = finalSelEnd;
        }, 0);
    } else {
        if (selectedText) { newText = tagOpen + selectedText + tagClose; }
        else { newText = tagOpen + placeholder + tagClose; }
        content = currentContent.substring(0, selStart) + newText + currentContent.substring(selEnd);
        const finalSelStart = selectedText ? selStart + tagOpen.length : selStart + tagOpen.length;
        const finalSelEnd = selectedText ? finalSelStart + selectedText.length : finalSelStart + placeholder.length;
        setTimeout(() => {
          if(textareaElement) {
              textareaElement.focus();
              textareaElement.setSelectionRange(finalSelStart, finalSelEnd);
          }
          selectionStart = finalSelStart; selectionEnd = finalSelEnd;
        }, 0);
    }
  }
  
  async function handleContextMenuSelect(event) {
    const { action, value } = event.detail;
    if(textareaElement) {
        textareaElement.focus();
        textareaElement.setSelectionRange(selectionStart, selectionEnd);
    }
  
    switch (action) {
      case 'bold': applyMarkdown('**', '**', 'жирный текст'); break;
      case 'italic': applyMarkdown('*', '*', 'курсив'); break;
      case 'underline': applyMarkdown('<u>', '</u>', 'подчеркнутый'); break;
      case 'strikethrough': applyMarkdown('~~', '~~', 'зачеркнутый'); break;
      case 'h1': applyMarkdown('# ', '', 'Заголовок 1', true); break;
      case 'h2': applyMarkdown('## ', '', 'Заголовок 2', true); break;
      case 'h3': applyMarkdown('### ', '', 'Заголовок 3', true); break;
      case 'ul': applyList('* '); break;
      case 'ol': applyList('1. '); break;
      case 'blockquote': applyMarkdown('> ', '', 'цитата', true); break;
      case 'inline_code': applyMarkdown('`', '`', 'код'); break;
      case 'code_block': applyMarkdown('\n```\n', '\n```\n', 'код здесь', false); break;
      case 'link': {
          const tempSelStart = textareaElement?.selectionStart ?? selectionStart;
          const tempSelEnd = textareaElement?.selectionEnd ?? selectionEnd;
          const url = prompt('Введите URL ссылки:', 'https://');
          if(textareaElement) {
              textareaElement.focus(); textareaElement.setSelectionRange(tempSelStart, tempSelEnd);
          }
          selectionStart = tempSelStart; selectionEnd = tempSelEnd;
          if (url) { applyMarkdown('[', `](${url})`, selectionEnd > selectionStart ? content.substring(selectionStart, selectionEnd) : 'текст ссылки'); }
          else { contextMenuVisible = false; }
        } break;
      case 'image': {
          const tempSelStart = textareaElement?.selectionStart ?? selectionStart;
          const tempSelEnd = textareaElement?.selectionEnd ?? selectionEnd;
          const imageUrl = prompt('Введите URL изображения:', 'https://');
          if(textareaElement) {
              textareaElement.focus(); textareaElement.setSelectionRange(tempSelStart, tempSelEnd);
          }
          selectionStart = tempSelStart; selectionEnd = tempSelEnd;
          if (imageUrl) { applyMarkdown('![', `](${imageUrl})`, selectionEnd > selectionStart ? content.substring(selectionStart, selectionEnd) : 'alt текст');}
          else { contextMenuVisible = false; }
        } break;
      case 'set_color':
        if (value) { applyStyle('color', value, 'цветной текст'); }
        break;
      case 'eyedropper':
        if ('EyeDropper' in window) {
          const eyeDropper = new EyeDropper();
          try {
            contextMenuVisible = false;
            const result = await eyeDropper.open();
            applyStyle('color', result.sRGBHex, 'цветной текст');
          } catch (e) {
            console.log('EyeDropper Canceled or Error:', e);
          }
        }
        break;
    }
  }
  
  function onRequestColorPicker() {
    colorPickerVisible = true;
    selectionStart = textareaElement?.selectionStart ?? selectionStart;
    selectionEnd = textareaElement?.selectionEnd ?? selectionEnd;
    setTimeout(() => colorPickerInput?.click(), 0);
  }
  
  function handleColorSelectedFromNativePicker(event) {
    const color = event.target.value;
    if(textareaElement) {
        textareaElement.focus();
        textareaElement.setSelectionRange(selectionStart, selectionEnd);
    }
    if (color) {
      applyStyle('color', color, 'цветной текст');
    }
    colorPickerVisible = false;
  }
  
  onMount(() => {
    if (itemToEdit) {
      title = itemToEdit.content_details?.title || '';
      content = itemToEdit.content_details?.content || '';
      is_markdown = itemToEdit.content_details?.is_markdown === undefined ? true : itemToEdit.content_details.is_markdown;
    }
    window.addEventListener('click', handleClickOutside, true);
    window.addEventListener('keydown', handleEscKey);
  });
  
  onDestroy(() => {
    window.removeEventListener('click', handleClickOutside, true);
    window.removeEventListener('keydown', handleEscKey);
    if (longPressTimer) clearTimeout(longPressTimer);
  });
  
  function handleSubmit() {
    if (!title.trim() && !content.trim()) {
      alert('Заполните заголовок или содержание текстового блока.');
      return;
    }
    dispatch('save', {
      item_type: 'text',
      content_data: { title: title.trim(), content: content, is_markdown: is_markdown }
    });
  }
  
  $: previewContentDetails = {
    title: title,
    content: content,
    is_markdown: is_markdown
  };
  
  </script>
  
  <form on:submit|preventDefault={handleSubmit} class="item-form">
    <div class="form-group">
        <label for="text-title">Заголовок (необязательно)</label>
        <input type="text" id="text-title" bind:value={title} disabled={isLoading} />
    </div>
  
    <div class="view-switcher">
      <button
        type="button"
        class:active={currentView === 'edit'}
        on:click={() => currentView = 'edit'}
        disabled={isLoading}
      >Редактировать</button>
      <button
        type="button"
        class:active={currentView === 'preview'}
        on:click={() => currentView = 'preview'}
        disabled={isLoading || !is_markdown} title={!is_markdown ? "Предпросмотр доступен только для Markdown" : ""}
      >Предпросмотр</button>
    </div>
  
    <div class="form-group content-area">
        {#if currentView === 'edit'}
          <label for="text-content">Содержание</label>
          <textarea
              id="text-content"
              bind:value={content}
              bind:this={textareaElement}
              on:contextmenu={handleTextareaContextMenu}
              on:touchstart={handleTouchStart}
              on:touchmove={handleTouchMove}
              on:touchend={handleTouchEnd}
              rows="10"
              disabled={isLoading}></textarea>
        {:else if currentView === 'preview'}
          <label>Предпросмотр содержания</label>
          <div class="preview-box">
              {#if is_markdown}
                  <TextItemDisplay contentDetails={previewContentDetails} />
              {:else}
                  <div class="non-markdown-preview">
                      {content.split('\n').map(line => `<p>${line.replace(/</g, '<').replace(/>/g, '>')}</p>`).join('')}
                  </div>
              {/if}
          </div>
        {/if}
    </div>
  
    <div class="form-group form-group-checkbox">
        <input type="checkbox" id="text-is-markdown" bind:checked={is_markdown} disabled={isLoading}
          on:change={() => { if (!is_markdown) currentView = 'edit'; }} />
        <label for="text-is-markdown">Использовать Markdown разметку</label>
    </div>
    <div class="form-actions">
        <button type="submit" class="btn-save" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : (itemToEdit ? 'Обновить текст' : 'Добавить текст')}
        </button>
        <button type="button" class="btn-cancel" on:click={() => dispatch('close')} disabled={isLoading}>Отмена</button>
    </div>
  </form>
  
  <ContextMenu
    bind:visible={contextMenuVisible}
    x={contextMenuX}
    y={contextMenuY}
    options={contextMenuOptions}
    on:select={handleContextMenuSelect}
    on:close={() => contextMenuVisible = false}
    on:requestColorPicker={onRequestColorPicker}
  />
  
  {#if colorPickerVisible}
    <input
      type="color"
      bind:this={colorPickerInput}
      on:input={handleColorSelectedFromNativePicker}
      on:change={handleColorSelectedFromNativePicker}
      on:blur={() => {if(colorPickerVisible) colorPickerVisible = false}}
      class="hidden-color-picker"
      aria-label="Выбрать цвет"
    />
  {/if}
  
  <style>
    .item-form { display: flex; flex-direction: column; gap: 15px; }
    .form-group { display: flex; flex-direction: column; }
    .form-group label { margin-bottom: 5px; font-weight: 500; color: var(--color-text-muted); }
    .form-group input[type="text"], .form-group textarea {
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: var(--spacing-border-radius-small);
        font-size: 1rem;
    }
    .form-group input[type="text"]:focus, .form-group textarea:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb, 175, 164, 255), 0.3);
        outline: none;
    }
    .form-group-checkbox { flex-direction: row; align-items: center; gap: 8px; }
    .form-group-checkbox label { margin-bottom: 0; }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px; }
    .btn-save {
        background-color: var(--color-primary);
        color: white; padding: 10px 15px; border: none;
        border-radius: var(--spacing-border-radius-button); cursor: pointer;
    }
    .btn-save:hover:not(:disabled) { background-color: var(--color-purple-hover); }
    .btn-save:disabled { background-color: #ccc; }
    .btn-cancel {
        background-color: #f0f0f0; color: #333; padding: 10px 15px;
        border: 1px solid #ccc; border-radius: var(--spacing-border-radius-button); cursor: pointer;
    }
    .btn-cancel:hover:not(:disabled) { background-color: #e0e0e0; }
  
    .hidden-color-picker {
      position: fixed; opacity: 0; pointer-events: none;
      width: 1px; height: 1px; top: -10px; left: -10px;
    }
  
    .view-switcher {
      display: flex;
      margin-bottom: 10px;
      border: 1px solid #ccc;
      border-radius: var(--spacing-border-radius-small);
      overflow: hidden;
    }
    .view-switcher button {
      flex: 1;
      padding: 8px 10px;
      background-color: #f0f0f0;
      border: none;
      border-right: 1px solid #ccc;
      cursor: pointer;
      font-size: 0.9rem;
      color: #555;
    }
    .view-switcher button:last-child {
      border-right: none;
    }
    .view-switcher button.active {
      background-color: var(--color-primary-light, #e0e0ff);
      color: var(--color-primary, #5439FF);
      font-weight: 500;
    }
    .view-switcher button:hover:not(.active):not(:disabled) {
      background-color: #e7e7e7;
    }
     .view-switcher button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  
    .content-area label {
      margin-bottom: 5px;
    }
  
    .preview-box {
      min-height: 150px;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: var(--spacing-border-radius-small);
      background-color: #f9f9f9;
      overflow-y: auto;
    }
    .non-markdown-preview p {
      margin: 0 0 0.5em 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>