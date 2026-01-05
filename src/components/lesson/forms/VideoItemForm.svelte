<script>
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { API_BASE_URL } from '../../../config.js';
    import { addNotification } from '../../../stores/notifications.js';

    export let itemToEdit = null;
    export let isLoading = false;

    const dispatch = createEventDispatcher();

    let title = '';
    let transcript = '';
    let video_file_original = null;
    let video_embed_url_input = '';
    let upload_type = 'embed'; // 'embed' или 'file'
    
    let current_video_file_url = null;
    let previewVideoUrl = null;
    let videoPlayerPreview;


    onMount(() => {
        if (itemToEdit && itemToEdit.content_details) {
            const cd = itemToEdit.content_details;
            title = cd.title || '';
            transcript = cd.transcript || '';
            current_video_file_url = cd.video_file_url;

            if (cd.video_embed_url) {
                upload_type = 'embed';
                video_embed_url_input = cd.video_embed_url;
                previewVideoUrl = null;
            } else if (cd.video_file_url) {
                upload_type = 'file';
                video_embed_url_input = '';
                previewVideoUrl = cd.video_file_url.startsWith('http') ? cd.video_file_url : `${API_BASE_URL}${cd.video_file_url}`;
            }
        }
    });

    function handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            video_file_original = file;
             if (previewVideoUrl && previewVideoUrl.startsWith('blob:')) {
                 URL.revokeObjectURL(previewVideoUrl);
            }
            previewVideoUrl = URL.createObjectURL(file);
            if (videoPlayerPreview) videoPlayerPreview.load();
        } else {
            video_file_original = null;
            if (previewVideoUrl && previewVideoUrl.startsWith('blob:')) {
                 URL.revokeObjectURL(previewVideoUrl);
            }
            if (current_video_file_url && upload_type === 'file') {
                 previewVideoUrl = current_video_file_url.startsWith('http') ? current_video_file_url : `${API_BASE_URL}${current_video_file_url}`;
            } else {
                previewVideoUrl = null;
            }
            if (videoPlayerPreview) videoPlayerPreview.load();
        }
    }

    async function handleSubmit() {
        if (upload_type === 'embed' && !video_embed_url_input.trim()) {
            addNotification('Пожалуйста, введите URL для встраивания видео.', 'warning');
            return;
        }
        if (upload_type === 'file' && !itemToEdit && !video_file_original) {
            addNotification('Пожалуйста, выберите видеофайл для загрузки.', 'warning');
            return;
        }

        const contentDataForJson = {
            title: title.trim(),
            transcript: transcript.trim(),
        };

        if (upload_type === 'embed') {
            contentDataForJson.video_embed_url = video_embed_url_input.trim();
        }

        const payload = new FormData();
        payload.append('item_type', 'video');
        payload.append('content_data', JSON.stringify(contentDataForJson));

        if (upload_type === 'file' && video_file_original) {
            payload.append('video_file', video_file_original);
        }
        dispatch('save', payload);
    }
    
    onDestroy(() => {
        if (previewVideoUrl && previewVideoUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewVideoUrl);
        }
    });
</script>

<form on:submit|preventDefault={handleSubmit} class="item-form">
    <div class="form-group">
        <label for="video-title">Заголовок (необязательно)</label>
        <input type="text" id="video-title" bind:value={title} disabled={isLoading} />
    </div>

    <div class="form-group">
        <label>Тип загрузки видео:</label>
        <div class="radio-group">
            <label><input type="radio" bind:group={upload_type} value="embed" name="upload_type"/> URL для встраивания (YouTube, Vimeo)</label>
            <label><input type="radio" bind:group={upload_type} value="file" name="upload_type"/> Загрузить файл</label>
        </div>
    </div>

    {#if upload_type === 'embed'}
        <div class="form-group">
            <label for="video-embed-url">URL видео (YouTube, Vimeo и т.п.)</label>
            <input type="url" id="video-embed-url" bind:value={video_embed_url_input} placeholder="https://www.youtube.com/watch?v=..." disabled={isLoading} />
        </div>
    {:else if upload_type === 'file'}
        <div class="form-group">
            <label for="video-file">Видеофайл</label>
            <input type="file" id="video-file" accept="video/*" on:change={handleFileChange} disabled={isLoading} />
            {#if previewVideoUrl}
                <div class="video-preview-container">
                    <p>Предпросмотр:</p>
                    <video bind:this={videoPlayerPreview} src={previewVideoUrl} controls style="width:100%; max-height: 300px;"></video>
                </div>
            {/if}
        </div>
    {/if}
    
    <div class="form-group">
        <label for="video-transcript">Транскрипция (необязательно)</label>
        <textarea id="video-transcript" bind:value={transcript} rows="5" disabled={isLoading}></textarea>
    </div>

    <div class="form-actions">
        <button type="submit" class="btn-save" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : (itemToEdit ? 'Обновить видео' : 'Добавить видео')}
        </button>
        <button type="button" class="btn-cancel" on:click={() => dispatch('close')} disabled={isLoading}>Отмена</button>
    </div>
</form>

<style>
    .item-form { display: flex; flex-direction: column; gap: 15px; }
    .form-group { display: flex; flex-direction: column; }
    .form-group label { margin-bottom: 5px; font-weight: 500; color: var(--color-text-muted); }
    .form-group input[type="text"], .form-group input[type="url"], .form-group input[type="file"], .form-group textarea {
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: var(--spacing-border-radius-small);
        font-size: 1rem;
    }
    .form-group input[type="text"]:focus, .form-group input[type="url"]:focus, .form-group textarea:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb, 175, 164, 255), 0.3);
        outline: none;
    }
    .radio-group { display: flex; flex-direction: column; gap: 5px; }
    .radio-group label { display: flex; align-items: center; gap: 5px; font-weight: normal; }
    .video-preview-container { margin-top: 10px; }
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