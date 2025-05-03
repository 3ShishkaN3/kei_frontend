<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { fly } from 'svelte/transition';
    import Close from 'svelte-material-icons/Close.svelte';

    export let courseToEdit = null; // null для создания, объект для редактирования

    const dispatch = createEventDispatcher();

    let title = '';
    let subtitle = '';
    let description = '';
    let status = 'draft'; // 'draft', 'published', 'free'
    let coverImageFile = null;
    let currentImageUrl = null; // Для отображения текущего изображения при редактировании
    let imagePreviewUrl = null; // Для предпросмотра нового изображения

    let isLoading = false;
    let errors = {}; // { title: ['Error message'], ... }

    onMount(() => {
        if (courseToEdit) {
            title = courseToEdit.title || '';
            subtitle = courseToEdit.subtitle || '';
            description = courseToEdit.description || '';
            status = courseToEdit.status || 'draft';
            currentImageUrl = courseToEdit.cover_image; // URL текущего изображения
        }
    });

    function handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            coverImageFile = file;
            // Создаем URL для предпросмотра
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreviewUrl = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            coverImageFile = null;
            imagePreviewUrl = null;
        }
    }

    async function handleSubmit() {
        isLoading = true;
        errors = {};

        // Используем FormData для отправки файла и данных
        const formData = new FormData();
        formData.append('title', title);
        formData.append('subtitle', subtitle);
        formData.append('description', description);
        formData.append('status', status);

        // Добавляем файл, только если он был выбран
        if (coverImageFile) {
            formData.append('cover_image', coverImageFile);
        } else if (!courseToEdit && !currentImageUrl) {
            // Если это создание нового курса и файл не выбран,
            // можно отправить пустой 'cover_image' или не отправлять,
            // в зависимости от логики бэкенда (будет ли он использовать default).
            // formData.append('cover_image', ''); // Раскомментируйте, если нужно
        }
         // Если при редактировании файл не менялся, поле cover_image не отправляется,
         // бэкенд не должен удалять старое изображение.

        dispatch('save', formData);

        // Сброс isLoading должен произойти в родительском компоненте после ответа API
        // isLoading = false; // Не сбрасываем здесь
    }

    function closeModal() {
        dispatch('close');
    }

    // Закрытие по клику вне окна
    function handleBackdropClick(event) {
        if (event.target === event.currentTarget) {
            closeModal();
        }
    }
    // Закрытие по Escape
    function handleKeydown(event) {
         if (event.key === 'Escape') {
             closeModal();
         }
    }

</script>

<svelte:window on:keydown={handleKeydown}/>

<div class="modal-backdrop" on:click={handleBackdropClick} transition:fly={{ y: -20, duration: 200 }}>
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button class="close-button" on:click={closeModal} aria-label="Закрыть окно">
            <Close size="24px" />
        </button>

        <h2 id="modal-title">{courseToEdit ? 'Редактировать курс' : 'Создать новый курс'}</h2>

        <form on:submit|preventDefault={handleSubmit}>
            <div class="form-group">
                <label for="title">Название курса</label>
                <input type="text" id="title" bind:value={title} required />
                {#if errors.title}<span class="error-text">{errors.title.join(', ')}</span>{/if}
            </div>

            <div class="form-group">
                <label for="subtitle">Подзаголовок (краткое описание)</label>
                <input type="text" id="subtitle" bind:value={subtitle} />
                 {#if errors.subtitle}<span class="error-text">{errors.subtitle.join(', ')}</span>{/if}
            </div>

            <div class="form-group">
                <label for="description">Полное описание</label>
                <textarea id="description" rows="4" bind:value={description} required></textarea>
                 {#if errors.description}<span class="error-text">{errors.description.join(', ')}</span>{/if}
            </div>

            <div class="form-group">
                <label for="status">Статус курса</label>
                <select id="status" bind:value={status} required>
                    <option value="draft">Черновик (виден только вам)</option>
                    <option value="published">Опубликован (виден всем, платный/по записи)</option>
                    <option value="free">Бесплатный (виден всем, доступен для записи)</option>
                </select>
                 {#if errors.status}<span class="error-text">{errors.status.join(', ')}</span>{/if}
            </div>

            <div class="form-group">
                <label for="cover_image">Баннер курса</label>
                <input type="file" id="cover_image" accept="image/png, image/jpeg, image/webp" on:change={handleFileChange} />
                 {#if errors.cover_image}<span class="error-text">{errors.cover_image.join(', ')}</span>{/if}

                {#if imagePreviewUrl}
                    <div class="image-preview">
                         <p>Новый баннер:</p>
                        <img src={imagePreviewUrl} alt="Предпросмотр баннера" />
                    </div>
                {:else if currentImageUrl}
                     <div class="image-preview">
                        <p>Текущий баннер:</p>
                        <img src={currentImageUrl} alt="Текущий баннер курса" />
                    </div>
                {/if}
            </div>

            <div class="form-actions">
                <button type="button" class="button secondary" on:click={closeModal} disabled={isLoading}>Отмена</button>
                <button type="submit" class="button primary" disabled={isLoading}>
                    {#if isLoading}Сохранение...{:else}Сохранить{/if}
                </button>
            </div>
             {#if errors.non_field_errors}<p class="error-text non-field">{errors.non_field_errors.join(', ')}</p>{/if}
        </form>
    </div>
</div>

<style>
    :root { /* Берем цвета из Courses.svelte или определяем здесь */
        --purple-light: #C2B6FC;
        --text-dark: #333;
        --text-muted: #555;
        --danger-red: #dc3545;
        --bg-light: #fff;
        --border-light: #ccc;
        --primary-action: #4D44B5; /* Темно-синий для основной кнопки */
        --primary-action-hover: #5f55d1;
    }
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000; /* Выше всего остального */
         backdrop-filter: blur(4px);
    }

    .modal-content {
        background-color: var(--bg-light);
        padding: 25px 30px;
        border-radius: 10px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    }

    .close-button {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-muted);
        padding: 5px;
        line-height: 1;
    }
    .close-button:hover {
        color: var(--text-dark);
    }

    h2 {
        margin-top: 0;
        margin-bottom: 20px;
        color: var(--text-dark);
        font-size: 1.5rem;
        text-align: center;
    }

    .form-group {
        margin-bottom: 18px;
    }

    label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
        color: var(--text-dark);
        font-size: 0.9rem;
    }
    label:has(+[required])::after { /* Добавляем звездочку к обязательным полям */
        content: ' *';
        color: var(--danger-red);
    }

    input[type="text"],
    textarea,
    select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--border-light);
        border-radius: 6px;
        font-size: 1rem;
        box-sizing: border-box;
        transition: border-color 0.2s ease;
    }
    input[type="text"]:focus,
    textarea:focus,
    select:focus {
        outline: none;
        border-color: var(--purple-light);
        box-shadow: 0 0 0 2px rgba(194, 182, 252, 0.3);
    }
     input[type="file"] {
        padding: 8px;
     }

    textarea {
        resize: vertical;
        min-height: 80px;
    }

    .image-preview {
        margin-top: 10px;
        max-width: 100%;
    }
    .image-preview p {
        font-size: 0.8rem;
        color: var(--text-muted);
        margin-bottom: 5px;
    }
    .image-preview img {
        max-width: 200px;
        max-height: 150px;
        border-radius: 5px;
        border: 1px solid #eee;
        display: block;
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 25px;
        padding-top: 15px;
        border-top: 1px solid #eee;
    }

    .button {
        padding: 10px 20px;
        border-radius: 20px;
        border: none;
        cursor: pointer;
        font-weight: 600;
        transition: background-color 0.2s ease, transform 0.1s ease;
    }
    .button.primary {
        background-color: var(--primary-action);
        color: white;
    }
    .button.primary:hover:not(:disabled) {
        background-color: var(--primary-action-hover);
    }
    .button.secondary {
        background-color: #eee;
        color: var(--text-dark);
        border: 1px solid #ddd;
    }
     .button.secondary:hover:not(:disabled) {
        background-color: #e0e0e0;
    }
    .button:active:not(:disabled) {
        transform: scale(0.98);
    }
     .button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
     }

    .error-text {
        color: var(--danger-red);
        font-size: 0.8rem;
        margin-top: 4px;
        display: block;
    }
     .error-text.non-field {
        margin-top: 15px;
        text-align: center;
        font-weight: bold;
     }
</style>