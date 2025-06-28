<script>
    import { createEventDispatcher } from 'svelte';
    import { dndzone } from 'svelte-dnd-action';
    import ImageItemDisplay from '../ImageItemDisplay.svelte';
    import AudioItemDisplay from '../AudioItemDisplay.svelte';

    export let testData;
    export let sectionItemId;
    export let viewMode;
    export let canStudentInteract;
    export let draggableItemsPoolForDisplay;
    export let filledSlotsForDisplay;
    export let selectedDraggableOptionForSlot;
    export let isTestSubmittedByStudent;

    const dispatch = createEventDispatcher();
    const dndOpts = { flipDurationMs: 200 };

    function selectDraggableForSlot(item) {
        if (!canStudentInteract) return;
        if (selectedDraggableOptionForSlot && selectedDraggableOptionForSlot.id === item.id) {
            selectedDraggableOptionForSlot = null; 
        } else {
            selectedDraggableOptionForSlot = item;
        }
        dispatch('update:selectedDraggableOptionForSlot', selectedDraggableOptionForSlot);
    }

    function placeSelectedOptionInSlot(slotId) {
        if (!canStudentInteract || !selectedDraggableOptionForSlot) return;
        filledSlotsForDisplay[slotId] = {...selectedDraggableOptionForSlot}; 
        filledSlotsForDisplay = {...filledSlotsForDisplay};
        selectedDraggableOptionForSlot = null; 
        dispatch('update:filledSlotsForDisplay', filledSlotsForDisplay);
        dispatch('update:selectedDraggableOptionForSlot', selectedDraggableOptionForSlot);
    }
    
    function clearSlot(slotId) {
        if (!canStudentInteract) return;
        delete filledSlotsForDisplay[slotId];
        filledSlotsForDisplay = {...filledSlotsForDisplay};
        dispatch('update:filledSlotsForDisplay', filledSlotsForDisplay);
    }
    
    function handleDndFinalizeSlot(e, slotId) {
        if (!canStudentInteract) return;
        const {items, info} = e.detail;
        if (items.length > 0) {
            filledSlotsForDisplay[slotId] = {...items[0]};
        } else {
            delete filledSlotsForDisplay[slotId];
        }
        filledSlotsForDisplay = {...filledSlotsForDisplay};
        dispatch('update:filledSlotsForDisplay', filledSlotsForDisplay);
    }

    function getSlotDisplayStatus(slot) { 
        if (viewMode === 'admin' || isTestSubmittedByStudent) {
            const studentAnswerObjectInSlot = filledSlotsForDisplay[slot.id];
            const studentAnswerTextInSlot = studentAnswerObjectInSlot?.text;
            if (studentAnswerTextInSlot === undefined && isTestSubmittedByStudent) return 'slot_empty_after_submit';
            if (studentAnswerTextInSlot === undefined) return 'slot_empty'; 
            if (studentAnswerTextInSlot === slot.correct_answer_text) return 'student_correct';
            return 'student_incorrect';
        }
        return 'pending';
    }

    // New function for Drag-and-Drop DND pool
    function handleDndDragDropPool(e) {
        if (!canStudentInteract) return;
        const {items} = e.detail;
        draggableItemsPoolForDisplay = items;
        dispatch('update:draggableItemsPoolForDisplay', draggableItemsPoolForDisplay);
    }
</script>

<div class="drag-drop-test-area">
    {#if testData.description && viewMode === 'admin'} 
    {:else if !testData.description && testData.test_type === 'drag-and-drop' }
        <p class="instruction-text">Распределите предложенные варианты по соответствующим ячейкам.</p>
    {/if}
    
    {#if canStudentInteract || viewMode === 'admin'}
        <h4>Доступные слова/фразы:</h4>
        <section 
            class="draggable-options-pool-display dnd-pool"
            use:dndzone={{
                items: draggableItemsPoolForDisplay, 
                type: 'ddOption-' + sectionItemId, 
                dragDisabled: !canStudentInteract, 
                dropTargetStyle: {},
                ...dndOpts
            }}
            on:consider={handleDndDragDropPool}
            on:finalize={handleDndDragDropPool}
            aria-label="Пул доступных слов для перетаскивания"
        >
            {#each draggableItemsPoolForDisplay as item (item.id)}
                <div class="draggable-option-dnd"
                    title={canStudentInteract ? "Клик или перетаскивание для добавления: " + item.text : item.text}
                    tabindex={canStudentInteract ? 0 : -1}
                    on:click={() => {if(canStudentInteract) selectDraggableForSlot(item)}}
                    on:keypress={(e) => {if(canStudentInteract && (e.key === 'Enter' || e.key === ' ')) selectDraggableForSlot(item);}}
                    role="button"
                    class:selected-for-slot={selectedDraggableOptionForSlot && selectedDraggableOptionForSlot.id === item.id}
                >{item.text}</div>
            {/each}
            {#if draggableItemsPoolForDisplay.length === 0 && canStudentInteract}
                <p class="empty-pool-message">Все слова использованы.</p>
            {/if}
            {#if testData.draggable_options_pool.length === 0 }
                <p class="empty-pool-message">Пул слов для этого теста не задан.</p>
            {/if}
        </section>
    {/if}

    <h4>Ячейки для заполнения:</h4>
    <div class="drag-drop-slots-container">
        {#each testData.drag_drop_slots || [] as slot (slot.id)}
            {@const filledItemObject = filledSlotsForDisplay[slot.id]}
            {@const slotDisplayStatus = getSlotDisplayStatus(slot)}
            <div class="drag-drop-slot-item status-{slotDisplayStatus}"
                 class:disabled={!canStudentInteract && isTestSubmittedByStudent}
            >
                <div class="slot-prompt">
                    {#if slot.prompt_image_details} <ImageItemDisplay contentDetails={slot.prompt_image_details} /> {/if}
                    {#if slot.prompt_audio_details} <AudioItemDisplay contentDetails={slot.prompt_audio_details} /> {/if}
                    {#if slot.prompt_text} <p class="prompt-text">{@html slot.prompt_text.replace(/\n/g, '<br>')}</p> {/if}
                    {#if !slot.prompt_image_details && !slot.prompt_audio_details && !slot.prompt_text}
                        <span class="slot-placeholder-num">Ячейка #{slot.order + 1}</span>
                    {/if}
                </div>
                <div 
                    class="drop-target-area-dnd" 
                    use:dndzone={{items: filledItemObject ? [filledItemObject] : [], type: 'ddOption-' + sectionItemId, zoneId: 'ddSlot-' + sectionItemId + '-' + slot.id, dragDisabled: !canStudentInteract, dropFromOthersDisabled: !!filledItemObject, ...dndOpts }}
                    on:finalize={(e) => handleDndFinalizeSlot(e, slot.id)}
                    on:click={() => placeSelectedOptionInSlot(slot.id)}
                    on:keypress={(e) => { if (canStudentInteract && (e.key === 'Enter' || e.key === ' ')) placeSelectedOptionInSlot(slot.id); }}
                    role="button"
                    tabindex={canStudentInteract && !filledItemObject ? 0 : -1} 
                    aria-label={`Ячейка ${slot.prompt_text || ('слот '+(slot.order+1))}. ${filledItemObject ? 'Текущий ответ: ' + filledItemObject.text : (selectedDraggableOptionForSlot && canStudentInteract ? 'Нажмите, чтобы поместить ' + selectedDraggableOptionForSlot.text : ( (viewMode === 'admin' || isTestSubmittedByStudent) ? 'Нет ответа' : 'Пусто, выберите облачко и нажмите сюда или перетащите' )  ) }`}
                >
                    {#if filledItemObject}
                        <div class="draggable-option-dnd in-slot" 
                             on:click|stopPropagation={() => {if(canStudentInteract) clearSlot(slot.id)}}
                             on:keypress|stopPropagation={(e) => { if(canStudentInteract && (e.key === 'Enter' || e.key === ' ')) clearSlot(slot.id); }}
                             tabindex={canStudentInteract ? 0 : -1}
                             role="button"
                             title={canStudentInteract ? "Удалить облачко из ячейки (клик)" : filledItemObject.text}
                        >
                            {filledItemObject.text}
                        </div>
                    {:else if selectedDraggableOptionForSlot && canStudentInteract}
                        <span class="drop-hint">Поместить "{selectedDraggableOptionForSlot.text}"?</span>
                    {:else}
                        <span class="drop-placeholder">{ (viewMode === 'admin' || isTestSubmittedByStudent) ? 'Нет ответа' : 'Пусто'}</span>
                    {/if}
                </div>
                {#if slot.explanation && (viewMode === 'admin' || (isTestSubmittedByStudent && filledItemObject))}
                    <div class="slot-explanation status-{slotDisplayStatus} visible">
                        <strong>Пояснение:</strong> {@html slot.explanation.replace(/\n/g, '<br>')}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>

<style>
    .drag-drop-test-area { margin-top: 25px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
    .instruction-text { font-size: 0.95em; color: var(--color-text-muted); margin-bottom: 15px; line-height: 1.6; }
    .drag-drop-test-area h4 { font-size: 1.05em; font-weight: 600; margin-top: 20px; margin-bottom: 12px; color: var(--color-secondary); }

    .dnd-zone { /* Общий стиль для dnd-зон */
        border: 2px dashed var(--color-border-light, #e0e0e0);
        padding: 10px;
        border-radius: var(--spacing-border-radius-small);
        transition: background-color 0.2s ease, border-color 0.2s ease;
        min-height: 50px; /* Минимальная высота для пустых зон */
    }
    .dnd-zone.svelte-dnd-droptarget-active {
        background-color: rgba(var(--color-primary-rgb), 0.05);
        border-color: var(--color-primary);
        border-style: solid;
    }
    .draggable-options-pool-display { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; background-color: #f7f9fc; }
    .draggable-item, .draggable-option-dnd { /* Унифицировал имя класса */
        padding: 8px 15px; background-color: #fff;
        border: 1px solid var(--color-primary-light, #d1c9ff);
        color: var(--color-primary-dark, #5845d8);
        border-radius: 18px; cursor: grab;
        transition: all 0.2s ease; font-size: 0.9em;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        display: inline-flex; align-items: center; user-select: none;
    }
    .draggable-item:hover:not([aria-disabled="true"]),
    .draggable-option-dnd:hover:not([aria-disabled="true"]) {
        background-color: var(--color-primary-light, #e0d8ff);
        transform: scale(1.03);
        box-shadow: 0 4px 8px rgba(0,0,0,0.08);
    }
    .draggable-item[aria-grabbed="true"],
    .draggable-option-dnd[aria-grabbed="true"] {
        opacity: 0.6; background-color: var(--color-secondary); color: white;
        box-shadow: 0 5px 10px rgba(0,0,0,0.2); transform: rotate(-2deg);
    }
    .draggable-item[aria-disabled="true"],
    .draggable-option-dnd[aria-disabled="true"] {
        opacity: 0.5; cursor: not-allowed; background-color: #e9ecef;
        color: #6c757d; border-color: #ced4da; box-shadow: none;
    }
    .draggable-item.selected-for-slot { /* Для клик-механики D&D */
        outline: 3px solid var(--color-secondary);
        box-shadow: 0 0 10px rgba(var(--color-secondary-rgb), 0.4);
    }
    .empty-pool-message { width: 100%; text-align: center; font-size: 0.9em; color: #888; font-style: italic; padding: 10px 0; }

    .drag-drop-slots-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; }
    .drag-drop-slot-item { border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; background-color: #fff; display: flex; flex-direction: column; transition: border-color 0.3s, background-color 0.3s; }
    .drag-drop-slot-item.disabled { opacity: 0.7; background-color: #f9f9f9; }
    .slot-prompt { margin-bottom: 10px; min-height: 20px; font-size: 0.9em; }
    .slot-prompt .prompt-text { font-style: italic; color: #444; }
    .slot-prompt :global(.image-item-display), .slot-prompt :global(.audio-item-display-enhanced) { margin-bottom: 5px; border: none; padding: 0; box-shadow: none; }
    .slot-placeholder-num { color: #999; font-size: 0.85em; }

    .drop-target-area-dnd {
        min-height: 48px; background-color: #f4f7fa;
        border: 2px dashed #c5d5e6; border-radius: 6px;
        display: flex; align-items: center; justify-content: center;
        padding: 10px; cursor: pointer; transition: all 0.2s;
        flex-grow: 1;
    }
    .drag-drop-slot-item.disabled .drop-target-area-dnd { cursor: default; }
    .drop-target-area-dnd.occupied { border-style: solid; border-color: var(--color-secondary-light, #d1d8f8); background-color: #eef2f7; }
    .draggable-item.in-slot { cursor: pointer; position: relative; } /* Для кнопки очистки */
    .clear-slot-btn { position: absolute; top: -8px; right: -8px; background: white; border: 1px solid #ccc; border-radius: 50%; width: 20px; height: 20px; font-size: 14px; color: #888; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.2); line-height: 1; padding: 0; }
    .clear-slot-btn:hover { color: var(--color-danger-red); background-color: #fff0f0; border-color: var(--color-danger-red); }
    .drop-hint, .drop-placeholder-dnd { font-size: 0.9em; color: #777; font-style: italic; text-align: center; }

    .drag-drop-slot-item.status-student_correct .drop-target-area-dnd { border-color: var(--color-success); background-color: #e6ffed; }
    .drag-drop-slot-item.status-student_correct .draggable-item.in-slot { background-color: var(--color-success); border-color: var(--color-success); color: white; }
    .drag-drop-slot-item.status-student_incorrect .drop-target-area-dnd { border-color: var(--color-danger-red); background-color: #ffebee; }
    .drag-drop-slot-item.status-student_incorrect .draggable-item.in-slot { background-color: var(--color-danger-red); border-color: var(--color-danger-red); color: white; }
    .drag-drop-slot-item.status-slot_empty_after_submit .drop-target-area-dnd,
    .drag-drop-slot-item.status-slot_empty .drop-target-area-dnd { border-color: #ffc107; background-color: #fff8e1; }
    .slot-explanation { font-size: 0.88em; color: #495057; margin-top: 10px; padding: 10px; background-color: #f8f9fa; border-radius: 6px; border-left: 3px solid #ced4da; line-height: 1.6; display: none; }
    .slot-explanation.visible { display: block; }
    .drag-drop-slot-item.status-student_correct .slot-explanation.visible { border-left-color: #28a745; background-color: #e6ffed; color: #155724; }
    .drag-drop-slot-item.status-student_incorrect .slot-explanation.visible { border-left-color: #dc3545; background-color: #ffebee; color: #721c24; }
</style>
