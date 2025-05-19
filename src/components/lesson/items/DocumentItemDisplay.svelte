<script>
    import { createEventDispatcher, onMount, afterUpdate } from 'svelte'; // afterUpdate может не понадобиться
    import { addNotification } from '../../../stores/notifications.js';
    // Иконки для отображения статуса ответа (опционально)
    import CheckCircleOutline from 'svelte-material-icons/CheckCircleOutline.svelte'; // Для правильного
    import CloseCircleOutline from 'svelte-material-icons/CloseCircleOutline.svelte'; // Для неправильного
    import HelpCircleOutline from 'svelte-material-icons/HelpCircleOutline.svelte';   // Для "нет ответа" или "ожидает проверки"
    import ImageItemDisplay from '../items/ImageItemDisplay.svelte'; // Предполагается, что они есть
	import AudioItemDisplay from '../items/AudioItemDisplay.svelte';


    export let testData;        // content_details объекта теста
    export let sectionItemId;   // ID SectionItem
    export let viewMode = 'student'; // 'student' или 'admin'
    
    // Новый пропс для получения деталей предыдущей отправки (если есть)
    // Структура TestSubmissionDetailSerializer (см. lessonApi.js)
    export let studentSubmission = null; 

    const dispatch = createEventDispatcher();

    // Состояние для MCQ
    let selectedOptionsMap = {}; // { [optionId]: true/false } для чекбоксов (mcq-multi)
    let selectedRadioOption = null; // optionId для радиокнопок (mcq-single)

    let isSubmitting = false;
    let submissionResult = null; // Хранит { status, score, feedback, student_answers } после отправки
    let hasSubmittedOnce = false; // Был ли тест отправлен хотя бы раз в текущей сессии просмотра

    // $: console.log("TestItemDisplay received testData:", JSON.parse(JSON.stringify(testData)));
    // $: console.log("TestItemDisplay received studentSubmission:", JSON.parse(JSON.stringify(studentSubmission)));


    onMount(() => {
        initializeAnswers();
    });

    // Реактивность на смену testData или studentSubmission
    $: if (testData || studentSubmission) {
        initializeAnswers();
    }

    function initializeAnswers() {
        selectedOptionsMap = {};
        selectedRadioOption = null;
        submissionResult = null; // Сбрасываем результат при инициализации
        // hasSubmittedOnce не сбрасываем, если хотим блокировать повторную отправку после первой успешной

        if (studentSubmission && studentSubmission.answers && studentSubmission.test === testData.id) {
            // Если есть предыдущая отправка для этого теста, предзаполняем ответы
            // и показываем результат
            hasSubmittedOnce = true; // Помечаем, что есть предыдущая отправка
            submissionResult = { // Формируем структуру для отображения результата
                status: studentSubmission.status,
                score: studentSubmission.score,
                feedback: studentSubmission.feedback,
                student_answers: studentSubmission.answers // { selected_option_ids: [...] }
            };

            if (testData.test_type === 'mcq-multi' && submissionResult.student_answers.selected_option_ids) {
                submissionResult.student_answers.selected_option_ids.forEach(id => {
                    selectedOptionsMap[id] = true;
                });
            } else if (testData.test_type === 'mcq-single' && submissionResult.student_answers.selected_option_ids && submissionResult.student_answers.selected_option_ids.length > 0) {
                selectedRadioOption = submissionResult.student_answers.selected_option_ids[0];
            }
        }
        // Обновляем Svelte
        selectedOptionsMap = {...selectedOptionsMap};
    }


    function handleMcqOptionChange(optionId, event) {
        if (testData.test_type === 'mcq-multi') {
            selectedOptionsMap[optionId] = event.target.checked;
            selectedOptionsMap = {...selectedOptionsMap}; // Триггер реактивности
        } else if (testData.test_type === 'mcq-single') {
            selectedRadioOption = optionId;
        }
    }

    async function handleSubmitTest() {
        if (isSubmitting || (hasSubmittedOnce && viewMode === 'student')) return; // Не отправлять повторно, если студент уже отправлял

        let answersPayload = {};
        if (testData.test_type === 'mcq-multi') {
            const selectedIds = Object.keys(selectedOptionsMap).filter(id => selectedOptionsMap[id]).map(id => parseInt(id));
            if (selectedIds.length === 0) {
                addNotification("Пожалуйста, выберите хотя бы один вариант ответа.", "warning"); return;
            }
            answersPayload = { selected_option_ids: selectedIds };
        } else if (testData.test_type === 'mcq-single') {
            if (selectedRadioOption === null) {
                addNotification("Пожалуйста, выберите вариант ответа.", "warning"); return;
            }
            answersPayload = { selected_option_ids: [selectedRadioOption] };
        } else {
            addNotification("Данный тип теста не поддерживается для отправки.", "error"); return;
        }

        isSubmitting = true;
        try {
            // В Lesson.svelte submitTest должен обновить studentSubmission или вызвать loadLessonData,
            // что приведет к обновлению studentSubmission пропа и перерисовке этого компонента.
            dispatch('submitTest', {
                testId: testData.id,
                sectionItemId: sectionItemId,
                answers: answersPayload,
                fileData: null 
            });
            // Уведомление об успехе/ошибке теперь полностью в Lesson.svelte
            // hasSubmittedOnce будет установлен, когда studentSubmission обновится
        } catch (error) {
            // Этот catch здесь маловероятен, так как dispatch не кидает ошибку сам по себе.
            // Ошибки API обрабатываются в Lesson.svelte.
            addNotification(`Ошибка при отправке: ${error.message}`, "error");
        } finally {
            isSubmitting = false; 
        }
    }

    // Хелперы для отображения статуса опции
    function getOptionStatus(optionId) {
        if (!submissionResult || !submissionResult.student_answers || !submissionResult.student_answers.selected_option_ids) {
            return 'none'; // Нет отправки или нет данных об ответах
        }

        const isSelectedByStudent = submissionResult.student_answers.selected_option_ids.includes(optionId);
        const isOptionActuallyCorrect = testData.mcq_options.find(opt => opt.id === optionId)?.is_correct;

        if (isSelectedByStudent && isOptionActuallyCorrect) return 'correctly-selected';
        if (isSelectedByStudent && !isOptionActuallyCorrect) return 'incorrectly-selected';
        if (!isSelectedByStudent && isOptionActuallyCorrect) return 'missed-correct';
        return 'correctly-ignored'; // Не выбран и не является правильным
    }

</script>

<div class="test-item-display-wrapper" 
    data-testid={`test-item-${testData?.id}`} 
    aria-labelledby={`test-title-${testData?.id}`}>
    
    <h4 class="test-title" id={`test-title-${testData?.id}`}>{testData?.title || 'Тест'}</h4>
    
    {#if testData?.description}
        <div class="test-description">{@html testData.description.replace(/\n/g, '<br>')}</div>
    {/if}
    
    {#if testData?.attached_image_id && testData.attached_image_details}
        <div class="test-attachment test-attached-image">
            <ImageItemDisplay contentDetails={testData.attached_image_details} />
        </div>
    {/if}
    {#if testData?.attached_audio_id && testData.attached_audio_details}
         <div class="test-attachment test-attached-audio">
            <AudioItemDisplay contentDetails={testData.attached_audio_details} />
        </div>
    {/if}

    <form class="test-form-display" on:submit|preventDefault={handleSubmitTest} aria-live="polite">
        {#if testData?.test_type === 'mcq-single' || testData?.test_type === 'mcq-multi'}
            <fieldset class="mcq-options-group" role="group" aria-labelledby={`test-title-${testData?.id}`}>
                <legend class="sr-only">Варианты ответа для теста "{testData?.title}"</legend>
                {#each testData.mcq_options || [] as option (option.id)}
                    {@const status = getOptionStatus(option.id)}
                    <label 
                        class="mcq-option-display" 
                        class:is-correct={ (viewMode === 'admin' || hasSubmittedOnce) && option.is_correct }
                        class:is-incorrect={ (viewMode === 'admin' || hasSubmittedOnce) && !option.is_correct }
                        class:student-selected={ (viewMode === 'student' && hasSubmittedOnce) && submissionResult?.student_answers?.selected_option_ids.includes(option.id) }
                        class:student-correctly-selected={ viewMode === 'student' && hasSubmittedOnce && status === 'correctly-selected' }
                        class:student-incorrectly-selected={ viewMode === 'student' && hasSubmittedOnce && status === 'incorrectly-selected' }
                        class:student-missed-correct={ viewMode === 'student' && hasSubmittedOnce && status === 'missed-correct' }
                    >
                        <input 
                            type={testData.test_type === 'mcq-single' ? 'radio' : 'checkbox'}
                            name="mcq_option_group_{sectionItemId}_{testData.id}" 
                            value={option.id}
                            checked={testData.test_type === 'mcq-single' ? selectedRadioOption === option.id : !!selectedOptionsMap[option.id]}
                            on:change={(e) => handleMcqOptionChange(option.id, e)}
                            disabled={isSubmitting || viewMode === 'admin' || (hasSubmittedOnce && viewMode === 'student')}
                            aria-describedby={option.explanation ? `explanation-${option.id}` : null}
                        />
                        <span class="option-icon-status">
                            {#if viewMode === 'student' && hasSubmittedOnce}
                                {#if status === 'correctly-selected'} <CheckCircleOutline size="18px" class="icon-correct"/>
                                {:else if status === 'incorrectly-selected'} <CloseCircleOutline size="18px" class="icon-incorrect"/>
                                {:else if status === 'missed-correct'} <HelpCircleOutline size="18px" class="icon-missed"/>
                                {/if}
                            {/if}
                        </span>
                        <span class="option-text-display">{@html option.text.replace(/\n/g, '<br>')}</span>
                        {#if option.is_correct && (viewMode === 'admin' || (hasSubmittedOnce && viewMode === 'student'))}
                             <span class="correct-answer-indicator" title="Правильный ответ">(Верно)</span>
                        {/if}
                    </label>
                    {#if option.explanation && (viewMode === 'admin' || (hasSubmittedOnce && (option.is_correct || selectedOptionsMap[option.id] || selectedRadioOption === option.id )))}
                        <div class="option-explanation-display" id={`explanation-${option.id}`} 
                             class:visible={viewMode === 'admin' || (hasSubmittedOnce && (option.is_correct || (testData.test_type === 'mcq-multi' ? selectedOptionsMap[option.id] : selectedRadioOption === option.id)))}
                        >
                            <strong>Пояснение:</strong> {@html option.explanation.replace(/\n/g, '<br>')}
                        </div>
                    {/if}
                {/each}
            </fieldset>
        {/if}

        {#if viewMode === 'student' && !hasSubmittedOnce}
            <div class="test-actions-display">
                <button type="submit" class="btn-submit-test-display" disabled={isSubmitting}>
                    {isSubmitting ? 'Отправка...' : 'Отправить ответ'}
                </button>
            </div>
        {/if}

        {#if viewMode === 'student' && hasSubmittedOnce && submissionResult}
            <div class="submission-result-display">
                <h4>Результаты вашего ответа:</h4>
                <p>Статус: 
                    <strong class:status-graded={submissionResult.status === 'graded'}
                              class:status-pending={submissionResult.status === 'grading_pending' || submissionResult.status === 'submitted'}
                              class:status-passed={submissionResult.status === 'auto_passed'}
                              class:status-failed={submissionResult.status === 'auto_failed'}>
                        {submissionResult.status === 'graded' ? 'Оценено' : 
                         submissionResult.status === 'auto_passed' ? 'Зачтено (авто)' :
                         submissionResult.status === 'auto_failed' ? 'Не зачтено (авто)' :
                         'Отправлено (ожидает проверки)'}
                    </strong>
                </p>
                {#if submissionResult.score !== null && submissionResult.score !== undefined}
                    <p>Оценка: <strong>{submissionResult.score}</strong></p>
                {/if}
                {#if submissionResult.feedback}
                    <p>Комментарий преподавателя: <strong>{@html submissionResult.feedback.replace(/\n/g, '<br>')}</strong></p>
                {/if}
            </div>
        {/if}
    </form>
</div>

<style>
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
.test-item-display-wrapper {
    background-color: #fff;
    border: 1px solid var(--color-border-light, #e7eaf3);
    border-radius: var(--spacing-border-radius-block, 12px);
    padding: clamp(15px, 3vw, 20px);
    margin-bottom: 25px;
    box-shadow: 0 3px 8px rgba(var(--color-primary-rgb, 175, 164, 255), 0.05);
}
.test-title {
    font-size: clamp(1.2em, 2.8vw, 1.5em);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-dark);
    margin-top: 0;
    margin-bottom: 8px;
}
.test-description {
    font-size: clamp(0.9em, 2vw, 1em);
    color: var(--color-text-muted);
    margin-bottom: 18px;
    line-height: 1.65;
}
.test-attachment { margin-bottom: 18px; }
.test-attachment :global(.image-item-display),
.test-attachment :global(.audio-item-display-enhanced) {
    border: 1px solid var(--color-border-light, #eef0f5); /* Немного другая рамка для вложений */
    box-shadow: none;
    margin-bottom: 0;
    border-radius: var(--spacing-border-radius-small);
}

.test-form-display { margin-top: 10px; }
.mcq-options-group {
    border: none; padding: 0; margin: 0;
    display: flex; flex-direction: column;
    gap: 12px;
}
.mcq-option-display {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 15px;
    border: 1px solid var(--color-border-admin-button, #d1c9ff); /* Используем цвет админ кнопки для границ */
    border-radius: var(--spacing-border-radius-small, 8px);
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
    background-color: var(--color-bg-light, #fff);
    position: relative; /* Для индикаторов */
}
.mcq-option-display:hover {
    border-color: var(--color-primary, #AFA4FF);
    background-color: var(--color-bg-ultra-light, #f8f6ff);
}
.mcq-option-display input[type="radio"], 
.mcq-option-display input[type="checkbox"] {
    margin-top: 4px; /* Выравнивание */
    flex-shrink: 0;
    accent-color: var(--color-secondary, #6D7FC9); /* Акцентный цвет для галочки */
    width: 16px; height: 16px;
    cursor: pointer;
}
.mcq-option-display input:disabled { cursor: not-allowed; }
.mcq-option-display input:disabled + .option-icon-status + .option-text-display {
    opacity: 0.7;
}

.option-icon-status {
    display: inline-flex;
    align-items: center;
    margin-right: -2px; /* Небольшая коррекция отступа */
    margin-top: 2px;
    width: 18px; /* Зарезервировать место */
}
.icon-correct { color: var(--color-success, #27ae60); }
.icon-incorrect { color: var(--color-danger-red, #e74c3c); }
.icon-missed { color: var(--color-primary, #AFA4FF); }


.option-text-display {
    flex-grow: 1;
    line-height: 1.55;
    font-size: 0.95em;
    word-break: break-word;
}

.correct-answer-indicator {
    font-size: 0.8em;
    font-weight: bold;
    color: var(--color-success, #27ae60);
    margin-left: 10px;
    white-space: nowrap;
}

/* Стили для отображения правильных/неправильных ответов после отправки или в админке */
.mcq-option-display.is-correct { /* Если это правильный ответ (показывается админу или студенту после) */
    border-left: 4px solid var(--color-success, #27ae60);
    /* background-color: #e6f7f0; */ /* Легкий фон для правильного */
}
.mcq-option-display.is-incorrect { /* Если это неправильный ответ (показывается админу) */
    /* Можно добавить стиль, если нужно визуально отличать неверные от неотмеченных */
}
.mcq-option-display.student-selected.is-correct { /* Студент выбрал правильный */
    background-color: rgba(var(--color-success-rgb, 46, 204, 113), 0.1);
    border-color: var(--color-success, #27ae60);
}
.mcq-option-display.student-selected:not(.is-correct) { /* Студент выбрал неправильный */
    background-color: rgba(var(--color-danger-red-rgb, 255, 77, 77), 0.1);
    border-color: var(--color-danger-red, #e74c3c);
    border-left-width: 4px;
}
.mcq-option-display:not(.student-selected).is-correct { /* Студент не выбрал, но это был правильный */
    /* Можно подсветить, что это был правильный, но не выбранный */
    /* border-left: 4px solid var(--color-primary-light); */
}


.option-explanation-display {
    font-size: 0.88em;
    color: #444;
    margin-top: 8px;
    padding: 8px 10px;
    background-color: #f7f7f9;
    border-radius: var(--spacing-border-radius-small);
    border-left: 3px solid var(--color-secondary-light, #c9d1f7); /* Добавить --color-secondary-light */
    line-height: 1.6;
    display: none; /* Скрыт по умолчанию */
}
.option-explanation-display.visible {
    display: block;
}

.test-actions-display {
    margin-top: 25px;
    text-align: right;
}
.btn-submit-test-display {
    background-color: var(--color-primary, #AFA4FF);
    color: white;
    padding: 10px 22px;
    border: none;
    border-radius: var(--spacing-border-radius-button);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease;
    font-size: 0.95rem;
}
.btn-submit-test-display:hover:not(:disabled) {
    background-color: var(--color-primary-dark, #8679f0);
}
.btn-submit-test-display:active:not(:disabled) {
    transform: translateY(1px);
}
.btn-submit-test-display:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    opacity: 0.8;
}

.submission-result-display {
    margin-top: 25px;
    padding: 15px 20px;
    background-color: var(--color-bg-ultra-light, #f8f6ff);
    border: 1px solid var(--color-border-admin-button, #d1c9ff);
    border-radius: var(--spacing-border-radius-block);
}
.submission-result-display h4 {
    margin-top: 0;
    margin-bottom: 12px;
    color: var(--color-primary-dark);
    font-size: 1.1em;
}
.submission-result-display p {
    margin-bottom: 8px;
    font-size: 0.95em;
}
.submission-result-display strong.status-graded,
.submission-result-display strong.status-passed { color: var(--color-success, #27ae60); }
.submission-result-display strong.status-failed { color: var(--color-danger-red, #e74c3c); }
.submission-result-display strong.status-pending { color: var(--color-secondary, #6D7FC9); }

</style>