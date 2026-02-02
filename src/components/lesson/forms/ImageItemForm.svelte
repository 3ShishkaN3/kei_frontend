<script>
    import { createEventDispatcher, onMount, onDestroy } from "svelte";
    import { API_BASE_URL } from "../../../config.js";
    import Cropper from "svelte-easy-crop";
    import ImagePlus from "svelte-material-icons/ImagePlus.svelte";
    import Close from "svelte-material-icons/Close.svelte";
    import { addNotification } from "../../../stores/notifications.js";

    export let itemToEdit = null;
    export let isLoading = false;

    const dispatch = createEventDispatcher();

    let title = "";
    let alt_text = "";
    let image_file_original = null;
    let current_image_url_from_server = null;
    let image_for_cropper = null;

    let crop = { x: 0, y: 0 };
    let zoom = 1;
    let currentAspect = undefined;
    let croppedAreaPixels = null;
    let showCropper = false;
    function setAspect(newAspect) {
        currentAspect = newAspect;
    }
    onMount(() => {
        if (itemToEdit && itemToEdit.content_details) {
            title = itemToEdit.content_details.title || "";
            alt_text = itemToEdit.content_details.alt_text || "";
            current_image_url_from_server =
                itemToEdit.content_details.image_url;
            if (current_image_url_from_server) {
                image_for_cropper = current_image_url_from_server.startsWith(
                    "http",
                )
                    ? current_image_url_from_server
                    : `${API_BASE_URL}${current_image_url_from_server}`;
                showCropper = true;
            }
        }
    });

    function handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            image_file_original = file;
            if (image_for_cropper && image_for_cropper.startsWith("blob:")) {
                URL.revokeObjectURL(image_for_cropper);
            }
            image_for_cropper = URL.createObjectURL(file);
            showCropper = true;
            crop = { x: 0, y: 0 };
            zoom = 1;
            croppedAreaPixels = null;
        }
    }

    function onCropComplete(event) {
        croppedAreaPixels = event.detail.pixels;
    }

    async function getCroppedImg(imageSrc, pixelCrop) {
        if (!pixelCrop || pixelCrop.width === 0 || pixelCrop.height === 0) {
            console.warn(
                "Invalid or no crop data, using original file if available.",
            );
            return image_file_original || null;
        }

        const image = new Image();
        image.src = imageSrc;
        try {
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = (err) => {
                    console.error("Image loading error for cropping:", err);
                    reject(err);
                };
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
                        console.error("Canvas to Blob conversion failed");
                        resolve(null);
                        return;
                    }
                    resolve(
                        new File(
                            [blob],
                            image_file_original?.name || "cropped-image.png",
                            { type: blob.type || "image/png" },
                        ),
                    );
                },
                image_file_original?.type || "image/png",
                0.9,
            );
        });
    }

    async function handleSubmit() {
        let finalImageFileToSend = null;

        if (image_file_original && showCropper) {
            if (croppedAreaPixels) {
                finalImageFileToSend = await getCroppedImg(
                    image_for_cropper,
                    croppedAreaPixels,
                );
            } else {
                finalImageFileToSend = image_file_original;
            }
        } else if (image_file_original) {
            finalImageFileToSend = image_file_original;
        }

        if (!itemToEdit && !finalImageFileToSend && !image_file_original) {
            addNotification("Пожалуйста, выберите изображение.", "warning");
            return;
        }

        const contentDataForJson = {
            title: title.trim(),
            alt_text: alt_text.trim(),
        };

        const payload = new FormData();
        payload.append("item_type", "image");
        payload.append("content_data", JSON.stringify(contentDataForJson));

        if (finalImageFileToSend) {
            payload.append("image", finalImageFileToSend);
        }

        dispatch("save", payload);
    }

    function removeImage() {
        if (image_for_cropper && image_for_cropper.startsWith("blob:")) {
            URL.revokeObjectURL(image_for_cropper);
        }
        image_for_cropper = null;
        image_file_original = null;
        showCropper = false;
        croppedAreaPixels = null;
    }

    onDestroy(() => {
        if (image_for_cropper && image_for_cropper.startsWith("blob:")) {
            URL.revokeObjectURL(image_for_cropper);
        }
    });
</script>

<form on:submit|preventDefault={handleSubmit} class="item-form">
    <div class="form-group">
        <label for="image-title">Заголовок (необязательно)</label>
        <input
            type="text"
            id="image-title"
            bind:value={title}
            disabled={isLoading}
        />
    </div>

    <div class="form-group">
        <label for="image-alt-text"
            >Альтернативный текст (для доступности)</label
        >
        <input
            type="text"
            id="image-alt-text"
            bind:value={alt_text}
            disabled={isLoading}
        />
    </div>

    <div class="form-group">
        <label
            >{showCropper
                ? "Изображение (можно изменить)"
                : "Выберите изображение"}</label
        >
        <div class="image-upload-container">
            {#if showCropper && image_for_cropper}
                <div class="aspect-ratio-selector">
                    <label>Пропорции: </label>
                    <button
                        type="button"
                        class:active={currentAspect === undefined}
                        on:click={() => setAspect(undefined)}>Своб.</button
                    >
                    <button
                        type="button"
                        class:active={currentAspect === 1 / 1}
                        on:click={() => setAspect(1 / 1)}>1:1</button
                    >
                    <button
                        type="button"
                        class:active={currentAspect === 16 / 9}
                        on:click={() => setAspect(16 / 9)}>16:9</button
                    >
                    <button
                        type="button"
                        class:active={currentAspect === 4 / 3}
                        on:click={() => setAspect(4 / 3)}>4:3</button
                    >
                    <button
                        type="button"
                        class:active={currentAspect === 3 / 4}
                        on:click={() => setAspect(3 / 4)}>3:4</button
                    >
                </div>

                <div class="cropper-wrapper">
                    <Cropper
                        image={image_for_cropper}
                        bind:crop
                        bind:zoom
                        aspect={currentAspect}
                        on:cropcomplete={onCropComplete}
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
                        bind:value={zoom}
                        min="1"
                        max="5"
                        step="0.1"
                        class="zoom-slider"
                    />
                </div>
                <div class="cropper-controls">
                    <label class="change-image-label">
                        <input
                            type="file"
                            accept="image/*"
                            on:change={handleFileChange}
                            disabled={isLoading}
                            style="display:none;"
                        />
                        Изменить файл
                    </label>
                    <button
                        type="button"
                        class="remove-image-btn-inline"
                        on:click={removeImage}
                        title="Удалить текущее изображение"
                    >
                        <Close size="16px" /> Удалить
                    </button>
                </div>
            {:else}
                <label
                    class="image-upload-label-box"
                    for="image-file-input-img"
                >
                    <ImagePlus size="36px" />
                    <span>Нажмите для загрузки изображения</span>
                </label>
                <input
                    type="file"
                    id="image-file-input-img"
                    accept="image/*"
                    on:change={handleFileChange}
                    disabled={isLoading}
                    style="display:none;"
                />
            {/if}
        </div>
    </div>

    <div class="form-actions">
        <button
            type="submit"
            class="btn-save"
            disabled={isLoading ||
                (!itemToEdit && !image_file_original && !showCropper) ||
                (showCropper &&
                    !image_for_cropper &&
                    !current_image_url_from_server)}
        >
            {isLoading
                ? "Сохранение..."
                : itemToEdit
                  ? "Обновить изображение"
                  : "Добавить изображение"}
        </button>
        <button
            type="button"
            class="btn-cancel"
            on:click={() => dispatch("close")}
            disabled={isLoading}>Отмена</button
        >
    </div>
</form>

<style>
    .item-form {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
    .form-group {
        display: flex;
        flex-direction: column;
    }
    .form-group label {
        margin-bottom: 5px;
        font-weight: 500;
        color: var(--color-text-muted);
    }
    .form-group input[type="text"] {
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: var(--spacing-border-radius-small);
        font-size: 1rem;
    }
    .form-group input[type="text"]:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb, 175, 164, 255), 0.3);
        outline: none;
    }

    .image-upload-container {
        border: 2px dashed var(--color-border-light, #ccc);
        border-radius: var(--spacing-border-radius-small);
        padding: 10px;
    }
    .image-upload-container:hover {
        border-color: var(--color-primary-light);
    }

    .image-upload-label-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 150px;
        cursor: pointer;
        color: var(--color-text-muted);
    }
    .image-upload-label-box:hover {
        color: var(--color-primary);
    }
    .image-upload-label-box span {
        margin-top: 8px;
        font-size: 0.9em;
    }

    .cropper-wrapper {
        position: relative;
        width: 100%;
        height: 300px;
        background: #f0f0f0;
        border-radius: var(--spacing-border-radius-small);
        overflow: hidden;
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
    :global(.cropper-wrapper .reactEasyCrop_Container) {
        border-radius: var(--spacing-border-radius-small);
    }

    .cropper-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
        gap: 10px;
    }

    .change-image-label {
        padding: 6px 12px;
        background-color: var(--color-bg-admin-button);
        color: var(--color-text-admin-button);
        border: 1px solid var(--color-border-admin-button);
        border-radius: var(--spacing-border-radius-button);
        cursor: pointer;
        font-size: 0.85rem;
        transition: background-color 0.2s;
    }
    .change-image-label:hover {
        background-color: var(--color-border-admin-button);
    }

    .remove-image-btn-inline {
        background: none;
        border: 1px solid var(--color-danger-red);
        color: var(--color-danger-red);
        padding: 5px 10px;
        border-radius: var(--spacing-border-radius-button);
        cursor: pointer;
        font-size: 0.85rem;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition:
            background-color 0.2s,
            color 0.2s;
    }
    .remove-image-btn-inline:hover {
        background-color: var(--color-danger-red);
        color: white;
    }

    .form-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
    }
    .btn-save {
        background-color: var(--color-primary);
        color: white;
        padding: 10px 15px;
        border: none;
        border-radius: var(--spacing-border-radius-button);
        cursor: pointer;
    }
    .btn-save:hover:not(:disabled) {
        background-color: var(--color-purple-hover);
    }
    .btn-save:disabled {
        background-color: #ccc;
        opacity: 0.7;
        cursor: not-allowed;
    }
    .btn-cancel {
        background-color: #f0f0f0;
        color: #333;
        padding: 10px 15px;
        border: 1px solid #ccc;
        border-radius: var(--spacing-border-radius-button);
        cursor: pointer;
    }
    .btn-cancel:hover:not(:disabled) {
        background-color: #e0e0e0;
    }

    .aspect-ratio-selector {
        margin-bottom: 10px;
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
        align-items: center;
    }
    .aspect-ratio-selector label {
        margin-bottom: 0;
        margin-right: 5px;
    }
    .aspect-ratio-selector button {
        padding: 4px 10px;
        font-size: 0.85em;
        border: 1px solid var(--color-border-light, #ccc);
        background: var(--color-bg-light, #fff);
        border-radius: var(--spacing-border-radius-small, 6px);
        cursor: pointer;
        transition:
            background-color 0.2s,
            border-color 0.2s,
            color 0.2s;
    }
    .aspect-ratio-selector button:hover {
        border-color: var(--color-secondary, #6d7fc9);
        color: var(--color-secondary, #6d7fc9);
    }
    .aspect-ratio-selector button.active {
        background-color: var(--color-primary, #afa4ff);
        color: white;
        border-color: var(--color-primary, #afa4ff);
    }
</style>
