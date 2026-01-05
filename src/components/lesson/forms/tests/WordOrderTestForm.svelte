<script>
    import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
    import { WordOrderTestModel } from '../../../../models/testTypes.js';
    import { addNotification } from '../../../../stores/notifications.js';
    import { API_BASE_URL } from '../../../../config.js';
    import { fade, slide } from 'svelte/transition';
    import { nanoid } from 'nanoid';

    import PlusCircleOutline from 'svelte-material-icons/PlusCircleOutline.svelte';
    import DeleteOutline from 'svelte-material-icons/DeleteOutline.svelte';
    import ImagePlusOutline from 'svelte-material-icons/ImagePlusOutline.svelte';
    import MusicNotePlus from 'svelte-material-icons/MusicNotePlus.svelte';
    import CloseCircle from 'svelte-material-icons/CloseCircle.svelte';
    import ArrowUpBold from 'svelte-material-icons/ArrowUpBold.svelte';
    import ArrowDownBold from 'svelte-material-icons/ArrowDownBold.svelte';
    import Cropper from 'svelte-easy-crop';
    import AspectRatioIcon from 'svelte-material-icons/AspectRatio.svelte';

    export let testData; 
    export let isEditing = false;
    export let isLoading = false;

    const dispatch = createEventDispatcher();

    let localTestModel = new WordOrderTestModel({ title: '', description: '', test_type: 'word-order', draggable_options_pool: [], correct_ordered_texts: [] });
    
    let testAttachedImageFile = null;
    let testImagePreviewUrl = null; 
    let testCurrentServerImageId = null;
    let testCurrentServerImageUrl = null;
    let testImageCrop = { x: 0, y: 0 };
    let testImageZoom = 1;
    let testImageCroppedAreaPixels = null;
    let testImageAspectRatio = 16/9; 
    const testImageAspectRatios = [
        { label: '16:9', value: 16/9 }, { label: '4:3', value: 4/3 },
        { label: '1:1', value: 1/1 }, { label: 'Своб.', value: null },
    ];
    
    let testAttachedAudioFile = null;
    let testAudioFileName = null;
    let testCurrentServerAudioId = null;
    let testCurrentServerAudioUrl = null;

    let newOptionPoolText = "";

    function generateTemporaryId() { return `temp_wo_opt_${nanoid(7)}`; }

    function initializeModel(currentTestData) {
        if (!currentTestData || Object.keys(currentTestData).length === 0 || currentTestData.test_type !== 'word-order') {
            localTestModel = new WordOrderTestModel({ 
                title: '', description: '', test_type: 'word-order', 
                draggable_options_pool: [], 
                correct_ordered_texts: [] 
            });
        } else {
            const wosDetails = currentTestData.word_order_sentence || {};
            const correctTexts = Array.isArray(wosDetails.correct_ordered_texts) ? [...wosDetails.correct_ordered_texts] : [];
            const poolCopy = currentTestData.draggable_options_pool 
                ? [...currentTestData.draggable_options_pool] 
                : [];
            
            localTestModel = new WordOrderTestModel({ 
                ...currentTestData, 
                draggable_options_pool: poolCopy,
                correct_ordered_texts: correctTexts,
                display_prompt: wosDetails.display_prompt || "",
                explanation: wosDetails.explanation || ""
            });
        }
        
        testCurrentServerImageId = currentTestData?.attached_image_id || null;
        testCurrentServerImageUrl = currentTestData?.attached_image_details?.image || null;
        if (testCurrentServerImageUrl && !testAttachedImageFile) {
            testImagePreviewUrl = testCurrentServerImageUrl.startsWith('http') ? testCurrentServerImageUrl : API_BASE_URL + testCurrentServerImageUrl;
        } else if (!testAttachedImageFile) { testImagePreviewUrl = null; }
        
        const arFromDataWo = currentTestData?.aspect_ratio_for_test_image;
        const foundArWo = testImageAspectRatios.find(ar => ar.value === arFromDataWo);
        testImageAspectRatio = foundArWo ? foundArWo.value : (testImageAspectRatios[0]?.value !== undefined ? testImageAspectRatios[0].value : null);


        testCurrentServerAudioId = currentTestData?.attached_audio_id || null;
        testCurrentServerAudioUrl = currentTestData?.attached_audio_details?.audio_file || null;
        if (testCurrentServerAudioUrl && !testAttachedAudioFile) {
            const name = testCurrentServerAudioUrl.substring(testCurrentServerAudioUrl.lastIndexOf('/') + 1);
            try { testAudioFileName = decodeURIComponent(name); } catch(e) { testAudioFileName = name; }
        } else if (!testAttachedAudioFile) { testAudioFileName = null; }

        if (localTestModel.draggable_options_pool.length === 0 && currentTestData?.title !== undefined) {
            localTestModel.addOptionToPool("Слово 1");
            localTestModel.addOptionToPool("Слово 2");
            localTestModel.addOptionToPool("Слово 3");
        }
        if (localTestModel.word_order_sentence.correct_ordered_texts.length === 0 && currentTestData?.title !== undefined && localTestModel.draggable_options_pool.length > 0) {
        }
        localTestModel = localTestModel;
        tick().then(() => {
        });
    }
    
    onMount(() => { initializeModel(testData); });

    let prevTestDataString = null;
    $: if (testData) {
        const currentTestDataString = JSON.stringify({
            title: testData.title, test_type: testData.test_type,
            imgId: testData.attached_image_id, audId: testData.attached_audio_id,
            poolCount: testData.draggable_options_pool?.length, 
            correctCount: testData.word_order_sentence?.correct_ordered_texts?.length,
            prompt: testData.word_order_sentence?.display_prompt,
            expl: testData.word_order_sentence?.explanation
        });
        if (currentTestDataString !== prevTestDataString) {
            initializeModel(testData);
            prevTestDataString = currentTestDataString;
        }
    }

    function handleTestImageFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            testAttachedImageFile = file;
            testCurrentServerImageId = null; 
            if (testImagePreviewUrl && testImagePreviewUrl.startsWith('blob:')) URL.revokeObjectURL(testImagePreviewUrl);
            testImagePreviewUrl = URL.createObjectURL(file);
            testImageCrop = { x: 0, y: 0 }; testImageZoom = 1; testImageCroppedAreaPixels = null;
        }
        event.target.value = null; 
    }
    function onTestImageCropComplete(e) { testImageCroppedAreaPixels = e.detail.pixels; }
    async function getCroppedGeneralTestImage(imageSrc, pixelCrop) {
        if (!pixelCrop || pixelCrop.width === 0 || pixelCrop.height === 0) return testAttachedImageFile || null;
        const image = new Image(); image.src = imageSrc;
        try { await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; }); } 
        catch (error) { addNotification("Ошибка загрузки общего изображения для обрезки.", "error"); return null; }
        const canvas = document.createElement('canvas');
        canvas.width = pixelCrop.width; canvas.height = pixelCrop.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) { resolve(null); return; }
                resolve(new File([blob], testAttachedImageFile?.name || 'test-general-cropped.png', { type: blob.type || 'image/png' }));
            }, testAttachedImageFile?.type || 'image/png', 0.9);
        });
    }
    function removeTestAttachedImage() {
        testAttachedImageFile = null;
        if (testImagePreviewUrl && testImagePreviewUrl.startsWith('blob:')) URL.revokeObjectURL(testImagePreviewUrl);
        testImagePreviewUrl = null;
        testCurrentServerImageId = null; 
        testImageCroppedAreaPixels = null;
    }
    function handleTestAudioFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            testAttachedAudioFile = file;
            testCurrentServerAudioId = null;
            testAudioFileName = file.name;
        }
        event.target.value = null;
    }
    function removeTestAttachedAudio() {
        testAttachedAudioFile = null;
        testAudioFileName = null;
        testCurrentServerAudioId = null;
    }

    function addOptionToDraggablePool() {
        if (!newOptionPoolText.trim()) return;
        if (localTestModel.draggable_options_pool.includes(newOptionPoolText.trim())) {
            addNotification("Такое слово/фраза уже есть в пуле.", "warning"); return;
        }
        localTestModel.addOptionToPool(newOptionPoolText.trim());
        newOptionPoolText = "";
        localTestModel = localTestModel;
    }
    function removeOptionFromDraggablePool(optionText) {
        localTestModel.removeOptionFromPool(optionText);
        localTestModel = localTestModel;
    }
    function editOptionInPool(index, event) {
        const newText = event.target.value.trim();
        if (!localTestModel || index < 0 || index >= localTestModel.draggable_options_pool.length) return;

        if (newText && !localTestModel.draggable_options_pool.filter((o,i) => i !== index).includes(newText)) {
            const oldText = localTestModel.draggable_options_pool[index];
            localTestModel.draggable_options_pool[index] = newText;
            
            localTestModel.word_order_sentence.correct_ordered_texts = localTestModel.word_order_sentence.correct_ordered_texts.map(txt => txt === oldText ? newText : txt);
            localTestModel = localTestModel;
        } else if (!newText) {
             event.target.value = localTestModel.draggable_options_pool[index];
            addNotification("Текст опции не может быть пустым.", "warning");
        } else {
            event.target.value = localTestModel.draggable_options_pool[index];
        }
    }

    function addWordToSequence(wordFromPool) {
        if (!wordFromPool) return;
        localTestModel.word_order_sentence.correct_ordered_texts.push(wordFromPool);
        localTestModel = localTestModel;
    }
    function removeWordFromSequence(index) {
        if (index < 0 || index >= localTestModel.word_order_sentence.correct_ordered_texts.length) return;
        localTestModel.word_order_sentence.correct_ordered_texts.splice(index, 1);
        localTestModel = localTestModel;
    }
    function moveWordInSequence(index, direction) {
        const arr = localTestModel.word_order_sentence.correct_ordered_texts;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (index < 0 || index >= arr.length || targetIndex < 0 || targetIndex >= arr.length) return;
        [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
        localTestModel = localTestModel;
    }

    function validateTest() {
        if (!localTestModel.title.trim()) { addNotification("Введите название теста.", "error"); return false; }
        if (localTestModel.draggable_options_pool.length === 0) { addNotification("Пул слов/фраз не может быть пустым.", "error"); return false; }
        if (localTestModel.word_order_sentence.correct_ordered_texts.length === 0) { addNotification("Правильная последовательность не может быть пустой.", "error"); return false; }
        for (const textItem of localTestModel.word_order_sentence.correct_ordered_texts) {
            if (!localTestModel.draggable_options_pool.includes(textItem)) {
                addNotification(`Слово/фраза "${textItem}" в правильной последовательности отсутствует в общем пуле.`, "error");
                return false;
            }
        }
        return true;
    }

    async function handleSave() {
        if (!localTestModel || !validateTest()) return;

        let finalGeneralImageFile = null;
        if (testAttachedImageFile && testImagePreviewUrl) {
             if (testImageCroppedAreaPixels && testImageCroppedAreaPixels.width > 0 && testImageCroppedAreaPixels.height > 0) {
                finalGeneralImageFile = await getCroppedGeneralTestImage(testImagePreviewUrl, testImageCroppedAreaPixels);
            } else { finalGeneralImageFile = testAttachedImageFile; }
        }
        
        const testPayload = localTestModel.toPayload();
        testPayload.attached_image = finalGeneralImageFile ? null : testCurrentServerImageId;
        testPayload.attached_audio = testAttachedAudioFile ? null : testCurrentServerAudioId;
        // testPayload.aspect_ratio_for_test_image = testImageAspectRatio;

        Object.keys(testPayload).forEach(key => {
            if (testPayload[key] === undefined) delete testPayload[key];
            if (key === 'word_order_sentence' && testPayload[key]) {
                if (!Array.isArray(testPayload[key].correct_ordered_texts)) {
                    testPayload[key].correct_ordered_texts = [];
                }
                delete testPayload[key].distractor_words; 
            }
        });
        
        if (finalGeneralImageFile || testAttachedAudioFile) {
            const formData = new FormData();
            formData.append('test_definition', JSON.stringify(testPayload));
            if (finalGeneralImageFile) formData.append('attached_image_file', finalGeneralImageFile);
            if (testAttachedAudioFile) formData.append('attached_audio_file', testAttachedAudioFile);
            dispatch('save', formData);
        } else {
            dispatch('save', testPayload); 
        }
    }
    
    onDestroy(() => { 
        if (testImagePreviewUrl && testImagePreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(testImagePreviewUrl);
        }
    });
</script>

<div>
    <div class="item-form word-order-test-form">
        {#if localTestModel && localTestModel.word_order_sentence}
            <div class="form-group">
                <label for={"wo-test-title-" + (localTestModel.id || 'new')}>Название теста</label>
                <input type="text" id={"wo-test-title-" + (localTestModel.id || 'new')} bind:value={localTestModel.title} placeholder="Название теста 'Порядок слов'" disabled={isLoading} />
            </div>
            <div class="form-group">
                <label for={"wo-test-description-" + (localTestModel.id || 'new')}>Описание/Инструкция</label>
                <textarea id={"wo-test-description-" + (localTestModel.id || 'new')} bind:value={localTestModel.description} rows="3" placeholder="Описание задания" disabled={isLoading}></textarea>
            </div>
            <div class="form-group">
                <label for={"wo-test-prompt-" + (localTestModel.id || 'new')}>Подсказка/Начало предложения (опционально)</label>
                <input type="text" id={"wo-test-prompt-" + (localTestModel.id || 'new')} bind:value={localTestModel.word_order_sentence.display_prompt} placeholder="Например, 'Переведите и составьте: ...'" disabled={isLoading} />
            </div>

            <div class="attachments-section">
                <h4 class="attachments-header">Общие материалы к тесту (опционально):</h4>
                <div class="form-row">
                    <div class="form-group attachment-control">
                        <label for={"wo-test-image-upload-input-" + (localTestModel.id || 'new')}>Общее изображение к тесту</label>
                        {#if testImagePreviewUrl}
                            <div class="cropper-wrapper-test general-test-cropper">
                                 <Cropper
                                    image={testImagePreviewUrl}
                                    crop={testImageCrop}
                                    zoom={testImageZoom}
                                    aspect={testImageAspectRatio} 
                                    on:cropchange={(e) => testImageCrop = e.detail}
                                    on:zoomchange={(e) => testImageZoom = e.detail}
                                    on:cropcomplete={onTestImageCropComplete}
                                    cropShape="rect"
                                    showGrid={true}
                                />
                            </div>
                            <div class="attachment-actions">
                                <div class="aspect-ratio-controls">
                                    <span title="Соотношение сторон"><AspectRatioIcon size="18px"/></span>
                                    {#each testImageAspectRatios as ar}
                                    <button 
                                        type="button" class="aspect-btn" 
                                        class:active={testImageAspectRatio === ar.value && !(testImageAspectRatio === null && ar.value === null && testImageAspectRatio !== ar.value) } 
                                        on:click={() => testImageAspectRatio = ar.value}
                                        title={ar.label}
                                    >{ar.label}</button>
                                    {/each}
                                </div>
                                <label class="file-upload-label small" for={"wo-test-image-replace-" + (localTestModel.id || 'new')}>
                                    <ImagePlusOutline size="18px"/><span>Заменить</span>
                                </label>
                                <input type="file" id={"wo-test-image-replace-" + (localTestModel.id || 'new')} class="visually-hidden" accept="image/*" on:change={handleTestImageFileChange} disabled={isLoading}/>
                                <button type="button" class="remove-attachment-btn small" on:click={removeTestAttachedImage} title="Удалить изображение">
                                    <CloseCircle size="18px"/> Удалить
                                </button>
                            </div>
                        {:else}
                            <label class="file-upload-label main-upload-trigger" for={"wo-test-image-upload-input-" + (localTestModel.id || 'new')}>
                                <ImagePlusOutline size="24px"/>
                                <span>{testCurrentServerImageId ? `ID: ${testCurrentServerImageId}. Загрузить новый.` : 'Загрузить изображение'}</span>
                            </label>
                            <input type="file" id={"wo-test-image-upload-input-" + (localTestModel.id || 'new')} class="visually-hidden" accept="image/*" on:change={handleTestImageFileChange} disabled={isLoading}/>
                        {/if}
                         {#if testCurrentServerImageId && !testImagePreviewUrl && !testAttachedImageFile}
                            <small class="form-hint removed-hint">Изображение (ID: {testCurrentServerImageId}) будет удалено.</small>
                        {/if}
                    </div>
                    <div class="form-group attachment-control">
                        <label for={"wo-test-audio-upload-input-" + (localTestModel.id || 'new')}>Общее аудио к тесту</label>
                        {#if testAudioFileName}
                            <div class="audio-filename-display">
                                <span>{testAudioFileName}</span>
                                <button type="button" class="remove-attachment-btn small" on:click={removeTestAttachedAudio} title="Удалить аудио">
                                    <CloseCircle size="18px"/>
                                </button>
                            </div>
                        {/if}
                         <label class="file-upload-label main-upload-trigger" class:hidden={!!testAudioFileName} for={"wo-test-audio-upload-input-" + (localTestModel.id || 'new')}>
                            <MusicNotePlus size="24px"/>
                            <span>{testCurrentServerAudioId ? `ID: ${testCurrentServerAudioId}. Загрузить новый.` : 'Загрузить аудио'}</span>
                        </label>
                        <input type="file" id={"wo-test-audio-upload-input-" + (localTestModel.id || 'new')} class="visually-hidden" accept="audio/*" on:change={handleTestAudioFileChange} disabled={isLoading}/>
                        {#if testCurrentServerAudioId && !testAudioFileName && !testAttachedAudioFile}
                             <small class="form-hint removed-hint">Аудио (ID: {testCurrentServerAudioId}) будет удалено.</small>
                        {/if}
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h4 class="section-header">Пул слов/фраз (варианты для составления):</h4>
                <div class="option-pool-controls">
                    <input type="text" bind:value={newOptionPoolText} placeholder="Новое слово/фраза" disabled={isLoading} />
                    <button type="button" class="btn-add-small" on:click={addOptionToDraggablePool} disabled={isLoading || !newOptionPoolText.trim()}>
                        <PlusCircleOutline size="18px"/>Добавить в пул
                    </button>
                </div>
                <div class="options-pool-list word-order-pool">
                    {#each localTestModel.draggable_options_pool as optionText, index ("pool-wo-" + optionText + index)}
                        <div class="pool-option-item">
                            <input type="text" value={optionText} on:change={(e) => editOptionInPool(index, e)} class="pool-option-input" placeholder="Текст опции" />
                            <div class="pool-item-actions">
                                <button type="button" class="btn-action-small" on:click={() => addWordToSequence(optionText)} title="Добавить в правильную последовательность"
                                        disabled={isLoading || (localTestModel.word_order_sentence.correct_ordered_texts.includes(optionText))} >
                                    <PlusCircleOutline size="16px"/>
                                </button>
                                <button type="button" class="btn-delete-small" on:click={() => removeOptionFromDraggablePool(optionText)} title="Удалить из пула">
                                    <DeleteOutline size="16px"/>
                                </button>
                            </div>
                        </div>
                    {/each}
                    {#if localTestModel.draggable_options_pool.length === 0}
                        <p class="empty-list-message">Пул слов/фраз пуст.</p>
                    {/if}
                </div>
            </div>

            <div class="form-section">
                <h4 class="section-header">Правильная последовательность:</h4>
                {#if localTestModel.word_order_sentence.correct_ordered_texts.length > 0}
                    <div class="correct-sequence-list">
                        {#each localTestModel.word_order_sentence.correct_ordered_texts as word, index ("seq-wo-" + word + index)}
                            <div class="sequence-item" transition:slide|local={{duration:150}}>
                                <span>{index + 1}.</span>
                                <span class="sequence-word-text">{word}</span>
                                <div class="sequence-item-controls">
                                    <button class="btn-action-small" on:click={() => moveWordInSequence(index, 'up')} disabled={isLoading || index === 0} title="Переместить вверх">
                                        <ArrowUpBold size="16px"/>
                                    </button>
                                    <button class="btn-action-small" on:click={() => moveWordInSequence(index, 'down')} disabled={isLoading || index === localTestModel.word_order_sentence.correct_ordered_texts.length - 1} title="Переместить вниз">
                                        <ArrowDownBold size="16px"/>
                                    </button>
                                    <button class="btn-delete-small" on:click={() => removeWordFromSequence(index)} title="Удалить из последовательности">
                                        <DeleteOutline size="16px"/>
                                    </button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="empty-list-message">
                        Правильная последовательность пуста. Добавляйте слова из пула выше.
                    </p>
                {/if}
            </div>
            
            <div class="form-group">
                <label for={"wo-test-explanation-" + (localTestModel.id || 'new')}>Пояснение к заданию/ответу (опционально)</label>
                <textarea id={"wo-test-explanation-" + (localTestModel.id || 'new')} bind:value={localTestModel.word_order_sentence.explanation} rows="2" placeholder="Общее пояснение к заданию" disabled={isLoading}></textarea>
            </div>

            <div class="form-actions">
                 <button type="submit" class="btn-save" on:click|preventDefault={handleSave} disabled={isLoading}>
                    {isLoading ? 'Сохранение...' : (isEditing ? 'Обновить тест' : 'Создать тест')}
                </button>
                <button type="button" class="btn-cancel" on:click={() => dispatch('cancel')} disabled={isLoading}>Отмена</button>
            </div>
        {:else}
             <div class="form-loading-placeholder">
                <div class="spinner"></div> Загрузка формы теста...
            </div>
        {/if}
    </div>
</div>
<style>
.item-form { display: flex; flex-direction: column; gap: 20px; }
.form-group { display: flex; flex-direction: column; }
.form-group label { 
    margin-bottom: 7px; font-weight: 500; 
    color: var(--color-text-muted); font-size: 0.9rem; 
    display: block;
}
.form-group input[type="text"], 
.form-group input[type="number"], 
.form-group textarea {
    padding: 10px 14px; border: 1px solid var(--color-border-light, #d8dce6);
    border-radius: var(--spacing-border-radius-small, 8px); font-size: 0.95rem;
    transition: border-color 0.2s, box-shadow 0.2s;
    background-color: var(--color-bg-light, #fff);
    width: 100%; box-sizing: border-box;
}
.form-group input:focus, .form-group textarea:focus {
    border-color: var(--color-primary, #AFA4FF);
    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 175, 164, 255), 0.2);
    outline: none;
}
.form-group textarea { line-height: 1.5; min-height: 60px; }
.form-loading-placeholder { display: flex; align-items: center; justify-content: center; padding: 30px; color: var(--color-text-muted); }
.spinner { border: 3px solid rgba(var(--color-primary-rgb), 0.2); border-left-color: var(--color-primary); border-radius: 50%; width: 24px; height: 24px; animation: form-spin 1s linear infinite; margin-right: 10px; }
@keyframes form-spin { to { transform: rotate(360deg); } }
.form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--color-border-light, #eee); }
.btn-save, .btn-cancel { font-size: 0.95rem; padding: 10px 20px; font-weight: 500; }
.btn-save { background-color: var(--color-primary); color: white; border: none; border-radius: var(--spacing-border-radius-button); cursor: pointer; transition: background-color 0.2s; }
.btn-save:hover:not(:disabled) { background-color: var(--color-primary-dark, #8679f0); }
.btn-save:disabled { background-color: #ccc; cursor: not-allowed; }
.btn-cancel { background-color: var(--color-bg-ultra-light, #f8f9fa); color: var(--color-text-muted, #555); padding: 10px 20px; border: 1px solid var(--color-border-light, #ddd); border-radius: var(--spacing-border-radius-button); cursor: pointer; transition: background-color 0.2s; }
.btn-cancel:hover:not(:disabled) { background-color: #e9ecef; }

.attachments-section { margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--color-border-light, #eee); }
.attachments-header { margin-top: 0; margin-bottom: 15px; font-size: 1.1em; font-weight: var(--font-weight-semi-bold); color: var(--color-text-dark); }
.form-row { display: flex; gap: 20px; margin-bottom:10px;}
.form-row > .form-group { flex: 1; }
.attachment-control > label:first-child { font-size: 0.95rem; margin-bottom: 8px; color: var(--color-text-dark); }
.file-upload-label { display: flex; align-items: center; gap: 10px; padding: 12px 15px; border: 2px dashed var(--color-border-admin-button, #d1c9ff); border-radius: var(--spacing-border-radius-small); cursor: pointer; color: var(--color-secondary, #6D7FC9); transition: background-color 0.2s, border-color 0.2s; }
.file-upload-label.hidden { display: none; }
.file-upload-label:hover { background-color: rgba(var(--color-primary-rgb, 175, 164, 255), 0.05); border-color: var(--color-primary, #AFA4FF); }
.file-upload-label span { font-size: 0.9em; flex-grow: 1; text-align: center; }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;}
.cropper-wrapper-test.general-test-cropper { position: relative; width: 100%; height: 200px; background: #eef2f7; border-radius: var(--spacing-border-radius-small); overflow: hidden; margin-bottom: 10px; border: 1px solid var(--color-border-light); }
.attachment-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; gap: 10px; flex-wrap: wrap;}
.aspect-ratio-controls { display: flex; gap: 5px; align-items: center; color: var(--color-text-muted); }
.aspect-ratio-controls > span { margin-right: 5px; display: inline-flex; align-items: center;}
.aspect-btn { font-size: 0.75em; padding: 4px 8px; border: 1px solid #ccc; background: #f9f9f9; border-radius: 4px; cursor: pointer; line-height: 1.2;}
.aspect-btn.active { background: var(--color-primary-light); color: var(--color-primary-dark); border-color: var(--color-primary); }
.file-upload-label.small { padding: 6px 10px; font-size: 0.85em; border-style: solid; }
.remove-attachment-btn { background: transparent; color: var(--color-text-muted); border: 1px solid var(--color-border-light); border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; padding:0; }
.remove-attachment-btn.small { width: 26px; height: 26px; }
.remove-attachment-btn:hover { background-color: rgba(var(--color-danger-red-rgb, 255,77,77), 0.1); color: var(--color-danger-red); border-color: rgba(var(--color-danger-red-rgb, 255,77,77),0.3); }
.image-preview-wrapper { position: relative; margin-bottom: 10px; padding: 5px; border: 1px solid var(--color-border-light); border-radius: var(--spacing-border-radius-small); background-color: var(--color-bg-light); }
.attached-image-preview { display: block; max-width: 100%; max-height: 120px; border-radius: 3px; object-fit: contain; margin: auto; }
.image-preview-wrapper .remove-attachment-btn { position: absolute; top: 3px; right: 3px; background-color: rgba(255,255,255,0.7); }
.audio-filename-display { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background-color: #f7f9fc; border-radius: var(--spacing-border-radius-small); margin-bottom: 10px; border: 1px solid var(--color-border-light); }
.audio-filename-display span { font-size: 0.9em; color: var(--color-text-dark); word-break: break-all; margin-right: 10px; }
.form-hint { font-size: 0.8em; color: var(--color-text-muted); margin-top: 5px;}
.form-hint.removed-hint { color: var(--color-danger-red); font-weight: 500; }


.word-order-test-form .form-section {
    margin-top: 25px;
    padding-top: 20px;
    border-top: 1px solid var(--color-border-light, #f0f0f0);
}
.word-order-test-form .section-header {
    font-size: 1.1em;
    font-weight: var(--font-weight-semi-bold);
    color: var(--color-text-dark);
    margin-bottom: 15px;
}

.option-pool-controls {
    display: flex; gap: 10px; margin-bottom: 10px; align-items: center;
}
.option-pool-controls input[type="text"] { flex-grow: 1; margin-bottom: 0; }
.btn-add-small {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 12px; font-size: 0.85rem;
    color: var(--color-primary); background-color: transparent;
    border: 1px solid var(--color-primary-light);
    border-radius: var(--spacing-border-radius-button);
    cursor: pointer; transition: all 0.2s;
    flex-shrink: 0;
}
.btn-add-small:hover:not(:disabled) { background-color: var(--color-primary-light); color: var(--color-primary-dark); border-color: var(--color-primary); }
.btn-add-small:disabled { opacity: 0.6; cursor: not-allowed; }

.options-pool-list.word-order-pool {
    display: flex; flex-wrap: wrap; gap: 8px;
    padding: 10px; background-color: var(--color-bg-light);
    border: 1px solid var(--color-border-light);
    border-radius: var(--spacing-border-radius-small); min-height: 40px;
}
.pool-option-item {
    display: flex; align-items: center; gap: 6px;
    background-color: var(--color-purple-light);
    color: var(--color-primary-dark);
    padding: 6px 8px; border-radius: 6px;
    font-size: 0.9em; border: 1px solid transparent;
}
.pool-option-input {
    background: transparent; border: none; outline: none;
    padding: 2px 4px; color: inherit; font-size: inherit;
    width: auto; min-width: 50px; border-radius: 3px;
}
.pool-option-input:focus { background-color: rgba(255,255,255,0.8); box-shadow: 0 0 0 2px var(--color-secondary); }
.pool-item-actions { display: flex; gap: 4px; margin-left: 5px; }
.btn-action-small { background: none; border: none; padding: 2px; cursor: pointer; color: inherit; opacity: 0.7; display: inline-flex;}
.btn-action-small:hover:not(:disabled) { opacity: 1; color: var(--color-primary); }
.btn-delete-small { background: none; border: none; color: inherit; cursor: pointer; padding: 2px; display: inline-flex; opacity: 0.7;}
.btn-delete-small:hover:not(:disabled) { opacity: 1; color: var(--color-danger-red); }
.empty-list-message { width: 100%; text-align: center; font-size: 0.9em; color: #999; font-style: italic; padding: 10px 0; }

.correct-sequence-list {
    border: 1px solid var(--color-secondary-light, #d1d8f8);
    border-radius: var(--spacing-border-radius-small);
    padding: 10px;
    min-height: 50px;
    background-color: var(--color-bg-light);
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.sequence-item {
    display: flex;
    align-items: center;
    background-color: #e9ecef;
    padding: 8px 12px;
    border-radius: var(--spacing-border-radius-small);
    font-size: 0.95em;
    color: var(--color-text-dark);
}
.sequence-item > span:first-child {
    margin-right: 8px;
    color: var(--color-text-muted);
    font-weight: 500;
}
.sequence-word-text {
    flex-grow: 1;
    word-break: break-word;
}
.sequence-item-controls {
    margin-left: auto;
    display: flex;
    gap: 6px;
}
.sequence-item-controls .btn-action-small:hover:not(:disabled),
.sequence-item-controls .btn-delete-small:hover:not(:disabled) {
    background-color: rgba(var(--color-text-muted-rgb, 85,85,85), 0.1);
    border-radius: 50%;
}
</style>
