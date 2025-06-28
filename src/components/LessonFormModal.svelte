<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import Close from 'svelte-material-icons/Close.svelte';
  import ImagePlus from 'svelte-material-icons/ImagePlus.svelte';
  // Установить: npm install svelte-easy-crop
  import Cropper from 'svelte-easy-crop';

  export let editingLesson = null;
  export let courseId;
  const dispatch = createEventDispatcher();

  let initialTitle = '';
  let title = '';
  let initialCoverImageUrl = null;
  let coverImageUrlPreview = null;
  let coverImageFile = null;

  // Параметры кроппера
  let crop = { x: 0, y: 0 };
  let zoom = 1;
  let croppedAreaPixels = null;
  
  let formError = null;
  let isLoading = false;

  onMount(() => {
    if (editingLesson) {
      initialTitle = editingLesson.title || '';
      title = editingLesson.title || '';
      initialCoverImageUrl = editingLesson.cover_image;
      coverImageUrlPreview = editingLesson.cover_image;
    }
  });

    function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    // создаём preview
    coverImageUrlPreview = URL.createObjectURL(file);
    coverImageFile = file;

    // сброс параметров кропа
    crop = { x: 0, y: 0 };
    zoom = 1;
    croppedAreaPixels = null;

    // We don't need to read natural size here, cropper will handle it
  }

  function onCropComplete(event) {
    // event.detail = { percent: {...}, pixels: {...} }
    croppedAreaPixels = event.detail.pixels;
  }


  async function getCroppedImg(imageSrc, pixelCrop) {
    const image = new Image();
    image.src = imageSrc;
    // Use crossorigin anonymous to handle potential CORS issues even with blob URLs in some browsers
    image.crossOrigin = 'Anonymous'; 
    
    // Waiting for image to load to prevent tainted canvas issues.
    await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width  = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      image,
      pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
      0,             0,            pixelCrop.width, pixelCrop.height
    );

    return new Promise(resolve => {
      canvas.toBlob(blob => {
        // Resolve with a File object
        resolve(new File([blob], coverImageFile?.name || 'cover.png', { type: blob.type }));
      }, 'image/png');
    });
  }

  async function handleSubmit() {
    isLoading = true;
    formError = null;

    if (!editingLesson && !title.trim()) {
        formError = 'Название урока не может быть пустым.';
        isLoading = false;
        return;
    }
    
    const formData = new FormData();
    let changed = false;

    // 1. Title change detection
    if (!editingLesson) {
        // For new lessons, always include the title.
        formData.append('title', title.trim());
        changed = true;
    } else {
        // For existing lessons, only include title if it has changed.
        if (title.trim() !== initialTitle) {
            formData.append('title', title.trim());
            changed = true;
        }
    }

    // 2. Image change detection
    // 2a. A new image was uploaded. We know this if coverImageFile is not null.
    if (coverImageFile) {
        if (coverImageUrlPreview && croppedAreaPixels && croppedAreaPixels.width > 0) {
            const croppedImage = await getCroppedImg(coverImageUrlPreview, croppedAreaPixels);
            formData.append('cover_image', croppedImage, croppedImage.name);
            changed = true;
        } else {
            // As a fallback, if cropping fails for some reason, upload the original file.
            formData.append('cover_image', coverImageFile, coverImageFile.name);
            changed = true;
        }
    }
    // 2b. An existing image was removed. We know this if there was an initial image, but now the preview is gone.
    else if (initialCoverImageUrl && !coverImageUrlPreview) {
        formData.append('cover_image', ''); // Send empty string to signal removal
        changed = true;
    }

    // If we are editing and nothing changed, just close the modal.
    if (editingLesson && !changed) {
        closeModal();
        return;
    }
    
    // For new lessons, if there's no title, it's an error (already checked),
    // but if there's a title but no image, that's fine. We must have some change to proceed.
    if (!changed) {
        closeModal();
        return;
    }

    dispatch('save', formData);
  }

  function closeModal() {
    dispatch('close');
  }
  function handleKeydown(event) {
    if (event.key === 'Escape') closeModal();
  }
</script>

<svelte:window on:keydown={handleKeydown} />
<div class="modal-overlay" on:click={closeModal}>
  <div class="modal-content" on:click|stopPropagation>
    <button class="close-button" on:click={closeModal} aria-label="Закрыть">
      <Close size="24px" />
    </button>
    <h2 class="modal-title">
      {editingLesson ? 'Редактировать урок' : 'Создать урок'}
    </h2>
    <form on:submit|preventDefault={handleSubmit}>
      {#if formError}<p class="error-message">{formError}</p>{/if}

      <div class="form-group">
        <label for="lesson-title">Название урока</label>
        <input id="lesson-title" type="text" bind:value={title} placeholder="Введите название урока" />
      </div>

      <div class="form-group">
        <label>Обложка урока</label>
        <div class="image-upload-area" style="position:relative;">
          {#if coverImageUrlPreview}
            <div style="position:relative; width:100%; height:50vh;">
                <Cropper
                    image={coverImageUrlPreview}
                    bind:crop
                    bind:zoom
                    aspect={1}
                    on:cropcomplete={onCropComplete}
                />
                </div>

            <label title="Загрузить заново">
              <input type="file" accept="image/*" on:change={handleFileChange} style="display:none;" />
            </label>
            <button type="button" class="remove-image-btn" on:click={() => {coverImageUrlPreview = null; coverImageFile = null;}}>
              <Close size="18px" />
            </button>
          {:else}
            <label for="lesson-cover" class="image-upload-label">
              <ImagePlus size="48px" /><span>Загрузить изображение</span>
            </label>
            <input type="file" id="lesson-cover" accept="image/*" on:change={handleFileChange} style="display:none;" />
          {/if}
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="cancel-button" on:click={closeModal} disabled={isLoading}>Отмена</button>
        <button type="submit" class="save-button" disabled={isLoading}>{#if isLoading}Сохранение...{:else}{editingLesson ? 'Сохранить' : 'Создать'}{/if}</button>
      </div>
    </form>
  </div>
</div>


<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        padding: 20px;
    }

    .modal-content {
        background-color: var(--color-bg-light, #fff);
        padding: 30px 35px;
        border-radius: var(--spacing-border-radius-block, 16px);
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
        position: relative;
        width: 100%;
        max-width: 550px; /* Limit modal width */
        max-height: 90vh;
        overflow-y: auto;
        animation: slide-down 0.3s ease-out;
    }

     @keyframes slide-down {
        from { transform: translateY(-30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
     }

    .close-button {
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        cursor: pointer;
        color: var(--color-text-muted, #888);
        padding: 5px;
        border-radius: 50%;
        transition: background-color 0.2s;
    }
    .close-button:hover {
        background-color: var(--color-simple-button-hover-bg, #f0f0f0);
         color: var(--color-text-dark, #333);
    }

    .modal-title {
        text-align: center;
        margin-top: 0;
        margin-bottom: 25px;
        font-size: 1.5rem;
        font-weight: var(--font-weight-bold, 700);
        color: var(--color-text-dark, #333);
    }
    
    .edit-indicator {
        display: block;
        font-size: 1.2rem;
        margin-bottom: 5px;
    }
    
    .entity-name {
        display: block;
        font-size: 1.3rem;
        color: var(--color-primary, #6D7FC9);
    }

    .form-group {
        margin-bottom: 20px;
    }

    label {
        display: block;
        margin-bottom: 8px;
        font-weight: var(--font-weight-semi-bold, 600);
        font-size: 0.95rem;
        color: var(--color-label, #303972);
    }

    input[type="text"] {
        width: 100%;
        padding: var(--spacing-input-padding, 12px 15px);
        border: 1px solid var(--color-input-border, #ccc);
        border-radius: var(--spacing-input-border-radius, 8px);
        font-size: 1rem;
        transition: border-color 0.2s, box-shadow 0.2s;
    }
    input[type="text"]:focus {
        outline: none;
        border-color: var(--color-input-focus-border, #6D7FC9);
        box-shadow: 0 0 0 3px var(--color-input-focus-shadow, rgba(109, 127, 201, 0.2));
    }

     .image-upload-area {
        border: 2px dashed var(--color-input-border, #ccc);
        border-radius: var(--spacing-input-border-radius, 8px);
        padding: 15px;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 150px;
        transition: border-color 0.2s;
        position: relative;
     }
    .image-upload-area:hover {
         border-color: var(--color-input-focus-border, #6D7FC9);
    }

     .image-upload-label {
         cursor: pointer;
         text-align: center;
         color: var(--color-text-muted, #888);
         display: flex;
         flex-direction: column;
         align-items: center;
         gap: 10px;
     }
     .image-upload-label span {
         font-size: 0.9rem;
     }
     .image-upload-label:hover {
         color: var(--color-input-focus-border, #6D7FC9);
     }

     .image-preview-container {
         position: relative;
         max-width: 100%;
         max-height: 250px; /* Limit preview height */
         display: inline-block; /* Fit content */
     }

     .image-preview {
         display: block;
         max-width: 100%;
         max-height: 250px;
         height: auto;
         border-radius: 5px;
         object-fit: contain;
     }

    .remove-image-btn {
         position: absolute;
         top: 5px;
         right: 5px;
         background-color: rgba(255, 0, 0, 0.7);
         color: white;
         border: none;
         border-radius: 50%;
         width: 28px;
         height: 28px;
         cursor: pointer;
         display: flex;
         align-items: center;
         justify-content: center;
         padding: 0;
         transition: background-color 0.2s;
         box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
     .remove-image-btn:hover {
         background-color: rgba(255, 0, 0, 0.9);
     }

     .form-hint {
        font-size: 0.8rem;
        color: var(--color-text-muted, #777);
        display: block;
        margin-top: 8px;
        text-align: center;
     }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 15px;
        margin-top: 30px;
    }

    .cancel-button, .save-button, .crop-button, .cancel-crop-button {
        padding: 10px 25px;
        border-radius: var(--spacing-border-radius-button, 20px);
        font-weight: var(--font-weight-semi-bold, 600);
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.95rem;
    }

    .cancel-button {
        background-color: var(--color-cancel-btn-bg, #f0f0f0);
        border: 1px solid var(--color-border-light, #ccc);
        color: var(--color-cancel-btn-text, #555);
    }
    .cancel-button:hover:not(:disabled) {
         background-color: #e5e5e5;
         border-color: #bbb;
    }

    .save-button {
        background: linear-gradient(120deg, var(--color-save-btn-gradient-start, #EBC7F2), var(--color-save-btn-gradient-end, #C2B6FC));
        color: var(--color-save-btn-text, white);
        border: none;
        box-shadow: 0 3px 8px rgba(194, 182, 252, 0.4); /* Adjusted shadow */
    }
    .save-button:hover:not(:disabled) {
         filter: brightness(1.1);
         box-shadow: 0 4px 12px rgba(194, 182, 252, 0.5);
    }
     .save-button:active:not(:disabled) {
         transform: translateY(1px);
         filter: brightness(0.95);
     }
     .save-button:disabled {
         opacity: 0.7;
         cursor: not-allowed;
         background: #ccc;
         box-shadow: none;
     }

    .cropper-actions {
        position: absolute;
        bottom: 10px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        gap: 10px;
        z-index: 10;
    }
    
    .crop-button {
        background-color: var(--color-input-focus-border, #6D7FC9);
        color: white;
        border: none;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        padding: 6px 12px;
        font-size: 0.85rem;
    }
    
    .cancel-crop-button {
        background-color: #f0f0f0;
        color: #555;
        border: 1px solid #ccc;
        padding: 6px 12px;
        font-size: 0.85rem;
    }

     .error-message {
        color: var(--color-error, #e74c3c);
        background-color: var(--color-error-bg, rgba(231, 76, 60, 0.1));
        padding: 10px;
        border-radius: var(--spacing-border-radius-small, 5px);
        margin-bottom: 15px;
        text-align: center;
        font-size: 0.9rem;
     }
</style>