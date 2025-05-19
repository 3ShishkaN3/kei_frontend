<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { SentenceOrderTestModel, SentenceOrderSlotModel, DraggableItemModel } from '../../../../models/testTypes.js';
    import DraggableItemsManager from './DraggableItemsManager.svelte';
    import { nanoid } from 'nanoid';
    import { addNotification } from '../../../../stores/notifications.js';
    import { fade } from 'svelte/transition'; // Для transition:fade в HTML

    import PlusCircleOutline from 'svelte-material-icons/PlusCircleOutline.svelte';
    import DeleteOutline from 'svelte-material-icons/DeleteOutline.svelte';
    import ArrowCollapseVertical from 'svelte-material-icons/ArrowCollapseVertical.svelte';

    export let testData; 
    export let isEditing = false;
    export let isLoading = false;

    const dispatch = createEventDispatcher();
    let localTestModel = new SentenceOrderTestModel({ title: '', test_type: 'sentence-order', draggable_items:[], sentence_order_slots:[] }); // Инициализация по умолчанию

    // Эта функция будет вызываться для инициализации и ре-инициализации модели
    function initializeModel(currentTestData) {
        if (!currentTestData) {
            localTestModel = new SentenceOrderTestModel({ title: '', test_type: 'sentence-order', draggable_items:[], sentence_order_slots:[] });
        } else {
            const draggableItemsCopy = currentTestData.draggable_items
                ? currentTestData.draggable_items.map(item => new DraggableItemModel({...item, id: item.id || `temp_drag_${nanoid(6)}`}))
                : [];
            const slotsCopy = currentTestData.sentence_order_slots
                ? currentTestData.sentence_order_slots.map(slot => new SentenceOrderSlotModel({...slot, id: slot.id || `temp_slot_${nanoid(6)}`}))
                : [];
            localTestModel = new SentenceOrderTestModel({ ...currentTestData, draggable_items: draggableItemsCopy, sentence_order_slots: slotsCopy });
        }

        if ((!localTestModel.draggable_items || localTestModel.draggable_items.length === 0) && currentTestData?.title !== undefined) {
             handleAddDraggableItemInternal(); 
             handleAddDraggableItemInternal(true); // Один дистрактор для примера
        }
        if ((!localTestModel.sentence_order_slots || localTestModel.sentence_order_slots.length === 0) && currentTestData?.title !== undefined) {
            handleAddSlotInternal();
        }
        updateSlotPreviews(); // Обновить после возможного добавления
        localTestModel = localTestModel; // Триггер Svelte
    }


    onMount(() => {
        initializeModel(testData);
    });
    
    let prevTestDataString = "";
    $: if (testData) { // Реактивность на изменение testData пропа
        const currentTestDataString = JSON.stringify({
            title: testData.title, type: testData.test_type, 
            dL: testData.draggable_items?.length, 
            soL: testData.sentence_order_slots?.length
        });
        if (currentTestDataString !== prevTestDataString) {
            initializeModel(testData);
            prevTestDataString = currentTestDataString;
        }
    }

    function updateSlotPreviews() {
        if (!localTestModel || !localTestModel.draggable_items || !localTestModel.sentence_order_slots) return;
        localTestModel.sentence_order_slots.forEach(slot => {
            const foundItem = localTestModel.draggable_items.find(di => di.id === slot.correct_item_id);
            slot.correct_item_text_preview = foundItem ? foundItem.text : " (облачко не найдено)";
        });
        localTestModel.sentence_order_slots = [...localTestModel.sentence_order_slots]; // Обновить Svelte
    }

    // Обработчик для DraggableItemsManager
    function handleDraggableItemsChange(event) {
        localTestModel.draggable_items = event.detail.map(d => new DraggableItemModel(d)); // event.detail это массив из менеджера
        updateSlotPreviews(); 
        localTestModel = localTestModel;
    }

    // Внутренняя функция для добавления DraggableItem (используется при инициализации)
    function handleAddDraggableItemInternal(isDistractor = false) {
        if (!localTestModel) return;
        const newItem = new DraggableItemModel({ id: `temp_drag_${nanoid(6)}`, text: '', is_distractor: isDistractor });
        localTestModel.draggable_items = [...localTestModel.draggable_items, newItem];
    }
    // Функция, вызываемая из DraggableItemsManager.svelte (он сам добавляет, нам надо только обновить)
    // DraggableItemsManager сам управляет своим списком и диспатчит 'change'


    // Внутренняя функция для добавления слота
    function handleAddSlotInternal() {
        if (!localTestModel) return;
        const newOrder = localTestModel.sentence_order_slots.length;
        const defaultCorrectItem = localTestModel.draggable_items.find(di => !di.is_distractor);
        localTestModel.sentence_order_slots = [
            ...localTestModel.sentence_order_slots,
            new SentenceOrderSlotModel({ 
                id: `temp_slot_${nanoid(6)}`, 
                order: newOrder, 
                correct_item_id: defaultCorrectItem?.id || null 
            })
        ];
    }
    // Функция для кнопки "Добавить слот" в UI
    function handleAddSlotClick() {
        handleAddSlotInternal();
        updateSlotPreviews();
        localTestModel = localTestModel;
    }


    function handleRemoveSlot(index) {
        if (!localTestModel || localTestModel.sentence_order_slots.length <= 1) {
            addNotification("Тест должен содержать хотя бы один слот.", "warning"); return;
        }
        localTestModel.sentence_order_slots.splice(index, 1);
        localTestModel.sentence_order_slots.forEach((s, i) => s.order = i);
        updateSlotPreviews();
        localTestModel = localTestModel;
    }

    function handleSlotCorrectItemChange(slotIndex, event) {
        if (!localTestModel) return;
        const selectedDraggableItemId = event.target.value;
        const targetSlot = localTestModel.sentence_order_slots[slotIndex];
        
        let newCorrectItemId = null;
        if (selectedDraggableItemId) {
            // ID из select может быть строкой, если это временный ID, или числом, если с сервера
            const foundItem = localTestModel.draggable_items.find(di => di.id.toString() === selectedDraggableItemId.toString());
            if (foundItem) {
                newCorrectItemId = foundItem.id;
            }
        }
        targetSlot.correct_item_id = newCorrectItemId;
        updateSlotPreviews();
        localTestModel = localTestModel;
    }

    function validate() {
        if (!localTestModel || !localTestModel.title?.trim()) { addNotification("Введите название теста.", "error"); return false; }
        if (!localTestModel.draggable_items || localTestModel.draggable_items.length === 0) { addNotification("Добавьте хотя бы одно облачко.", "error"); return false; }
        if (localTestModel.draggable_items.some(di => !di.text?.trim())) { addNotification("Все облачка должны иметь текст.", "error"); return false; }
        if (!localTestModel.sentence_order_slots || localTestModel.sentence_order_slots.length === 0) { addNotification("Добавьте хотя бы один слот.", "error"); return false; }
        
        const availableNonDistractorIds = new Set(localTestModel.draggable_items.filter(di => !di.is_distractor).map(di => di.id));
        if (availableNonDistractorIds.size === 0 && localTestModel.sentence_order_slots.length > 0) {
             addNotification("Хотя бы одно облачко должно быть не-дистрактором, если есть слоты.", "error"); return false;
        }

        for (const slot of localTestModel.sentence_order_slots) {
            if (slot.correct_item_id === null || slot.correct_item_id === undefined) {
                addNotification("Каждый слот должен иметь назначенное правильное облачко.", "error"); return false;
            }
            if (!availableNonDistractorIds.has(slot.correct_item_id)) {
                addNotification(`Облачко, назначенное для слота (ID: ${slot.correct_item_id}), не найдено среди доступных не-дистракторов или является дистрактором.`, "error"); return false;
            }
        }
        return true;
    }

    function handleSave() {
        if (!localTestModel || !validate()) return;
        
        const payload = localTestModel.toPayload();
        payload.draggable_items = payload.draggable_items.map(item => {
            if (typeof item.id === 'string' && item.id.startsWith('temp_')) delete item.id;
            return item;
        });
        payload.sentence_order_slots = payload.sentence_order_slots.map(slot => {
            if (typeof slot.id === 'string' && slot.id.startsWith('temp_')) delete slot.id;
            // correct_item_id должен быть числом, если соответствующий DraggableItem имеет числовой ID
            const originalDraggableItem = localTestModel.draggable_items.find(di => di.id === slot.correct_item_id);
            if (originalDraggableItem && typeof originalDraggableItem.id === 'number') {
                slot.correct_item_id = originalDraggableItem.id;
            } else if (originalDraggableItem && typeof originalDraggableItem.id === 'string' && originalDraggableItem.id.startsWith('temp_')) {
                // Если ID временный, бэкенд должен будет его найти после создания DraggableItem.
                // Это усложняет. Лучше, чтобы на этом этапе ID уже были серверными или
                // бэкенд принимал какую-то другую связь (например, по тексту, что не надежно).
                // Пока оставляем как есть, но это потенциальное место для проблем.
                // В идеале, DraggableItems создаются первыми, получают ID, потом создаются слоты.
            }
            return slot;
        });
        dispatch('save', payload);
    }
</script>

<div class="item-form sentence-order-test-form">
    {#if localTestModel}
        <div class="form-group">
            <label for="so-test-title-{localTestModel.id || 'new'}">Название теста "Порядок предложений"</label>
            <input type="text" id="so-test-title-{localTestModel.id || 'new'}" bind:value={localTestModel.title} placeholder="Название теста" disabled={isLoading} />
        </div>
        <div class="form-group">
            <label for="so-test-desc-{localTestModel.id || 'new'}">Описание/Инструкция</label>
            <textarea id="so-test-desc-{localTestModel.id || 'new'}" bind:value={localTestModel.description} rows="3" placeholder="Инструкция для студента" disabled={isLoading}></textarea>
        </div>

        <DraggableItemsManager 
            bind:items={localTestModel.draggable_items} 
            on:change={handleDraggableItemsChange}
            title="Облачка (фразы/слова для расстановки)"
            {isLoading}
        />

        <h4 class="slots-header">Слоты для правильного порядка:</h4>
        {#if localTestModel.sentence_order_slots.length === 0}
            <p class="no-items-message">Нет слотов. Добавьте хотя бы один.</p>
        {/if}
        {#each localTestModel.sentence_order_slots as slot, index (slot.id)}
            <div class="slot-entry" transition:fade|local>
                <span class="slot-order-indicator">#{index + 1} <ArrowCollapseVertical size="18px"/></span>
                <div class="form-group slot-correct-item-group">
                    <label for={`slot-correct-item-${slot.id}`}>Правильное облачко для этого слота:</label>
                    <select 
                        id={`slot-correct-item-${slot.id}`}
                        value={slot.correct_item_id}
                        on:change={(e) => handleSlotCorrectItemChange(index, e)}
                        disabled={isLoading || localTestModel.draggable_items.filter(di => !di.is_distractor).length === 0}
                    >
                        <option value={null} disabled={slot.correct_item_id !== null}>-- Выберите облачко --</option>
                        {#each localTestModel.draggable_items.filter(di => !di.is_distractor) as draggableItem (draggableItem.id)}
                            <option value={draggableItem.id}>{draggableItem.text || "(пустое облачко)"}</option>
                        {/each}
                    </select>
                    {#if slot.correct_item_text_preview && slot.correct_item_id !== null} 
                        <small class="preview-text">Выбрано: "{slot.correct_item_text_preview}"</small> 
                    {/if}
                </div>
                 <div class="form-group slot-prompt-group">
                    <label for={`slot-prompt-${slot.id}`}>Подсказка для слота (необязательно):</label>
                    <input type="text" id={`slot-prompt-${slot.id}`} bind:value={slot.prompt_text} placeholder="Например, начало фразы" disabled={isLoading} />
                </div>
                <button 
                    type="button" 
                    class="remove-item-btn" 
                    on:click={() => handleRemoveSlot(index)} 
                    title="Удалить слот"
                    disabled={isLoading || localTestModel.sentence_order_slots.length <= 1}
                >
                    <DeleteOutline size="18px" />
                </button>
            </div>
        {/each}
         <button type="button" class="add-item-btn-small" on:click={handleAddSlot} disabled={isLoading}>
            <PlusCircleOutline size="16px" /> Добавить слот
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
    /* Общие стили для item-form, form-group и т.д. как в MCQTestForm */
    /* ... */
    .slots-header { font-size: 1.1em; font-weight: 600; margin: 20px 0 10px; color: var(--color-text-dark); }
    .slot-entry { 
        display: flex; 
        align-items: flex-end; /* Выровнять по низу, если инпуты разной высоты */
        gap: 15px; 
        padding: 15px; 
        border: 1px solid #eef2f7; 
        border-radius: 8px; 
        margin-bottom: 12px; 
        background: #fff;
    }
    .slot-order-indicator { 
        font-weight: 500; 
        color: var(--color-text-muted);
        padding-bottom: 10px; /* Примерно на уровень инпута */
        display: inline-flex;
        align-items: center;
        gap: 5px;
        white-space: nowrap;
    }
    .slot-correct-item-group, .slot-prompt-group { flex-grow: 1; margin-bottom: 0 !important; }
    .slot-correct-item-group label, .slot-prompt-group label { font-size: 0.85em !important; margin-bottom: 4px !important; }
    .slot-correct-item-group select, .slot-prompt-group input { font-size: 0.9em !important; padding: 9px 12px !important; width: 100%; }
    .slot-correct-item-group .preview-text { font-size: 0.8em; color: #777; margin-top: 4px; font-style: italic; }
    
    .remove-item-btn { /* уже есть в DraggableItemsManager, если стили общие */ }
    .add-item-btn-small { /* уже есть в DraggableItemsManager, если стили общие */ }
    .no-items-message { /* уже есть в DraggableItemsManager, если стили общие */ }

    /* Используйте те же стили для .btn-save, .btn-cancel, .form-actions что и в MCQTestForm */
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 25px; padding-top:20px; border-top: 1px solid #eee;}
    .btn-save, .btn-cancel { font-size: 0.95rem; padding: 10px 20px; font-weight: 500; }
    /* ... и т.д. ... */
</style>