<script>
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { API_BASE_URL } from '../../../config.js';
    import { addNotification } from '../../../stores/notifications.js';

    export let itemToEdit = null;
    export let isLoading = false;

    const dispatch = createEventDispatcher();

    let title = '';
    let transcript = '';
    let audio_file_original = null;
    let current_audio_url = null;
    let previewAudioUrl = null;
    let audioPlayerPreview;


    onMount(() => {
        if (itemToEdit && itemToEdit.content_details) {
            title = itemToEdit.content_details.title || '';
            transcript = itemToEdit.content_details.transcript || '';
            current_audio_url = itemToEdit.content_details.audio_file_url;
            if (current_audio_url) {
                previewAudioUrl = current_audio_url.startsWith('http') ? current_audio_url : `${API_BASE_URL}${current_audio_url}`;
            }
        }
    });

    function handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            audio_file_original = file;
            if (previewAudioUrl && previewAudioUrl.startsWith('blob:')) {
                 URL.revokeObjectURL(previewAudioUrl);
            }
            previewAudioUrl = URL.createObjectURL(file);
             if(audioPlayerPreview) audioPlayerPreview.load();
        } else {
            audio_file_original = null;
            if (previewAudioUrl && previewAudioUrl.startsWith('blob:')) {
                 URL.revokeObjectURL(previewAudioUrl);
            }
            if (current_audio_url) {
                 previewAudioUrl = current_audio_url.startsWith('http') ? current_audio_url : `${API_BASE_URL}${current_audio_url}`;
            } else {
                previewAudioUrl = null;
            }
            if(audioPlayerPreview) audioPlayerPreview.load();
        }
    }

    async function handleSubmit() {
        if (!itemToEdit && !audio_file_original) {
            addNotification('Пожалуйста, выберите аудиофайл.', 'warning');
            return;
        }

        const contentDataForJson = {
            title: title.trim(),
            transcript: transcript.trim(),
        };

        const payload = new FormData();
        payload.append('item_type', 'audio');
        payload.append('content_data', JSON.stringify(contentDataForJson));

        if (audio_file_original) {
            payload.append('audio_file', audio_file_original);
        }

        dispatch('save', payload);
    }
    
    onDestroy(() => {
        if (previewAudioUrl && previewAudioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewAudioUrl);
        }
    });
</script>

<form on:submit|preventDefault={handleSubmit} class="item-form">
    <div class="form-group">
        <label for="audio-title">Заголовок (необязательно)</label>
        <input type="text" id="audio-title" bind:value={title} disabled={isLoading} />
    </div>

    <div class="form-group">
        <label for="audio-file">Аудиофайл</label>
        <input type="file" id="audio-file" accept="audio/*" on:change={handleFileChange} disabled={isLoading} />
        {#if previewAudioUrl}
            <div class="audio-preview-container">
                <p>Предпросмотр:</p>
                <audio bind:this={audioPlayerPreview} src={previewAudioUrl} controls style="width:100%;"></audio>
            </div>
        {/if}
    </div>
    
    <div class="form-group">
        <label for="audio-transcript">Транскрипция (необязательно)</label>
        <textarea id="audio-transcript" bind:value={transcript} rows="5" disabled={isLoading}></textarea>
    </div>

    <div class="form-actions">
        <button type="submit" class="btn-save" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : (itemToEdit ? 'Обновить аудио' : 'Добавить аудио')}
        </button>
        <button type="button" class="btn-cancel" on:click={() => dispatch('close')} disabled={isLoading}>Отмена</button>
    </div>
</form>

<style>
    .item-form { display: flex; flex-direction: column; gap: 15px; }
    .form-group { display: flex; flex-direction: column; }
    .form-group label { margin-bottom: 5px; font-weight: 500; color: var(--color-text-muted); }
    .form-group input[type="text"], .form-group input[type="file"], .form-group textarea {
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
    .audio-preview-container { margin-top: 10px; }
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