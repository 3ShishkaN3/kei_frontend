<script>
    import { createEventDispatcher, onMount, onDestroy, tick } from "svelte";
    import {
        MCQTestModel,
        MCQOptionModel,
    } from "../../../../models/testTypes.js";
    import { addNotification } from "../../../../stores/notifications.js";
    import { fade } from "svelte/transition";
    import Cropper from "svelte-easy-crop";
    import { API_BASE_URL } from "../../../../config.js";
    import { nanoid } from "nanoid";

    import PlusCircleOutline from "svelte-material-icons/PlusCircleOutline.svelte";
    import DeleteOutline from "svelte-material-icons/DeleteOutline.svelte";
    import ImagePlusOutline from "svelte-material-icons/ImagePlusOutline.svelte";
    import MusicNotePlus from "svelte-material-icons/MusicNotePlus.svelte";
    import CloseCircle from "svelte-material-icons/CloseCircle.svelte";
    import CheckboxMarked from "svelte-material-icons/CheckboxMarked.svelte";
    import CheckboxBlankOutline from "svelte-material-icons/CheckboxBlankOutline.svelte";
    import AspectRatioIcon from "svelte-material-icons/AspectRatio.svelte";

    export let testData;
    export let isEditing = false;
    export let isLoading = false;

    const dispatch = createEventDispatcher();

    let localTestModel = new MCQTestModel({
        title: "",
        test_type: "mcq-single",
        mcq_options: [],
    });
    let isMultiSelect = false;

    let attachedImageFile = null;
    let imagePreviewUrlForCropper = null;
    let showImageCropper = false;
    let imageCrop = { x: 0, y: 0 };
    let imageZoom = 1;
    let imageCroppedAreaPixels = null;
    let currentServerImageId = null;
    let currentServerImageUrl = null;

    let imageAspectRatio = undefined;
    const aspectRatios = [
        { label: "Своб.", value: undefined },
        { label: "1:1", value: 1 / 1 },
        { label: "16:9", value: 16 / 9 },
        { label: "4:3", value: 4 / 3 },
        { label: "3:4", value: 3 / 4 },
    ];

    let attachedAudioFile = null;
    let audioFileName = null;
    let currentServerAudioId = null;
    let currentServerAudioUrl = null;

    function generateTemporaryId() {
        return `temp_${nanoid(8)}`;
    }

    function initializeModel(currentTestData) {
        if (!currentTestData) {
            localTestModel = new MCQTestModel({
                title: "",
                test_type: "mcq-single",
                mcq_options: [],
            });
        } else {
            const optionsCopy = currentTestData.mcq_options
                ? currentTestData.mcq_options.map(
                      (opt) =>
                          new MCQOptionModel({
                              ...opt,
                              id:
                                  opt.id && typeof opt.id !== "symbol"
                                      ? opt.id
                                      : generateTemporaryId(),
                          }),
                  )
                : [];
            localTestModel = new MCQTestModel({
                ...currentTestData,
                mcq_options: optionsCopy,
            });
        }

        isMultiSelect = localTestModel.test_type === "mcq-multi";

        currentServerImageId = currentTestData?.attached_image || null;
        currentServerImageUrl =
            currentTestData?.attached_image_details?.image || null;
        if (currentServerImageUrl && !attachedImageFile) {
            imagePreviewUrlForCropper = currentServerImageUrl.startsWith("http")
                ? currentServerImageUrl
                : API_BASE_URL + currentServerImageUrl;
            showImageCropper = true;
        } else if (!attachedImageFile) {
            imagePreviewUrlForCropper = null;
            showImageCropper = false;
        }

        const arFromData = currentTestData?.aspect_ratio_for_test_image;
        const foundAr = aspectRatios.find((ar) => ar.value === arFromData);
        imageAspectRatio = foundAr ? foundAr.value : null;

        currentServerAudioId = currentTestData?.attached_audio || null;
        currentServerAudioUrl =
            currentTestData?.attached_audio_details?.audio_file || null;
        if (currentServerAudioUrl && !attachedAudioFile) {
            const name = currentServerAudioUrl.substring(
                currentServerAudioUrl.lastIndexOf("/") + 1,
            );
            try {
                audioFileName = decodeURIComponent(name);
            } catch (e) {
                audioFileName = name;
            }
        } else if (!attachedAudioFile) {
            audioFileName = null;
        }

        if (
            (!localTestModel.mcq_options ||
                localTestModel.mcq_options.length === 0) &&
            currentTestData?.title !== undefined
        ) {
            addOptionInternal(true);
            addOptionInternal(false);
        }
        localTestModel = localTestModel;
    }

    onMount(() => {
        initializeModel(testData);
    });

    let prevTestDataString = null;
    $: if (testData) {
        const currentTestDataString = JSON.stringify({
            title: testData.title,
            description: testData.description,
            test_type: testData.test_type,
            attached_image: testData.attached_image,
            attached_audio: testData.attached_audio,
            mcq_options_count: testData.mcq_options?.length,
        });
        if (currentTestDataString !== prevTestDataString) {
            initializeModel(testData);
            prevTestDataString = currentTestDataString;
        }
    }

    function addOptionInternal(isCorrect = false) {
        if (!localTestModel) return;
        const newOrder = localTestModel.mcq_options.length;
        let actualCorrect = isCorrect;
        if (!isMultiSelect && isCorrect) {
            localTestModel.mcq_options.forEach(
                (opt) => (opt.is_correct = false),
            );
        }
        localTestModel.addOption({
            text: "",
            is_correct: actualCorrect,
            explanation: "",
            order: newOrder,
            id: generateTemporaryId(),
        });
    }
    function handleAddOptionClick() {
        addOptionInternal(false);
        localTestModel = localTestModel;
    }

    function removeOption(index) {
        if (!localTestModel || localTestModel.mcq_options.length <= 1) {
            addNotification(
                "Тест должен иметь хотя бы одну опцию ответа.",
                "warning",
            );
            return;
        }
        localTestModel.removeOption(index);
        localTestModel.mcq_options.forEach((opt, i) => (opt.order = i));
        localTestModel = localTestModel;
    }

    function handleOptionCorrectChange(selectedIndex) {
        if (!localTestModel) return;
        if (!isMultiSelect) {
            localTestModel.mcq_options.forEach((option, index) => {
                option.is_correct = index === selectedIndex;
            });
        } else {
            localTestModel.mcq_options[selectedIndex].is_correct =
                !localTestModel.mcq_options[selectedIndex].is_correct;
        }
        localTestModel = localTestModel;
    }

    function handleImageFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            attachedImageFile = file;
            currentServerImageId = null;
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
    function onImageTestCropComplete(e) {
        imageCroppedAreaPixels = e.detail.pixels;
    }

    async function getCroppedTestImage(imageSrc, pixelCrop) {
        if (!pixelCrop || pixelCrop.width === 0 || pixelCrop.height === 0) {
            return attachedImageFile || null;
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
                "Ошибка загрузки изображения для обрезки в тесте.",
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
                            attachedImageFile?.name || "test-cropped-image.png",
                            { type: blob.type || "image/png" },
                        ),
                    );
                },
                attachedImageFile?.type || "image/png",
                0.9,
            );
        });
    }

    function removeAttachedImage() {
        attachedImageFile = null;
        if (
            imagePreviewUrlForCropper &&
            imagePreviewUrlForCropper.startsWith("blob:")
        )
            URL.revokeObjectURL(imagePreviewUrlForCropper);
        imagePreviewUrlForCropper = null;
        showImageCropper = false;
        currentServerImageId = null;
        imageCroppedAreaPixels = null;
    }

    function handleAudioFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            attachedAudioFile = file;
            currentServerAudioId = null;
            audioFileName = file.name;
        }
        event.target.value = null;
    }
    function removeAttachedAudio() {
        attachedAudioFile = null;
        audioFileName = null;
        currentServerAudioId = null;
    }

    function validateTest() {
        if (!localTestModel) return false;
        if (!localTestModel.title.trim()) {
            addNotification("Введите название теста.", "error");
            return false;
        }
        if (
            !localTestModel.mcq_options ||
            localTestModel.mcq_options.length === 0
        ) {
            addNotification(
                "Тест должен содержать хотя бы одну опцию ответа.",
                "error",
            );
            return false;
        }
        if (localTestModel.mcq_options.some((opt) => !opt.text.trim())) {
            addNotification(
                "Все опции ответа должны содержать текст.",
                "error",
            );
            return false;
        }
        if (
            !isMultiSelect &&
            !localTestModel.mcq_options.some((opt) => opt.is_correct)
        ) {
            addNotification(
                "Для теста с одним вариантом ответа должен быть выбран правильный ответ.",
                "error",
            );
            return false;
        }
        return true;
    }

    async function handleSave() {
        if (!localTestModel || !validateTest()) return;

        localTestModel.test_type = isMultiSelect ? "mcq-multi" : "mcq-single";
        let finalCroppedImageFile = null;

        if (attachedImageFile && showImageCropper) {
            if (
                imageCroppedAreaPixels &&
                imageCroppedAreaPixels.width > 0 &&
                imageCroppedAreaPixels.height > 0
            ) {
                finalCroppedImageFile = await getCroppedTestImage(
                    imagePreviewUrlForCropper,
                    imageCroppedAreaPixels,
                );
            } else {
                finalCroppedImageFile = attachedImageFile;
            }
        }

        const testDefinition = {
            title: localTestModel.title,
            description: localTestModel.description,
            test_type: localTestModel.test_type,
            mcq_options: localTestModel.mcq_options.map((opt) => {
                const payloadOpt = opt.toPayload();
                if (
                    typeof payloadOpt.id === "string" &&
                    payloadOpt.id.startsWith("temp_")
                ) {
                    delete payloadOpt.id;
                }
                return payloadOpt;
            }),
            attached_image: finalCroppedImageFile ? null : currentServerImageId,
            attached_audio: attachedAudioFile ? null : currentServerAudioId,
            // aspect_ratio_for_test_image: imageAspectRatio,
        };

        if (finalCroppedImageFile || attachedAudioFile) {
            const formData = new FormData();
            formData.append("test_definition", JSON.stringify(testDefinition));
            if (finalCroppedImageFile) {
                formData.append("attached_image_file", finalCroppedImageFile);
            }
            if (attachedAudioFile) {
                formData.append("attached_audio_file", attachedAudioFile);
            }
            dispatch("save", formData);
        } else {
            dispatch("save", testDefinition);
        }
    }

    onDestroy(() => {
        if (
            imagePreviewUrlForCropper &&
            imagePreviewUrlForCropper.startsWith("blob:")
        ) {
            URL.revokeObjectURL(imagePreviewUrlForCropper);
        }
    });
</script>

<div class="item-form mcq-test-form">
    {#if localTestModel}
        <div class="form-group">
            <label
                for={"mcq-test-title-" +
                    (localTestModel.id && typeof localTestModel.id !== "symbol"
                        ? localTestModel.id
                        : "new")}>Название теста</label
            >
            <input
                type="text"
                id={"mcq-test-title-" +
                    (localTestModel.id && typeof localTestModel.id !== "symbol"
                        ? localTestModel.id
                        : "new")}
                bind:value={localTestModel.title}
                placeholder="Введите название теста"
                disabled={isLoading}
            />
        </div>

        <div class="form-group">
            <label
                for={"mcq-test-description-" +
                    (localTestModel.id && typeof localTestModel.id !== "symbol"
                        ? localTestModel.id
                        : "new")}>Описание/Инструкция</label
            >
            <textarea
                id={"mcq-test-description-" +
                    (localTestModel.id && typeof localTestModel.id !== "symbol"
                        ? localTestModel.id
                        : "new")}
                bind:value={localTestModel.description}
                rows="3"
                placeholder="Описание или инструкция (необязательно)"
                disabled={isLoading}
            ></textarea>
        </div>

        <div class="form-group form-group-custom-checkbox">
            <input
                type="checkbox"
                id={"mcq-is-multi-" +
                    (localTestModel.id && typeof localTestModel.id !== "symbol"
                        ? localTestModel.id
                        : "new")}
                class="custom-checkbox-input"
                bind:checked={isMultiSelect}
                disabled={isLoading}
            />
            <label
                for={"mcq-is-multi-" +
                    (localTestModel.id && typeof localTestModel.id !== "symbol"
                        ? localTestModel.id
                        : "new")}
                class="custom-checkbox-label"
            >
                <span class="checkbox-visual">
                    {#if isMultiSelect}
                        <CheckboxMarked size="18px" />
                    {:else}
                        <CheckboxBlankOutline size="18px" />
                    {/if}
                </span>
                Разрешить несколько правильных ответов
            </label>
        </div>

        <div class="attachments-section">
            <h4 class="attachments-header">Прикрепленные материалы к тесту:</h4>
            <div class="form-row">
                <div class="form-group attachment-control">
                    <label
                        for={"mcq-image-upload-input-" +
                            (localTestModel.id &&
                            typeof localTestModel.id !== "symbol"
                                ? localTestModel.id
                                : "new")}>Изображение к тесту</label
                    >
                    {#if showImageCropper && imagePreviewUrlForCropper}
                        <div class="cropper-wrapper-test">
                            <Cropper
                                image={imagePreviewUrlForCropper}
                                bind:crop={imageCrop}
                                bind:zoom={imageZoom}
                                aspect={imageAspectRatio}
                                on:cropcomplete={onImageTestCropComplete}
                                cropShape="rect"
                                showGrid={true}
                                minZoom={1}
                                maxZoom={5}
                            />
                        </div>
                        <div class="zoom-slider-container">
                            <span>Масштаб:</span>
                            <input
                                type="range"
                                bind:value={imageZoom}
                                min="1"
                                max="5"
                                step="0.1"
                                class="zoom-slider"
                            />
                        </div>
                        <div class="attachment-actions">
                            <div class="aspect-ratio-controls">
                                <span title="Соотношение сторон"
                                    ><AspectRatioIcon size="18px" /></span
                                >
                                {#each aspectRatios as ar}
                                    <button
                                        type="button"
                                        class="aspect-btn"
                                        class:active={imageAspectRatio ===
                                            ar.value}
                                        on:click={() =>
                                            (imageAspectRatio = ar.value)}
                                        title={ar.label}>{ar.label}</button
                                    >
                                {/each}
                            </div>
                            <label
                                class="file-upload-label small"
                                for={"mcq-image-upload-replace-" +
                                    (localTestModel.id &&
                                    typeof localTestModel.id !== "symbol"
                                        ? localTestModel.id
                                        : "new")}
                            >
                                <ImagePlusOutline size="18px" />
                                <span>Заменить</span>
                            </label>
                            <input
                                type="file"
                                id={"mcq-image-upload-replace-" +
                                    (localTestModel.id &&
                                    typeof localTestModel.id !== "symbol"
                                        ? localTestModel.id
                                        : "new")}
                                class="visually-hidden"
                                accept="image/*"
                                on:change={handleImageFileChange}
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                class="remove-attachment-btn small"
                                on:click={removeAttachedImage}
                                title="Удалить изображение"
                            >
                                <CloseCircle size="18px" />
                            </button>
                        </div>
                    {:else}
                        <label
                            class="file-upload-label main-upload-trigger"
                            for={"mcq-image-upload-input-" +
                                (localTestModel.id &&
                                typeof localTestModel.id !== "symbol"
                                    ? localTestModel.id
                                    : "new")}
                        >
                            <ImagePlusOutline size="24px" />
                            <span>Загрузить изображение</span>
                        </label>
                        <input
                            type="file"
                            id={"mcq-image-upload-input-" +
                                (localTestModel.id &&
                                typeof localTestModel.id !== "symbol"
                                    ? localTestModel.id
                                    : "new")}
                            class="visually-hidden"
                            accept="image/*"
                            on:change={handleImageFileChange}
                            disabled={isLoading}
                        />
                    {/if}
                    {#if currentServerImageId && !showImageCropper && !attachedImageFile}
                        <small class="form-hint removed-hint"
                            >Изображение (ID: {currentServerImageId}) будет
                            удалено при сохранении.</small
                        >
                    {/if}
                </div>

                <div class="form-group attachment-control">
                    <label
                        for={"mcq-audio-upload-input-" +
                            (localTestModel.id &&
                            typeof localTestModel.id !== "symbol"
                                ? localTestModel.id
                                : "new")}>Аудио к тесту</label
                    >
                    {#if audioFileName}
                        <div class="audio-filename-display">
                            <span>{audioFileName}</span>
                            <button
                                type="button"
                                class="remove-attachment-btn small"
                                on:click={removeAttachedAudio}
                                title="Удалить аудио"
                            >
                                <CloseCircle size="18px" />
                            </button>
                        </div>
                    {/if}
                    <label
                        class="file-upload-label main-upload-trigger"
                        class:hidden={!!audioFileName}
                        for={"mcq-audio-upload-input-" +
                            (localTestModel.id &&
                            typeof localTestModel.id !== "symbol"
                                ? localTestModel.id
                                : "new")}
                    >
                        <MusicNotePlus size="24px" />
                        <span
                            >{currentServerAudioId
                                ? `Текущее ID: ${currentServerAudioId}. Загрузить новый для замены.`
                                : "Загрузить аудио"}</span
                        >
                    </label>
                    <input
                        type="file"
                        id={"mcq-audio-upload-input-" +
                            (localTestModel.id &&
                            typeof localTestModel.id !== "symbol"
                                ? localTestModel.id
                                : "new")}
                        class="visually-hidden"
                        accept="audio/*"
                        on:change={handleAudioFileChange}
                        disabled={isLoading}
                    />
                    {#if currentServerAudioId && !audioFileName && !attachedAudioFile}
                        <small class="form-hint removed-hint"
                            >Аудио (ID: {currentServerAudioId}) будет удалено
                            при сохранении.</small
                        >
                    {/if}
                </div>
            </div>
        </div>

        <h4 class="options-header">Варианты ответа:</h4>
        {#if localTestModel.mcq_options}
            {#each localTestModel.mcq_options as option, index (option.id)}
                <div
                    class="mcq-option-item"
                    transition:fade|local={{ duration: 150 }}
                >
                    <label
                        class="option-correct-toggle-label"
                        title={option.is_correct
                            ? "Отмечен как правильный"
                            : "Отметить как правильный"}
                    >
                        <input
                            type="checkbox"
                            class="custom-checkbox-input"
                            checked={option.is_correct}
                            on:change={() => handleOptionCorrectChange(index)}
                            disabled={isLoading}
                            aria-labelledby={"mcq-option-text-label-" +
                                index +
                                "-" +
                                option.id}
                        />
                        <span class="checkbox-visual large">
                            {#if option.is_correct}
                                <CheckboxMarked size="22px" />
                            {:else}
                                <CheckboxBlankOutline size="22px" />
                            {/if}
                        </span>
                    </label>
                    <div class="option-inputs">
                        <div class="form-group option-text-group">
                            <label
                                for={"mcq-option-text-" +
                                    index +
                                    "-" +
                                    option.id}
                                id={"mcq-option-text-label-" +
                                    index +
                                    "-" +
                                    option.id}>Текст опции #{index + 1}</label
                            >
                            <input
                                type="text"
                                id={"mcq-option-text-" +
                                    index +
                                    "-" +
                                    option.id}
                                bind:value={option.text}
                                placeholder="Текст варианта ответа"
                                disabled={isLoading}
                            />
                        </div>
                        <div class="form-group option-explanation-group">
                            <label
                                for={"mcq-option-explanation-" +
                                    index +
                                    "-" +
                                    option.id}>Пояснение (необязательно)</label
                            >
                            <input
                                type="text"
                                id={"mcq-option-explanation-" +
                                    index +
                                    "-" +
                                    option.id}
                                bind:value={option.explanation}
                                placeholder="Пояснение к варианту"
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                    <button
                        type="button"
                        class="option-delete-btn"
                        on:click={() => removeOption(index)}
                        title="Удалить опцию"
                        disabled={isLoading ||
                            localTestModel.mcq_options.length <= 1}
                    >
                        <DeleteOutline size="20px" />
                    </button>
                </div>
            {/each}
        {/if}

        <button
            type="button"
            class="add-option-btn"
            on:click={handleAddOptionClick}
            disabled={isLoading}
        >
            <PlusCircleOutline size="18px" /> Добавить вариант ответа
        </button>

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
                      ? "Обновить тест"
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
        <div class="form-loading-placeholder">
            <div class="spinner"></div>
            Загрузка формы теста...
        </div>
    {/if}
</div>

<style>
    .item-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
    .form-group {
        display: flex;
        flex-direction: column;
    }
    .form-group
        label:not(.custom-checkbox-label):not(.file-upload-label):not(
            .option-correct-toggle-label
        ) {
        margin-bottom: 7px;
        font-weight: 500;
        color: var(--color-text-muted);
        font-size: 0.9rem;
        display: block;
    }
    .form-group input[type="text"],
    .form-group input[type="number"],
    .form-group textarea {
        padding: 10px 14px;
        border: 1px solid var(--color-border-light, #d8dce6);
        border-radius: var(--spacing-border-radius-small, 8px);
        font-size: 0.95rem;
        transition:
            border-color 0.2s,
            box-shadow 0.2s;
        background-color: var(--color-bg-light, #fff);
    }
    .form-group input:focus,
    .form-group textarea:focus {
        border-color: var(--color-primary, #afa4ff);
        box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 175, 164, 255), 0.2);
        outline: none;
    }
    .form-group textarea {
        line-height: 1.5;
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
        to {
            transform: rotate(360deg);
        }
    }

    .form-group-custom-checkbox {
        display: flex;
        align-items: center;
        margin: 5px 0;
    }
    .custom-checkbox-input {
        opacity: 0;
        position: absolute;
        width: 0;
        height: 0;
    }
    .custom-checkbox-label {
        display: inline-flex;
        align-items: center;
        cursor: pointer;
        font-size: 0.95rem;
        color: var(--color-text-dark);
        user-select: none;
    }
    .checkbox-visual {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        margin-right: 10px;
        border: 2px solid var(--color-border-admin-button, #c5bfff);
        border-radius: var(--spacing-border-radius-small, 6px);
        transition:
            background-color 0.2s,
            border-color 0.2s;
        color: var(--color-primary, #afa4ff);
    }
    .custom-checkbox-input:checked + .custom-checkbox-label .checkbox-visual,
    .custom-checkbox-input:checked ~ .checkbox-visual {
        background-color: var(--color-primary, #afa4ff);
        border-color: var(--color-primary, #afa4ff);
        color: white;
    }
    .custom-checkbox-input:focus + .custom-checkbox-label .checkbox-visual,
    .custom-checkbox-input:focus ~ .checkbox-visual {
        box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 175, 164, 255), 0.3);
    }
    .custom-checkbox-input:disabled + .custom-checkbox-label,
    .custom-checkbox-input:disabled ~ .checkbox-visual {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .attachments-section {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid var(--color-border-light, #eee);
    }
    .attachments-header {
        margin-top: 0;
        margin-bottom: 15px;
        font-size: 1.1em;
        font-weight: var(--font-weight-semi-bold);
        color: var(--color-text-dark);
    }
    .form-row {
        display: flex;
        gap: 20px;
        margin-bottom: 10px;
    }
    .form-row > .form-group {
        flex: 1;
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
        color: var(--color-secondary, #6d7fc9);
        transition:
            background-color 0.2s,
            border-color 0.2s;
    }
    .file-upload-label.hidden {
        display: none;
    }
    .file-upload-label:hover {
        background-color: rgba(var(--color-primary-rgb, 175, 164, 255), 0.05);
        border-color: var(--color-primary, #afa4ff);
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
        height: 200px;
        background: #eef2f7;
        border-radius: var(--spacing-border-radius-small);
        overflow: hidden;
        margin-bottom: 20px;
        border: 1px solid var(--color-border-light);
        contain: content;
        transform: translateZ(0);
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
    .file-upload-label.small {
        padding: 6px 10px;
        font-size: 0.85em;
        border-style: solid;
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
    .image-preview-wrapper {
        position: relative;
        margin-bottom: 10px;
        padding: 5px;
        border: 1px solid var(--color-border-light);
        border-radius: var(--spacing-border-radius-small);
        background-color: var(--color-bg-light);
    }
    .attached-image-preview {
        display: block;
        max-width: 100%;
        max-height: 120px;
        border-radius: 3px;
        object-fit: contain;
        margin: auto;
    }
    .image-preview-wrapper .remove-attachment-btn {
        position: absolute;
        top: 3px;
        right: 3px;
        background-color: rgba(255, 255, 255, 0.7);
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
    .cropper-wrapper-test {
        position: relative;
        width: 100%;
        height: 250px;
        background: #f0f0f0;
        margin-bottom: 12px;
        border-radius: var(--spacing-border-radius-small);
        overflow: hidden;
        border: 1px solid var(--color-border-light);
        contain: content;
        transform: translateZ(0);
    }
    .zoom-slider-container {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 10px;
        margin-bottom: 12px;
        padding: 8px 12px;
        background: #f8faff;
        border-radius: var(--spacing-border-radius-small);
        border: 1px solid var(--color-border-light);
    }
    .zoom-slider-container span {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        white-space: nowrap;
    }
    .zoom-slider {
        flex-grow: 1;
        height: 4px;
        -webkit-appearance: none;
        background: #e0e6ed;
        border-radius: 2px;
        outline: none;
    }
    .zoom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: var(--color-primary);
        cursor: pointer;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    .audio-filename-display span {
        font-size: 0.9em;
        color: var(--color-text-dark);
        word-break: break-all;
    }
    .form-hint {
        font-size: 0.8em;
        color: var(--color-text-muted);
        margin-top: 5px;
    }
    .form-hint.removed-hint {
        color: var(--color-danger-red);
    }

    .options-header {
        margin-top: 20px;
        margin-bottom: 12px;
        font-size: 1.1em;
        font-weight: var(--font-weight-semi-bold);
        color: var(--color-text-dark);
        border-bottom: 1px solid #eee;
        padding-bottom: 8px;
    }
    .mcq-option-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 15px;
        border: 1px solid var(--color-border-light, #e0e0e0);
        border-radius: var(--spacing-border-radius-block, 10px);
        margin-bottom: 12px;
        background-color: #fff;
        transition:
            box-shadow 0.2s,
            border-color 0.2s;
    }
    .mcq-option-item:focus-within,
    .mcq-option-item:hover {
        border-color: var(--color-primary-light, #d1c9ff);
        box-shadow: 0 3px 8px
            rgba(var(--color-primary-rgb, 175, 164, 255), 0.12);
    }
    .option-correct-toggle-label {
        margin-top: 28px;
        display: inline-flex;
        align-items: center;
        cursor: pointer;
    }
    .option-correct-toggle-label .checkbox-visual.large {
        width: 24px;
        height: 24px;
    }
    .option-correct-toggle-label .checkbox-visual.large :global(svg) {
        width: 20px;
        height: 20px;
    }
    .option-inputs {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .option-text-group,
    .option-explanation-group {
        margin-bottom: 0;
    }
    .option-delete-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
        color: var(--color-text-muted);
        margin-left: auto;
        align-self: center;
        transition: color 0.2s;
    }
    .option-delete-btn:hover:not(:disabled) {
        color: var(--color-danger-red);
    }
    .option-delete-btn:disabled {
        color: #ccc;
        cursor: not-allowed;
    }
    .add-option-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 16px;
        font-size: 0.9rem;
        color: var(--color-primary, #afa4ff);
        background-color: transparent;
        border: 1px dashed var(--color-primary, #afa4ff);
        border-radius: var(--spacing-border-radius-button);
        cursor: pointer;
        transition:
            background-color 0.2s,
            color 0.2s,
            border-style 0.2s;
        margin-top: 8px;
    }
    .add-option-btn:hover:not(:disabled) {
        background-color: rgba(var(--color-primary-rgb, 175, 164, 255), 0.1);
        border-style: solid;
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
        .form-row {
            flex-direction: column;
            gap: 15px;
        }
        .mcq-option-item {
            flex-wrap: wrap;
        }
        .option-delete-btn {
            align-self: flex-end;
            margin-top: 5px;
        }
        .option-correct-toggle-label {
            margin-top: 0;
            margin-bottom: 10px;
        }
        .mcq-option-item {
            flex-direction: column;
            align-items: stretch;
        }
        .option-inputs {
            width: 100%;
        }
    }
</style>
