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
            const isSelected = studentActualChoicesIds.includes(option.id);
            if (option.is_correct) { 
                return isSelected ? 'student_correct' : 'missed_correct';
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

<style>
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
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
</style>
