      
<script>
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { API_BASE_URL } from '../../../config.js';
    import { addNotification } from '../../../stores/notifications.js';

    export let itemToEdit = null;
    export let isLoading = false;

    const dispatch = createEventDispatcher();

    let title = '';
    let document_file_original = null;
    let current_document_url = null;
    let fileNamePreview = null;


    onMount(() => {
        if (itemToEdit && itemToEdit.content_details) {
            title = itemToEdit.content_details.title || '';
            current_document_url = itemToEdit.content_details.document_file_url;
            if (current_document_url) {
                fileNamePreview = current_document_url.split('/').pop();
            }
        }
    });

    function handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            document_file_original = file;
            fileNamePreview = file.name;
        } else {
            document_file_original = null;
            if (current_document_url) {
                fileNamePreview = current_document_url.split('/').pop();
            } else {
                fileNamePreview = null;
            }
        }
    }

    async function handleSubmit() {
        if (!itemToEdit && !document_file_original) {
            addNotification('Пожалуйста, выберите PDF файл.', 'warning');
            return;
        }

        const contentDataForJson = {
            title: title.trim(),
        };

        const payload = new FormData();
        payload.append('item_type', 'document');
        payload.append('content_data', JSON.stringify(contentDataForJson));

        if (document_file_original) {
            payload.append('document_file', document_file_original);
        }

        dispatch('save', payload);
    }
</script>

    

<form on:submit|preventDefault={handleSubmit} class="item-form">
    <div class="form-group">
        <label for="document-title">Заголовок (необязательно)</label>
        <input type="text" id="document-title" bind:value={title} disabled={isLoading} />
    </div>

    <div class="form-group">
        <label for="document-file">PDF Файл</label>
        <input type="file" id="document-file" accept=".pdf" on:change={handleFileChange} disabled={isLoading} />
        {#if fileNamePreview}
            <p class="file-name-preview">Выбран файл: {fileNamePreview}</p>
        {/if}
    </div>
    
    <div class="form-actions">
        <button type="submit" class="btn-save" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : (itemToEdit ? 'Обновить документ' : 'Добавить документ')}
        </button>
        <button type="button" class="btn-cancel" on:click={() => dispatch('close')} disabled={isLoading}>Отмена</button>
    </div>
</form>

<style>
    .item-form { display: flex; flex-direction: column; gap: 15px; }
    .form-group { display: flex; flex-direction: column; }
    .form-group label { margin-bottom: 5px; font-weight: 500; color: var(--color-text-muted); }
    .form-group input[type="text"], .form-group input[type="file"] {
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: var(--spacing-border-radius-small);
        font-size: 1rem;
    }
    .form-group input[type="text"]:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb, 175, 164, 255), 0.3);
        outline: none;
    }
    .file-name-preview { font-size: 0.9em; color: #555; margin-top: 5px; font-style: italic; }
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
</style>