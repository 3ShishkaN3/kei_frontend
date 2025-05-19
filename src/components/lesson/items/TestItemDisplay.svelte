<script>
    import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
    import { dndzone } from 'svelte-dnd-action';
    import { flip } from 'svelte/animate'; 
    import { fade } from 'svelte/transition'; 

    import ImageItemDisplay from '../items/ImageItemDisplay.svelte';
    import AudioItemDisplay from '../items/AudioItemDisplay.svelte';

    import CheckCircleOutline from 'svelte-material-icons/CheckCircleOutline.svelte'; 
    import CloseCircleOutline from 'svelte-material-icons/CloseCircleOutline.svelte'; 
    import RadioboxMarked from 'svelte-material-icons/RadioboxMarked.svelte'; 
    import RadioboxBlank from 'svelte-material-icons/RadioboxBlank.svelte';   
    import CheckboxMarked from 'svelte-material-icons/CheckboxMarked.svelte';
    import CheckboxBlankOutline from 'svelte-material-icons/CheckboxBlankOutline.svelte';
    import HelpCircleOutline from 'svelte-material-icons/HelpCircleOutline.svelte';
    import DragVertical from 'svelte-material-icons/DragVertical.svelte';

    export let testData;        
    export let sectionItemId;   
    export let viewMode = 'student'; 
    export let studentSubmission = null; 

    const dispatch = createEventDispatcher();

    let isSubmitting = false;
    
    $: isSubmitted = !!studentSubmission && studentSubmission.test?.id === testData?.id && viewMode === 'student';
    $: canInteract = viewMode === 'student' && !isSubmitted && !isSubmitting;

    let mcq_selectedOptionsMap = {}; 
    let mcq_selectedRadioOption = null; 
    
    let sentenceOrder_availableItems = []; 
    let sentenceOrder_placedInSlots = []; 
    
    let dragToMatch_availableItems = [];
    let dragToMatch_matches = {}; 

    let studentActualMcqChoiceIds = []; 
    let studentActualSentenceOrderPlacedItems = []; 
    let studentActualDragToMatchMatches = {};


    function initializeLocalStateFromProps(currentTestData, currentStudentSubmission, currentViewMode) {
        mcq_selectedOptionsMap = {};
        mcq_selectedRadioOption = null;
        
        const currentIsSubmittedForInit = !!currentStudentSubmission && 
                                           currentStudentSubmission.test?.id === currentTestData?.id && 
                                           currentViewMode === 'student';
        
        sentenceOrder_availableItems = currentTestData?.draggable_items 
            ? currentTestData.draggable_items.map(item => ({...item }))
            : [];
        sentenceOrder_placedInSlots = currentTestData?.sentence_order_slots 
            ? currentTestData.sentence_order_slots.map(() => null) 
            : [];

        dragToMatch_availableItems = currentTestData?.draggable_items
            ? currentTestData.draggable_items.map(item => ({...item }))
            : [];
        dragToMatch_matches = {};
        
        studentActualMcqChoiceIds = [];
        studentActualSentenceOrderPlacedItems = currentTestData?.sentence_order_slots?.map(() => null) || [];
        studentActualDragToMatchMatches = {};

        if (currentIsSubmittedForInit && currentStudentSubmission && currentStudentSubmission.answers) {
            const answers = currentStudentSubmission.answers;

            if (currentTestData?.test_type === 'mcq-multi' || currentTestData?.test_type === 'mcq-single') {
                const ids = answers.selected_option_ids || (Array.isArray(answers) ? answers.map(a => a.id) : []);
                studentActualMcqChoiceIds = ids;
                if (currentTestData.test_type === 'mcq-multi') {
                    ids.forEach(id => { mcq_selectedOptionsMap[id] = true; });
                } else if (ids.length > 0) {
                    mcq_selectedRadioOption = ids[0];
                }
            } else if (currentTestData?.test_type === 'sentence-order' && answers.submitted_item_ids_order) {
                const placedIds = answers.submitted_item_ids_order;
                studentActualSentenceOrderPlacedItems = placedIds.map(id => 
                    currentTestData.draggable_items.find(di => di.id === id) || null
                ).filter(item => item !== null); 
                
                sentenceOrder_placedInSlots = [...studentActualSentenceOrderPlacedItems]; 
                const placedItemIdsSet = new Set(placedIds);
                sentenceOrder_availableItems = (currentTestData.draggable_items || [])
                    .filter(di => !placedItemIdsSet.has(di.id))
                    .map(item => ({...item }));

            } else if (currentTestData?.test_type === 'drag-to-match' && Array.isArray(answers)) {
                answers.forEach(match => {
                    const targetKey = match.matching_pair_id || match.target_id;
                    const itemKey = match.submitted_draggable_item_id || match.dropped_item_id;
                    if (typeof targetKey !== 'undefined' && typeof itemKey !== 'undefined') {
                       studentActualDragToMatchMatches[targetKey] = itemKey;
                       dragToMatch_matches[targetKey] = itemKey; 
                    }
                });
                const matchedItemIdsSet = new Set(Object.values(studentActualDragToMatchMatches));
                dragToMatch_availableItems = (currentTestData.draggable_items || [])
                    .filter(di => !matchedItemIdsSet.has(di.id))
                    .map(item => ({...item }));
            }
        }
        
        mcq_selectedOptionsMap = {...mcq_selectedOptionsMap};
        sentenceOrder_availableItems = [...sentenceOrder_availableItems];
        sentenceOrder_placedInSlots = [...sentenceOrder_placedInSlots];
        dragToMatch_availableItems = [...dragToMatch_availableItems];
        dragToMatch_matches = {...dragToMatch_matches};
    }
    
    onMount(() => {
        initializeLocalStateFromProps(testData, studentSubmission, viewMode);
    });

    let prevTestDataString = ""; 
    let prevSubmissionString = "";
    let prevViewModeString = "";

    $: { 
        const currentTestDataStr = JSON.stringify(testData ? { id: testData.id, type: testData.test_type, oL: testData.mcq_options?.length, dL: testData.draggable_items?.length, soL: testData.sentence_order_slots?.length, mtL: testData.match_targets?.length } : null);
        const currentSubmissionStr = JSON.stringify(studentSubmission ? { id: studentSubmission.id, status: studentSubmission.status } : null);
        const currentViewModeStr = viewMode;

        if (currentTestDataStr !== prevTestDataString || 
            currentSubmissionStr !== prevSubmissionString || 
            currentViewModeStr !== prevViewModeString) 
        {
            if (isSubmitting && currentSubmissionStr !== prevSubmissionString) { 
                 if ((studentSubmission && studentSubmission.test?.id === testData?.id) || !studentSubmission) {
                    isSubmitting = false;
                }
            }
            initializeLocalStateFromProps(testData, studentSubmission, viewMode);
            prevTestDataString = currentTestDataStr;
            prevSubmissionString = currentSubmissionStr;
            prevViewModeString = currentViewModeStr;
        }
    }
    
    function handleMcqOptionChange(optionId, event) {
        if (!canInteract) return; 
        if (testData.test_type === 'mcq-multi') {
            mcq_selectedOptionsMap[optionId] = event.target.checked;
            mcq_selectedOptionsMap = {...mcq_selectedOptionsMap};
        } else if (testData.test_type === 'mcq-single') {
            mcq_selectedRadioOption = optionId;
        }
    }

    const dndOptions = { flipDurationMs: 200 };

    function handleSentenceOrderPoolFinalize(e) {
        if (!canInteract) return;
        sentenceOrder_availableItems = e.detail.items.map(item => ({...item}));
    }

    function handleSentenceOrderSlotFinalize(e, slotIndex) {
        if (!canInteract) return;
        const droppedItemArray = e.detail.items; 
        const oldItemInSlot = sentenceOrder_placedInSlots[slotIndex];

        if (oldItemInSlot && (!droppedItemArray[0] || oldItemInSlot.id !== droppedItemArray[0]?.id)) {
            if (!sentenceOrder_availableItems.find(it => it.id === oldItemInSlot.id)) {
                 sentenceOrder_availableItems = [...sentenceOrder_availableItems, oldItemInSlot];
            }
        }
        
        if (droppedItemArray && droppedItemArray.length > 0) {
            sentenceOrder_placedInSlots[slotIndex] = droppedItemArray[0];
            sentenceOrder_availableItems = sentenceOrder_availableItems.filter(it => it.id !== droppedItemArray[0].id);
        } else { 
            sentenceOrder_placedInSlots[slotIndex] = null;
        }
        sentenceOrder_placedInSlots = [...sentenceOrder_placedInSlots];
        sentenceOrder_availableItems = [...sentenceOrder_availableItems];
    }

    function handleMatchItemsPoolFinalize(e) {
        if (!canInteract) return;
        dragToMatch_availableItems = e.detail.items.map(item => ({...item}));
    }

    function handleDndMatchTargetDropFinalize(e, targetId) {
        if (!canInteract) return;
        const droppedItemArray = e.detail.items;
        const previouslyDroppedItemId = dragToMatch_matches[targetId];

        if (previouslyDroppedItemId && (!droppedItemArray[0] || previouslyDroppedItemId !== droppedItemArray[0]?.id)) {
            const prevItemOriginal = testData.draggable_items.find(i => i.id === previouslyDroppedItemId);
            if (prevItemOriginal && !dragToMatch_availableItems.find(i => i.id === prevItemOriginal.id)) {
                dragToMatch_availableItems = [...dragToMatch_availableItems, {...prevItemOriginal}];
            }
        }
        if (droppedItemArray && droppedItemArray.length > 0) {
            dragToMatch_matches[targetId] = droppedItemArray[0].id;
            dragToMatch_availableItems = dragToMatch_availableItems.filter(item => item.id !== droppedItemArray[0].id);
        } else {
            delete dragToMatch_matches[targetId];
        }
        dragToMatch_matches = {...dragToMatch_matches};
        dragToMatch_availableItems = [...dragToMatch_availableItems];
    }

    function returnItemToPool(targetId) {
        if (!canInteract) return;
        const itemIdToReturn = dragToMatch_matches[targetId];
        if (itemIdToReturn) {
            const itemOriginal = testData.draggable_items.find(i => i.id === itemIdToReturn);
            if (itemOriginal && !dragToMatch_availableItems.find(i => i.id === itemOriginal.id)) {
                dragToMatch_availableItems = [...dragToMatch_availableItems, {...itemOriginal}];
            }
            delete dragToMatch_matches[targetId];
            dragToMatch_matches = {...dragToMatch_matches};
        }
    }

    async function handleSubmitTest() {
        if (!canInteract) return;
        let answersPayload = {};

        if (testData.test_type === 'mcq-multi') {
            const selectedIds = Object.keys(mcq_selectedOptionsMap).filter(id => mcq_selectedOptionsMap[id]).map(id => parseInt(id));
            if (selectedIds.length === 0) { dispatch('notify', { type: 'warning', message: 'Выберите хотя бы один вариант.' }); return; }
            answersPayload = { selected_option_ids: selectedIds };
        } else if (testData.test_type === 'mcq-single') {
            if (mcq_selectedRadioOption === null) { dispatch('notify', { type: 'warning', message: 'Выберите вариант ответа.' }); return; }
            answersPayload = { selected_option_ids: mcq_selectedRadioOption !== null ? [parseInt(mcq_selectedRadioOption)] : [] };
        } else if (testData.test_type === 'sentence-order') {
            const placedItemIds = sentenceOrder_placedInSlots.map(item => item?.id).filter(id => id != null);
            if (placedItemIds.length !== (testData.sentence_order_slots?.length || 0)) {
                 dispatch('notify', { type: 'warning', message: 'Заполните все слоты для порядка слов.' }); return;
            }
            answersPayload = { submitted_item_ids_order: placedItemIds };
        } else if (testData.test_type === 'drag-to-match') {
            const matchesForApi = Object.entries(dragToMatch_matches).map(([targetId, itemId]) => ({
                matching_pair_id: parseInt(targetId), 
                submitted_draggable_item_id: itemId ? parseInt(itemId) : null 
            }));
             if (matchesForApi.length !== (testData.match_targets?.length || 0)) {
                 dispatch('notify', { type: 'warning', message: 'Соотнесите элементы для всех целей.' }); return;
            }
            answersPayload = { answers: matchesForApi }; 
        } else {
            return;
        }

        isSubmitting = true; 
        await tick();
        
        dispatch('submitTest', {
            testId: testData.id, sectionItemId: sectionItemId,
            answers: answersPayload, fileData: null 
        });
    }
    
    function getOptionDisplayStatus(option, studentChoices, isTestDone) {
        if (viewMode === 'admin' || isTestDone) {
            const isSelectedByStudent = studentChoices.includes(option.id);
            if (option.is_correct) return isSelectedByStudent ? 'student_correct' : 'missed_correct';
            return isSelectedByStudent ? 'student_incorrect' : 'neutral_incorrect';
        }
        return 'pending';
    }

    function getSentenceOrderSlotStatus(slot, index, studentPlacedItems, isTestDone) {
        if (viewMode === 'admin' || isTestDone) {
            const studentPlacedItem = studentPlacedItems[index];
            if (!studentPlacedItem) return 'slot_empty';
            return slot.correct_item_id === studentPlacedItem.id ? 'slot_correct' : 'slot_incorrect';
        }
        return 'slot_pending';
    }

    function getMatchTargetStatus(target, studentMatches, isTestDone) {
        if (viewMode === 'admin' || isTestDone) {
            const studentDroppedItemId = studentMatches[target.id];
            if (studentDroppedItemId === undefined || studentDroppedItemId === null) return 'target_empty';
            return target.correct_item_id === studentDroppedItemId ? 'target_correct' : 'target_incorrect';
        }
        return 'target_pending';
    }
</script>

<div class="test-item-display-wrapper" data-testid={"test-item-" + (testData?.id || 'unknown')} aria-labelledby={"test-title-" + (testData?.id || 'unknown')}>
    <h4 class="test-title" id={"test-title-" + (testData?.id || 'unknown')}>{testData?.title || 'Тест'}</h4>
    {#if testData?.description}
        <div class="test-description">{@html testData.description.replace(/\n/g, '<br>')}</div>
    {/if}
    
    {#if testData?.attached_image_details}
        <div class="test-attachment test-attached-image">
            <ImageItemDisplay contentDetails={testData.attached_image_details} />
        </div>
    {/if}
    {#if testData?.attached_audio_details}
            <div class="test-attachment test-attached-audio">
            <AudioItemDisplay contentDetails={testData.attached_audio_details} />
        </div>
    {/if}

    <form class="test-form-display" on:submit|preventDefault={handleSubmitTest} aria-live="polite">
        {#if testData?.test_type === 'mcq-single' || testData?.test_type === 'mcq-multi'}
            <fieldset class="mcq-options-group" role={testData.test_type === 'mcq-single' ? 'radiogroup' : 'group'} aria-labelledby={"test-title-" + (testData?.id || 'unknown')}>
                <legend class="sr-only">Варианты ответа для теста "{testData?.title}"</legend>
                {#each testData.mcq_options || [] as option (option.id)}
                    {@const displayStatus = getOptionDisplayStatus(option, studentActualMcqChoiceIds, isSubmitted)}
                    <div 
                        class="mcq-option-display-item status-{displayStatus}"
                        class:disabled={!canInteract}
                    >
                        <label class="mcq-option-label">
                            <input 
                                type={testData.test_type === 'mcq-single' ? 'radio' : 'checkbox'}
                                name={"mcq_option_group_" + sectionItemId + "_" + (testData.id || 'new')} 
                                value={option.id}
                                checked={testData.test_type === 'mcq-single' ? mcq_selectedRadioOption === option.id : !!mcq_selectedOptionsMap[option.id]}
                                on:change={(e) => handleMcqOptionChange(option.id, e)}
                                disabled={!canInteract}
                                class="mcq-option-input"
                                aria-describedby={option.explanation ? "explanation-" + option.id : null}
                            />
                            <span class="mcq-option-checkbox-visual">
                                {#if testData.test_type === 'mcq-single'}
                                    <svelte:component this={(isSubmitted ? studentActualMcqChoiceIds.includes(option.id) : mcq_selectedRadioOption === option.id) ? RadioboxMarked : RadioboxBlank} size="22px" />
                                {:else}
                                    <svelte:component this={(isSubmitted ? studentActualMcqChoiceIds.includes(option.id) : mcq_selectedOptionsMap[option.id]) ? CheckboxMarked : CheckboxBlankOutline} size="22px" />
                                {/if}
                            </span>
                            <span class="mcq-option-text-content">{@html option.text.replace(/\n/g, '<br>')}</span>
                        </label>
                        
                        {#if option.explanation && (viewMode === 'admin' || (isSubmitted && studentActualMcqChoiceIds.includes(option.id) ))}
                            <div 
                                class="mcq-option-explanation status-{displayStatus} visible" 
                                id={"explanation-" + option.id}
                            >
                                <strong>Пояснение:</strong> {@html option.explanation.replace(/\n/g, '<br>')}
                            </div>
                        {/if}
                    </div>
                {/each}
            </fieldset>
        
        {:else if testData?.test_type === 'sentence-order'}
            <div class="sentence-order-test-area">
                <p class="instruction">Расставьте элементы в правильном порядке.</p>
                
                <h4>Доступные элементы (перетащите в слоты ниже):</h4>
                <section 
                    class="draggable-items-pool so-pool"
                    use:dndzone={{items: sentenceOrder_availableItems, type: 'draggable_item_so', ...dndOptions, dragDisabled: !canInteract}}
                    on:finalize={handleSentenceOrderPoolFinalize}
                    aria-label="Пул доступных элементов для расстановки"
                >
                    {#each sentenceOrder_availableItems as item (item.id)}
                        <div class="draggable-item-chip so-chip" animate:flip={dndOptions}>
                            {#if canInteract}<DragVertical size="16px" class="drag-handle"/>{/if} 
                            {@html item.text.replace(/\n/g, '<br>')}
                        </div>
                    {/each}
                    {#if sentenceOrder_availableItems.length === 0 && !isSubmitted}
                        <span class="empty-pool-placeholder">Все элементы размещены</span>
                    {/if}
                </section>

                <h4>Порядок в предложении:</h4>
                <section class="sentence-order-slots-container" aria-label="Слоты для размещения элементов">
                    {#each testData.sentence_order_slots || [] as slot, index (slot.id)}
                        {@const placedItemObject = sentenceOrder_placedInSlots[index]} 
                        {@const slotStatus = getSentenceOrderSlotStatus(slot, index, studentActualSentenceOrderPlacedItems, isSubmitted)}
                        <div 
                            class="sentence-order-slot status-{slotStatus}"
                            use:dndzone={{items: placedItemObject ? [placedItemObject] : [], type: 'draggable_item_so', ...dndOptions, dragDisabled: !canInteract}}
                            on:finalize={(e) => handleSentenceOrderSlotFinalize(e, index)}
                            aria-label={`Слот ${index + 1}${slot.prompt_text ? ', подсказка: ' + slot.prompt_text : ''}`}
                        >
                            <span class="slot-index">{index + 1}.</span>
                            {#if slot.prompt_text}<span class="slot-prompt">{@html slot.prompt_text.replace(/\n/g, '<br>')}</span>{/if}
                            
                            {#if placedItemObject}
                                <div class="draggable-item-chip placed so-chip" 
                                     transition:fade={{duration:150}} 
                                     
                                >
                                   {#if canInteract}<DragVertical size="16px" class="drag-handle"/>{/if} 
                                   {@html placedItemObject.text.replace(/\n/g, '<br>')}
                                </div>
                            {:else if canInteract}
                                <span class="empty-slot-placeholder">Перетащите сюда</span>
                            {/if}

                            {#if isSubmitted && slotStatus === 'slot_incorrect'}
                                <span class="feedback-icon error" title="Неверно"><CloseCircleOutline size="18px"/></span>
                            {:else if isSubmitted && slotStatus === 'slot_correct'}
                                <span class="feedback-icon success" title="Верно"><CheckCircleOutline size="18px"/></span>
                            {:else if isSubmitted && slotStatus === 'slot_empty'}
                                <span class="feedback-icon neutral" title="Пропущено"><HelpCircleOutline size="18px"/></span>
                            {/if}
                        </div>
                        {#if slot.explanation && (viewMode === 'admin' || (isSubmitted && (slotStatus === 'slot_correct' || slotStatus === 'slot_incorrect' || slotStatus === 'slot_empty')))}
                            <div class="mcq-option-explanation status-{slotStatus} visible">
                                <strong>Пояснение к слоту:</strong> {@html slot.explanation.replace(/\n/g, '<br>')}
                            </div>
                        {/if}
                    {/each}
                </section>
                {#if viewMode === 'admin' || isSubmitted}
                    <div class="correct-answer-display">
                        <strong>Правильный порядок:</strong>
                        {#each testData.sentence_order_slots || [] as slot ('correct-slot-' + slot.id)}
                            {@const correctItem = testData.draggable_items.find(di => di.id === slot.correct_item_id)}
                            <span class="draggable-item-chip correct-chip">{@html correctItem?.text?.replace(/\n/g, '<br>') || '?'}</span>
                        {/each}
                    </div>
                {/if}
            </div>

        {:else if testData?.test_type === 'drag-to-match'}
            <div class="drag-to-match-test-area">
                <p class="instruction">Перетащите облачка к соответствующим целям.</p>
                <div class="drag-match-layout">
                    <section class="match-targets-column" aria-label="Цели для соотнесения">
                        <h4>Цели:</h4>
                        {#each testData.match_targets || [] as target (target.id)}
                            {@const droppedItemId = dragToMatch_matches[target.id]}
                            {@const droppedItemObject = testData.draggable_items.find(di => di.id === droppedItemId)}
                            {@const targetStatus = getMatchTargetStatus(target, studentActualDragToMatchMatches, isSubmitted)}
                            <div class="match-target-item status-{targetStatus}">
                                <div class="target-prompt">
                                    {#if target.prompt_text}<p class="prompt-p-text">{@html target.prompt_text.replace(/\n/g, '<br>')}</p>{/if}
                                    {#if target.prompt_image_details} <div class="prompt-p-media"><ImageItemDisplay contentDetails={target.prompt_image_details} /></div> {/if}
                                    {#if target.prompt_audio_details} <div class="prompt-p-media"><AudioItemDisplay contentDetails={target.prompt_audio_details} /></div> {/if}
                                </div>
                                <div 
                                    class="target-dropzone"
                                    use:dndzone={{items: droppedItemObject ? [droppedItemObject] : [], type: 'draggable_item_match', ...dndOptions, dragDisabled: !canInteract}}
                                    on:finalize={(e) => handleDndMatchTargetDropFinalize(e, target.id)}
                                    aria-label={`Зона для ответа на цель ${target.prompt_text || ('медиа #' + target.id)}`}
                                >
                                    {#if droppedItemObject}
                                        <div class="draggable-item-chip placed dm-chip" 
                                             on:click={() => {if(canInteract) returnItemToPool(target.id)}} 
                                             title={canInteract ? "Нажмите, чтобы вернуть в пул" : ""}
                                             role={canInteract ? "button" : ""}
                                             tabindex={canInteract ? 0 : -1}
                                             on:keydown={(e) => {if(canInteract && (e.key==='Enter' || e.key===' ')) returnItemToPool(target.id)}}
                                             transition:fade={{duration:150}} 
                                        >
                                            {#if canInteract}<DragVertical size="16px" class="drag-handle"/>{/if} 
                                            {@html droppedItemObject.text.replace(/\n/g, '<br>')}
                                        </div>
                                    {:else if canInteract}
                                        <span class="empty-slot-placeholder">Перетащите сюда</span>
                                    {/if}
                                </div>
                                {#if isSubmitted}
                                    {#if targetStatus === 'target_incorrect'}
                                        <span class="feedback-icon error" title="Неверно"><CloseCircleOutline size="18px"/></span>
                                    {:else if targetStatus === 'target_correct'}
                                        <span class="feedback-icon success" title="Верно"><CheckCircleOutline size="18px"/></span>
                                    {:else if targetStatus === 'target_empty'}
                                         <span class="feedback-icon neutral" title="Нет ответа"><HelpCircleOutline size="18px"/></span>
                                    {/if}
                                {/if}
                                {#if target.explanation && (viewMode === 'admin' || (isSubmitted && (targetStatus === 'target_correct' || targetStatus === 'target_incorrect')) )}
                                    <div class="match-target-explanation status-{targetStatus} visible">
                                        <strong>Пояснение:</strong> {@html target.explanation.replace(/\n/g, '<br>')}
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </section>
                    <section 
                        class="draggable-items-pool-column dm-pool"
                        use:dndzone={{items: dragToMatch_availableItems, type: 'draggable_item_match', ...dndOptions, dragDisabled: !canInteract}}
                        on:finalize={handleMatchItemsPoolFinalize}
                        aria-label="Пул доступных облачков для соотнесения"
                    >
                        <h4>Доступные облачка:</h4>
                        {#each dragToMatch_availableItems as item (item.id)}
                            <div class="draggable-item-chip dm-chip" 
                                 animate:flip={dndOptions}
                                 class:is-distractor={item.is_distractor && (viewMode==='admin' || isSubmitted)}
                            >
                               {#if canInteract}<DragVertical size="16px" class="drag-handle"/>{/if} 
                               {@html item.text.replace(/\n/g, '<br>')}
                            </div>
                        {/each}
                        {#if dragToMatch_availableItems.length === 0 && !isSubmitted}
                            <span class="empty-pool-placeholder">Все облачка использованы</span>
                        {/if}
                    </section>
                </div>
                 {#if viewMode === 'admin' || isSubmitted}
                    <div class="correct-answer-display">
                        <strong>Правильные соотнесения:</strong>
                        <ul>
                        {#each testData.match_targets || [] as target ('correct-target-' + target.id)}
                            {@const correctItem = testData.draggable_items.find(di => di.id === target.correct_item_id)}
                            <li>
                                <span class="prompt-preview">
                                    {#if target.prompt_text}{@html target.prompt_text.replace(/\n/g, '<br>')}{:else if target.prompt_image_details}Изображение{:else if target.prompt_audio_details}Аудио{/if}
                                </span>
                                 → <span class="draggable-item-chip correct-chip">{@html correctItem?.text?.replace(/\n/g, '<br>') || '?'}</span>
                            </li>
                        {/each}
                        </ul>
                    </div>
                {/if}
            </div>
        {/if}

        {#if canInteract}
            <div class="test-actions-display">
                <button type="submit" class="btn-submit-test-display" disabled={isSubmitting}>
                    {isSubmitting ? 'Отправка...' : 'Отправить ответ'}
                </button>
            </div>
        {/if}

        {#if viewMode === 'student' && isSubmitted && studentSubmission}
            <div class="submission-result-display status-{studentSubmission.status.toLowerCase()}">
                <h4>Результаты:</h4>
                <p>Статус: 
                    <strong >
                        { studentSubmission.status === 'graded' ? 'Оценено' : 
                            studentSubmission.status === 'auto_passed' ? 'Зачтено' :
                            studentSubmission.status === 'auto_failed' ? 'Не зачтено' :
                            studentSubmission.status === 'grading_pending' ? 'На проверке' :
                            'Отправлено'
                        }
                    </strong>
                </p>
                {#if typeof studentSubmission.score === 'number'}
                    <p>Оценка: <strong>{studentSubmission.score}</strong></p>
                {/if}
                {#if studentSubmission.feedback}
                    <p class="feedback-text">Комментарий: <strong>{@html studentSubmission.feedback.replace(/\n/g, '<br>')}</strong></p>
                {/if}
            </div>
        {/if}
        {#if viewMode === 'admin' && studentSubmission } 
            <div class="submission-result-display admin-view status-{studentSubmission.status.toLowerCase()}">
            <h4>Ответ студента (ID отправки: {studentSubmission.id}):</h4>
                <p>Статус: <strong>{studentSubmission.status}</strong>. Оценка: <strong>{typeof studentSubmission.score === 'number' ? studentSubmission.score : 'N/A'}</strong></p>
            </div>
        {/if}
    </form>
</div>

<style>
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
    .test-item-display-wrapper { background-color: #fff; border: 1px solid #e7eaf3; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 3px 8px rgba(175, 164, 255, 0.05); }
    .test-title { font-size: 1.5em; font-weight: 700; color: #333; margin-top: 0; margin-bottom: 8px; }
    .test-description { font-size: 1em; color: #555; margin-bottom: 18px; line-height: 1.65; }
    .test-attachment { margin-bottom: 18px; }
    .test-attachment :global(.image-item-display), .test-attachment :global(.audio-item-display-enhanced) { border: 1px solid #eef0f5; box-shadow: none; margin-bottom: 0; border-radius: 8px; }
    .test-form-display { margin-top: 10px; }
    .mcq-options-group { border: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
    
    .mcq-option-display-item {
        border: 1px solid #d1c9ff;
        border-radius: 8px;
        background-color: #fff;
        transition: background-color 0.2s, border-color 0.2s;
        overflow: hidden; 
    }
    .mcq-option-label {
        display: flex;
        align-items: flex-start; 
        gap: 10px;
        padding: 12px 15px;
        cursor: pointer;
        width: 100%;
    }
    .mcq-option-display-item.disabled .mcq-option-label { cursor: default; opacity: 0.7; }
    .mcq-option-display-item:not(.disabled) .mcq-option-label:hover { background-color: #f8f6ff; }
    
    .mcq-option-input { 
        position: absolute;
        opacity: 0;
        width: 0; height: 0;
    }
    .mcq-option-checkbox-visual {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px; height: 22px;
        margin-top: 2px; 
        color: #adb5bd; 
        flex-shrink: 0;
        transition: color 0.2s;
    }
    .mcq-option-input:checked + .mcq-option-checkbox-visual {
        color: var(--color-primary, #AFA4FF); 
    }
    .mcq-option-input:disabled + .mcq-option-checkbox-visual {
        color: #ced4da; 
    }
    .mcq-option-text-content { flex-grow: 1; line-height: 1.55; font-size: 0.95em; word-break: break-word; color: #343a40; }
    
    .mcq-option-display-item.status-student_correct { background-color: #e6ffed; border-left: 4px solid #28a745; }
    .mcq-option-display-item.status-student_incorrect { background-color: #ffebee; border-left: 4px solid #dc3545; }
    .mcq-option-display-item.status-missed_correct { border-left: 4px solid #ffc107; }
    .mcq-option-display-item.status-neutral_incorrect.admin-view,
    .mcq-option-display-item.status-pending.admin-view { /* Optional distinct style for admin */ }
    .mcq-option-display-item.status-missed_correct.admin-view,
    .mcq-option-display-item.status-student_correct.admin-view { border-left-color: #28a745; }
    
    
    .mcq-option-explanation {
        font-size: 0.9em; color: #495057; margin: 0 15px 12px 44px; 
        padding: 10px; background-color: #f8f9fa; border-radius: 6px; 
        border-left: 3px solid #ced4da; line-height: 1.6;
        display: none; 
    }
    .mcq-option-explanation.visible { display: block; }
    .mcq-option-display-item.status-student_correct .mcq-option-explanation.visible,
    .mcq-option-display-item.status-missed_correct .mcq-option-explanation.visible { border-left-color: #28a745; background-color: #e6ffed; color: #155724; }
    .mcq-option-display-item.status-student_incorrect .mcq-option-explanation.visible { border-left-color: #dc3545; background-color: #ffebee; color: #721c24; }
    .mcq-option-display-item.status-missed_correct.admin-view .mcq-option-explanation.visible,
    .mcq-option-display-item.status-student_correct.admin-view .mcq-option-explanation.visible { border-left-color: #28a745; background-color: #e6ffed; color: #155724; }
    .mcq-option-display-item.status-student_incorrect.admin-view .mcq-option-explanation.visible,
    .mcq-option-display-item.status-neutral_incorrect.admin-view .mcq-option-explanation.visible { border-left-color: #6c757d; background-color: #f1f3f5; }
    
    
    .test-actions-display { margin-top: 25px; text-align: right; }
    .btn-submit-test-display { background-color: var(--color-primary, #AFA4FF); color: white; padding: 10px 22px; border: none; border-radius: 25px; font-weight: 500; cursor: pointer; transition: background-color 0.2s ease, transform 0.1s ease; font-size: 0.95rem; }
    .btn-submit-test-display:hover:not(:disabled) { background-color: var(--color-primary-dark, #8679f0); }
    .btn-submit-test-display:active:not(:disabled) { transform: translateY(1px); }
    .btn-submit-test-display:disabled { background-color: #ccc; cursor: not-allowed; opacity: 0.8; }
    
    .submission-result-display { margin-top: 25px; padding: 15px 20px; background-color: #f8f6ff; border: 1px solid #d1c9ff; border-radius: 12px; }
    .submission-result-display h4 { margin-top: 0; margin-bottom: 12px; color: #5845d8; font-size: 1.1em; }
    .submission-result-display p { margin-bottom: 8px; font-size: 0.95em; }
    .submission-result-display strong { font-weight: 600; }
    .submission-result-display.status-auto_passed strong, .submission-result-display.status-graded strong { color: #27ae60; } 
    .submission-result-display.status-auto_failed strong { color: #e74c3c; }
    .submission-result-display.status-grading_pending strong, .submission-result-display.status-submitted strong { color: #6D7FC9; }
    .submission-result-display .feedback-text strong { color: #343a40; font-weight: normal; display: block; margin-top: 4px; padding: 8px; background-color: #fff; border-radius: 4px;}
    .submission-result-display.admin-view { background-color: #e9ecef; border-color: #ced4da; }
    .submission-result-display.admin-view h4 { color: #495057; }
    
    /* DND Стили */
    .sentence-order-test-area .instruction,
    .drag-to-match-test-area .instruction { font-style: italic; margin-bottom: 15px; color: var(--color-text-muted); }
    
    .draggable-items-pool, .draggable-items-pool-column {
        display: flex; flex-wrap: wrap; gap: 8px; 
        margin-bottom: 20px; padding: 10px; 
        background-color: var(--color-bg-ultra-light, #f8f6ff); 
        border: 1px dashed var(--color-border-admin-button, #d1c9ff);
        border-radius: 8px; min-height: 40px;
        user-select: none;
    }
    .draggable-item-chip {
        padding: 7px 14px; 
        background-color: #fff; 
        border: 1px solid var(--color-border-light, #e0e0e0);
        color: var(--color-text-dark, #333);
        border-radius: 20px; 
        cursor: grab;
        box-shadow: 0 1px 2px rgba(0,0,0,0.08); 
        transition: box-shadow 0.2s, transform 0.2s, background-color 0.2s, border-color 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.9em;
    }
    .draggable-item-chip:active:not(.disabled) { cursor: grabbing; box-shadow: 0 3px 6px rgba(0,0,0,0.12); transform: scale(1.03); }
    .draggable-item-chip.is-distractor { 
        opacity: 0.8; 
        border-style: dashed; 
        border-color: #aaa;
        background-color: #f5f5f5;
    }
    .drag-handle { color: #aaa; margin-right: 3px; cursor: inherit; }
    .draggable-item-chip.disabled, .draggable-item-chip[draggable="false"] {
        cursor: default;
        opacity: 0.7;
    }
    .draggable-item-chip.disabled:active, .draggable-item-chip[draggable="false"]:active {
        box-shadow: 0 1px 2px rgba(0,0,0,0.08); transform: none;
    }
    
    
    .sentence-order-slots-container { display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; }
    .sentence-order-slot { 
        display: flex; align-items: center; gap: 10px; 
        padding: 8px 12px; 
        border: 1px solid var(--color-border-light, #e0e0e0); 
        background-color: #fff;
        border-radius: 8px; min-height: 42px; 
        transition: background-color 0.2s, border-color 0.2s;
    }
    .sentence-order-slot.dnd-hovered { 
        background-color: var(--color-primary-light, #e0d8ff) !important;
        border-color: var(--color-primary, #AFA4FF) !important;
    }
    .slot-index { font-weight: bold; color: var(--color-text-muted, #6c757d); }
    .slot-prompt { font-style: italic; color: #888; margin-right: 5px; }
    .empty-slot-placeholder, .empty-pool-placeholder { color: #adb5bd; font-style: italic; font-size: 0.9em; text-align: center; width: 100%; }
    .draggable-item-chip.placed { 
        cursor: default; 
        background-color: var(--color-primary-light, #f0eaff); 
        border-color: var(--color-primary, #AFA4FF); 
        color: var(--color-primary-dark, #5845d8);
    }
    .feedback-icon { display: inline-flex; align-items: center; margin-left: auto; padding-left: 8px; }
    .feedback-icon.success { color: var(--color-success, #28a745); }
    .feedback-icon.error { color: var(--color-danger-red, #dc3545); }
    .feedback-icon.neutral { color: var(--color-text-muted, #6c757d); }
    
    
    .sentence-order-slot.status-slot_correct { background-color: #e6ffed; border-color: #28a745; }
    .sentence-order-slot.status-slot_incorrect { background-color: #ffebee; border-color: #dc3545; }
    .sentence-order-slot.status-slot_empty { /* Optional: style for empty slots after submission */ }
    
    
    .correct-answer-display { margin-top: 15px; padding-top:10px; border-top: 1px solid #eee;}
    .correct-answer-display strong { display: block; margin-bottom: 8px; font-size: 0.95em;}
    .correct-answer-display .draggable-item-chip.correct-chip { 
        background-color: #d4edda; border-color: #c3e6cb; color: #155724; cursor: default; margin-right: 5px; margin-bottom: 5px;
    }
    .correct-answer-display ul { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 5px; }
    .correct-answer-display li { margin-bottom: 5px; display: flex; align-items: center; }
    .correct-answer-display .prompt-preview { color: #555; font-style: italic; margin-right: 5px; }
    
    
    .drag-match-layout { display: flex; gap: 25px; flex-wrap: wrap; }
    .match-targets-column { flex: 2; min-width: 280px; display: flex; flex-direction: column; gap: 15px;}
    .draggable-items-pool-column { flex: 1; min-width: 200px; background: #f0f4f8; padding: 15px; border-radius: 8px; align-self: flex-start; }
    .draggable-items-pool-column h4, .match-targets-column h4 { margin-top:0; margin-bottom:12px; font-size: 1.05em; color: var(--color-text-dark);}
    .match-target-item { padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; }
    .target-prompt { margin-bottom: 12px; min-height: 30px; }
    .target-prompt .prompt-p-text { margin: 0 0 8px 0; font-weight: 500;}
    .target-prompt :global(.image-item-display), .target-prompt :global(.audio-item-display-enhanced) { 
        padding: 0; border: none; box-shadow: none; margin-bottom: 5px; background: transparent;
    }
    .target-dropzone { 
        min-height: 46px; background: #f8f9fa; 
        border: 2px dashed #ced4da; border-radius: 6px; 
        display: flex; align-items: center; justify-content: center; padding: 8px; 
        transition: background-color 0.2s, border-color 0.2s;
    }
    .target-dropzone.dnd-hovered {
         background-color: var(--color-primary-light, #e0d8ff) !important;
         border-color: var(--color-primary, #AFA4FF) !important;
    }
    .match-target-item.status-target_correct .target-dropzone .draggable-item-chip.placed { background-color: #d4edda; border-color: #28a745; color: #155724; }
    .match-target-item.status-target_incorrect .target-dropzone .draggable-item-chip.placed { background-color: #f8d7da; border-color: #dc3545; color: #721c24; }
    
    
    .match-target-explanation { margin-top: 10px; font-size: 0.88em; color: #495057; background: #f8f9fa; padding: 8px 10px; border-left: 3px solid #ced4da; border-radius: 6px; line-height: 1.6; display: none; }
    .match-target-explanation.visible { display: block; }
    .match-target-item.status-target_correct .match-target-explanation.visible { border-left-color: var(--color-success); background-color: #e6ffed; }
    .match-target-item.status-target_incorrect .match-target-explanation.visible { border-left-color: var(--color-danger-red); background-color: #ffebee; }
    
    
    @media (max-width: 768px) {
        .drag-match-layout { flex-direction: column; }
        .draggable-items-pool-column { order: -1; margin-bottom: 20px; } 
    }
    </style>