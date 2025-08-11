<script>
    import { createEventDispatcher } from 'svelte';
    import CheckCircleOutline from 'svelte-material-icons/CheckCircleOutline.svelte'; 
    import CloseCircleOutline from 'svelte-material-icons/CloseCircleOutline.svelte'; 
    import RadioboxMarked from 'svelte-material-icons/RadioboxMarked.svelte'; 
    import RadioboxBlank from 'svelte-material-icons/RadioboxBlank.svelte';   
    import CheckboxMarked from 'svelte-material-icons/CheckboxMarked.svelte';
    import CheckboxBlankOutline from 'svelte-material-icons/CheckboxBlankOutline.svelte';

    export let testData;
    export let sectionItemId;
    export let viewMode;
    export let studentActualChoicesIds;
    export let canStudentInteract;
    export let localSelectedOptionsMap;
    export let localSelectedRadioOption;
    export let isTestSubmittedByStudent;

    const dispatch = createEventDispatcher();

    function handleMcqOptionChange(optionId, event) {
        if (!canStudentInteract) return; 
        if (testData.test_type === 'mcq-multi') {
            localSelectedOptionsMap[optionId] = event.target.checked;
            localSelectedOptionsMap = {...localSelectedOptionsMap};
            dispatch('update:localSelectedOptionsMap', localSelectedOptionsMap);
        } else if (testData.test_type === 'mcq-single') {
            localSelectedRadioOption = optionId;
            dispatch('update:localSelectedRadioOption', localSelectedRadioOption);
        }
    }

    function getOptionDisplayStatusForMcq(option) {
        if (viewMode === 'admin' || isTestSubmittedByStudent) {
            // Определяем выбран ли вариант на основе локальных данных или серверных
            let isSelected = false;
            if (studentActualChoicesIds.length > 0) {
                // Используем данные с сервера если они есть
                isSelected = studentActualChoicesIds.includes(option.id);
            } else {
                // Используем локальные данные если нет данных с сервера
                if (testData.test_type === 'mcq-single') {
                    isSelected = localSelectedRadioOption === option.id;
                } else if (testData.test_type === 'mcq-multi') {
                    isSelected = !!localSelectedOptionsMap[option.id];
                }
            }
            
            // use built-in flag for correctness for both admin and student
            const isCorrect = option.is_correct;
            if (isCorrect) {
                // Все правильные ответы должны быть подсвечены зеленым
                return 'correct';
            } else {
                return isSelected ? 'student_incorrect' : 'neutral_incorrect';
            }
        }
        return 'pending';
    }


</script>

<fieldset class="mcq-options-group" role={testData.test_type === 'mcq-single' ? 'radiogroup' : 'group'} aria-labelledby={"test-title-" + (testData?.id || 'unknown')}>
    <legend class="sr-only">Варианты ответа для теста "{testData?.title}"</legend>
    {#each testData.mcq_options || [] as option (option.id)}
        {#key isTestSubmittedByStudent}
        <div 
            class="mcq-option-display-item status-{getOptionDisplayStatusForMcq(option)}"
            class:disabled={!canStudentInteract}
        >
            <div class="mcq-option-content">
                <label class="mcq-option-label">
                    <input 
                        type={testData.test_type === 'mcq-single' ? 'radio' : 'checkbox'}
                        name={"mcq_option_group_" + sectionItemId + "_" + (testData.id || 'new')} 
                        value={option.id}
                        checked={testData.test_type === 'mcq-single' ? 
                            (studentActualChoicesIds.length > 0 ? studentActualChoicesIds.includes(option.id) : localSelectedRadioOption === option.id) : 
                            (studentActualChoicesIds.length > 0 ? studentActualChoicesIds.includes(option.id) : !!localSelectedOptionsMap[option.id])}
                        on:change={(e) => handleMcqOptionChange(option.id, e)}
                        disabled={!canStudentInteract}
                        class="mcq-option-input"
                        aria-describedby={option.explanation ? ("explanation-" + sectionItemId + "-" + option.id) : null}
                    />
                    <span class="mcq-option-checkbox-visual">
                        {#if testData.test_type === 'mcq-single'}
                            <svelte:component this={(studentActualChoicesIds.length > 0 ? studentActualChoicesIds.includes(option.id) : localSelectedRadioOption === option.id) ? RadioboxMarked : RadioboxBlank} size="22px" />
                        {:else}
                            <svelte:component this={(studentActualChoicesIds.length > 0 ? studentActualChoicesIds.includes(option.id) : !!localSelectedOptionsMap[option.id]) ? CheckboxMarked : CheckboxBlankOutline} size="22px" />
                        {/if}
                    </span>
                    <span class="mcq-option-text-content">{@html option.text.replace(/\n/g, '<br>')}</span>
                </label>
                
                {#if option.explanation && (viewMode === 'admin' || (isTestSubmittedByStudent && (getOptionDisplayStatusForMcq(option) === 'correct' || getOptionDisplayStatusForMcq(option) === 'student_incorrect')))}
                    <div 
                        class="mcq-option-explanation status-{getOptionDisplayStatusForMcq(option)} visible" 
                        id={"explanation-" + sectionItemId + "-" + option.id}
                    >
                        <strong>Пояснение:</strong> {@html option.explanation.replace(/\n/g, '<br>')}
                    </div>
                {/if}
            </div>
        </div>
        {/key}
    {/each}
</fieldset>
<!-- Removed redundant summary block -->

<style>
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
    .mcq-options-group { border: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
    .mcq-option-display-item { border: 1px solid #d1c9ff; border-radius: 8px; background-color: #fff; transition: background-color 0.2s, border-color 0.2s; overflow: hidden; }
    .mcq-option-content { display: flex; align-items: flex-start; gap: 15px; }
    .mcq-option-label { display: flex; align-items: flex-start; gap: 10px; padding: 12px 15px; cursor: pointer; flex: 1; }
    .mcq-option-display-item.disabled .mcq-option-label { cursor: default; }
    .mcq-option-display-item:not(.disabled) .mcq-option-label:hover { background-color: #f8f6ff; }
    .mcq-option-input { position: absolute; opacity: 0; width: 0; height: 0; }
    .mcq-option-checkbox-visual { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; margin-top: 2px; color: #adb5bd; flex-shrink: 0; transition: color 0.2s; }
    .mcq-option-input:checked + .mcq-option-checkbox-visual { color: var(--color-primary, #AFA4FF); }
    .mcq-option-input:disabled + .mcq-option-checkbox-visual { color: #ced4da; }
    .mcq-option-text-content { flex-grow: 1; line-height: 1.55; font-size: 0.95em; word-break: break-word; color: #343a40; }
    /* Подсветка для правильных ответов (все правильные ответы зеленые) */
    .mcq-option-display-item.status-correct { 
        background-color: var(--color-mcq-correct, #d4f4dd); 
        border-left: 4px solid var(--color-mcq-correct-border, #7eb88a); 
    }
    .mcq-option-display-item.status-correct .mcq-option-text-content {
        color: var(--color-mcq-correct-text, #1f5f2b);
    }
    
    /* Подсветка для неправильных выбранных ответов */
    .mcq-option-display-item.status-student_incorrect { 
        background-color: var(--color-mcq-incorrect, #fce4e6); 
        border-left: 4px solid var(--color-mcq-incorrect-border, #e57373); 
    }
    .mcq-option-display-item.status-student_incorrect .mcq-option-text-content {
        color: var(--color-mcq-incorrect-text, #8b2635);
    }
    .mcq-option-explanation {
        font-size: 0.9em;
        color: var(--color-text-dark, #343a40);
        margin: 0 15px 0 0;
        padding: 0;
        background-color: #f8f6ff;
        border-radius: 8px;
        line-height: 1.6;
        display: none;
        min-width: 200px;
        max-width: 300px;
        flex-shrink: 0;
        align-self: center;
    }
    .mcq-option-explanation.visible { display: block; }
    
    /* Пояснения для правильных ответов */
    .mcq-option-display-item.status-correct .mcq-option-explanation.visible {
        background-color: var(--color-mcq-correct, #d4f4dd);
        color: var(--color-mcq-correct-text, #1f5f2b);
    }
    
    /* Пояснения для неправильных выбранных ответов */
    .mcq-option-display-item.status-student_incorrect .mcq-option-explanation.visible {
        background-color: var(--color-mcq-incorrect, #fce4e6);
        color: var(--color-mcq-incorrect-text, #8b2635);
    }
</style>
