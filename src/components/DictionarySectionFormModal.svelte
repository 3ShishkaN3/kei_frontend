<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import Close from 'svelte-material-icons/Close.svelte';
  import ImagePlus from 'svelte-material-icons/ImagePlus.svelte';
  import Cropper from 'svelte-easy-crop';

  export let editingSection = null;
  export let courseId;
  const dispatch = createEventDispatcher();

  let initialTitle = '';
  let title = '';
  let initialBannerImageUrl = null;
  let bannerImageUrlPreview = null;
  let bannerImageFile = null;
  let naturalSize = { width: 0, height: 0 };

  let crop = { x: 0, y: 0 };
  let zoom = 1;
  let croppedAreaPixels = null;

  let is_primary = false;
  let formError = null;
  let isLoading = false;

  onMount(() => {
    if (editingSection) {
      initialTitle = editingSection.title || '';
      is_primary = editingSection.is_primary || false;
      initialBannerImageUrl = editingSection.banner_image;
      title = '';
      const img = new Image();
      img.src = initialBannerImageUrl;
      img.onload = () => {
        naturalSize = { width: img.width, height: img.height };
        croppedAreaPixels = { x: 0, y: 0, width: img.width, height: img.height };
      };
    }
  });

  function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    bannerImageUrlPreview = URL.createObjectURL(file);
    bannerImageFile = file;
    crop = { x: 0, y: 0 };
    zoom = 1;
    croppedAreaPixels = null;
    const img = new Image();
    img.src = bannerImageUrlPreview;
    img.onload = () => {
      naturalSize = { width: img.width, height: img.height };
      croppedAreaPixels = { x: 0, y: 0, width: img.width, height: img.height };
    };
  }

  function onCropComplete(event) {
    // event.detail = { percent: {...}, pixels: {...} }
    croppedAreaPixels = event.detail.pixels;
  }

  async function getCroppedImg(imageSrc, pixelCrop) {
    const image = new Image();
    image.src = imageSrc;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
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
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        resolve(new File([blob], 'banner.png', { type: blob.type }));
      });
    });
  }

  async function handleSubmit() {
    formError = null;
    if (!editingSection && !title.trim()) {
      formError = 'Название раздела не может быть пустым.';
      return;
    }

    isLoading = true;
    const formData = new FormData();
    if (!editingSection || (title.trim() && title.trim() !== initialTitle)) {
      formData.append('title', title.trim());
    }
    formData.append('course', courseId);
    formData.append('is_primary', is_primary);

    // определяем область обрезки
    const cropToUse = croppedAreaPixels || {
      x: 0,
      y: 0,
      width: naturalSize.width,
      height: naturalSize.height
    };

    // создаём обрезанный файл
    if (bannerImageUrlPreview) {
      bannerImageFile = await getCroppedImg(bannerImageUrlPreview, cropToUse);
    }

    if (bannerImageFile) {
      formData.append('banner_image', bannerImageFile, bannerImageFile.name);
    } else if (editingSection && initialBannerImageUrl && !bannerImageUrlPreview) {
      formData.append('banner_image', '');
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
      {editingSection ? 'Редактировать раздел' : 'Создать раздел'}
    </h2>
    <form on:submit|preventDefault={handleSubmit}>
      {#if formError}
        <p class="error-message">{formError}</p>
      {/if}

      <div class="form-group">
        <label for="section-title">Название раздела</label>
        <input
          type="text"
          id="section-title"
          bind:value={title}
          placeholder={editingSection ? initialTitle : ''}
        />
      </div>

      <div class="form-group">
        <label>Баннер раздела</label>
        <div class="image-upload-area" style="position:relative;">
          {#if bannerImageUrlPreview}
            <div style="position:relative; width:100%; height:200px;">
              <Cropper
                image={bannerImageUrlPreview}
                bind:crop
                bind:zoom
                aspect={16/9}
                on:cropcomplete={onCropComplete}
              />
            </div>
            <label title="Загрузить заново">
              <input type="file" accept="image/*" on:change={handleFileChange} style="display:none;" />
            </label>
            <button type="button" class="remove-image-btn" on:click={() => (bannerImageUrlPreview = null)}>
              <Close size="18px" />
            </button>
          {:else}
            <label for="section-banner" class="image-upload-label">
              <ImagePlus size="48px" /><span>Загрузить баннер</span>
            </label>
            <input
              type="file"
              id="section-banner"
              accept="image/*"
              on:change={handleFileChange}
              style="display:none;"
            />
          {/if}
        </div>
      </div>

      <div class="form-group checkbox-group">
        <input type="checkbox" id="section-is-primary" bind:checked={is_primary} />
        <label for="section-is-primary">Основной раздел словаря?</label>
      </div>

      <div class="form-actions">
        <button type="button" class="cancel-button" on:click={closeModal} disabled={isLoading}>
          Отмена
        </button>
        <button type="submit" class="save-button" disabled={isLoading}>
          {#if isLoading}Сохранение...{:else}{editingSection ? 'Сохранить' : 'Создать'}{/if}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
    /* Styles are very similar to LessonFormModal, reuse or scope them */
    .modal-overlay, .modal-content, .close-button, .modal-title, .form-group, label, input[type="text"], .image-upload-area, .image-upload-label, .image-preview-container, .image-preview, .remove-image-btn, .form-hint, .form-actions, .cancel-button, .save-button, .error-message {
        /* Basic styles copied - ideally use global classes or scoped styles */
        /* Add styles for checkbox-group */
         --spacing-input-border-radius: 8px;
         --color-input-border: #ccc;
         --color-input-focus-border: #6D7FC9;
         --color-label: #303972;
         --font-weight-semi-bold: 600;
         --color-text-muted: #888;
         --spacing-input-padding: 12px 15px;
         --color-bg-light: #fff;
         --spacing-border-radius-block: 16px;
         --color-cancel-btn-bg: #f0f0f0;
         --color-border-light: #ccc;
         --color-cancel-btn-text: #555;
         --spacing-border-radius-button: 20px;
         --color-save-btn-gradient-start: #EBC7F2;
         --color-save-btn-gradient-end: #C2B6FC;
         --color-save-btn-text: white;
         --color-error: #e74c3c;
         --color-error-bg: rgba(231, 76, 60, 0.1);
         --spacing-border-radius-small: 5px;
    }

    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px; }
    .modal-content { background-color: var(--color-bg-light, #fff); padding: 30px 35px; border-radius: var(--spacing-border-radius-block, 16px); box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2); position: relative; width: 100%; max-width: 550px; max-height: 90vh; overflow-y: auto; animation: slide-down 0.3s ease-out; }
    @keyframes slide-down { from { transform: translateY(-30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .close-button { position: absolute; top: 15px; right: 15px; background: none; border: none; cursor: pointer; color: var(--color-text-muted, #888); padding: 5px; border-radius: 50%; transition: background-color 0.2s; }
    .close-button:hover { background-color: #f0f0f0; color: #333; }
    .modal-title { text-align: center; margin-top: 0; margin-bottom: 25px; font-size: 1.5rem; font-weight: 700; color: #333; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 8px; font-weight: var(--font-weight-semi-bold, 600); font-size: 0.95rem; color: var(--color-label, #303972); }
    input[type="text"] { width: 100%; padding: var(--spacing-input-padding, 12px 15px); border: 1px solid var(--color-input-border, #ccc); border-radius: var(--spacing-input-border-radius, 8px); font-size: 1rem; transition: border-color 0.2s, box-shadow 0.2s; }
    input[type="text"]:focus { outline: none; border-color: var(--color-input-focus-border, #6D7FC9); box-shadow: 0 0 0 3px rgba(109, 127, 201, 0.2); }
    .image-upload-area { border: 2px dashed var(--color-input-border, #ccc); border-radius: var(--spacing-input-border-radius, 8px); padding: 15px; display: flex; justify-content: center; align-items: center; min-height: 150px; transition: border-color 0.2s; position: relative; }
    .image-upload-area:hover { border-color: var(--color-input-focus-border, #6D7FC9); }
    .image-upload-label { cursor: pointer; text-align: center; color: var(--color-text-muted, #888); display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .image-upload-label span { font-size: 0.9rem; }
    .image-upload-label:hover { color: var(--color-input-focus-border, #6D7FC9); }
    .image-preview-container { position: relative; max-width: 100%; max-height: 250px; display: inline-block; }
    .image-preview { display: block; max-width: 100%; max-height: 250px; height: auto; border-radius: 5px; object-fit: contain; }
    .remove-image-btn { position: absolute; top: 5px; right: 5px; background-color: rgba(255, 0, 0, 0.7); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; transition: background-color 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
    .remove-image-btn:hover { background-color: rgba(255, 0, 0, 0.9); }
    .form-hint { font-size: 0.8rem; color: var(--color-text-muted, #777); display: block; margin-top: 8px; text-align: left; } /* Align hint left for checkbox */
    .form-actions { display: flex; justify-content: flex-end; gap: 15px; margin-top: 30px; }
    .cancel-button, .save-button { padding: 10px 25px; border-radius: var(--spacing-border-radius-button, 20px); font-weight: var(--font-weight-semi-bold, 600); cursor: pointer; transition: all 0.2s ease; font-size: 0.95rem; }
    .cancel-button { background-color: var(--color-cancel-btn-bg, #f0f0f0); border: 1px solid var(--color-border-light, #ccc); color: var(--color-cancel-btn-text, #555); }
    .cancel-button:hover:not(:disabled) { background-color: #e5e5e5; border-color: #bbb; }
    .save-button { background: linear-gradient(120deg, var(--color-save-btn-gradient-start, #EBC7F2), var(--color-save-btn-gradient-end, #C2B6FC)); color: var(--color-save-btn-text, white); border: none; box-shadow: 0 3px 8px rgba(194, 182, 252, 0.4); }
    .save-button:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 4px 12px rgba(194, 182, 252, 0.5); }
    .save-button:active:not(:disabled) { transform: translateY(1px); filter: brightness(0.95); }
    .save-button:disabled { opacity: 0.7; cursor: not-allowed; background: #ccc; box-shadow: none; }
    .error-message { color: var(--color-error, #e74c3c); background-color: var(--color-error-bg, rgba(231, 76, 60, 0.1)); padding: 10px; border-radius: var(--spacing-border-radius-small, 5px); margin-bottom: 15px; text-align: center; font-size: 0.9rem; }

    /* Checkbox specific */
     .checkbox-group {
         display: flex;
         align-items: flex-start; /* Align checkbox with label better */
         gap: 10px;
         margin-bottom: 5px; /* Less margin for checkbox */
     }
     .checkbox-group input[type="checkbox"] {
         margin-top: 3px; /* Align checkbox */
         width: 18px;
         height: 18px;
         cursor: pointer;
     }
     .checkbox-group label {
         margin-bottom: 0; /* Remove bottom margin */
         font-weight: normal; /* Normal weight for checkbox label */
         color: var(--color-text-dark);
         cursor: pointer;
         flex-grow: 1;
     }
     .checkbox-group .form-hint {
         margin-top: 0;
         margin-left: 28px; /* Indent hint under checkbox */
         width: 100%;
     }

</style>