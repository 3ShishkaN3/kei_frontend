<script>
    import { createEventDispatcher } from 'svelte';
    import ImageItemDisplay from '../ImageItemDisplay.svelte';
    import AudioItemDisplay from '../AudioItemDisplay.svelte';
    import Refresh from 'svelte-material-icons/Refresh.svelte';

    export let testData = null;
    export let sectionItemId = null;
    export let viewMode = 'student'; // 'student' или 'admin'
    export let canStudentInteract = false;
    export let isTestSubmittedByStudent = false;
    export let studentAnswerText = '';

    const dispatch = createEventDispatcher();

    function resetTestToDefault(event) {
        if (!canStudentInteract) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        studentAnswerText = '';
        dispatch('update:studentAnswerText', '');
        
        dispatch('testReset');
    }

    function handleTextChange(event) {
        const newValue = event.target.value;
        studentAnswerText = newValue;
        dispatch('update:studentAnswerText', newValue);
    }
</script>

<div class="free-text-test-display" data-testid="free-text-test-display" style="position: relative;">
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
    
    {#if testData?.free_text_question?.prompt_text}
        <div class="question-section">
            <h5 class="question-title">Вопрос:</h5>
            <div class="question-text">{@html testData.free_text_question.prompt_text.replace(/\n/g, '<br>')}</div>
        </div>
    {/if}

    {#if testData?.free_text_question?.prompt_image_file}
        <div class="question-attachment">
            <ImageItemDisplay contentDetails={{
                image_file: testData.free_text_question.prompt_image_file,
                title: 'Изображение к вопросу'
            }} />
        </div>
    {/if}

    {#if testData?.free_text_question?.prompt_audio_file}
        <div class="question-attachment">
            <AudioItemDisplay contentDetails={{
                audio_file: testData.free_text_question.prompt_audio_file,
                title: 'Аудио к вопросу'
            }} />
        </div>
    {/if}

    <div class="answer-section">
        <label for="text-answer" class="answer-label">
            Ваш ответ:
        </label>
        <textarea
            id="text-answer"
            class="text-answer-input"
            placeholder="Введите ваш ответ здесь..."
            value={studentAnswerText}
            on:input={handleTextChange}
            disabled={!canStudentInteract}
            rows="6"
            maxlength="2000"
        ></textarea>
        <div class="character-count">
            {studentAnswerText.length}/2000 символов
        </div>
    </div>



    {#if (viewMode === 'admin' || (viewMode === 'student' && isTestSubmittedByStudent)) && testData?.free_text_question?.reference_answer}
        <div class="correct-answer-section">
            <h5 class="correct-answer-title">Правильный ответ:</h5>
            <div class="correct-answer-text">
                {@html testData.free_text_question.reference_answer.replace(/\n/g, '<br>')}
            </div>
        </div>
    {/if}

    {#if (viewMode === 'admin' || (viewMode === 'student' && isTestSubmittedByStudent)) && testData?.free_text_question?.explanation}
        <div class="explanation-section">
            <h5 class="explanation-title">Объяснение:</h5>
            <div class="explanation-text">
                {@html testData.free_text_question.explanation.replace(/\n/g, '<br>')}
            </div>
        </div>
    {/if}
</div>

<style>
    .free-text-test-display {
        background-color: #fff;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
    }

    .question-section {
        margin-bottom: 20px;
    }

    .question-title {
        font-size: 1.1em;
        font-weight: 600;
        color: var(--color-text-dark, #333);
        margin-bottom: 8px;
    }

    .question-text {
        font-size: 1rem;
        line-height: 1.6;
        color: var(--color-text-muted, #666);
        background-color: #f8f9fa;
        padding: 12px;
        border-radius: 6px;
        border-left: 4px solid var(--color-primary, #AFA4FF);
    }

    .question-attachment {
        margin-bottom: 20px;
        border-radius: 8px;
        overflow: hidden;
    }

    .question-attachment :global(.image-item-display),
    .question-attachment :global(.audio-item-display-enhanced) {
        border: none;
        box-shadow: none;
        margin-bottom: 0;
        padding: 0;
    }

    .answer-section {
        margin-bottom: 20px;
    }

    .answer-label {
        display: block;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-text-dark, #333);
        margin-bottom: 8px;
    }

    .text-answer-input {
        width: 100%;
        min-height: 120px;
        padding: 12px;
        border: 2px solid #e1e5e9;
        border-radius: 8px;
        font-size: 1rem;
        line-height: 1.5;
        font-family: inherit;
        resize: vertical;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        background-color: #fff;
    }

    .text-answer-input:focus {
        outline: none;
        border-color: var(--color-primary, #AFA4FF);
        box-shadow: 0 0 0 3px rgba(175, 164, 255, 0.1);
    }

    .text-answer-input:disabled {
        background-color: #f8f9fa;
        color: #6c757d;
        cursor: not-allowed;
    }

    .character-count {
        font-size: 0.85rem;
        color: #6c757d;
        text-align: right;
        margin-top: 4px;
    }

    .correct-answer-section,
    .explanation-section {
        margin-top: 20px;
        padding: 15px;
        background-color: #f8f6ff;
        border: 1px solid #d1c9ff;
        border-radius: 8px;
    }

    .correct-answer-title,
    .explanation-title {
        font-size: 1rem;
        font-weight: 600;
        color: #5845d8;
        margin-bottom: 8px;
    }

    .correct-answer-text,
    .explanation-text {
        font-size: 0.95rem;
        line-height: 1.6;
        color: #333;
        background-color: #fff;
        padding: 10px;
        border-radius: 4px;
    }

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
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        z-index: 10;
    }
    
    .reset-test-button:hover {
        background: #f8f9fa;
        border-color: #5845d8;
        transform: scale(1.05);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    
    .reset-test-button:active {
        transform: scale(0.95);
    }

    @media (max-width: 768px) {
        .free-text-test-display {
            padding: 15px;
        }

        .text-answer-input {
            min-height: 100px;
        }
    }
</style> 