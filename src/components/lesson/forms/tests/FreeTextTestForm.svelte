<script>
    import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
    import { FreeTextTestModel } from '../../../../models/testTypes.js';
    import { addNotification } from '../../../../stores/notifications.js';
    import { fade } from 'svelte/transition';
    import Cropper from 'svelte-easy-crop';
    import { API_BASE_URL } from '../../../../config.js';
    import { nanoid } from 'nanoid';

    import PlusCircleOutline from 'svelte-material-icons/PlusCircleOutline.svelte';
    import DeleteOutline from 'svelte-material-icons/DeleteOutline.svelte';
    import ImagePlusOutline from 'svelte-material-icons/ImagePlusOutline.svelte';
    import MusicNotePlus from 'svelte-material-icons/MusicNotePlus.svelte';
    import CloseCircle from 'svelte-material-icons/CloseCircle.svelte';
    import AspectRatioIcon from 'svelte-material-icons/AspectRatio.svelte';

    export let testData;
    export let isEditing = false;
    export let isLoading = false;

    const dispatch = createEventDispatcher();

    let localTestModel = new FreeTextTestModel({ title: '', test_type: 'free-text' });

    let questionImageFile = null;
    let questionImagePreviewUrlForCropper = null;
    let showQuestionImageCropper = false;
    let questionImageCrop = { x: 0, y: 0 };
    let questionImageZoom = 1;
    let questionImageCroppedAreaPixels = null;
    let currentQuestionImageId = null;
    let currentQuestionImageUrl = null;

    let questionImageAspectRatio = null;
    const aspectRatios = [
        { label: 'Своб.', value: null }, { label: '1:1', value: 1/1 },
        { label: '16:9', value: 16/9 }, { label: '4:3', value: 4/3 },
        { label: '3:4', value: 3/4 },
    ];

    let questionAudioFile = null;
    let questionAudioFileName = null;
    let currentQuestionAudioId = null;
    let currentQuestionAudioUrl = null;

    function generateTemporaryId() {
        return `temp_${nanoid(8)}`;
    }

    function initializeModel(currentTestData) {
        if (!currentTestData) {
            localTestModel = new FreeTextTestModel({ title: '', test_type: 'free-text' });
        } else {
            localTestModel = new FreeTextTestModel({ ...currentTestData });
        }

        currentQuestionImageId = currentTestData?.free_text_question?.prompt_image_file || null;
        currentQuestionImageUrl = currentTestData?.free_text_question?.prompt_image_details?.image || null;
        if (currentQuestionImageUrl && !questionImageFile) {
            questionImagePreviewUrlForCropper = currentQuestionImageUrl.startsWith('http') ? currentQuestionImageUrl : API_BASE_URL + currentQuestionImageUrl;
            showQuestionImageCropper = true;
        } else if (!questionImageFile) {
            questionImagePreviewUrlForCropper = null;
            showQuestionImageCropper = false;
        }

        const arFromData = currentTestData?.free_text_question?.aspect_ratio_for_question_image;
        const foundAr = aspectRatios.find(ar => ar.value === arFromData);
        questionImageAspectRatio = foundAr ? foundAr.value : null;

        currentQuestionAudioId = currentTestData?.free_text_question?.prompt_audio_file || null;
        currentQuestionAudioUrl = currentTestData?.free_text_question?.prompt_audio_details?.audio_file || null;
        if (currentQuestionAudioUrl && !questionAudioFile) {
            const name = currentQuestionAudioUrl.substring(currentQuestionAudioUrl.lastIndexOf('/') + 1);
            try { questionAudioFileName = decodeURIComponent(name); } catch(e) { questionAudioFileName = name; }
        } else if (!questionAudioFile) {
            questionAudioFileName = null;
        }

        localTestModel = localTestModel;
    }

    onMount(() => {
        initializeModel(testData);
    });

    function validateTest() {
        if (!localTestModel.title.trim()) {
            addNotification('Пожалуйста, введите название теста.', 'error');
            return false;
        }

        if (!localTestModel.free_text_question.prompt_text.trim()) {
            addNotification('Пожалуйста, введите текст вопроса.', 'error');
            return false;
        }

        if (!localTestModel.free_text_question.reference_answer.trim()) {
            addNotification('Пожалуйста, введите правильный ответ.', 'error');
            return false;
        }

        return true;
    }

    function handleQuestionImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                questionImageFile = file;
                questionImagePreviewUrlForCropper = URL.createObjectURL(file);
                showQuestionImageCropper = true;
                questionImageCrop = { x: 0, y: 0 };
                questionImageZoom = 1;
            } else {
                addNotification('Пожалуйста, выберите файл изображения.', 'error');
            }
        }
    }

    function onQuestionImageCropComplete(event) {
        questionImageCroppedAreaPixels = event.detail;
    }

    async function getCroppedQuestionImage(imageSrc, pixelCrop) {
        const image = new Image();
        image.src = imageSrc;
        
        return new Promise((resolve) => {
            image.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = pixelCrop.width;
                canvas.height = pixelCrop.height;
                
                ctx.drawImage(
                    image,
                    pixelCrop.x,
                    pixelCrop.y,
                    pixelCrop.width,
                    pixelCrop.height,
                    0,
                    0,
                    pixelCrop.width,
                    pixelCrop.height
                );
                
                canvas.toBlob((blob) => {
                    const file = new File([blob], questionImageFile.name, { type: questionImageFile.type });
                    resolve(file);
                }, questionImageFile.type);
            };
        });
    }

    function removeQuestionImage() {
        questionImageFile = null;
        questionImagePreviewUrlForCropper = null;
        showQuestionImageCropper = false;
        currentQuestionImageId = null;
        currentQuestionImageUrl = null;
    }

    function handleQuestionAudioUpload(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.type.startsWith('audio/')) {
                questionAudioFile = file;
                questionAudioFileName = file.name;
            } else {
                addNotification('Пожалуйста, выберите аудио файл.', 'error');
            }
        }
    }

    function removeQuestionAudio() {
        questionAudioFile = null;
        questionAudioFileName = null;
        currentQuestionAudioId = null;
        currentQuestionAudioUrl = null;
    }

    async function handleSave() {
        if (!localTestModel || !validateTest()) return;

        let finalCroppedQuestionImageFile = null;

        if (questionImageFile && showQuestionImageCropper) {
            if (questionImageCroppedAreaPixels && questionImageCroppedAreaPixels.width > 0 && questionImageCroppedAreaPixels.height > 0) {
                finalCroppedQuestionImageFile = await getCroppedQuestionImage(questionImagePreviewUrlForCropper, questionImageCroppedAreaPixels);
            } else {
                finalCroppedQuestionImageFile = questionImageFile;
            }
        }

        const testDefinition = {
            title: localTestModel.title,
            description: localTestModel.description,
            test_type: localTestModel.test_type,
            free_text_question: {
                prompt_text: localTestModel.free_text_question.prompt_text,
                reference_answer: localTestModel.free_text_question.reference_answer,
                explanation: localTestModel.free_text_question.explanation,
                prompt_image_file: finalCroppedQuestionImageFile ? null : currentQuestionImageId,
                prompt_audio_file: questionAudioFile ? null : currentQuestionAudioId,
            }
        };

        if (finalCroppedQuestionImageFile || questionAudioFile) {
            const formData = new FormData();
            formData.append('test_definition', JSON.stringify(testDefinition));
            if (finalCroppedQuestionImageFile) {
                formData.append('question_image_file', finalCroppedQuestionImageFile);
            }
            if (questionAudioFile) {
                formData.append('question_audio_file', questionAudioFile);
            }
            dispatch('save', formData);
        } else {
            dispatch('save', testDefinition);
        }
    }

    onDestroy(() => {
        if (questionImagePreviewUrlForCropper && questionImagePreviewUrlForCropper.startsWith('blob:')) {
            URL.revokeObjectURL(questionImagePreviewUrlForCropper);
        }
    });
</script>

<div class="item-form free-text-test-form">
    {#if localTestModel}
        <div class="form-group">
            <label for={"free-text-test-title-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')}>Название теста</label>
            <input type="text" id={"free-text-test-title-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')} bind:value={localTestModel.title} placeholder="Введите название теста" disabled={isLoading} />
        </div>

        <div class="form-group">
            <label for={"free-text-test-description-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')}>Описание/Инструкция</label>
            <textarea id={"free-text-test-description-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')} bind:value={localTestModel.description} rows="3" placeholder="Описание или инструкция (необязательно)" disabled={isLoading}></textarea>
        </div>

        <div class="question-section">
            <h4 class="section-header">Вопрос:</h4>
            
            <div class="form-group">
                <label for={"free-text-question-text-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')}>Текст вопроса</label>
                <textarea id={"free-text-question-text-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')} bind:value={localTestModel.free_text_question.prompt_text} rows="4" placeholder="Введите текст вопроса для студентов" disabled={isLoading}></textarea>
            </div>

            <div class="form-group attachment-control">
                <label for={"free-text-question-image-upload-input-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')}>Изображение к вопросу (необязательно)</label>
                {#if showQuestionImageCropper && questionImagePreviewUrlForCropper}
                    <div class="cropper-wrapper-test">
                        <Cropper
                            image={questionImagePreviewUrlForCropper}
                            crop={questionImageCrop}
                            zoom={questionImageZoom}
                            aspect={questionImageAspectRatio}
                            on:cropchange={(e) => questionImageCrop = e.detail}
                            on:zoomchange={(e) => questionImageZoom = e.detail}
                            on:cropcomplete={onQuestionImageCropComplete}
                            cropShape="rect"
                            showGrid={true}
                        />
                    </div>
                    <div class="attachment-actions">
                        <div class="aspect-ratio-controls">
                            <span>Соотношение:</span>
                            {#each aspectRatios as ratio}
                                <button type="button" class="aspect-btn" class:active={questionImageAspectRatio === ratio.value} on:click={() => questionImageAspectRatio = ratio.value}>
                                    {ratio.label}
                                </button>
                            {/each}
                        </div>
                        <button type="button" class="remove-attachment-btn" on:click={removeQuestionImage} disabled={isLoading}>
                            <CloseCircle size="20px" />
                        </button>
                    </div>
                {:else}
                    <label class="file-upload-label" for={"free-text-question-image-upload-input-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')}>
                        <ImagePlusOutline size="24px" />
                        <span>Выберите изображение для вопроса</span>
                    </label>
                    <input type="file" id={"free-text-question-image-upload-input-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')} accept="image/*" on:change={handleQuestionImageUpload} class="visually-hidden" disabled={isLoading} />
                {/if}
            </div>

            <div class="form-group attachment-control">
                <label for={"free-text-question-audio-upload-input-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')}>Аудио к вопросу (необязательно)</label>
                {#if questionAudioFileName}
                    <div class="audio-filename-display">
                        <span>{questionAudioFileName}</span>
                        <button type="button" class="remove-attachment-btn" on:click={removeQuestionAudio} disabled={isLoading}>
                            <CloseCircle size="20px" />
                        </button>
                    </div>
                {:else}
                    <label class="file-upload-label" for={"free-text-question-audio-upload-input-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')}>
                        <MusicNotePlus size="24px" />
                        <span>Выберите аудио файл для вопроса</span>
                    </label>
                    <input type="file" id={"free-text-question-audio-upload-input-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')} accept="audio/*" on:change={handleQuestionAudioUpload} class="visually-hidden" disabled={isLoading} />
                {/if}
            </div>
        </div>

        <div class="answer-section">
            <h4 class="section-header">Правильный ответ:</h4>
            
            <div class="form-group">
                <label for={"free-text-reference-answer-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')}>Правильный ответ</label>
                <textarea id={"free-text-reference-answer-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')} bind:value={localTestModel.free_text_question.reference_answer} rows="4" placeholder="Введите правильный ответ для проверки" disabled={isLoading}></textarea>
            </div>

            <div class="form-group">
                <label for={"free-text-explanation-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')}>Объяснение (необязательно)</label>
                <textarea id={"free-text-explanation-" + (localTestModel.id && typeof localTestModel.id !== 'symbol' ? localTestModel.id : 'new')} bind:value={localTestModel.free_text_question.explanation} rows="3" placeholder="Объяснение к правильному ответу" disabled={isLoading}></textarea>
            </div>
        </div>

        <div class="form-actions">
            <button type="button" class="btn-cancel" on:click={() => dispatch('cancel')} disabled={isLoading}>
                Отмена
            </button>
            <button type="submit" class="btn-save" on:click|preventDefault={handleSave} disabled={isLoading}>
                {isLoading ? 'Сохранение...' : (isEditing ? 'Обновить' : 'Создать')}
            </button>
        </div>
    {:else}
        <div class="form-loading-placeholder">
            <div class="spinner"></div>
            Загрузка формы...
        </div>
    {/if}
</div>

<style>
    .item-form {
        padding: 20px;
        background-color: var(--color-bg-light, #fff);
        border-radius: var(--spacing-border-radius-block, 12px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .section-header {
        margin-top: 25px;
        margin-bottom: 15px;
        font-size: 1.2em;
        font-weight: var(--font-weight-semi-bold);
        color: var(--color-text-dark);
        border-bottom: 2px solid var(--color-primary-light, #d1c9ff);
        padding-bottom: 8px;
    }

    .form-group {
        margin-bottom: 20px;
    }

    .form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: var(--color-text-dark);
        font-size: 0.95rem;
    }

    .form-group input[type="text"],
    .form-group input[type="number"],
    .form-group textarea {
        padding: 10px 14px;
        border: 1px solid var(--color-border-light, #d8dce6);
        border-radius: var(--spacing-border-radius-small, 8px);
        font-size: 0.95rem;
        transition: border-color 0.2s, box-shadow 0.2s;
        background-color: var(--color-bg-light, #fff);
        width: 100%;
        box-sizing: border-box;
    }

    .form-group input:focus,
    .form-group textarea:focus {
        border-color: var(--color-primary, #AFA4FF);
        box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 175, 164, 255), 0.2);
        outline: none;
    }

    .form-group textarea {
        line-height: 1.5;
        resize: vertical;
        min-height: 80px;
    }

    .form-loading-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 30px;
        color: var(--color-text-muted);
    }

    .spinner {
        border: 3px solid rgba(var(--color-primary-rgb), 0.2);
        border-left-color: var(--color-primary);
        border-radius: 50%;
        width: 24px;
        height: 24px;
        animation: form-spin 1s linear infinite;
        margin-right: 10px;
    }

    @keyframes form-spin {
        to { transform: rotate(360deg); }
    }

    .attachment-control > label:first-child {
        font-size: 0.95rem;
        margin-bottom: 8px;
    }

    .file-upload-label {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 15px;
        border: 2px dashed var(--color-border-admin-button, #d1c9ff);
        border-radius: var(--spacing-border-radius-small);
        cursor: pointer;
        color: var(--color-secondary, #6D7FC9);
        transition: background-color 0.2s, border-color 0.2s;
    }

    .file-upload-label:hover {
        background-color: rgba(var(--color-primary-rgb, 175, 164, 255), 0.05);
        border-color: var(--color-primary, #AFA4FF);
    }

    .file-upload-label span {
        font-size: 0.9em;
        flex-grow: 1;
        text-align: center;
    }

    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }

    .cropper-wrapper-test {
        position: relative;
        width: 100%;
        height: 220px;
        background: #eef2f7;
        border-radius: var(--spacing-border-radius-small);
        overflow: hidden;
        margin-bottom: 10px;
        border: 1px solid var(--color-border-light);
    }

    .attachment-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
        gap: 10px;
    }

    .aspect-ratio-controls {
        display: flex;
        gap: 5px;
        align-items: center;
        color: var(--color-text-muted);
    }

    .aspect-ratio-controls > span {
        margin-right: 5px;
    }

    .aspect-btn {
        font-size: 0.75em;
        padding: 3px 6px;
        border: 1px solid #ccc;
        background: #f9f9f9;
        border-radius: 4px;
        cursor: pointer;
    }

    .aspect-btn.active {
        background: var(--color-primary-light);
        color: var(--color-primary-dark);
        border-color: var(--color-primary);
    }

    .remove-attachment-btn {
        background: transparent;
        color: var(--color-text-muted);
        border: 1px solid var(--color-border-light);
        border-radius: 50%;
        width: 28px;
        height: 28px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        padding: 0;
    }

    .remove-attachment-btn:hover {
        background-color: rgba(var(--color-danger-red-rgb), 0.1);
        color: var(--color-danger-red);
        border-color: rgba(var(--color-danger-red-rgb), 0.3);
    }

    .audio-filename-display {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background-color: #f7f9fc;
        border-radius: var(--spacing-border-radius-small);
        margin-bottom: 10px;
        border: 1px solid var(--color-border-light);
    }

    .audio-filename-display span {
        font-size: 0.9em;
        color: var(--color-text-dark);
        word-break: break-all;
    }

    .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 25px;
        padding-top: 20px;
        border-top: 1px solid var(--color-border-light, #eee);
    }

    .btn-save,
    .btn-cancel {
        font-size: 0.95rem;
        padding: 10px 20px;
        font-weight: 500;
    }

    .btn-save {
        background-color: var(--color-primary);
        color: white;
        border: none;
        border-radius: var(--spacing-border-radius-button);
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .btn-save:hover:not(:disabled) {
        background-color: var(--color-primary-dark, #8679f0);
    }

    .btn-save:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }

    .btn-cancel {
        background-color: var(--color-bg-ultra-light, #f8f9fa);
        color: var(--color-text-muted, #555);
        padding: 10px 20px;
        border: 1px solid var(--color-border-light, #ddd);
        border-radius: var(--spacing-border-radius-button);
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .btn-cancel:hover:not(:disabled) {
        background-color: #e9ecef;
    }

    @media (max-width: 600px) {
        .item-form {
            padding: 15px;
        }

        .form-actions {
            flex-direction: column;
        }

        .btn-save,
        .btn-cancel {
            width: 100%;
        }
    }
</style> 