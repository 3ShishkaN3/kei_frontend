<script>
	import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
	import EasyMDE from 'easymde';
	import 'easymde/dist/easymde.min.css';
	import Cropper from 'svelte-easy-crop';

	export let isOpen = false;
	export let itemToEdit = null;
	export let courseId, lessonId, targetSectionId; // targetSectionId - куда добавляем НОВЫЙ
    export let isAdminOrStaff = false;

	const dispatch = createEventDispatcher();
    let content_data = {};
	// --- Form State ---
	let itemType = 'text';
	let order = 0;
	let formError = null;
	let isLoading = false;

	// --- Content State (для создания нового) ---
	let textContent = '';
	let isMarkdown = true;
	let imageFile = null;
	let imageUrlPreview = null;
	let crop = { x: 0, y: 0 };
	let zoom = 1;
	let croppedAreaPixels = null;
    let imageAspectRatio = 16/9; // Можно сделать настраиваемым
	let mediaFile = null;
    let mediaTitle = '';
    let testTitle = '';
    let testDescription = '';
    let testType = 'mcq-single';
    // TODO: State для компонентов теста (MCQ опции и т.д.)
    let mcqOptions = [{ text: '', is_correct: false }]; // Пример для MCQ

    // --- Linking Existing State ---
    let linkExisting = false; // Флаг выбора привязки
    let existing_content_type = '';
	let existing_content_id = '';

    // --- MDE Instance ---
	let mdeInstance = null;
    let textInputRef;

	// --- Lifecycle & Setup ---
	$: if (isOpen) {
        resetFormInternal();
		if (itemToEdit) {
			populateFormForEdit();
		} else {
            // Значения по умолчанию для нового элемента
            itemType = 'text'; // Начинаем с текста
        }
        tick().then(initializeEditorIfNeeded); // Инициализация редактора
	} else {
        cleanupResources();
    }

    function resetFormInternal() {
        // Сброс всех полей состояния
        itemType = 'text'; order = 0; formError = null; isLoading = false;
        textContent = ''; isMarkdown = true;
        imageFile = null; imageUrlPreview = null; crop = { x: 0, y: 0 }; zoom = 1; croppedAreaPixels = null;
        mediaFile = null; mediaTitle = '';
        testTitle = ''; testDescription = ''; testType = 'mcq-single'; mcqOptions = [{ text: '', is_correct: false }];
        linkExisting = false; existing_content_type = ''; existing_content_id = '';
        cleanupResources(); // Очистка URL и MDE
    }

    function cleanupResources() {
        if (imageUrlPreview && imageUrlPreview.startsWith('blob:')) { URL.revokeObjectURL(imageUrlPreview); }
        imageUrlPreview = null;
        destroyMDE();
    }

    function populateFormForEdit() {
        if (!itemToEdit) return;
        itemType = itemToEdit.item_type;
        order = itemToEdit.order;
        linkExisting = false; // При редактировании всегда работаем с текущим контентом

        const details = itemToEdit.content_details;
        if (!details) return; // Нет деталей контента для редактирования

        if (itemType === 'text') {
            textContent = details.content || '';
            isMarkdown = details.is_markdown || false;
        } else if (itemType === 'image') {
            imageUrlPreview = details.image; // Показываем текущее изображение
            mediaTitle = details.title || '';
            // Сбрасываем состояние файла/кропа
            imageFile = null; crop = { x: 0, y: 0 }; zoom = 1; croppedAreaPixels = null;
        } else if (['audio', 'video', 'document'].includes(itemType)) {
             mediaTitle = details.title || '';
             // Файл не загружаем, показываем только возможность заменить
             mediaFile = null;
        } else if (itemType === 'test') {
             testTitle = details.title || '';
             testDescription = details.description || '';
             testType = details.test_type || 'mcq-single';
             // TODO: Загрузить компоненты редактируемого теста (details.mcq_options и т.д.)
             mcqOptions = details.mcq_options?.map(o => ({...o})) || [{ text: '', is_correct: false }]; // Пример
        }
    }

    function initializeEditorIfNeeded() {
        if (isOpen && itemType === 'text' && textInputRef && !mdeInstance) {
            initializeMDE();
        }
    }

    function initializeMDE() {
        if (textInputRef && !mdeInstance) {
             try {
                mdeInstance = new EasyMDE({
                    element: textInputRef,
                    initialValue: textContent,
                    spellChecker: false, // Отключаем по умолчанию
                    // Другие опции EasyMDE: https://github.com/Ionaru/easy-markdown-editor#configuration
                    toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "side-by-side", "fullscreen", "|", "guide"],
                 });
                mdeInstance.codemirror.on("change", () => {
                    textContent = mdeInstance.value(); // Обновляем svelte state при изменении
                });
             } catch (e) {
                 console.error("Ошибка инициализации EasyMDE:", e);
                 // Можно показать сообщение пользователю
             }
        }
    }
        function destroyMDE() {
        if (mdeInstance) {
            try {
                mdeInstance.toTextArea(); // Возвращаем textarea в нормальное состояние
                mdeInstance = null;
            } catch (e) {
                console.error("Ошибка уничтожения EasyMDE:", e);
            }
        }
    }
      onDestroy(() => {
         destroyMDE(); // Гарантируем очистку при уничтожении компонента
    });


	// --- Image Cropper Handlers ---
	function handleImageFileChange(event) {
		const file = event.target.files[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) {
             alert("Пожалуйста, выберите файл изображения.");
             return;
        }
		imageFile = file; // Сохраняем оригинальный файл
        imageUrlPreview = URL.createObjectURL(file);
		crop = { x: 0, y: 0 };
		zoom = 1;
		croppedAreaPixels = null;
	}

	function onCropComplete(event) {
		croppedAreaPixels = event.detail.pixels;
	}

	async function getCroppedImgBlob(imageSrc, pixelCrop) {
		// Адаптировано из примера, возвращает Blob
		return new Promise(async (resolve, reject) => {
            if (!pixelCrop) {
                // Если кропа нет (например, картинка не менялась),
                // нужно вернуть оригинальный файл (если он есть) или null
                 resolve(null); // Или вернуть imageFile, если он не менялся? Зависит от логики
                 return;
            }
			const image = new Image();
			image.src = imageSrc;
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = pixelCrop.width;
                canvas.height = pixelCrop.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error("Не удалось получить 2D контекст")); return; }
                ctx.drawImage(
                    image,
                    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
                    0, 0, pixelCrop.width, pixelCrop.height
                );
                canvas.toBlob(blob => {
                     if (!blob) { reject(new Error("Не удалось создать Blob")); return; }
                    resolve(blob);
                }, 'image/png'); // Можно использовать imageFile.type, но png надежнее
            };
            image.onerror = (error) => reject(error);
		});
	}

    // --- Media File Handler ---
        // --- Media File Handler ---
    function handleMediaFileChange(event) {
        const file = event.target.files[0];
        if (file) {
             mediaFile = file;
             // Можно добавить проверку типа файла для audio/video/document
        }
    }

    // --- MCQ Option Handlers ---
    function addMcqOption() { mcqOptions = [...mcqOptions, { text: '', is_correct: false }]; }
    function removeMcqOption(index) { mcqOptions = mcqOptions.filter((_, i) => i !== index); }

	// --- Submit Logic ---
	async function handleSubmit() {
		formError = null;
		isLoading = true;

        let body; // FormData or JSON object
        let useFormData = false;

        // --- Подготовка данных для отправки ---
        let payload = { item_type: itemType, order: order };

        if (linkExisting && existing_content_id && existing_content_type) {
             // 1. Привязка к существующему
             payload.existing_content_type = existing_content_type;
             payload.existing_content_id = parseInt(existing_content_id);
             body = payload; // JSON
             useFormData = false;
        } else {
             // 2. Создание нового контента или обновление существующего
             payload.content_data = {}; // Данные для сериализатора контента

             if (itemType === 'text') {
                 if (mdeInstance) textContent = mdeInstance.value();
                 payload.content_data = { content: textContent, is_markdown: isMarkdown, title: mediaTitle };
                 body = payload; // JSON
                 useFormData = false;
             }
             else if (itemType === 'image') {
                 body = new FormData(); // Всегда FormData для возможного файла
                 body.append('item_type', itemType);
                 body.append('order', order.toString());
                 body.append('content_data_title', mediaTitle);
                 body.append('content_data_alt_text', ' '); // Placeholder

                 if (imageFile && croppedAreaPixels) { // Новый файл + кроп
                     try {
                         const croppedBlob = await getCroppedImgBlob(imageUrlPreview, croppedAreaPixels);
                         body.append('content_data_image', croppedBlob, imageFile.name.replace(/(\.[\w\d_-]+)$/i, '_cropped.png'));
                     } catch (e) { formError = `Ошибка обрезки: ${e.message}`; isLoading = false; return; }
                 } else if (imageFile && !croppedAreaPixels) { // Новый файл без кропа
                     body.append('content_data_image', imageFile, imageFile.name);
                 }
                 // Если файл не менялся (itemToEdit && !imageFile), content_data_image не добавляется
                 useFormData = true;
             }
             else if (['audio', 'video', 'document'].includes(itemType)) {
                 body = new FormData();
                 body.append('item_type', itemType);
                 body.append('order', order.toString());
                 body.append('content_data_title', mediaTitle);
                 const fileFieldName = `content_data_${itemType === 'document' ? 'document_file' : (itemType + '_file')}`;
                 if (mediaFile) { // Отправляем файл только если он выбран
                    body.append(fileFieldName, mediaFile, mediaFile.name);
                 }
                  // Если файл не менялся, content_data_file* не добавляется
                 useFormData = true;
             }
             else if (itemType === 'test') {
                 // Собираем данные теста
                  payload.content_data = {
                      title: testTitle,
                      description: testDescription,
                      test_type: testType,
                      // Добавляем компоненты
                      mcq_options: testType.startsWith('mcq') ? mcqOptions.filter(o => o.text.trim()) : undefined,
                      // TODO: Добавить сбор данных для других типов тестов
                  };
                   // Убираем пустые ключи
                   Object.keys(payload.content_data).forEach(key => {
                       if (payload.content_data[key] === undefined || payload.content_data[key] === null) {
                           delete payload.content_data[key];
                       }
                   });
                 body = payload; // JSON
                 useFormData = false;
             }
             else { // Неизвестный тип
                 formError = "Неизвестный тип элемента."; isLoading = false; return;
             }
        }

        // Если body остался объектом (не FormData), а должен был быть FormData (из-за файлов)
        if (useFormData && !(body instanceof FormData)) {
             formError = "Ошибка подготовки данных для отправки."; isLoading = false; return;
        }
        // Если body это FormData, но данные content_data не были добавлены (т.к. файл не менялся)
        // Нужно отправить пустой content_data, чтобы бэкенд не пытался создать новый контент
        if (useFormData && body instanceof FormData && !body.has('content_data_image') && !body.has('content_data_audio_file') && !body.has('content_data_video_file') && !body.has('content_data_document_file')) {
             // Как передать, что контент не менялся? Либо не отправлять content_data*, либо PATCH
             // Для PUT бэкенд должен понимать, что отсутствие файла = не менять его
             // Для POST/PUT с FormData, где content_data не передается, бэкенд может решить, что его не надо создавать/менять
        }


		dispatch('save', body); // Отправляем body (FormData или JSON)
        // isLoading сбросится в родителе
	}

    
</script>

{#if isOpen}
<div class="modal-backdrop" on:click|self={handleCloseModal}>
	<div class="modal-content" on:click|stopPropagation>
		<h3>{itemToEdit ? 'Редактировать' : 'Добавить'} элемент</h3>
		<form on:submit|preventDefault={handleSubmit}>
			{#if formError}<p class="error-message">{formError}</p>{/if}

            <div class="form-grid">
                <div class="form-group">
                    <label for="item-type">Тип элемента:</label>
                    <select id="item-type" bind:value={itemType} required disabled={!!itemToEdit || linkExisting} on:change={() => { linkExisting = false; existing_content_type = ''; /* Сброс при смене типа */ }}>
                        <option value="text">Текст</option>
                        <option value="image">Изображение</option>
                        <option value="audio">Аудио</option>
                        <option value="video">Видео</option>
                        <option value="document">Документ</option>
                        <option value="test">Тест</option>
                    </select>
                    {#if itemToEdit}<small>Тип элемента нельзя изменить.</small>{/if}
                </div>
                <div class="form-group">
                    <label for="item-order">Порядок:</label>
                    <input id="item-order" type="number" bind:value={order} min="0" required>
                </div>
            </div>

            {#if !itemToEdit}
                <fieldset class="content-choice">
                    <legend>Источник контента:</legend>
                     <label>
                        <input type="radio" name="contentSource" value={false} bind:group={linkExisting}> Создать новый
                    </label>
                    <label>
                        <input type="radio" name="contentSource" value={true} bind:group={linkExisting}> Привязать существующий
                    </label>
                </fieldset>
            {/if}

            {#if linkExisting}
                 <div class="form-group">
                     <label for="existing-type">Тип существующего контента:</label>
                     <input id="existing-type" type="text" value={itemType} readonly>
                 </div>
                 <div class="form-group">
                     <label for="existing-id">ID существующего контента ({itemType}):</label>
                     <input id="existing-id" type="number" bind:value={existing_content_id} required min="1" placeholder="Введите ID...">
                     <small>Найдите ID нужного материала/теста в админ-панели.</small>
                 </div>
            {:else} {#if itemType === 'text'}
                    <div class="form-group">
                        <label for="text-title">Заголовок (необязательно):</label>
                        <input id="text-title" type="text" bind:value={mediaTitle}>
                    </div>
                    <div class="form-group">
                        <label for="text-content-area-mde">Содержимое:</label>
                        <textarea id="text-content-area-mde" bind:this={textInputRef}></textarea>
                         <label class="inline-label">
                            <input type="checkbox" bind:checked={isMarkdown}> Использовать Markdown
                        </label>
                    </div>
                 {:else if itemType === 'image'}
                    <div class="form-group">
                         <label for="image-title">Заголовок (необязательно):</label>
                         <input id="image-title" type="text" bind:value={mediaTitle}>
                    </div>
                    <div class="form-group">
                        <label for="image-file">{itemToEdit ? 'Заменить изображение (необязательно):' : 'Файл изображения:'}</label>
                        <input id="image-file" type="file" accept="image/*" on:change={handleImageFileChange}>
                         {#if imageUrlPreview}
                             <div class="cropper-container">
                                 <Cropper image={imageUrlPreview} bind:crop bind:zoom aspect={imageAspectRatio} on:cropcomplete={onCropComplete} objectFit="contain"/>
                             </div>
                             <small>Выделите нужную область.</small>
                         {/if}
                    </div>
                {:else if itemType === 'audio' || itemType === 'video' || itemType === 'document'}
                    <div class="form-group">
                        <label for="media-title">{itemType === 'document' ? 'Название документа' : 'Заголовок'} (необязательно):</label>
                        <input id="media-title" type="text" bind:value={mediaTitle}>
                    </div>
                    <div class="form-group">
                        <label for="media-file">{itemToEdit ? `Заменить файл (${itemType}):` : `Файл (${itemType}):`}</label>
                        {#if itemToEdit && !mediaFile}<p><small>Чтобы заменить текущий файл, загрузите новый.</small></p>{/if}
                        <input id="media-file" type="file" accept={itemType === 'audio' ? 'audio/*' : (itemType === 'video' ? 'video/*' : '.pdf,.doc,.docx,.ppt,.pptx')} on:change={handleMediaFileChange}>
                        {#if mediaFile}<p><small>Выбран файл: {mediaFile.name}</small></p>{/if}
                    </div>
                {:else if itemType === 'test'}
                     <div class="form-group"> <label for="test-title">Название теста:</label> <input id="test-title" type="text" bind:value={testTitle} required> </div>
                     <div class="form-group"> <label for="test-description">Описание/Инструкция:</label> <textarea id="test-description" bind:value={testDescription} rows="3"></textarea> </div>
                     <div class="form-group"> <label for="test-type">Тип теста:</label> <select id="test-type" bind:value={testType} required><option value="mcq-single">Выбор одного</option><option value="mcq-multi">Выбор нескольких</option><option value="free-text">Текстовый ответ</option><option value="word-order">Порядок слов</option><option value="matching">Соотнесение</option><option value="pronunciation">Произношение</option><option value="spelling">Правописание</option></select> </div>
                     {#if testType.startsWith('mcq')}
                         <fieldset class="test-components">
                             <legend>Варианты ответов</legend>
                             {#each mcqOptions as option, index (index)}
                                 <div class="mcq-option-row">
                                     <input type="text" bind:value={option.text} placeholder="Текст варианта" required>
                                     <label class="inline-label small">
                                         <input type="checkbox" bind:checked={option.is_correct}> Правильный?
                                     </label>
                                     <button type="button" class="remove-option-btn" on:click={() => removeMcqOption(index)} title="Удалить вариант">✕</button>
                                 </div>
                             {/each}
                             <button type="button" class="add-option-btn" on:click={addMcqOption}>+ Добавить вариант</button>
                         </fieldset>
                     {/if}
                     {/if}
            {/if}

			<div class="modal-actions">
				<button type="button" class="cancel-btn" on:click={handleCloseModal} disabled={isLoading}>Отмена</button>
				<button type="submit" class="save-btn" disabled={isLoading}>{#if isLoading} Загрузка... {:else} Сохранить {/if}</button>
			</div>
		</form>
	</div>
</div>
{/if}

<style>
	/* --- Стили модалки --- */
    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px;}
    .modal-content { background: white; padding: 25px 30px; border-radius: 8px; width: 100%; max-width: 700px; max-height: 90vh; overflow-y: auto; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
    .modal-content h3 { margin-top: 0; margin-bottom: 20px; color: #333; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9em; color: #444; }
    label.inline-label { display: inline-flex; align-items: center; margin-top: 8px; font-weight: normal; }
    input[type="text"], input[type="number"], select, textarea {
        width: 100%;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 0.95em;
        box-sizing: border-box; /* Важно */
    }
    textarea { min-height: 80px; resize: vertical; }
    select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
    input[type="checkbox"] { margin-right: 5px; width: auto; }
    small { font-size: 0.8em; color: #666; display: block; margin-top: 3px; }
    .error-message { color: var(--color-danger-red); background: #ffebee; border: 1px solid var(--color-danger-red); padding: 10px; border-radius: 4px; margin-bottom: 15px; }
    fieldset.content-choice { border: 1px solid #eee; padding: 10px; margin-bottom: 15px; border-radius: 4px; }
    fieldset.content-choice legend { font-weight: 600; padding: 0 5px; font-size: 0.9em; }
    fieldset.content-choice label { display: inline-flex; margin-right: 15px; font-weight: normal; }

    .modal-actions { margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #eee; padding-top: 15px; }
    .modal-actions button { padding: 10px 18px; border-radius: 5px; border: none; cursor: pointer; font-weight: 600; transition: background-color 0.2s; }
    .cancel-btn { background-color: #f0f0f0; color: #333; }
    .cancel-btn:hover { background-color: #e0e0e0; }
    .save-btn { background-color: var(--color-primary); color: white; }
    .save-btn:hover { background-color: var(--color-primary-dark); }
     .save-btn:disabled { background-color: #cccccc; cursor: not-allowed; }

    /* Стили для Cropper */
    .cropper-container {
        position: relative;
        width: 100%;
         /* Задаем высоту или соотношение сторон */
         /* Например, для 16:9 */
         padding-bottom: 56.25%; /* 9 / 16 * 100% */
        /* Или фиксированную высоту */
        /* height: 300px; */
        background-color: #f0f0f0;
        margin-top: 10px;
        border-radius: 4px;
        overflow: hidden; /* Важно */
    }
     /* Контейнер Cropper должен быть внутри .cropper-container */
     /* :global(.svelte-easy-crop) можно использовать для стилизации, если нужно */
     .cropper-container :global(.svelte-easy-crop-container) {
         position: absolute;
         top: 0;
         left: 0;
         right: 0;
         bottom: 0;
     }


    /* Стили для EasyMDE (могут переопределяться глобальными стилями) */
    :global(.easymde-container .CodeMirror) {
        border: 1px solid #ccc;
        border-radius: 4px;
    }
     :global(.easymde-container .editor-toolbar) {
         border-top-left-radius: 4px;
         border-top-right-radius: 4px;
         opacity: 0.9;
     }
      :global(.easymde-container .editor-toolbar a.active),
      :global(.easymde-container .editor-toolbar a:hover) {
         background: #f0f0f0;
         border-color: #ccc;
     }
    fieldset.test-components { border: 1px solid #eee; padding: 10px 15px; margin-top: 15px; border-radius: 4px; }
    fieldset.test-components legend { font-weight: 600; padding: 0 5px; font-size: 0.9em; color: #444; }
    .mcq-option-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .mcq-option-row input[type="text"] { flex-grow: 1; }
    .mcq-option-row label.small { font-size: 0.85em; white-space: nowrap; }
    .remove-option-btn { background: none; border: none; color: var(--color-danger-red); cursor: pointer; font-size: 1.2em; padding: 0 5px; }
    .add-option-btn {
        font-size: 0.9em; padding: 5px 10px; background-color: #e8e8e8; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;
    }
    .add-option-btn:hover { background-color: #ddd; }
</style>