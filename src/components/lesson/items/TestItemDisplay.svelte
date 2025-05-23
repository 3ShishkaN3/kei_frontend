<script>
    import { createEventDispatcher, onMount, tick } from 'svelte';
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
    import { dndzone } from 'svelte-dnd-action';

    export let testData = null;        
    export let sectionItemId = null;   
    export let viewMode = 'student'; 
    export let studentSubmission = null; 

    const dispatch = createEventDispatcher();

    // --- Локальное состояние для UI и взаимодействия ---
    let localSelectedOptionsMap = {}; 
    let localSelectedRadioOption = null; 
    let isSubmitting = false;
    let dndBasePoolForCurrentTest = []; // Базовый пул для word-order
    
    // --- Вычисляемые состояния на основе пропсов ---
    let isTestSubmittedByStudent = false;
    let canStudentInteract = false;
    let studentActualChoicesIds = [];

    // Состояния для конкретных типов тестов
    let draggableItemsPoolForDisplay = []; // Для drag-and-drop
    let filledSlotsForDisplay = {};      
    let currentWordSequence = []; // Для word-order
    let wordOrderAvailableOptionsInPool = []; // Для word-order
    let selectedDraggableOptionForSlot = null; 

    const dndOpts = { flipDurationMs: 200 };

    function generateUiId() { return `ui_${Math.random().toString(36).substr(2, 9)}`; }

    function syncStateWithProps(currentTestData, currentStudentSubmission, currentViewMode, currentIsSubmittingFlag) {
        const newIsTestSubmittedByStudent = !!currentStudentSubmission && 
                                           currentStudentSubmission.test?.id === currentTestData?.id && 
                                           currentViewMode === 'student';
        
        let newIsSubmittingState = currentIsSubmittingFlag;
        if (currentIsSubmittingFlag && newIsTestSubmittedByStudent && currentStudentSubmission?.id !== studentSubmission?.id) {
            newIsSubmittingState = false;
        } else if (currentIsSubmittingFlag && !currentStudentSubmission && studentSubmission !== null) { 
            newIsSubmittingState = false;
        }
        
        isTestSubmittedByStudent = newIsTestSubmittedByStudent;
        isSubmitting = newIsSubmittingState;
        canStudentInteract = currentViewMode === 'student' && !isTestSubmittedByStudent && !isSubmitting;
        
        localSelectedOptionsMap = {};
        localSelectedRadioOption = null;
        studentActualChoicesIds = [];
        
        draggableItemsPoolForDisplay = [];
        filledSlotsForDisplay = {};
        currentWordSequence = [];
        wordOrderAvailableOptionsInPool = [];
        dndBasePoolForCurrentTest = []; // Сброс базового пула
        selectedDraggableOptionForSlot = null;

        if (currentTestData) {
            // Инициализация для drag-and-drop
            if (currentTestData.draggable_options_pool && currentTestData.test_type === 'drag-and-drop') {
                draggableItemsPoolForDisplay = currentTestData.draggable_options_pool.map(text => ({ 
                    id: generateUiId(), 
                    text: text 
                }));
            }

            // Инициализация для word-order
            if (currentTestData.draggable_options_pool && currentTestData.test_type === 'word-order') {
                dndBasePoolForCurrentTest = currentTestData.draggable_options_pool.map(text => ({ 
                    id: generateUiId(), 
                    text: text 
                }));
                wordOrderAvailableOptionsInPool = [...dndBasePoolForCurrentTest];
            }

            if (isTestSubmittedByStudent && currentStudentSubmission && currentStudentSubmission.answers) {
                const answersFromServer = currentStudentSubmission.answers;

                if (currentTestData.test_type === 'mcq-multi' || currentTestData.test_type === 'mcq-single') {
                    const mcqAnswerIds = answersFromServer.selected_option_ids || 
                                       (Array.isArray(answersFromServer) ? answersFromServer.map(a => a.id) : []);
                    studentActualChoicesIds = mcqAnswerIds;
                    if (currentTestData.test_type === 'mcq-multi') {
                        studentActualChoicesIds.forEach(id => { localSelectedOptionsMap[id] = true; });
                    } else if (studentActualChoicesIds.length > 0) {
                        localSelectedRadioOption = studentActualChoicesIds[0];
                    }
                } else if (currentTestData.test_type === 'drag-and-drop' && Array.isArray(answersFromServer)) {
                    answersFromServer.forEach(ans => {
                        if (ans && typeof ans.slot_id !== 'undefined' && typeof ans.dropped_option_text !== 'undefined') {
                            const poolItem = draggableItemsPoolForDisplay.find(pItem => pItem.text === ans.dropped_option_text);
                            filledSlotsForDisplay[ans.slot_id] = poolItem ? { ...poolItem } : { id: generateUiId(), text: ans.dropped_option_text };
                        }
                    });
                } else if (currentTestData.test_type === 'word-order' && Array.isArray(answersFromServer.submitted_order_words)) {
                    currentWordSequence = answersFromServer.submitted_order_words.map(text => {
                        const poolItem = dndBasePoolForCurrentTest.find(p => p.text === text);
                        return poolItem ? { ...poolItem } : { id: generateUiId(), text: text };
                    });
                    // Обновляем доступный пул, исключая использованные слова
                    wordOrderAvailableOptionsInPool = dndBasePoolForCurrentTest.filter(
                        poolItem => !currentWordSequence.find(seqItem => seqItem.id === poolItem.id)
                    ).map(item => ({...item}));
                }
            }
        }
        
        // Обновляем реактивные переменные
        localSelectedOptionsMap = {...localSelectedOptionsMap};
        filledSlotsForDisplay = {...filledSlotsForDisplay};
        currentWordSequence = [...currentWordSequence];
        draggableItemsPoolForDisplay = [...draggableItemsPoolForDisplay];
        wordOrderAvailableOptionsInPool = [...wordOrderAvailableOptionsInPool];
        dndBasePoolForCurrentTest = [...dndBasePoolForCurrentTest];
    }

    onMount(() => {
        syncStateWithProps(testData, studentSubmission, viewMode, isSubmitting);
    });

    let prevTestDataString = ""; 
    let prevSubmissionString = "";
    let prevViewModeString = "";
    let prevIsSubmittingForEffect = false;

    $: {
        const sigTest = JSON.stringify(testData?.id + (testData?.test_type || '') + (testData?.mcq_options?.length || 0) + (testData?.drag_drop_slots?.length || 0) + (testData?.draggable_options_pool?.join(',') || ''));
        const sigSub = JSON.stringify(studentSubmission?.id + (studentSubmission?.status || '') + JSON.stringify(studentSubmission?.answers));
        if (sigTest !== prevTestDataString || sigSub !== prevSubmissionString || viewMode !== prevViewModeString || isSubmitting !== prevIsSubmittingForEffect) 
        {
            syncStateWithProps(testData, studentSubmission, viewMode, isSubmitting);
            prevTestDataString = sigTest;
            prevSubmissionString = sigSub;
            prevViewModeString = viewMode;
            prevIsSubmittingForEffect = isSubmitting;
        }
    }
    
    function handleMcqOptionChange(optionId, event) {
        if (!canStudentInteract) return; 
        if (testData.test_type === 'mcq-multi') {
            localSelectedOptionsMap[optionId] = event.target.checked;
            localSelectedOptionsMap = {...localSelectedOptionsMap};
        } else if (testData.test_type === 'mcq-single') {
            localSelectedRadioOption = optionId;
        }
    }

    function selectDraggableForSlot(item) {
        if (!canStudentInteract) return;
        if (selectedDraggableOptionForSlot && selectedDraggableOptionForSlot.id === item.id) {
            selectedDraggableOptionForSlot = null; 
        } else {
            selectedDraggableOptionForSlot = item;
        }
    }

    function placeSelectedOptionInSlot(slotId) {
        if (!canStudentInteract || !selectedDraggableOptionForSlot) return;
        filledSlotsForDisplay[slotId] = {...selectedDraggableOptionForSlot}; 
        filledSlotsForDisplay = {...filledSlotsForDisplay};
        selectedDraggableOptionForSlot = null; 
    }
    
    function clearSlot(slotId) {
        if (!canStudentInteract) return;
        delete filledSlotsForDisplay[slotId];
        filledSlotsForDisplay = {...filledSlotsForDisplay};
    }
    
    function handleDndFinalizePool(e) {
        if (!canStudentInteract) return;
        const {items, info} = e.detail;
        // Для drag-and-drop пул остается неизменным при finalize
        // Элементы не удаляются из пула при перетаскивании
        draggableItemsPoolForDisplay = items.map(item => ({...item}));
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
    }
    
    function returnItemFromSlotToPool(slotId) {
        if (!canStudentInteract) return;
        delete filledSlotsForDisplay[slotId];
        filledSlotsForDisplay = {...filledSlotsForDisplay};
    }

    // Для Word Order DND
    function handleDndWordOrderPool(e) {
        if (!canStudentInteract) return;
        const {items, info} = e.detail;
        wordOrderAvailableOptionsInPool = items.map(item => ({...item}));
        
        // Обработка перемещения из последовательности в пул
        if (info.trigger === 'droppedIntoZone') {
            // После изменения пула, обновляем последовательность
            currentWordSequence = currentWordSequence.filter(
                seqItem => !wordOrderAvailableOptionsInPool.find(poolItem => poolItem.id === seqItem.id)
            ).map(item => ({...item}));
        }
    }
    
    function handleDndWordOrderSequence(e) {
        if (!canStudentInteract) return;
        const {items, info} = e.detail;
        currentWordSequence = items.map(item => ({...item}));
        
        // Обработка перемещения из пула в последовательность
        if (info.trigger === 'droppedIntoZone') {
            // После изменения последовательности, обновляем доступные в пуле
            wordOrderAvailableOptionsInPool = dndBasePoolForCurrentTest.filter(
                poolItem => !currentWordSequence.find(seqItem => seqItem.id === poolItem.id)
            ).map(item => ({...item}));
        }
    }
     
    function addWordToStudentSequenceFromPool(itemFromPool) {
        if (!canStudentInteract) return;
        currentWordSequence = [...currentWordSequence, {...itemFromPool}];
        wordOrderAvailableOptionsInPool = wordOrderAvailableOptionsInPool.filter(p => p.id !== itemFromPool.id);
    }
    
    function returnWordFromStudentSequenceToPool(itemIndex) {
        if (!canStudentInteract || itemIndex < 0 || itemIndex >= currentWordSequence.length) return;
        const [itemToReturn] = currentWordSequence.splice(itemIndex, 1);
        currentWordSequence = [...currentWordSequence];
        if (itemToReturn && !wordOrderAvailableOptionsInPool.find(i => i.id === itemToReturn.id)) {
             // Добавляем обратно в пул и сортируем по исходному порядку
            wordOrderAvailableOptionsInPool = [...wordOrderAvailableOptionsInPool, {...itemToReturn}]
                .sort((a,b) => dndBasePoolForCurrentTest.findIndex(p=>p.id===a.id) - dndBasePoolForCurrentTest.findIndex(p=>p.id===b.id) );
        } else {
            wordOrderAvailableOptionsInPool = [...wordOrderAvailableOptionsInPool];
        }
    }

    async function handleSubmitTest() {
        if (!canStudentInteract) return;
        let answersPayload = {};
        let formIsValid = true;

        if (testData.test_type === 'mcq-multi') {
            const selectedIds = Object.keys(localSelectedOptionsMap).filter(id => localSelectedOptionsMap[id]).map(id => parseInt(id));
            if (selectedIds.length === 0 && viewMode === 'student') formIsValid = false;
            answersPayload = { selected_option_ids: selectedIds };
        } else if (testData.test_type === 'mcq-single') {
            if (localSelectedRadioOption === null && viewMode === 'student') formIsValid = false;
            answersPayload = { selected_option_ids: localSelectedRadioOption !== null ? [parseInt(localSelectedRadioOption)] : [] };
        } else if (testData.test_type === 'drag-and-drop') {
            const slotAnswers = [];
            let filledCount = 0;
            for (const slot of testData.drag_drop_slots || []) {
                if (filledSlotsForDisplay[slot.id]) {
                    slotAnswers.push({ slot_id: slot.id, dropped_option_text: filledSlotsForDisplay[slot.id].text });
                    filledCount++;
                }
            }
            if (filledCount < (testData.drag_drop_slots || []).length && viewMode === 'student') formIsValid = false;
            answersPayload = { answers: slotAnswers }; 
        } else if (testData.test_type === 'word-order') {
            if (currentWordSequence.length === 0 && (testData.word_order_sentence?.correct_ordered_texts || []).length > 0 && viewMode === 'student') {
                formIsValid = false;
            }
            answersPayload = { submitted_order_words: currentWordSequence.map(item => item.text) };
        } else { return; }

        if (!formIsValid && viewMode === 'student') {
            dispatch('notify', { type: 'warning', message: 'Пожалуйста, дайте ответ на все части задания.' });
            return;
        }
        isSubmitting = true; 
        await tick(); 
        dispatch('submitTest', { testId: testData.id, sectionItemId, answers: answersPayload, fileData: null });
    }
    
    function getOptionDisplayStatusForMcq(option) {
        if (viewMode === 'admin' || isTestSubmittedByStudent) {
            const isSelected = studentActualChoicesIds.includes(option.id);
            if (option.is_correct) { 
                return isSelected ? 'student_correct' : 'missed_correct';
            } else { 
                return isSelected ? 'student_incorrect' : 'neutral_incorrect';
            }
        }
        return 'pending';
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

    function isWordOrderSequenceCorrect() { 
        if (!isTestSubmittedByStudent || !testData?.word_order_sentence?.correct_ordered_texts) return null;
        const correctTexts = testData.word_order_sentence.correct_ordered_texts;
        const studentTexts = currentWordSequence.map(item => item.text);
        if (correctTexts.length === 0 && studentTexts.length === 0) return true; 
        if (correctTexts.length !== studentTexts.length && studentTexts.length > 0) return false; 
        if (correctTexts.length > 0 && studentTexts.length === 0 && correctTexts.length > 0) return false; 
        return correctTexts.every((word, index) => word === studentTexts[index]);
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
                    {@const displayStatus = getOptionDisplayStatusForMcq(option)}
                    <div 
                        class="mcq-option-display-item status-{displayStatus}"
                        class:disabled={!canStudentInteract}
                    >
                        <label class="mcq-option-label">
                            <input 
                                type={testData.test_type === 'mcq-single' ? 'radio' : 'checkbox'}
                                name={"mcq_option_group_" + sectionItemId + "_" + (testData.id || 'new')} 
                                value={option.id}
                                checked={testData.test_type === 'mcq-single' ? localSelectedRadioOption === option.id : !!localSelectedOptionsMap[option.id]}
                                on:change={(e) => handleMcqOptionChange(option.id, e)}
                                disabled={!canStudentInteract}
                                class="mcq-option-input"
                                aria-describedby={option.explanation ? ("explanation-" + sectionItemId + "-" + option.id) : null}
                            />
                            <span class="mcq-option-checkbox-visual">
                                {#if testData.test_type === 'mcq-single'}
                                    <svelte:component this={(isTestSubmittedByStudent ? studentActualChoicesIds.includes(option.id) : localSelectedRadioOption === option.id) ? RadioboxMarked : RadioboxBlank} size="22px" />
                                {:else}
                                    <svelte:component this={(isTestSubmittedByStudent ? studentActualChoicesIds.includes(option.id) : localSelectedOptionsMap[option.id]) ? CheckboxMarked : CheckboxBlankOutline} size="22px" />
                                {/if}
                            </span>
                            <span class="mcq-option-text-content">{@html option.text.replace(/\n/g, '<br>')}</span>
                        </label>
                        
                        {#if option.explanation && (viewMode === 'admin' || (isTestSubmittedByStudent && (displayStatus === 'student_correct' || displayStatus === 'student_incorrect' || displayStatus === 'missed_correct')))}
                            <div 
                                class="mcq-option-explanation status-{displayStatus} visible" 
                                id={"explanation-" + sectionItemId + "-" + option.id}
                            >
                                <strong>Пояснение:</strong> {@html option.explanation.replace(/\n/g, '<br>')}
                            </div>
                        {/if}
                    </div>
                {/each}
            </fieldset>
        
        {:else if testData?.test_type === 'drag-and-drop'}
            <div class="drag-drop-test-area">
                {#if testData.description && viewMode === 'admin'} 
                {:else if !testData.description && testData.test_type === 'drag-and-drop' }
                    <p class="instruction-text">Распределите предложенные варианты по соответствующим ячейкам.</p>
                {/if}
                
                {#if canStudentInteract || viewMode === 'admin'}
                    <h4>Доступные слова/фразы:</h4>
                    <section 
                        class="draggable-options-pool-display dnd-pool word-order-source-pool"
                        use:dndzone={{
                            items: wordOrderAvailableOptionsInPool, 
                            type: 'woItem-' + sectionItemId, 
                            dragDisabled: !canStudentInteract, 
                            dropTargetStyle: {},
                            ...dndOpts
                        }}
                        on:consider={handleDndWordOrderPool}
                        on:finalize={handleDndWordOrderPool}
                        aria-label="Пул доступных слов для составления последовательности"
                    >
                        {#each wordOrderAvailableOptionsInPool as item (item.id)}
                            <div class="draggable-option-dnd word-order-option"
                                title={canStudentInteract ? "Клик или перетаскивание для добавления: " + item.text : item.text}
                                tabindex={canStudentInteract ? 0 : -1}
                                on:click={() => {if(canStudentInteract) addWordToStudentSequenceFromPool(item)}}
                                on:keypress={(e) => {if(canStudentInteract && (e.key === 'Enter' || e.key === ' ')) addWordToStudentSequenceFromPool(item);}}
                                role="button"
                            >{item.text}</div>
                        {/each}
                        {#if wordOrderAvailableOptionsInPool.length === 0 && canStudentInteract}
                            <p class="empty-pool-message">Все слова использованы.</p>
                        {/if}
                        {#if dndBasePoolForCurrentTest.length === 0 }
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

        {:else if testData?.test_type === 'word-order'}
            <div class="word-order-test-area">
                {#if testData.word_order_sentence?.display_prompt}
                    <p class="instruction-text"><strong>Задание:</strong> {@html testData.word_order_sentence.display_prompt.replace(/\n/g, '<br>')}</p>
                {/if}
                <p class="instruction-text">Составьте правильную последовательность, перетаскивая слова/фразы из верхнего блока в нижний, или кликая по ним.</p>

                {#if canStudentInteract || viewMode === 'admin'}
                    <h4>Доступные слова/фразы:</h4>
                    <section 
                        class="draggable-options-pool-display dnd-pool word-order-source-pool"
                        use:dndzone={{items: wordOrderAvailableOptionsInPool, type: 'woItem-' + sectionItemId, zoneId: 'woPool-' + sectionItemId, dragDisabled: !canStudentInteract, ...dndOpts}}
                        on:finalize={(e) => handleDndWordOrderPool(e)}
                        aria-label="Пул доступных слов для составления последовательности"
                    >
                        {#each wordOrderAvailableOptionsInPool as item (item.id)}
                            <div class="draggable-option-dnd word-order-option"
                                 title={canStudentInteract ? "Клик или перетаскивание для добавления: " + item.text : item.text}
                                 aria-grabbed={false} tabindex={canStudentInteract ? 0 : -1}
                                 on:click={() => {if(canStudentInteract) addWordToStudentSequenceFromPool(item)}}
                                 on:keypress={(e) => {if(canStudentInteract && (e.key === 'Enter' || e.key === ' ')) addWordToStudentSequenceFromPool(item);}}
                                 role="button"
                            >{item.text}</div>
                        {/each}
                        {#if wordOrderAvailableOptionsInPool.length === 0 && canStudentInteract}
                            <p class="empty-pool-message">Все слова использованы.</p>
                        {/if}
                         {#if dndBasePoolForCurrentTest.length === 0 }
                            <p class="empty-pool-message">Пул слов для этого теста не задан.</p>
                        {/if}
                    </section>
                {/if}

                <h4>Ваша последовательность:</h4>
                <section 
                    class="word-sequence-display-area dnd-sequence word-order-target-sequence"
                    use:dndzone={{
                        items: currentWordSequence, 
                        type: 'woItem-' + sectionItemId, 
                        dragDisabled: !canStudentInteract, 
                        dropTargetStyle: {},
                        ...dndOpts
                    }}
                    on:consider={handleDndWordOrderSequence}
                    on:finalize={handleDndWordOrderSequence}
                    aria-label="Текущая составленная последовательность"
                >
                    {#if currentWordSequence.length > 0}
                        {#each currentWordSequence as item, index (item.id)}
                            <div class="sequence-word-item-dnd" 
                                title={canStudentInteract ? "Перетащить для изменения порядка или кликнуть для возврата: " + item.text : item.text}
                                class:interactive={canStudentInteract}
                                tabindex={canStudentInteract ? 0 : -1}
                                on:click={() => {if(canStudentInteract) returnWordFromStudentSequenceToPool(index);}}
                                on:keypress={(e) => {if(canStudentInteract && (e.key === 'Enter' || e.key === ' ')) returnWordFromStudentSequenceToPool(index);}}
                                role="button"
                            >
                                {#if canStudentInteract} <DragVertical size="16px" class="drag-handle"/> {/if}
                                <span>{item.text}</span>
                            </div>
                        {/each}
                    {:else}
                        <p class="empty-sequence-message">Последовательность пуста. Перетащите или кликните слова из пула выше.</p>
                    {/if}
                </section>
                {#if isTestSubmittedByStudent && testData.word_order_sentence}
                    {@const isCorrectSeq = isWordOrderSequenceCorrect()}
                    <div class="sequence-result-display" class:correct={isCorrectSeq === true} class:incorrect={isCorrectSeq === false}>
                        <strong>Результат:</strong> 
                        {#if isCorrectSeq === true} Верно!
                        {:else if isCorrectSeq === false} Неверно. 
                            {#if viewMode === 'admin' || isTestSubmittedByStudent }
                            Правильная последовательность: "{testData.word_order_sentence.correct_ordered_texts.join(' ')}"
                            {/if}
                        {:else} Ответ не полный или не может быть оценен.
                        {/if}
                        {#if testData.word_order_sentence.explanation}
                            <p class="explanation-text"><em>Пояснение:</em> {@html testData.word_order_sentence.explanation.replace(/\n/g, '<br>')}</p>
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}
    
        {#if canStudentInteract}
            <div class="test-actions-display">
                <button type="submit" class="btn-submit-test-display" disabled={isSubmitting}>
                    {isSubmitting ? 'Отправка...' : 'Отправить ответ'}
                </button>
            </div>
        {/if}

        {#if viewMode === 'student' && isTestSubmittedByStudent && studentSubmission}
            <div class="submission-result-display status-{studentSubmission.status.toLowerCase()}">
                <h4>Результаты:</h4>
                <p>Статус: 
                    <strong >
                        { studentSubmission.status === 'graded' ? 'Оценено' : 
                            studentSubmission.status === 'auto_passed' || studentSubmission.status === 'auto_correct' ? 'Зачтено' :
                            studentSubmission.status === 'auto_failed' || studentSubmission.status === 'auto_incorrect' ? 'Не зачтено' :
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
/* Общие стили для TestItemDisplay */
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
.test-item-display-wrapper { background-color: #fff; border: 1px solid #e7eaf3; border-radius: 12px; padding: clamp(15px, 3vw, 25px); margin-bottom: 25px; box-shadow: 0 4px 12px rgba(var(--color-primary-rgb, 175, 164, 255), 0.07); }
.test-title { font-size: clamp(1.25em, 3vw, 1.6em); font-weight: 700; color: var(--color-text-dark); margin-top: 0; margin-bottom: 10px; }
.test-description { font-size: clamp(0.9em, 2.2vw, 1em); color: var(--color-text-muted); margin-bottom: 20px; line-height: 1.7; }
.test-attachment { margin-bottom: 20px; border-radius: 8px; overflow: hidden; }
.test-attachment :global(.image-item-display), 
.test-attachment :global(.audio-item-display-enhanced) { 
    border: none; box-shadow: none; margin-bottom: 0; padding: 0; 
}
.test-form-display { margin-top: 15px; }

/* Стили для MCQ (из предыдущего ответа, можно скопировать) */
.mcq-options-group { border: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.mcq-option-display-item { border: 1px solid #d1c9ff; border-radius: 8px; background-color: #fff; transition: background-color 0.2s, border-color 0.2s; overflow: hidden; }
.mcq-option-label { display: flex; align-items: flex-start; gap: 10px; padding: 12px 15px; cursor: pointer; width: 100%; }
.mcq-option-display-item.disabled .mcq-option-label { cursor: default; }
.mcq-option-display-item:not(.disabled) .mcq-option-label:hover { background-color: #f8f6ff; }
.mcq-option-input { position: absolute; opacity: 0; width: 0; height: 0; }
.mcq-option-checkbox-visual { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; margin-top: 2px; color: #adb5bd; flex-shrink: 0; transition: color 0.2s; }
.mcq-option-input:checked + .mcq-option-checkbox-visual { color: var(--color-primary, #AFA4FF); }
.mcq-option-input:disabled + .mcq-option-checkbox-visual { color: #ced4da; }
.mcq-option-text-content { flex-grow: 1; line-height: 1.55; font-size: 0.95em; word-break: break-word; color: #343a40; }
.mcq-option-display-item.status-student_correct { background-color: #e6ffed; border-left: 4px solid #28a745; }
.mcq-option-display-item.status-student_incorrect { background-color: #ffebee; border-left: 4px solid #dc3545; }
.mcq-option-display-item.status-missed_correct { border-left: 4px solid #ffc107; }
.mcq-option-display-item.status-missed_correct.admin-view, .mcq-option-display-item.status-student_correct.admin-view { border-left: 4px solid #28a745; }
.mcq-option-explanation { font-size: 0.9em; color: #495057; margin: 0 15px 12px 44px; padding: 10px; background-color: #f8f9fa; border-radius: 6px; border-left: 3px solid #ced4da; line-height: 1.6; display: none; }
.mcq-option-explanation.visible { display: block; }
.mcq-option-display-item.status-student_correct .mcq-option-explanation.visible { border-left-color: #28a745; background-color: #e6ffed; color: #155724; }
.mcq-option-display-item.status-student_incorrect .mcq-option-explanation.visible { border-left-color: #dc3545; background-color: #ffebee; color: #721c24; }
.mcq-option-display-item.status-missed_correct .mcq-option-explanation.visible { border-left-color: var(--color-primary, #AFA4FF); background-color: #f8f6ff; color: var(--color-primary-dark, #5845d8); }
.mcq-option-display-item.status-missed_correct.admin-view .mcq-option-explanation.visible, .mcq-option-display-item.status-student_correct.admin-view .mcq-option-explanation.visible { border-left-color: #28a745; background-color: #e6ffed; color: #155724; }
.mcq-option-display-item.status-student_incorrect.admin-view .mcq-option-explanation.visible, .mcq-option-display-item.status-neutral_incorrect.admin-view .mcq-option-explanation.visible { border-left-color: #6c757d; background-color: #f1f3f5;}


/* Стили для Drag-and-Drop и Word-Order */
.drag-drop-test-area, .word-order-test-area { margin-top: 25px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
.instruction-text { font-size: 0.95em; color: var(--color-text-muted); margin-bottom: 15px; line-height: 1.6; }
.drag-drop-test-area h4, .word-order-test-area h4 { font-size: 1.05em; font-weight: 600; margin-top: 20px; margin-bottom: 12px; color: var(--color-secondary); }

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
.empty-pool-message, .empty-sequence-message { width: 100%; text-align: center; font-size: 0.9em; color: #888; font-style: italic; padding: 10px 0; }

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


/* Стили для Word Order теста */
.word-order-test-area .draggable-options-pool-display { margin-bottom: 15px; }
.word-order-test-area .draggable-item.word-order-option { /* Можно добавить специфичные стили */ }
.word-sequence-display-area {
    display: flex; flex-wrap: wrap; gap: 8px;
    padding: 12px; background-color: #fff;
    border: 1px solid var(--color-secondary-light);
    border-radius: var(--spacing-border-radius-small);
    min-height: 48px; margin-bottom: 15px;
}
.sequence-word-item-dnd {
    position: relative; padding-right: 20px; /* Место под крестик */
}
.sequence-word-item-dnd.interactive:hover { background-color: #eef2f7; }
.drag-handle { margin-right: 6px; cursor: grab; color: #aaa; }
.sequence-word-item-dnd:active .drag-handle { cursor: grabbing; }
.remove-word-indicator { position: absolute; top: 50%; right: 5px; transform: translateY(-50%); font-weight: bold; color: #aaa; cursor: pointer; opacity: 0.6; transition: opacity 0.2s; font-size: 1.2em; line-height: 1; }
.sequence-word-item-dnd.interactive:hover .remove-word-indicator { opacity: 1; }
.remove-word-indicator:hover { color: var(--color-danger-red); }

.sequence-result-display { margin-top: 15px; padding: 12px; border-radius: var(--spacing-border_radius-small); font-size: 0.95em;}
.sequence-result-display.correct { background-color: #e6ffed; border: 1px solid #c3e6cb; color: #155724; }
.sequence-result-display.incorrect { background-color: #ffebee; border: 1px solid #f5c6cb; color: #721c24; }
.sequence-result-display .explanation-text { margin-top: 8px; font-size: 0.9em; font-style: italic; }

/* Общие для тестов */
.test-actions-display { margin-top: 25px; text-align: right; }
.btn-submit-test-display { background-color: var(--color-primary, #AFA4FF); color: white; padding: 10px 22px; border: none; border-radius: 25px; font-weight: 500; cursor: pointer; transition: background-color 0.2s ease, transform 0.1s ease; font-size: 0.95rem; }
.btn-submit-test-display:hover:not(:disabled) { background-color: var(--color-primary-dark, #8679f0); }
.btn-submit-test-display:active:not(:disabled) { transform: translateY(1px); }
.btn-submit-test-display:disabled { background-color: #ccc; cursor: not-allowed; opacity: 0.8; }

.submission-result-display { margin-top: 25px; padding: 15px 20px; background-color: #f8f6ff; border: 1px solid #d1c9ff; border-radius: 12px; }
.submission-result-display h4 { margin-top: 0; margin-bottom: 12px; color: #5845d8; font-size: 1.1em; }
.submission-result-display p { margin-bottom: 8px; font-size: 0.95em; }
.submission-result-display strong { font-weight: 600; }
.submission-result-display.status-auto_passed strong, .submission-result-display.status-graded strong, .submission-result-display.status-auto_correct strong { color: #27ae60; } 
.submission-result-display.status-auto_failed strong, .submission-result-display.status-auto_incorrect strong { color: #e74c3c; }
.submission-result-display.status-grading_pending strong, .submission-result-display.status-submitted strong { color: #6D7FC9; }
.submission-result-display .feedback-text strong { color: #343a40; font-weight: normal; display: block; margin-top: 4px; padding: 8px; background-color: #fff; border-radius: 4px;}
.submission-result-display.admin-view { background-color: #e9ecef; border-color: #ced4da; }
.submission-result-display.admin-view h4 { color: #495057; }
</style>