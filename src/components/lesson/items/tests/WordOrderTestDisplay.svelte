<script>
    import { createEventDispatcher } from "svelte";
    import { dndzone } from "svelte-dnd-action";
    import DragVertical from "svelte-material-icons/DragVertical.svelte";
    import Refresh from "svelte-material-icons/Refresh.svelte";

    export let testData;
    export let sectionItemId;
    export let viewMode;
    export let canStudentInteract;
    export let currentWordSequence;
    export let wordOrderAvailableOptionsInPool;
    export let dndBasePoolForCurrentTest;
    export let isTestSubmittedByStudent;
    let isDragging = false;

    const dispatch = createEventDispatcher();
    const flipDurationMs = 200;

    const dndType = `wordOrder_${sectionItemId}`;

    function resetTestToDefault(event) {
        if (!canStudentInteract) return;

        event.preventDefault();
        event.stopPropagation();

        const allItemsFromSequence = [...currentWordSequence];
        wordOrderAvailableOptionsInPool = [
            ...wordOrderAvailableOptionsInPool,
            ...allItemsFromSequence,
        ];

        currentWordSequence = [];

        wordOrderAvailableOptionsInPool = wordOrderAvailableOptionsInPool.sort(
            (a, b) => {
                const indexA = dndBasePoolForCurrentTest.findIndex(
                    (p) => p.id === a.id,
                );
                const indexB = dndBasePoolForCurrentTest.findIndex(
                    (p) => p.id === b.id,
                );
                return indexA - indexB;
            },
        );

        dispatch("update:currentWordSequence", currentWordSequence);
        dispatch(
            "update:wordOrderAvailableOptionsInPool",
            wordOrderAvailableOptionsInPool,
        );

        dispatch("testReset");
    }

    function handleDndPoolConsider(e) {
        if (!canStudentInteract) return;
        wordOrderAvailableOptionsInPool = e.detail.items;
    }

    function handleDndPoolFinalize(e) {
        if (!canStudentInteract) return;
        const { items, info } = e.detail;
        if (info.source === "pointer" && info.trigger === "droppedIntoZone") {
            wordOrderAvailableOptionsInPool = items;
            currentWordSequence = currentWordSequence.filter(
                (seqItem) => seqItem.id !== info.item.id,
            );
            wordOrderAvailableOptionsInPool =
                wordOrderAvailableOptionsInPool.sort((a, b) => {
                    const indexA = dndBasePoolForCurrentTest.findIndex(
                        (p) => p.id === a.id,
                    );
                    const indexB = dndBasePoolForCurrentTest.findIndex(
                        (p) => p.id === b.id,
                    );
                    return indexA - indexB;
                });
        } else {
            wordOrderAvailableOptionsInPool = items;
        }

        dispatch(
            "update:wordOrderAvailableOptionsInPool",
            wordOrderAvailableOptionsInPool,
        );
        dispatch("update:currentWordSequence", currentWordSequence);
    }

    function handleDndSequenceConsider(e) {
        if (!canStudentInteract) return;
        currentWordSequence = e.detail.items;
    }

    function handleDndSequenceFinalize(e) {
        if (!canStudentInteract) return;
        const { items, info } = e.detail;

        if (info.source === "pointer" && info.trigger === "droppedIntoZone") {
            currentWordSequence = items;
            wordOrderAvailableOptionsInPool =
                wordOrderAvailableOptionsInPool.filter(
                    (poolItem) => poolItem.id !== info.item.id,
                );
        } else {
            currentWordSequence = items;
        }

        dispatch("update:currentWordSequence", currentWordSequence);
        dispatch(
            "update:wordOrderAvailableOptionsInPool",
            wordOrderAvailableOptionsInPool,
        );
    }

    function addWordToStudentSequenceFromPool(itemFromPool) {
        if (!canStudentInteract || isDragging) return;
        currentWordSequence = [...currentWordSequence, { ...itemFromPool }];
        wordOrderAvailableOptionsInPool =
            wordOrderAvailableOptionsInPool.filter(
                (p) => p.id !== itemFromPool.id,
            );
        dispatch("update:currentWordSequence", currentWordSequence);
        dispatch(
            "update:wordOrderAvailableOptionsInPool",
            wordOrderAvailableOptionsInPool,
        );
    }

    function returnWordFromStudentSequenceToPool(itemIndex) {
        if (
            !canStudentInteract ||
            isDragging ||
            itemIndex < 0 ||
            itemIndex >= currentWordSequence.length
        )
            return;
        const itemToReturn = currentWordSequence[itemIndex];
        currentWordSequence = currentWordSequence.filter(
            (_, i) => i !== itemIndex,
        );

        if (
            itemToReturn &&
            !wordOrderAvailableOptionsInPool.find(
                (i) => i.id === itemToReturn.id,
            )
        ) {
            wordOrderAvailableOptionsInPool = [
                ...wordOrderAvailableOptionsInPool,
                { ...itemToReturn },
            ].sort((a, b) => {
                const indexA = dndBasePoolForCurrentTest.findIndex(
                    (p) => p.id === a.id,
                );
                const indexB = dndBasePoolForCurrentTest.findIndex(
                    (p) => p.id === b.id,
                );
                return indexA - indexB;
            });
        }

        dispatch("update:currentWordSequence", currentWordSequence);
        dispatch(
            "update:wordOrderAvailableOptionsInPool",
            wordOrderAvailableOptionsInPool,
        );
    }

    function isWordOrderSequenceCorrect() {
        if (
            !isTestSubmittedByStudent ||
            !testData?.word_order_sentence?.correct_ordered_texts
        )
            return null;
        const correctTexts = testData.word_order_sentence.correct_ordered_texts;
        const studentTexts = currentWordSequence.map((item) => item.text);
        if (correctTexts.length === 0 && studentTexts.length === 0) return true;
        if (
            correctTexts.length !== studentTexts.length &&
            studentTexts.length > 0
        )
            return false;
        if (
            correctTexts.length > 0 &&
            studentTexts.length === 0 &&
            correctTexts.length > 0
        )
            return false;
        return correctTexts.every(
            (word, index) => word === studentTexts[index],
        );
    }
</script>

<div class="word-order-test-area" style="position: relative;">
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

    {#if testData.word_order_sentence?.display_prompt}
        <p class="instruction-text">
            <strong>Задание:</strong>
            {@html testData.word_order_sentence.display_prompt.replace(
                /\n/g,
                "<br>",
            )}
        </p>
    {/if}

    {#if canStudentInteract || viewMode === "admin"}
        <h4>Доступные слова/фразы:</h4>
        <section
            class="draggable-options-pool-display dnd-zone"
            use:dndzone={{
                items: wordOrderAvailableOptionsInPool,
                type: dndType,
                flipDurationMs,
                dragDisabled: !canStudentInteract,
            }}
            on:consider={handleDndPoolConsider}
            on:finalize={handleDndPoolFinalize}
            on:dragstart={() => {
                isDragging = true;
            }}
            on:dragend={() => {
                isDragging = false;
            }}
            aria-label="Пул доступных слов для составления последовательности"
        >
            {#each wordOrderAvailableOptionsInPool as item (item.id)}
                <div
                    class="draggable-option-dnd word-order-option"
                    title={canStudentInteract
                        ? "Клик или перетаскивание для добавления: " + item.text
                        : item.text}
                    tabindex={canStudentInteract ? 0 : -1}
                    on:click={(e) => {
                        if (canStudentInteract && !isDragging) {
                            e.preventDefault();
                            addWordToStudentSequenceFromPool(item);
                        }
                    }}
                    on:keydown={(e) => {
                        if (
                            canStudentInteract &&
                            !isDragging &&
                            (e.key === "Enter" || e.key === " ")
                        ) {
                            e.preventDefault();
                            addWordToStudentSequenceFromPool(item);
                        }
                    }}
                    role="button"
                >
                    {item.text}
                </div>
            {/each}
            {#if wordOrderAvailableOptionsInPool.length === 0 && canStudentInteract}
                <p class="empty-pool-message">Все слова использованы.</p>
            {/if}
            {#if dndBasePoolForCurrentTest.length === 0}
                <p class="empty-pool-message">
                    Пул слов для этого теста не задан.
                </p>
            {/if}
        </section>
    {/if}

    <h4>Ваша последовательность:</h4>
    <section
        class="word-sequence-display-area dnd-zone"
        use:dndzone={{
            items: currentWordSequence,
            type: dndType,
            flipDurationMs,
            dragDisabled: !canStudentInteract,
        }}
        on:consider={handleDndSequenceConsider}
        on:finalize={handleDndSequenceFinalize}
        on:dragstart={() => {
            isDragging = true;
        }}
        on:dragend={() => {
            isDragging = false;
        }}
        aria-label="Текущая составленная последовательность"
    >
        {#if currentWordSequence.length > 0}
            {#each currentWordSequence as item, index (item.id)}
                <div
                    class="draggable-option-dnd word-order-option sequence-word-item-dnd"
                    title={canStudentInteract
                        ? "Перетащить для изменения порядка или кликнуть для возврата: " +
                          item.text
                        : item.text}
                    class:interactive={canStudentInteract}
                    tabindex={canStudentInteract ? 0 : -1}
                    on:click={(e) => {
                        if (canStudentInteract && !isDragging) {
                            e.preventDefault();
                            returnWordFromStudentSequenceToPool(index);
                        }
                    }}
                    on:keydown={(e) => {
                        if (
                            canStudentInteract &&
                            !isDragging &&
                            (e.key === "Enter" || e.key === " ")
                        ) {
                            e.preventDefault();
                            returnWordFromStudentSequenceToPool(index);
                        }
                    }}
                    role="button"
                >
                    <span>{item.text}</span>
                </div>
            {/each}
        {:else}
            <p class="empty-sequence-message">
                Последовательность пуста. Перетащите или кликните слова из пула
                выше.
            </p>
        {/if}
    </section>

    {#if isTestSubmittedByStudent && testData.word_order_sentence}
        {@const isCorrectSeq = isWordOrderSequenceCorrect()}
        <div
            class="sequence-result-display"
            class:correct={isCorrectSeq === true}
            class:incorrect={isCorrectSeq === false}
        >
            <strong>Результат:</strong>
            {#if isCorrectSeq === true}
                Верно!
            {:else if isCorrectSeq === false}
                Неверно.
                {#if viewMode === "admin" || isTestSubmittedByStudent}
                    Правильная последовательность: "{testData.word_order_sentence.correct_ordered_texts.join(
                        " ",
                    )}"
                {/if}
            {:else}
                Ответ не полный или не может быть оценен.
            {/if}
            {#if testData.word_order_sentence.explanation}
                <p class="explanation-text">
                    <em>Пояснение:</em>
                    {@html testData.word_order_sentence.explanation.replace(
                        /\n/g,
                        "<br>",
                    )}
                </p>
            {/if}
        </div>
    {/if}
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

    .word-order-test-area {
        margin-top: 25px;
        padding-top: 20px;
        border-top: 1px solid #f0f0f0;
    }

    .instruction-text {
        font-size: 0.95em;
        color: var(--color-text-muted);
        margin-bottom: 15px;
        line-height: 1.6;
    }

    .word-order-test-area h4 {
        font-size: 1.05em;
        font-weight: 600;
        margin-top: 20px;
        margin-bottom: 12px;
        color: var(--color-secondary);
    }

    .dnd-zone {
        border: 2px dashed var(--color-border-light, #e0e0e0);
        padding: 10px;
        border-radius: var(--spacing-border-radius-small);
        transition:
            background-color 0.2s ease,
            border-color 0.2s ease;
        min-height: 50px;
    }

    .dnd-zone:global(.svelte-dnd-droptarget-active) {
        background-color: rgba(var(--color-primary-rgb), 0.05);
        border-color: var(--color-primary);
        border-style: solid;
    }

    .draggable-options-pool-display {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 20px;
        background-color: #f7f9fc;
    }

    .draggable-option-dnd {
        padding: 8px 15px;
        background-color: #fff;
        border: 1px solid var(--color-primary-light, #d1c9ff);
        color: var(--color-primary-dark, #5845d8);
        border-radius: 18px;
        cursor: grab;
        transition: all 0.2s ease;
        font-size: 1.05em;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        display: inline-flex;
        align-items: center;
        user-select: none;
    }

    .draggable-option-dnd:hover:not([aria-disabled="true"]) {
        background-color: var(--color-primary-light, #e0d8ff);
        transform: scale(1.03);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    }

    .draggable-option-dnd:global([aria-grabbed="true"]) {
        opacity: 0.6;
        background-color: var(--color-secondary);
        color: white;
        box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
        transform: rotate(-2deg);
    }

    .draggable-option-dnd[aria-disabled="true"] {
        opacity: 0.5;
        cursor: not-allowed;
        background-color: #e9ecef;
        color: #6c757d;
        border-color: #ced4da;
        box-shadow: none;
    }

    .empty-pool-message,
    .empty-sequence-message {
        width: 100%;
        text-align: center;
        font-size: 0.9em;
        color: #888;
        font-style: italic;
        padding: 10px 0;
    }

    .word-sequence-display-area {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px;
        background-color: #fff;
        border: 1px solid var(--color-secondary-light);
        border-radius: var(--spacing-border-radius-small);
        min-height: 48px;
        margin-bottom: 15px;
    }

    .drag-handle {
        margin-right: 6px;
        cursor: grab;
        color: #aaa;
    }

    .sequence-word-item-dnd:active .drag-handle {
        cursor: grabbing;
    }

    .sequence-result-display {
        margin-top: 15px;
        padding: 12px;
        border-radius: var(--spacing-border-radius-small);
        font-size: 0.95em;
    }

    .sequence-result-display.correct {
        background-color: #e6ffed;
        border: 1px solid #c3e6cb;
        color: #155724;
    }

    .sequence-result-display.incorrect {
        background-color: #ffebee;
        border: 1px solid #f5c6cb;
        color: #721c24;
    }

    .sequence-result-display .explanation-text {
        margin-top: 8px;
        font-size: 0.9em;
        font-style: italic;
    }
</style>
