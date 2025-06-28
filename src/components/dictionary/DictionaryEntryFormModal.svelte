<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { fly } from 'svelte/transition';
    import * as dictionaryApi from '../../api/dictionaryApi.js';
    import { addNotification } from '../../stores/notifications.js';
    import Modal from '../utils/Modal.svelte';

    export let isOpen = false;
    export let entry = null; // null for create, object for edit
    export let sectionId;
    export let courseId; // This is no longer needed but kept for modal signature

    let localEntry = {};
    let audioFile = null;
    let isSaving = false;

    $: modalTitle = entry ? 'Редактировать слово' : 'Создать новое слово';

    onMount(resetForm);
    $: if (isOpen) resetForm();

    function resetForm() {
        localEntry = entry ? { ...entry } : { term: '', reading: '', translation: '' };
        audioFile = null;
        const fileInput = document.querySelector('#audio-file-input');
        if (fileInput) fileInput.value = '';
    }

    const dispatch = createEventDispatcher();

    function close() {
        dispatch('close');
    }

    async function handleSubmit() {
        if (!localEntry.term || !localEntry.translation) {
            addNotification('Поля "Слово" и "Перевод" обязательны.', 'error');
            return;
        }

        isSaving = true;

        const formData = new FormData();
        formData.append('term', localEntry.term);
        formData.append('reading', localEntry.reading || '');
        formData.append('translation', localEntry.translation);
        
        if (audioFile) {
            formData.append('pronunciation_audio', audioFile, audioFile.name);
        }

        try {
            let savedEntry;
            if (entry) {
                savedEntry = await dictionaryApi.updateDictionaryEntry(sectionId, entry.id, formData);
            } else {
                savedEntry = await dictionaryApi.createDictionaryEntry(sectionId, formData);
            }
            
            dispatch('save', { entry: savedEntry, isNewEntry: !entry });
            close();
        } catch (e) {
            addNotification(`Ошибка сохранения: ${e.message}`, 'error');
        } finally {
            isSaving = false;
        }
    }
</script>

<Modal bind:isOpen {modalTitle} on:close={close} size="medium">
    <form on:submit|preventDefault={handleSubmit} class="entry-form">
        <div class="form-group">
            <label for="term">Слово (Кандзи/Кана)</label>
            <input type="text" id="term" bind:value={localEntry.term} required>
        </div>
        <div class="form-group">
            <label for="reading">Чтение (Хирагана/Катакана)</label>
            <input type="text" id="reading" bind:value={localEntry.reading}>
        </div>
        <div class="form-group">
            <label for="translation">Перевод</label>
            <input type="text" id="translation" bind:value={localEntry.translation} required>
        </div>
        <div class="form-group">
            <label for="audio-file-input">Аудио произношения</label>
            <input type="file" id="audio-file-input" accept="audio/*" on:change={(e) => audioFile = e.target.files[0]}>
            {#if localEntry.pronunciation_audio && !audioFile}
                <p class="current-audio">Текущий файл: <a href={localEntry.pronunciation_audio} target="_blank" rel="noopener noreferrer">Прослушать</a></p>
            {/if}
        </div>

        <div class="form-actions">
            <button type="button" class="control-button" on:click={close} disabled={isSaving}>Отмена</button>
            <button type="submit" class="control-button primary" disabled={isSaving}>
                {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
        </div>
    </form>
</Modal>

<style>
    .entry-form {
        padding: 10px;
    }
    .form-group {
        margin-bottom: 1.5rem;
    }
    .section-title-group {
        background-color: var(--color-bg-very-light);
        padding: 1rem;
        border-radius: var(--spacing-border-radius-small);
        border: 1px solid var(--color-border-light);
        margin-bottom: 2rem;
    }
    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: var(--color-text-muted);
    }
    input[type="text"], input[type="file"] {
        width: 100%;
        padding: 12px;
        border: 1px solid #ced4da;
        border-radius: var(--spacing-border-radius-small);
        font-size: 1rem;
        transition: border-color 0.2s, box-shadow 0.2s;
        background-color: var(--color-bg-light);
        color: var(--color-text-dark);
    }
    input[type="file"] {
        padding: 9px;
    }
    input[type="text"]:focus {
        outline: none;
        border-color: var(--color-purple-active);
        box-shadow: 0 0 0 3px rgba(142, 139, 224, 0.25);
    }
    .current-audio {
        font-size: 0.9rem;
        margin-top: 0.75rem;
        color: var(--color-text-muted);
    }
    .current-audio a {
        color: var(--color-purple-active);
        text-decoration: none;
    }
     .current-audio a:hover {
        text-decoration: underline;
     }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 2rem;
        border-top: 1px solid var(--color-border-light);
        padding-top: 1.5rem;
    }

    /* Re-using button styles from Practice.svelte */
    :global(.control-button) {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 1.2rem;
        border-radius: var(--spacing-border-radius-button);
        border: 1px solid var(--color-border-light);
        background-color: var(--color-bg-light);
        color: var(--color-text-muted);
        font-weight: var(--font-weight-semi-bold);
        cursor: pointer;
        transition: all 0.2s ease;
    }
    :global(.control-button:disabled) {
        opacity: 0.6;
        cursor: not-allowed;
    }
    :global(.control-button:not(:disabled):hover) {
        background-color: var(--color-bg-very-light);
        border-color: var(--color-border-medium);
        color: var(--color-text-dark);
    }
    :global(.control-button.primary) {
        background-color: var(--color-purple-active);
        color: var(--color-text-light);
        border-color: var(--color-purple-active);
    }
    :global(.control-button.primary:not(:disabled):hover) {
        background-color: var(--color-purple-hover);
        border-color: var(--color-purple-hover);
    }
</style> 