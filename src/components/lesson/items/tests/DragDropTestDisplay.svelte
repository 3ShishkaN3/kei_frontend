<script>
    import { createEventDispatcher, onMount, onDestroy } from "svelte";
    import { dndzone } from "svelte-dnd-action";
    import { flip } from "svelte/animate";
    import ImageItemDisplay from "../ImageItemDisplay.svelte";
    import AudioItemDisplay from "../AudioItemDisplay.svelte";
    import Refresh from "svelte-material-icons/Refresh.svelte";

    export let testData;
    export let sectionItemId;
    export let viewMode;
    export let canStudentInteract;
    export let draggableItemsPoolForDisplay;
    export let filledSlotsForDisplay;
    export let selectedDraggableOptionForSlot;
    export let isTestSubmittedByStudent;
    export let studentSubmission = null;

    const dispatch = createEventDispatcher();

    const flipDurationMs = 200;

    let isMobile = false;
    if (typeof window !== "undefined") {
        isMobile =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent,
            );
    }

    $: dragDropAnswersMap = new Map();
    $: if (studentSubmission && studentSubmission.drag_drop_answers) {
        dragDropAnswersMap.clear();
        studentSubmission.drag_drop_answers.forEach((answer) => {
            dragDropAnswersMap.set(answer.slot_id, answer);
        });
    }

    $: slotStatuses = {};
    $: if (testData && testData.drag_drop_slots) {
        testData.drag_drop_slots.forEach((slot) => {
            slotStatuses[slot.id] = getSlotDisplayStatus(slot);
        });
    }

    $: if (studentSubmission && testData && testData.drag_drop_slots) {
        testData.drag_drop_slots.forEach((slot) => {
            slotStatuses[slot.id] = getSlotDisplayStatus(slot);
        });
        slotStatuses = { ...slotStatuses };
    }

    function handlePoolDndConsider(e) {
        if (!canStudentInteract) return;
        draggableItemsPoolForDisplay = e.detail.items;
        dispatch(
            "update:draggableItemsPoolForDisplay",
            draggableItemsPoolForDisplay,
        );
    }

    function handlePoolDndFinalize(e) {
        if (!canStudentInteract) return;
        draggableItemsPoolForDisplay = e.detail.items;
        dispatch(
            "update:draggableItemsPoolForDisplay",
            draggableItemsPoolForDisplay,
        );
    }

    function handleSlotDndConsider(e, slotId) {
        if (!canStudentInteract) return;
        const slotItems = e.detail.items;

        if (slotItems.length > 0) {
            filledSlotsForDisplay[slotId] = slotItems[0];
        } else {
            delete filledSlotsForDisplay[slotId];
        }
        filledSlotsForDisplay = { ...filledSlotsForDisplay };

        dispatch("update:filledSlotsForDisplay", filledSlotsForDisplay);
    }

    function handleSlotDndFinalize(e, slotId) {
        if (!canStudentInteract) return;
        const slotItems = e.detail.items;

        if (slotItems.length > 0) {
            filledSlotsForDisplay[slotId] = slotItems[0];
        } else {
            delete filledSlotsForDisplay[slotId];
        }
        filledSlotsForDisplay = { ...filledSlotsForDisplay };

        dispatch("update:filledSlotsForDisplay", filledSlotsForDisplay);
    }

    function selectDraggableForSlot(item) {
        if (!canStudentInteract) return;
        if (
            selectedDraggableOptionForSlot &&
            selectedDraggableOptionForSlot.id === item.id
        ) {
            selectedDraggableOptionForSlot = null;
        } else {
            selectedDraggableOptionForSlot = item;
        }
        dispatch(
            "update:selectedDraggableOptionForSlot",
            selectedDraggableOptionForSlot,
        );
    }

    function placeSelectedOptionInSlot(slotId) {
        if (!canStudentInteract || !selectedDraggableOptionForSlot) return;

        filledSlotsForDisplay[slotId] = { ...selectedDraggableOptionForSlot };
        filledSlotsForDisplay = { ...filledSlotsForDisplay };

        const itemIndex = draggableItemsPoolForDisplay.findIndex(
            (item) => item.id === selectedDraggableOptionForSlot.id,
        );
        if (itemIndex !== -1) {
            draggableItemsPoolForDisplay.splice(itemIndex, 1);
            draggableItemsPoolForDisplay = [...draggableItemsPoolForDisplay];
        }

        selectedDraggableOptionForSlot = null;

        dispatch("update:filledSlotsForDisplay", filledSlotsForDisplay);
        dispatch(
            "update:draggableItemsPoolForDisplay",
            draggableItemsPoolForDisplay,
        );
        dispatch(
            "update:selectedDraggableOptionForSlot",
            selectedDraggableOptionForSlot,
        );
    }

    function clearSlot(slotId) {
        if (!canStudentInteract) return;

        const removedItem = filledSlotsForDisplay[slotId];
        if (removedItem) {
            draggableItemsPoolForDisplay = [
                ...draggableItemsPoolForDisplay,
                removedItem,
            ];
        }

        delete filledSlotsForDisplay[slotId];
        filledSlotsForDisplay = { ...filledSlotsForDisplay };

        dispatch("update:filledSlotsForDisplay", filledSlotsForDisplay);
        dispatch(
            "update:draggableItemsPoolForDisplay",
            draggableItemsPoolForDisplay,
        );
    }

    function getSlotDisplayStatus(slot) {
        if (viewMode === "admin" || isTestSubmittedByStudent) {
            const studentAnswerObjectInSlot = filledSlotsForDisplay[slot.id];
            const studentAnswerTextInSlot = studentAnswerObjectInSlot?.text;

            if (isTestSubmittedByStudent && studentSubmission) {
                const submissionAnswer = dragDropAnswersMap.get(slot.id);
                if (submissionAnswer) {
                    return submissionAnswer.is_correct
                        ? "student_correct"
                        : "student_incorrect";
                } else {
                    return "slot_empty_after_submit";
                }
            }

            if (
                studentAnswerTextInSlot === undefined &&
                isTestSubmittedByStudent
            )
                return "slot_empty_after_submit";
            if (studentAnswerTextInSlot === undefined) return "slot_empty";
            if (studentAnswerTextInSlot === slot.correct_answer_text)
                return "student_correct";
            return "student_incorrect";
        }
        return "pending";
    }

    function resetTestToDefault(event) {
        if (!canStudentInteract) return;

        event.preventDefault();
        event.stopPropagation();

        const allItemsFromSlots = Object.values(filledSlotsForDisplay);
        draggableItemsPoolForDisplay = [
            ...draggableItemsPoolForDisplay,
            ...allItemsFromSlots,
        ];

        filledSlotsForDisplay = {};

        selectedDraggableOptionForSlot = null;

        dispatch(
            "update:draggableItemsPoolForDisplay",
            draggableItemsPoolForDisplay,
        );
        dispatch("update:filledSlotsForDisplay", filledSlotsForDisplay);
        dispatch(
            "update:selectedDraggableOptionForSlot",
            selectedDraggableOptionForSlot,
        );

        dispatch("testReset");
    }

    onDestroy(() => {
        try {
            document.removeEventListener("wheel", ensureScroll);
        } catch (e) {
        }
    });

    onMount(() => {
        document.addEventListener("wheel", ensureScroll, { passive: true });
    });

    function ensureScroll(e) {
    }
</script>

<div class="drag-drop-test-area">
    {#if canStudentInteract}
        <button
            class="reset-test-button"
            on:click={resetTestToDefault}
            title="Сбросить тест к начальному состоянию"
            aria-label="Сбросить тест к начальному состоянию"
        >
            <Refresh size="20px" />
        </button>
    {/if}

    {#if testData.description && viewMode === "admin"}{:else if !testData.description && testData.test_type === "drag-and-drop"}
        <p class="instruction-text">
            Распределите предложенные варианты по соответствующим ячейкам. Можно
            перетаскивать слова или кликать для выбора.
        </p>
    {/if}

    {#if canStudentInteract || viewMode === "admin"}
        <h4>Доступные слова/фразы:</h4>
        <section
            class="draggable-options-pool-display"
            aria-label="Пул доступных слов для перетаскивания"
            use:dndzone={{
                items: draggableItemsPoolForDisplay,
                flipDurationMs,
                type: "words-pool",
                dropFromOthersDisabled: false,
                dropTargetStyle: { outline: "2px dashed #5845d8" },
            }}
            on:consider={handlePoolDndConsider}
            on:finalize={handlePoolDndFinalize}
        >
            {#each draggableItemsPoolForDisplay as item (item.id)}
                <div
                    class="draggable-option-dnd"
                    title={canStudentInteract
                        ? "Клик для выбора или перетащите: " + item.text
                        : item.text}
                    tabindex={canStudentInteract ? 0 : -1}
                    on:click={(e) => {
                        if (canStudentInteract) {
                            e.stopPropagation();
                            selectDraggableForSlot(item);
                        }
                    }}
                    on:keypress={(e) => {
                        if (
                            canStudentInteract &&
                            (e.key === "Enter" || e.key === " ")
                        )
                            selectDraggableForSlot(item);
                    }}
                    role="button"
                    aria-label={canStudentInteract
                        ? "Нажмите для выбора или перетащите: " + item.text
                        : item.text}
                    class:selected={selectedDraggableOptionForSlot &&
                        selectedDraggableOptionForSlot.id === item.id}
                    animate:flip={{ duration: flipDurationMs }}
                >
                    {item.text}
                </div>
            {/each}
            {#if draggableItemsPoolForDisplay.length === 0 && canStudentInteract}
                <p class="empty-pool-message">Все слова использованы.</p>
            {/if}
            {#if testData.draggable_options_pool.length === 0}
                <p class="empty-pool-message">
                    Пул слов для этого теста не задан.
                </p>
            {/if}
        </section>
    {/if}

    <h4>Ячейки для заполнения:</h4>
    <div class="drag-drop-slots-container">
        {#each testData.drag_drop_slots || [] as slot (slot.id)}
            {@const filledItemObject = filledSlotsForDisplay[slot.id]}
            {@const slotItems = filledItemObject ? [filledItemObject] : []}
            {@const slotDisplayStatus = slotStatuses[slot.id] || "pending"}
            <div
                class="drag-drop-slot-item"
                class:status-student_correct={slotDisplayStatus ===
                    "student_correct"}
                class:status-student_incorrect={slotDisplayStatus ===
                    "student_incorrect"}
                class:status-slot_empty_after_submit={slotDisplayStatus ===
                    "slot_empty_after_submit"}
                class:status-slot_empty={slotDisplayStatus === "slot_empty"}
                class:status-pending={slotDisplayStatus === "pending"}
                class:disabled={!canStudentInteract && isTestSubmittedByStudent}
            >
                <div class="slot-prompt">
                    {#if slot.prompt_image_details}
                        <ImageItemDisplay
                            contentDetails={slot.prompt_image_details}
                        />
                    {/if}
                    {#if slot.prompt_audio_details}
                        <AudioItemDisplay
                            contentDetails={slot.prompt_audio_details}
                        />
                    {/if}
                    {#if slot.prompt_text}
                        <p class="prompt-text">
                            {@html slot.prompt_text.replace(/\n/g, "<br>")}
                        </p>
                    {/if}
                    {#if !slot.prompt_image_details && !slot.prompt_audio_details && !slot.prompt_text}
                        <span class="slot-placeholder-num"
                            >Ячейка #{slot.order + 1}</span
                        >
                    {/if}
                </div>
                <div
                    class="drop-target-area-dnd"
                    use:dndzone={{
                        items: slotItems,
                        flipDurationMs,
                        type: "words-pool",
                        dropFromOthersDisabled: false,
                        dropTargetStyle: {
                            outline: "2px dashed #5845d8",
                            backgroundColor: "rgba(88, 69, 216, 0.1)",
                        },
                    }}
                    on:consider={(e) => handleSlotDndConsider(e, slot.id)}
                    on:finalize={(e) => handleSlotDndFinalize(e, slot.id)}
                    on:click={(e) => {
                        if (canStudentInteract) {
                            e.stopPropagation();
                            placeSelectedOptionInSlot(slot.id);
                        }
                    }}
                    on:keypress={(e) => {
                        if (
                            canStudentInteract &&
                            (e.key === "Enter" || e.key === " ")
                        )
                            placeSelectedOptionInSlot(slot.id);
                    }}
                    role="button"
                    tabindex={canStudentInteract && !filledItemObject ? 0 : -1}
                    aria-label={`Ячейка ${slot.prompt_text || "слот " + (slot.order + 1)}. ${filledItemObject ? "Текущий ответ: " + filledItemObject.text : selectedDraggableOptionForSlot && canStudentInteract ? "Нажмите, чтобы поместить " + selectedDraggableOptionForSlot.text : viewMode === "admin" || isTestSubmittedByStudent ? "Нет ответа" : "Пусто, выберите облачко и нажмите сюда или перетащите слово"}`}
                >
                    {#each slotItems as item (item.id)}
                        <div
                            class="draggable-option-dnd in-slot"
                            on:click|stopPropagation={() => {
                                if (canStudentInteract) clearSlot(slot.id);
                            }}
                            on:keypress|stopPropagation={(e) => {
                                if (
                                    canStudentInteract &&
                                    (e.key === "Enter" || e.key === " ")
                                )
                                    clearSlot(slot.id);
                            }}
                            tabindex={canStudentInteract ? 0 : -1}
                            role="button"
                            title={canStudentInteract
                                ? "Удалить облачко из ячейки (клик)"
                                : item.text}
                            animate:flip={{ duration: flipDurationMs }}
                        >
                            {item.text}
                        </div>
                    {/each}

                    {#if slotItems.length === 0}
                        {#if selectedDraggableOptionForSlot && canStudentInteract}
                            <span class="drop-hint"
                                >Поместить "{selectedDraggableOptionForSlot.text}"?</span
                            >
                        {:else if isTestSubmittedByStudent}
                            <span class="drop-placeholder">Нет ответа</span>
                        {:else}
                            <span class="drop-placeholder"
                                >{viewMode === "admin" ||
                                isTestSubmittedByStudent
                                    ? "Нет ответа"
                                    : "Пусто"}</span
                            >
                        {/if}
                    {/if}
                </div>
                {#if slot.explanation && (viewMode === "admin" || (isTestSubmittedByStudent && filledItemObject))}
                    <div
                        class="slot-explanation status-{slotDisplayStatus} visible"
                    >
                        <strong>Пояснение:</strong>
                        {@html slot.explanation.replace(/\n/g, "<br>")}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>

<style>
    .reset-test-button {
        position: absolute;
        top: -15px;
        right: 10px;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        z-index: 10;
    }

    .reset-test-button:hover {
        background: #f8f9fa;
        border-color: #5845d8;
        transform: scale(1.05);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .reset-test-button:active {
        transform: scale(0.95);
    }

    .drag-drop-test-area {
        margin-top: 25px;
        padding-top: 20px;
        border-top: 1px solid #f0f0f0;
        position: relative;
    }
    .instruction-text {
        font-size: 0.95em;
        color: var(--color-text-muted);
        margin-bottom: 15px;
        line-height: 1.6;
    }
    .drag-drop-test-area h4 {
        font-size: 1.05em;
        font-weight: 600;
        margin-top: 20px;
        margin-bottom: 12px;
        color: var(--color-secondary);
    }

    .draggable-options-pool-display {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 20px;
        background-color: #f7f9fc;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
        transition: all 0.2s ease;
    }

    .draggable-options-pool-display:has(.draggable-option-dnd:active) {
        background-color: #f0f4ff;
        border-color: var(--color-primary, #5845d8);
    }
    .draggable-item,
    .draggable-option-dnd {
        padding: 6px 12px;
        background-color: #fff;
        border: 1px solid var(--color-primary-light, #d1c9ff);
        color: var(--color-primary-dark, #5845d8);
        border-radius: 16px;
        cursor: grab;
        transition: all 0.2s ease;
        font-size: 1.05em;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        display: inline-flex;
        align-items: center;
        user-select: none;
        white-space: nowrap;
        position: relative;
    }

    .draggable-option-dnd:active {
        cursor: grabbing;
        transform: scale(1.05);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
    }

    .draggable-option-dnd.in-slot {
        cursor: pointer;
        background-color: var(--color-primary-light, #e0d8ff);
        border-color: var(--color-primary, #5845d8);
    }

    .draggable-option-dnd.in-slot:active {
        cursor: grabbing;
    }
    .draggable-item:hover:not([aria-disabled="true"]),
    .draggable-option-dnd:hover:not([aria-disabled="true"]) {
        background-color: var(--color-primary-light, #e0d8ff);
        transform: scale(1.03);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    }

    .draggable-item[aria-disabled="true"],
    .draggable-option-dnd[aria-disabled="true"] {
        opacity: 0.5;
        cursor: not-allowed;
        background-color: #e9ecef;
        color: #6c757d;
        border-color: #ced4da;
        box-shadow: none;
    }
    .draggable-item.selected-for-slot {
        outline: 3px solid var(--color-secondary);
        box-shadow: 0 0 10px rgba(var(--color-secondary-rgb), 0.4);
    }
    .empty-pool-message {
        width: 100%;
        text-align: center;
        font-size: 0.9em;
        color: #888;
        font-style: italic;
        padding: 10px 0;
    }

    .drag-drop-slots-container {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
    }

    @media (max-width: 768px) {
        .drag-drop-slots-container {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }

        .draggable-options-pool-display {
            gap: 6px;
            padding: 8px;
        }

        .draggable-item,
        .draggable-option-dnd {
            padding: 4px 8px;
            font-size: 0.8em;
            border-radius: 12px;
        }

        .drag-drop-test-area h4 {
            font-size: 1em;
            margin-top: 15px;
            margin-bottom: 8px;
        }
    }

    /* Очень маленькие экраны */
    @media (max-width: 480px) {
        .drag-drop-slots-container {
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
        }

        .draggable-item,
        .draggable-option-dnd {
            padding: 3px 6px;
            font-size: 0.75em;
        }
    }

    .drag-drop-slot-item {
        border: none;
        border-radius: 8px;
        padding: 12px;
        background-color: #fff;
        display: flex;
        flex-direction: column;
        transition:
            border-color 0.3s,
            background-color 0.3s;
        min-height: 120px; /* Фиксированная минимальная высота */
    }

    /* Мобильная адаптация для слотов */
    @media (max-width: 768px) {
        .drag-drop-slot-item {
            padding: 8px;
            min-height: 100px;
        }
    }

    @media (max-width: 480px) {
        .drag-drop-slot-item {
            padding: 6px;
            min-height: 90px;
        }
    }

    .drag-drop-slot-item.disabled {
        opacity: 0.7;
        background-color: #f9f9f9;
    }
    .slot-prompt {
        margin-bottom: 8px;
        min-height: 16px;
        font-size: 0.85em;
        flex-shrink: 0; /* Предотвращает сжатие */
    }

    /* Мобильная адаптация для промптов */
    @media (max-width: 768px) {
        .slot-prompt {
            margin-bottom: 6px;
            font-size: 0.8em;
        }
    }

    .slot-prompt .prompt-text {
        font-style: italic;
        color: #444;
    }
    .slot-prompt :global(.image-item-display),
    .slot-prompt :global(.audio-item-display-enhanced) {
        margin-bottom: 5px;
        border: none;
        padding: 0;
        box-shadow: none;
        max-width: 100%;
        height: auto;
    }

    /* Фиксированный размер для изображений в слотах */
    .slot-prompt :global(.image-item-display img) {
        max-width: 100%;
        height: auto;
        max-height: 180px;
        object-fit: contain;
    }

    @media (max-width: 768px) {
        .slot-prompt :global(.image-item-display img) {
            max-height: 150px;
        }
    }

    @media (max-width: 480px) {
        .slot-prompt :global(.image-item-display img) {
            max-height: 120px;
        }
    }

    .slot-placeholder-num {
        color: #999;
        font-size: 0.85em;
    }

    .drop-target-area-dnd {
        min-height: 40px; /* Уменьшаем минимальную высоту */
        max-height: 60px; /* Ограничиваем максимальную высоту */
        background-color: #f4f7fa;
        border: 2px dashed #c5d5e6;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        transition: all 0.2s;
        flex-grow: 1;
        flex-shrink: 0; /* Предотвращает сжатие */
        position: relative;
    }

    /* Стили для активной зоны перетаскивания */
    .drop-target-area-dnd:has(.draggable-option-dnd) {
        border-style: solid;
        border-color: var(--color-primary, #5845d8);
        background-color: var(--color-primary-light, #e0d8ff);
    }

    /* Стили для зоны при наведении перетаскиваемого элемента */
    .drop-target-area-dnd:hover {
        border-color: var(--color-primary, #5845d8);
        background-color: rgba(88, 69, 216, 0.05);
    }

    /* Курсор pointer только для пустых слотов, когда можно взаимодействовать */
    .drop-target-area-dnd:empty,
    .drop-target-area-dnd:has(.drop-placeholder) {
        cursor: pointer;
    }

    /* Для заполненных слотов курсор по умолчанию */
    .drop-target-area-dnd:has(.draggable-option-dnd) {
        cursor: default;
    }

    /* Мобильная адаптация для областей вставки */
    @media (max-width: 768px) {
        .drop-target-area-dnd {
            min-height: 35px;
            max-height: 50px;
            padding: 6px;
        }
    }

    @media (max-width: 480px) {
        .drop-target-area-dnd {
            min-height: 30px;
            max-height: 45px;
            padding: 4px;
        }
    }

    .drag-drop-slot-item.disabled .drop-target-area-dnd {
        cursor: default;
    }
    .drop-target-area-dnd.occupied {
        border-style: solid;
        border-color: var(--color-secondary-light, #d1d8f8);
        background-color: #eef2f7;
    }
    .draggable-item.in-slot {
        cursor: pointer;
        position: relative;
    } /* Для кнопки очистки */
    .clear-slot-btn {
        position: absolute;
        top: -8px;
        right: -8px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 14px;
        color: #888;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        line-height: 1;
        padding: 0;
    }
    .clear-slot-btn:hover {
        color: var(--color-danger-red);
        background-color: #fff0f0;
        border-color: var(--color-danger-red);
    }
    .drop-hint,
    .drop-placeholder-dnd {
        font-size: 0.85em;
        color: #777;
        font-style: italic;
        text-align: center;
    }

    /* Мобильная адаптация для подсказок */
    @media (max-width: 768px) {
        .drop-hint,
        .drop-placeholder-dnd {
            font-size: 0.8em;
        }
    }

    /* Стили для подсветки правильных ответов */
    .drag-drop-slot-item.status-student_correct .drop-target-area-dnd {
        border-color: var(--color-mcq-correct-border) !important;
        background-color: var(--color-mcq-correct) !important;
    }
    .drag-drop-slot-item.status-student_correct .draggable-option-dnd.in-slot {
        background-color: var(--color-mcq-correct-border) !important;
        border-color: var(--color-mcq-correct-border) !important;
        color: var(--color-mcq-correct-text) !important;
    }

    /* Стили для подсветки неправильных ответов */
    .drag-drop-slot-item.status-student_incorrect .drop-target-area-dnd {
        border-color: var(--color-mcq-incorrect-border) !important;
        background-color: var(--color-mcq-incorrect) !important;
    }
    .drag-drop-slot-item.status-student_incorrect
        .draggable-option-dnd.in-slot {
        background-color: var(--color-mcq-incorrect-border) !important;
        border-color: var(--color-mcq-incorrect-border) !important;
        color: var(--color-mcq-incorrect-text) !important;
    }
    /* Стили для пустых слотов после отправки */
    .drag-drop-slot-item.status-slot_empty_after_submit .drop-target-area-dnd,
    .drag-drop-slot-item.status-slot_empty .drop-target-area-dnd {
        border-color: #ffc107 !important;
        background-color: #fff8e1 !important;
    }
    .slot-explanation {
        font-size: 0.88em;
        color: #495057;
        margin-top: 10px;
        padding: 10px;
        background-color: #f8f9fa;
        border-radius: 6px;
        border-left: 3px solid #ced4da;
        line-height: 1.6;
        display: none;
    }
    .slot-explanation.visible {
        display: block;
    }
    .drag-drop-slot-item.status-student_correct .slot-explanation.visible {
        border-left-color: var(--color-mcq-correct-border) !important;
        background-color: var(--color-mcq-correct) !important;
        color: var(--color-mcq-correct-text) !important;
    }
    .drag-drop-slot-item.status-student_incorrect .slot-explanation.visible {
        border-left-color: var(--color-mcq-incorrect-border) !important;
        background-color: var(--color-mcq-incorrect) !important;
        color: var(--color-mcq-incorrect-text) !important;
    }
</style>
