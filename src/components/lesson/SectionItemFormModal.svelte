<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import Modal from '../utils/Modal.svelte'; // Предполагается, что Modal.svelte существует
	import TextItemForm from './forms/TextItemForm.svelte';
	import ImageItemForm from './forms/ImageItemForm.svelte';
	import AudioItemForm from './forms/AudioItemForm.svelte';
	import VideoItemForm from './forms/VideoItemForm.svelte';
	import DocumentItemForm from './forms/DocumentItemForm.svelte';
    import TestItemFormContainer from './forms/tests/TestItemFormContainer.svelte'

	export let isOpen = false;
	export let itemToEdit = null; // Если редактируем существующий
	export let courseId;
	export let lessonId;
    export let targetSectionId; // ID раздела, куда добавляем/в котором редактируем
    export let isAdminOrStaff; // Для передачи в формы, если потребуется

	const dispatch = createEventDispatcher();

	let selectedItemType = 'text'; // Тип по умолчанию для нового элемента
    let formComponent = null;
    let modalTitle = '';
    let isLoadingForm = false; // Для дизейбла кнопок в формах

    const itemTypes = [
        { value: 'text', label: 'Текстовый блок' },
        { value: 'image', label: 'Изображение' },
        { value: 'audio', label: 'Аудио' },
        { value: 'video', label: 'Видео' },
        { value: 'document', label: 'Документ (PDF)' },
        { value: 'test', label: 'Тест' },
    ];

    $: {
        if (isOpen) {
            if (itemToEdit) {
                selectedItemType = itemToEdit.item_type;
                modalTitle = `Редактировать: ${itemTypes.find(it => it.value === selectedItemType)?.label || 'элемент'}`;
            } else {
                // selectedItemType остается тем, что выбрал пользователь, или 'text' по умолчанию
                modalTitle = `Добавить новый элемент: ${itemTypes.find(it => it.value === selectedItemType)?.label || 'текст'}`;
            }
            updateFormComponent();
        }
    }
    
    function updateFormComponent() {
        switch (selectedItemType) {
            case 'text': formComponent = TextItemForm; break;
            case 'image': formComponent = ImageItemForm; break;
            case 'audio': formComponent = AudioItemForm; break;
            case 'video': formComponent = VideoItemForm; break;
            case 'document': formComponent = DocumentItemForm; break;
            case 'test': formComponent = TestItemFormContainer; break;
            default: formComponent = null;
        }
        // Обновление заголовка, если тип меняется при создании нового элемента
        if (!itemToEdit && isOpen) {
             modalTitle = `Добавить новый элемент: ${itemTypes.find(it => it.value === selectedItemType)?.label || 'элемент'}`;
        }
    }

	function handleSave(event) {
        isLoadingForm = true; // Показываем индикатор загрузки в форме
        // event.detail содержит { item_type, content_data } или FormData
        let dataToSave = event.detail;

        // Если это не FormData, убедимся, что item_type установлен
        if (!(dataToSave instanceof FormData)) {
            dataToSave.item_type = selectedItemType;
        } else {
            // Для FormData, item_type уже должен быть добавлен в самой форме
            // (наши формы это делают)
        }
        
		dispatch('save', dataToSave);
        // isLoadingForm будет сброшен в Lesson.svelte после завершения API запроса
        // или можно сделать dispatch('close') отсюда, если Lesson.svelte сам закроет модалку
	}

    function handleClose() {
        isLoadingForm = false; // Сбрасываем при закрытии
        if (!itemToEdit) selectedItemType = 'text'; // Сброс типа для нового элемента
        dispatch('close');
    }

    // Для сброса isLoadingForm из родительского компонента, если нужно
    export function setLoading(loadingState) {
        isLoadingForm = loadingState;
    }

</script>

<Modal bind:isOpen {modalTitle} on:close={handleClose} size="large">
    <div class="item-form-modal-content">
        {#if !itemToEdit}
            <div class="form-group item-type-selector">
                <label for="item-type">Тип элемента:</label>
                <select id="item-type" bind:value={selectedItemType} on:change={updateFormComponent}>
                    {#each itemTypes as itemType}
                        <option value={itemType.value}>{itemType.label}</option>
                    {/each}
                </select>
            </div>
        {/if}

        {#if formComponent}
            <svelte:component 
                this={formComponent} 
                {itemToEdit}
                {courseId}
                {lessonId}
                {targetSectionId}
                {isAdminOrStaff}
                bind:isLoading={isLoadingForm}
                on:save={handleSave}
                on:close={handleClose}
            />
        {:else}
            <p>Выберите тип элемента для добавления.</p>
        {/if}
    </div>
</Modal>

<style>
    .item-form-modal-content {
        padding: 10px; /* Немного отступов внутри модалки */
    }
    .item-type-selector {
        margin-bottom: 20px;
    }
    .item-type-selector label {
        margin-bottom: 5px;
        font-weight: 500;
        color: var(--color-text-muted);
    }
    .item-type-selector select {
        width: 100%;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: var(--spacing-border-radius-small);
        font-size: 1rem;
        background-color: white;
    }
     /* Стили для .form-group и .form-actions внутри загруженных компонентов */
    :global(.item-form-modal-content .item-form) {
        padding-top: 10px;
    }
</style>