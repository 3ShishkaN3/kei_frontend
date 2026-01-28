<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { AiConversationTestModel } from "../../../../models/testTypes.js";
    import { addNotification } from "../../../../stores/notifications.js";
    import { API_BASE_URL } from "../../../../config.js";
    import { fetchAllDictionarySections } from "../../../../api/dictionaryApi.js";
    import { apiFetch } from "../../../../api/api.js";
    import ImagePlusOutline from "svelte-material-icons/ImagePlusOutline.svelte";
    import CloseCircle from "svelte-material-icons/CloseCircle.svelte";
    import { fade } from "svelte/transition";
    import Cropper from "svelte-easy-crop";
    import AspectRatioIcon from "svelte-material-icons/AspectRatio.svelte";

    export let testData;
    export let isEditing = false;
    export let isLoading = false;

    const dispatch = createEventDispatcher();

    let localTestModel = new AiConversationTestModel({
        title: "",
        test_type: "ai-conversation",
        ai_conversation_question: {
            context: "",
            personality: "",
            goodbye_condition: "",
            background_image: null,
        },
    });

    let attachedBgFile = null;
    let currentServerBgId = null;
    let bgPreviewUrl = null;

    let imagePreviewUrlForCropper = null;
    let showImageCropper = false;
    let imageCrop = { x: 0, y: 0 };
    let imageZoom = 1;
    let imageCroppedAreaPixels = null;
    let imageAspectRatio = 16 / 9;

    // Словари
    let availableDictionaries = [];
    let selectedDictionaryIds = [];
    let isLoadingDictionaries = false;

    function initializeModel(currentTestData) {
        if (!currentTestData) {
            localTestModel = new AiConversationTestModel({
                title: "",
                test_type: "ai-conversation",
                ai_conversation_question: {
                    context: "",
                    personality: "",
                    goodbye_condition: "",
                    background_image: null,
                },
            });
            attachedBgFile = null;
            currentServerBgId = null;
            bgPreviewUrl = null;
            imagePreviewUrlForCropper = null;
            showImageCropper = false;
            imageCrop = { x: 0, y: 0 };
            imageZoom = 1;
            imageCroppedAreaPixels = null;
        } else {
            if (!currentTestData.ai_conversation_question) {
                currentTestData.ai_conversation_question = {
                    context: "",
                    personality: "",
                    goodbye_condition: "",
                    background_image: null,
                };
            }
            localTestModel = new AiConversationTestModel(currentTestData);

            const bg = currentTestData.ai_conversation_question;
            const rawBg = bg.background_image ?? bg.background_image_details;
            currentServerBgId = typeof rawBg === "number" ? rawBg : (rawBg?.id ?? null);

            if (
                currentTestData.ai_conversation_question
                    .background_image_details?.image
            ) {
                bgPreviewUrl =
                    currentTestData.ai_conversation_question
                        .background_image_details.image;
                if (!bgPreviewUrl.startsWith("http"))
                    bgPreviewUrl = API_BASE_URL + bgPreviewUrl;
            }
            imagePreviewUrlForCropper = null;
            showImageCropper = false;
            attachedBgFile = null;

            if (localTestModel?.ai_conversation_question?.dictionaries) {
                selectedDictionaryIds = localTestModel.ai_conversation_question.dictionaries;
            } else if (localTestModel?.ai_conversation_question?.dictionaries_details) {
                selectedDictionaryIds = localTestModel.ai_conversation_question.dictionaries_details.map(d => d.id);
            } else {
                selectedDictionaryIds = [];
            }
        }
    }

    onMount(async () => {
        initializeModel(testData);
        await loadDictionaries();
        if (localTestModel?.ai_conversation_question?.dictionaries) {
            selectedDictionaryIds = localTestModel.ai_conversation_question.dictionaries;
        } else if (localTestModel?.ai_conversation_question?.dictionaries_details) {
            selectedDictionaryIds = localTestModel.ai_conversation_question.dictionaries_details.map(d => d.id);
        }
    });

    async function loadDictionaries() {
        isLoadingDictionaries = true;
        try {
            const dictionaries = await fetchAllDictionarySections();
            availableDictionaries = dictionaries.map(dict => ({
                id: dict.id,
                title: dict.title,
                course_id: dict.course_id,
                course_title: dict.course?.title || 'Неизвестный курс',
                display_name: `${dict.course?.title || 'Неизвестный курс'} - ${dict.title}`
            }));
            
            if (localTestModel?.ai_conversation_question?.dictionaries) {
                selectedDictionaryIds = localTestModel.ai_conversation_question.dictionaries;
            } else if (localTestModel?.ai_conversation_question?.dictionaries_details) {
                selectedDictionaryIds = localTestModel.ai_conversation_question.dictionaries_details.map(d => d.id);
            }
        } catch (error) {
            console.error("Error loading dictionaries:", error);
            addNotification("Ошибка загрузки словарей", "error");
        } finally {
            isLoadingDictionaries = false;
        }
    }

    function handleDictionaryChange(event) {
        const selectedOptions = Array.from(event.target.selectedOptions);
        selectedDictionaryIds = selectedOptions.map(option => parseInt(option.value));
        if (localTestModel?.ai_conversation_question) {
            localTestModel.ai_conversation_question.dictionaries = selectedDictionaryIds;
        }
    }

    let currentId = testData?.id;

    $: if (testData && testData.id !== currentId) {
        currentId = testData.id;
        initializeModel(testData);
    }

    function handleBgFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            attachedBgFile = file;
            currentServerBgId = null;
            if (
                imagePreviewUrlForCropper &&
                imagePreviewUrlForCropper.startsWith("blob:")
            )
                URL.revokeObjectURL(imagePreviewUrlForCropper);
            imagePreviewUrlForCropper = URL.createObjectURL(file);
            showImageCropper = true;
            imageCrop = { x: 0, y: 0 };
            imageZoom = 1;
            imageCroppedAreaPixels = null;
        }
        event.target.value = null;
    }

    function onCropComplete(e) {
        imageCroppedAreaPixels = e.detail.pixels;
    }

    async function getCroppedImage(imageSrc, pixelCrop) {
        if (!pixelCrop || pixelCrop.width === 0 || pixelCrop.height === 0) {
            return attachedBgFile;
        }
        const image = new Image();
        image.src = imageSrc;
        try {
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });
        } catch (error) {
            addNotification(
                "Ошибка загрузки изображения для обрезки.",
                "error",
            );
            return null;
        }
        const canvas = document.createElement("canvas");
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height,
        );
        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(null);
                        return;
                    }
                    resolve(
                        new File(
                            [blob],
                            attachedBgFile?.name || "bg-cropped.png",
                            {
                                type: blob.type || "image/png",
                            },
                        ),
                    );
                },
                attachedBgFile?.type || "image/png",
                0.9,
            );
        });
    }

    function removeAttachedBg() {
        attachedBgFile = null;
        if (
            imagePreviewUrlForCropper &&
            imagePreviewUrlForCropper.startsWith("blob:")
        )
            URL.revokeObjectURL(imagePreviewUrlForCropper);
        imagePreviewUrlForCropper = null;
        bgPreviewUrl = null;
        currentServerBgId = null;
        showImageCropper = false;
        if (localTestModel.ai_conversation_question) {
            localTestModel.ai_conversation_question.background_image = null;
        }
    }

    function validateTest() {
        if (!localTestModel) return false;
        if (!localTestModel.title.trim()) {
            addNotification("Введите название теста.", "error");
            return false;
        }
        if (!localTestModel.ai_conversation_question.context.trim()) {
            addNotification("Укажите контекст разговора.", "error");
            return false;
        }
        return true;
    }

    async function handleSave() {
        if (!localTestModel || !validateTest()) return;

        let finalCroppedFile = null;
        if (attachedBgFile && showImageCropper && imagePreviewUrlForCropper) {
            if (imageCroppedAreaPixels) {
                finalCroppedFile = await getCroppedImage(
                    imagePreviewUrlForCropper,
                    imageCroppedAreaPixels,
                );
            } else {
                finalCroppedFile = attachedBgFile;
            }
        }

        const testDefinition = localTestModel.toPayload();
        testDefinition.ai_conversation_question.background_image = finalCroppedFile
            ? null
            : currentServerBgId;

        if (finalCroppedFile) {
            const formData = new FormData();
            formData.append("test_definition", JSON.stringify(testDefinition));
            formData.append("ai_background_image", finalCroppedFile);
            dispatch("save", formData);
        } else {
            dispatch("save", testDefinition);
        }
    }
</script>

<div class="item-form ai-conversation-form">
    {#if localTestModel}
        <div class="form-group">
            <label for="ai-test-title">Название теста</label>
            <input
                type="text"
                id="ai-test-title"
                bind:value={localTestModel.title}
                placeholder="Например: Разговор в кафе"
                disabled={isLoading}
            />
        </div>

        <div class="form-group">
            <label for="ai-test-description">Описание/Инструкция</label>
            <textarea
                id="ai-test-description"
                bind:value={localTestModel.description}
                rows="3"
                placeholder="Инструкция для студента..."
                disabled={isLoading}
            ></textarea>
        </div>

        <div class="form-section">
            <h4>Настройки AI Собеседника</h4>

            <div class="form-group">
                <label for="ai-context"
                    >Контекст разговора <span class="required">*</span></label
                >
                <textarea
                    id="ai-context"
                    bind:value={localTestModel.ai_conversation_question.context}
                    rows="4"
                    placeholder="Опишите ситуацию: кто собеседник, где происходит действие, о чем разговор..."
                    disabled={isLoading}
                ></textarea>
                <small class="hint"
                    >Это главный промпт для настройки сцены.</small
                >
            </div>

            <div class="form-group">
                <label for="ai-personality"
                    >Личность/Характер (опционально)</label
                >
                <textarea
                    id="ai-personality"
                    bind:value={
                        localTestModel.ai_conversation_question.personality
                    }
                    rows="2"
                    placeholder="Например: Дружелюбная, вежливая, использует сленг..."
                    disabled={isLoading}
                ></textarea>
            </div>

            <div class="form-group">
                <label for="ai-goodbye">Условие завершения (опционально)</label>
                <input
                    type="text"
                    id="ai-goodbye"
                    bind:value={
                        localTestModel.ai_conversation_question
                            .goodbye_condition
                    }
                    placeholder="Например: Когда студент попрощается или договорится о встрече"
                    disabled={isLoading}
                />
            </div>

            <div class="form-group">
                <label for="ai-dictionaries">Словари (опционально)</label>
                <select
                    id="ai-dictionaries"
                    multiple
                    size="5"
                    on:change={handleDictionaryChange}
                    disabled={isLoading || isLoadingDictionaries}
                    class="dictionaries-select"
                >
                    {#if isLoadingDictionaries}
                        <option disabled>Загрузка словарей...</option>
                    {:else if availableDictionaries.length === 0}
                        <option disabled>Нет доступных словарей</option>
                    {:else}
                        {#each availableDictionaries as dict (dict.id)}
                            <option value={dict.id} selected={selectedDictionaryIds.includes(dict.id)}>
                                {dict.display_name}
                            </option>
                        {/each}
                    {/if}
                </select>
                <small class="hint"
                    >Выберите словари, слова из которых будут использоваться в разговоре. 
                    Удерживайте Ctrl (Cmd на Mac) для выбора нескольких.</small
                >
            </div>

            <div class="form-group attachment-control">
                <label for="ai-bg-upload">Фоновое изображение (локация)</label>

                {#if showImageCropper && imagePreviewUrlForCropper}
                    <div class="cropper-wrapper-test">
                        <Cropper
                            image={imagePreviewUrlForCropper}
                            bind:crop={imageCrop}
                            bind:zoom={imageZoom}
                            aspect={imageAspectRatio}
                            on:cropcomplete={onCropComplete}
                        />
                    </div>
                    <div class="attachment-actions">
                        <div class="control-group-inline">
                            <label for="ai-zoom-slider"
                                >Масштаб: {imageZoom.toFixed(1)}x</label
                            >
                            <input
                                type="range"
                                id="ai-zoom-slider"
                                bind:value={imageZoom}
                                min="1"
                                max="3"
                                step="0.1"
                                class="zoom-slider"
                            />
                        </div>
                        <div class="action-buttons">
                            <button
                                type="button"
                                class="btn-action-small danger"
                                on:click={removeAttachedBg}
                                >Удалить</button
                            >
                        </div>
                    </div>
                {:else if currentServerBgId || bgPreviewUrl}
                    <div class="image-preview-wrapper">
                        <img
                            src={bgPreviewUrl}
                            alt="Background Preview"
                            class="attached-image-preview"
                        />
                        <button
                            type="button"
                            class="remove-attachment-btn"
                            on:click={removeAttachedBg}
                            title="Удалить фон"
                        >
                            <CloseCircle size="20px" />
                        </button>
                    </div>
                {/if}

                {#if !showImageCropper}
                    <label
                        class="file-upload-label main-upload-trigger"
                        for="ai-bg-upload"
                    >
                        <ImagePlusOutline size="24px" />
                        <span
                            >{currentServerBgId || bgPreviewUrl
                                ? "Заменить фон"
                                : "Загрузить фон"}</span
                        >
                    </label>
                    <input
                        type="file"
                        id="ai-bg-upload"
                        class="visually-hidden"
                        accept="image/*"
                        on:change={handleBgFileChange}
                        disabled={isLoading}
                    />
                {/if}
            </div>
        </div>

        <div class="form-actions">
            <button
                type="submit"
                class="btn-save"
                on:click|preventDefault={handleSave}
                disabled={isLoading}
            >
                {isLoading
                    ? "Сохранение..."
                    : isEditing
                      ? "Обновить настройки"
                      : "Создать тест"}
            </button>
            <button
                type="button"
                class="btn-cancel"
                on:click={() => dispatch("cancel")}
                disabled={isLoading}>Отмена</button
            >
        </div>
    {:else}
        <div class="loading">Загрузка...</div>
    {/if}
</div>

<style>
    .cropper-wrapper-test {
        position: relative;
        width: 100%;
        height: 300px;
        background: #333;
        margin-bottom: 10px;
        border-radius: var(--spacing-border-radius-small);
        overflow: hidden;
    }
    .attachment-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f9f9f9;
        padding: 10px;
        border-radius: var(--spacing-border-radius-small);
        margin-bottom: 15px;
        border: 1px solid var(--color-border-light);
    }
    .control-group-inline {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
    }
    .control-group-inline label {
        font-size: 0.8rem;
        margin-bottom: 0;
        white-space: nowrap;
    }
    .action-buttons {
        display: flex;
        gap: 8px;
    }
    .btn-action-small {
        padding: 5px 12px;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text-muted);
        display: flex;
        align-items: center;
        gap: 5px;
    }
    .zoom-slider {
        width: 100%;
        height: 6px;
        -webkit-appearance: none;
        appearance: none;
        background: #ddd;
        border-radius: 3px;
        outline: none;
    }
    .zoom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        background: var(--color-primary);
        border-radius: 50%;
        cursor: pointer;
    }

    .item-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
    .form-group {
        display: flex;
        flex-direction: column;
        margin-bottom: 15px;
    }
    .form-group label {
        font-weight: 500;
        margin-bottom: 5px;
        color: var(--color-text-dark);
    }
    .form-group input[type="text"],
    .form-group textarea,
    .form-group select {
        padding: 10px;
        border: 1px solid var(--color-border-light);
        border-radius: var(--spacing-border-radius-small);
        font-family: inherit;
    }
    .dictionaries-select {
        min-height: 120px;
        padding: 8px;
    }
    .dictionaries-select option {
        padding: 6px 8px;
    }
    .form-section {
        background: var(--color-bg-ultra-light);
        padding: 15px;
        border-radius: var(--spacing-border-radius-small);
        border: 1px solid var(--color-border-light);
    }
    .form-section h4 {
        margin-top: 0;
        margin-bottom: 15px;
        color: var(--color-primary);
    }
    .required {
        color: var(--color-danger-red);
    }
    .hint {
        font-size: 0.85em;
        color: var(--color-text-muted);
        margin-top: 4px;
    }

    .file-upload-label {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border: 2px dashed var(--color-border-admin-button);
        border-radius: var(--spacing-border-radius-small);
        cursor: pointer;
        color: var(--color-secondary);
        text-align: center;
        justify-content: center;
        transition: all 0.2s;
    }
    .file-upload-label:hover {
        background: rgba(var(--color-primary-rgb), 0.05);
        border-color: var(--color-primary);
    }
    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
    }

    .image-preview-wrapper {
        position: relative;
        margin-bottom: 10px;
        max-width: 300px;
    }
    .attached-image-preview {
        width: 100%;
        border-radius: var(--spacing-border-radius-small);
        border: 1px solid var(--color-border-light);
    }
    .remove-attachment-btn {
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(255, 255, 255, 0.8);
        border: none;
        border-radius: 50%;
        cursor: pointer;
        color: var(--color-danger-red);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 10px;
    }
    .btn-save {
        background: var(--color-primary);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: var(--spacing-border-radius-button);
        cursor: pointer;
    }
    .btn-save:hover:not(:disabled) {
        background: var(--color-primary-dark);
    }
    .btn-cancel {
        background: #f8f9fa;
        border: 1px solid #ddd;
        padding: 10px 20px;
        border-radius: var(--spacing-border-radius-button);
        cursor: pointer;
    }
</style>
