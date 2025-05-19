<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { DragToMatchTestModel, MatchTargetModel, DraggableItemModel } from '../../../../models/testTypes.js';
    import DraggableItemsManager from './DraggableItemsManager.svelte';
    import { nanoid } from 'nanoid';
    import { addNotification } from '../../../../stores/notifications.js';
    // Иконки
    import PlusCircleOutline from 'svelte-material-icons/PlusCircleOutline.svelte';
    import DeleteOutline from 'svelte-material-icons/DeleteOutline.svelte';
    import TargetIcon from 'svelte-material-icons/Target.svelte'; // Для цели
    // Для выбора типа промпта
    import TextBoxOutline from 'svelte-material-icons/TextBoxOutline.svelte';
    import ImageOutline from 'svelte-material-icons/ImageOutline.svelte';
    import MusicNoteOutline from 'svelte-material-icons/MusicNoteOutline.svelte';
    // Для загрузки/выбора существующих Image/Audio материалов для промптов
    // import ImageSearchOutline from 'svelte-material-icons/ImageSearchOutline.svelte';
    // import FileMusicOutline from 'svelte-material-icons/FileMusicOutline.svelte';


    export let testData;
    export let isEditing = false;
    export let isLoading = false;

    const dispatch = createEventDispatcher();
    let localTestModel;

    onMount(() => {
        if (testData) {
            localTestModel = new DragToMatchTestModel({ ...testData });
            localTestModel.draggable_items = localTestModel.draggable_items.map(it => ({...it, id: it.id || `temp_drag_${nanoid(6)}`}));
            // TODO: Загрузить детали для prompt_image_id, prompt_audio_id для каждой цели, если они есть
            updateTargetPreviews();
        } else {
            localTestModel = new DragToMatchTestModel({ title: '', test_type: 'drag-to-match' });
        }
         if (localTestModel.draggable_items.length === 0) {
             handleAddDraggableItem(); handleAddDraggableItem();
        }
        if (localTestModel.match_targets.length === 0) {
            handleAddTarget();
        }
    });

    function updateTargetPreviews() {
        if (!localTestModel || !localTestModel.draggable_items) return;
        localTestModel.match_targets.forEach(target => {
            const foundItem = localTestModel.draggable_items.find(di => di.id === target.correct_item_id);
            target.correct_item_text_preview = foundItem ? foundItem.text : " (не найдено)";
            // TODO: Заполнять target.prompt_image_details / target.prompt_audio_details
            // на основе target.prompt_image_id / target.prompt_audio_id, если нужно превью в форме
        });
    }

    function handleDraggableItemsChange(event) {
        localTestModel.draggable_items = event.detail.map(d => new DraggableItemModel(d));
        updateTargetPreviews();
        localTestModel = localTestModel;
    }

    function handleAddTarget() {
        const newOrder = localTestModel.match_targets.length;
        const defaultCorrectItem = localTestModel.draggable_items.find(di => !di.is_distractor);
        localTestModel.match_targets.push(new MatchTargetModel({ 
            id: `temp_target_${nanoid(6)}`, 
            order: newOrder,
            correct_item_id: defaultCorrectItem?.id || null,
            prompt_text: '' // По умолчанию текстовый промпт
        }));
        updateTargetPreviews();
        localTestModel = localTestModel;
    }
    function handleRemoveTarget(index) {
        if (localTestModel.match_targets.length <= 1) {
            addNotification("Тест должен содержать хотя бы одну цель для соотнесения.", "warning"); return;
        }
        localTestModel.match_targets.splice(index, 1);
        localTestModel.match_targets.forEach((t, i) => t.order = i);
        updateTargetPreviews();
        localTestModel = localTestModel;
    }
    function handleTargetCorrectItemChange(targetIndex, event) {
        const selectedDraggableItemId = event.target.value;
        localTestModel.match_targets[targetIndex].correct_item_id = 
            isNaN(parseInt(selectedDraggableItemId)) ? selectedDraggableItemId : parseInt(selectedDraggableItemId);
        updateTargetPreviews();
        localTestModel = localTestModel;
    }
    
    function setTargetPromptType(targetIndex, type) {
        const target = localTestModel.match_targets[targetIndex];
        target.prompt_text = null;
        target.prompt_image_id = null;
        target.prompt_audio_id = null;
        if (type === 'text') target.prompt_text = '';
        // Для image/audio нужно будет добавить UI для выбора/загрузки и установки ID
        localTestModel = localTestModel;
    }
    // TODO: Функции для выбора/загрузки ImageMaterial/AudioMaterial для промптов целей
    // и установки target.prompt_image_id / target.prompt_audio_id


    function validate() {
        if (!localTestModel.title.trim()) { addNotification("Введите название теста.", "error"); return false; }
        if (localTestModel.draggable_items.length === 0) { addNotification("Добавьте хотя бы одно облачко.", "error"); return false; }
        if (localTestModel.draggable_items.some(di => !di.text.trim())) { addNotification("Все облачка должны иметь текст.", "error"); return false; }
        if (localTestModel.match_targets.length === 0) { addNotification("Добавьте хотя бы одну цель для соотнесения.", "error"); return false; }
        if (localTestModel.match_targets.some(t => t.correct_item_id === null)) { addNotification("Каждая цель должна иметь назначенное правильное облачко.", "error"); return false; }
        if (localTestModel.match_targets.some(t => !t.prompt_text && !t.prompt_image_id && !t.prompt_audio_id)) {
             addNotification("Каждая цель должна иметь хотя бы один тип промпта (текст, изображение или аудио).", "error"); return false;
        }
        // ... (другие валидации, как в SentenceOrderTestForm) ...
        return true;
    }

    function handleSave() {
        if (!localTestModel || !validate()) return;
        const payload = localTestModel.toPayload();
        // ... (очистка временных ID, как в SentenceOrderTestForm) ...
        dispatch('save', payload);
    }

</script>

<div class="item-form drag-match-test-form">
     {#if localTestModel}
        <div class="form-group">
            <label for="dm-test-title-{localTestModel.id || 'new'}">Название теста "Соотнесение"</label>
            <input type="text" id="dm-test-title-{localTestModel.id || 'new'}" bind:value={localTestModel.title} placeholder="Название теста" disabled={isLoading} />
        </div>
        <div class="form-group">
            <label for="dm-test-desc-{localTestModel.id || 'new'}">Описание/Инструкция</label>
            <textarea id="dm-test-desc-{localTestModel.id || 'new'}" bind:value={localTestModel.description} rows="3" placeholder="Инструкция для студента" disabled={isLoading}></textarea>
        </div>

        <DraggableItemsManager 
            bind:items={localTestModel.draggable_items} 
            on:change={handleDraggableItemsChange}
            title="Облачка (элементы для соотнесения)"
            {isLoading}
        />

        <h4 class="targets-header">Цели (с чем соотносить):</h4>
        {#if localTestModel.match_targets.length === 0}
            <p class="no-items-message">Нет целей. Добавьте хотя бы одну.</p>
        {/if}
        {#each localTestModel.match_targets as target, index (target.id)}
            <div class="target-entry" transition:fade|local>
                <span class="target-order-indicator">Цель #{index + 1} <TargetIcon size="18px"/></span>
                <div class="target-details">
                    <div class="form-group prompt-type-selector">
                        <label>Тип промпта для цели:</label>
                        <div class="btn-group">
                            <button type="button" class:active={target.prompt_text !== null} on:click={() => setTargetPromptType(index, 'text')} title="Текст"><TextBoxOutline size="20px"/></button>
                            <button type="button" class:active={target.prompt_image_id !== null} on:click={() => setTargetPromptType(index, 'image')} title="Изображение"><ImageOutline size="20px"/></button>
                            <button type="button" class:active={target.prompt_audio_id !== null} on:click={() => setTargetPromptType(index, 'audio')} title="Аудио"><MusicNoteOutline size="20px"/></button>
                        </div>
                    </div>

                    {#if target.prompt_text !== null}
                    <div class="form-group">
                        <label for={`target-prompt-text-${target.id}`}>Текст промпта:</label>
                        <input type="text" id={`target-prompt-text-${target.id}`} bind:value={target.prompt_text} placeholder="Текст для соотнесения" disabled={isLoading} />
                    </div>
                    {:else if target.prompt_image_id !== null}
                    <div class="form-group">
                        <label>Изображение-промпт (ID: {target.prompt_image_id || 'не выбрано'}):</label>
                        <input type="number" placeholder="ID ImageMaterial" bind:value={target.prompt_image_id} disabled={isLoading}/>
                    </div>
                    {:else if target.prompt_audio_id !== null}
                    <div class="form-group">
                        <label>Аудио-промпт (ID: {target.prompt_audio_id || 'не выбрано'}):</label>
                         <input type="number" placeholder="ID AudioMaterial" bind:value={target.prompt_audio_id} disabled={isLoading}/>
                    </div>
                    {/if}

                    <div class="form-group target-correct-item-group">
                        <label for={`target-correct-item-${target.id}`}>Правильное облачко для этой цели:</label>
                        <select 
                            id={`target-correct-item-${target.id}`}
                            value={target.correct_item_id}
                            on:change={(e) => handleTargetCorrectItemChange(index, e)}
                            disabled={isLoading || localTestModel.draggable_items.filter(di => !di.is_distractor).length === 0}
                        >
                            <option value={null} disabled={target.correct_item_id !== null}>-- Выберите облачко --</option>
                            {#each localTestModel.draggable_items.filter(di => !di.is_distractor) as draggableItem (draggableItem.id)}
                                <option value={draggableItem.id}>{draggableItem.text || "(пустое облачко)"}</option>
                            {/each}
                        </select>
                        {#if target.correct_item_text_preview && target.correct_item_id !== null} 
                            <small class="preview-text">Выбрано: "{target.correct_item_text_preview}"</small> 
                        {/if}
                    </div>
                     <div class="form-group">
                        <label for={`target-explanation-${target.id}`}>Пояснение к цели (необязательно):</label>
                        <input type="text" id={`target-explanation-${target.id}`} bind:value={target.explanation} placeholder="Пояснение" disabled={isLoading} />
                    </div>
                </div>
                <button type="button" class="remove-item-btn" on:click={() => handleRemoveTarget(index)} title="Удалить цель" disabled={isLoading || localTestModel.match_targets.length <= 1}>
                    <DeleteOutline size="18px" />
                </button>
            </div>
        {/each}
        <button type="button" class="add-item-btn-small" on:click={handleAddTarget} disabled={isLoading}>
            <PlusCircleOutline size="16px" /> Добавить цель
        </button>

        <div class="form-actions">
            <button type="submit" class="btn-save" on:click|preventDefault={handleSave} disabled={isLoading}>Сохранить тест</button>
            <button type="button" class="btn-cancel" on:click={() => dispatch('cancel')} disabled={isLoading}>Отмена</button>
        </div>
    {:else}
        <div class="form-loading-placeholder"><div class="spinner"></div> Загрузка...</div>
    {/if}
</div>

<style>
    /* ... (общие стили как в SentenceOrderTestForm) ... */
    .targets-header { font-size: 1.1em; font-weight: 600; margin: 20px 0 10px; color: var(--color-text-dark); }
    .target-entry { display: flex; align-items: flex-start; gap: 15px; padding: 15px; border: 1px solid #eef2f7; border-radius: 8px; margin-bottom: 12px; background: #fff; }
    .target-order-indicator { font-weight: 500; color: var(--color-text-muted); margin-top: 5px; white-space: nowrap; display: flex; align-items: center; gap: 5px; }
    .target-details { flex-grow: 1; display: flex; flex-direction: column; gap: 12px; }
    .prompt-type-selector label { font-size: 0.85em; margin-bottom: 5px; display: block; }
    .btn-group { display: flex; gap: 5px; margin-bottom: 10px; }
    .btn-group button { padding: 6px 10px; border: 1px solid #ccc; background: #f7f7f7; border-radius: 5px; cursor: pointer; }
    .btn-group button.active { background: var(--color-primary-light); color: var(--color-primary-dark); border-color: var(--color-primary); }
    .btn-group button:hover:not(.active) { background: #e9e9e9; }
    .target-correct-item-group select { width: 100%; }
    .target-correct-item-group .preview-text { font-size: 0.8em; color: #777; margin-top: 4px; font-style: italic; }
</style>