<script>
    import { createEventDispatcher, onMount, onDestroy, tick } from "svelte";
    import {
        DragDropTestModel,
        DragDropSlotModel,
    } from "../../../../models/testTypes.js";
    import { nanoid } from "nanoid";
    import { addNotification } from "../../../../stores/notifications.js";
    import { API_BASE_URL } from "../../../../config.js";
    import { fade, slide } from "svelte/transition";

    import PlusCircleOutline from "svelte-material-icons/PlusCircleOutline.svelte";
    import DeleteOutline from "svelte-material-icons/DeleteOutline.svelte";
    import ImagePlusOutline from "svelte-material-icons/ImagePlusOutline.svelte";
    import MusicNotePlus from "svelte-material-icons/MusicNotePlus.svelte";
    import Close from "svelte-material-icons/Close.svelte";
    import AspectRatioIcon from "svelte-material-icons/AspectRatio.svelte";
    import ContentSaveEditOutline from "svelte-material-icons/ContentSaveEditOutline.svelte";
    import PencilOutline from "svelte-material-icons/PencilOutline.svelte";
    import Cropper from "svelte-easy-crop";

    export let testData;
    export let isEditing = false;
    export let isLoading = false;

    const dispatch = createEventDispatcher();

    let localTestModel = new DragDropTestModel({
        title: "",
        description: "",
        test_type: "drag-and-drop",
    });

    let testAttachedImageFile = null;
    let testImagePreviewUrl = null;
    let testCurrentServerImageId = null;
    let testCurrentServerImageUrl = null;
    let testImageCrop = { x: 0, y: 0 };
    let testImageZoom = 1;
    let testImageCroppedAreaPixels = null;
    let testImageAspectRatio = 16 / 9;
    const testImageAspectRatios = [
        { label: "16:9", value: 16 / 9 },
        { label: "4:3", value: 4 / 3 },
        { label: "1:1", value: 1 / 1 },
        { label: "Своб.", value: null },
    ];

    let testAttachedAudioFile = null;
    let testAudioFileName = null;
    let testCurrentServerAudioId = null;
    let testCurrentServerAudioUrl = null;

    let newOptionPoolText = "";

    const slotImageAspectRatios = [
        { label: "16:9", value: 16 / 9 },
        { label: "4:3", value: 4 / 3 },
        { label: "1:1", value: 1 / 1 },
        { label: "Своб.", value: null },
    ];

    let attachedSlotFiles = new Map();
    let attachedSlotAudioFiles = new Map();

    function generateTemporaryId() {
        return `temp_slot_${nanoid(6)}`;
    }

    function initializeModel(currentTestData) {
        if (
            !currentTestData ||
            Object.keys(currentTestData).length === 0 ||
            currentTestData.test_type !== "drag-and-drop"
        ) {
            localTestModel = new DragDropTestModel({
                title: "",
                description: "",
                test_type: "drag-and-drop",
            });
        } else {
            const slotsCopy = currentTestData.drag_drop_slots
                ? currentTestData.drag_drop_slots.map((s) => {
                      const slotId =
                          s.id && typeof s.id !== "symbol"
                              ? s.id
                              : generateTemporaryId();
                      const slot = new DragDropSlotModel({
                          ...s,
                          id: slotId,
                          prompt_image_file:
                              s.prompt_image_details?.image || null,
                          prompt_audio_file:
                              s.prompt_audio_details?.audio_file || null,
                      });

                      slot._attachedImageFile = null;
                      slot._currentServerImageId =
                          s.prompt_image_details?.id || null;
                      slot._currentServerImageUrl =
                          s.prompt_image_details?.image || null;
                      if (slot._currentServerImageUrl) {
                          slot._imagePreviewUrl =
                              slot._currentServerImageUrl.startsWith("http")
                                  ? slot._currentServerImageUrl
                                  : API_BASE_URL + slot._currentServerImageUrl;
                      } else {
                          slot._imagePreviewUrl = null;
                      }
                      slot._imageCrop = { x: 0, y: 0 };
                      slot._imageZoom = 1;
                      slot._imageCroppedAreaPixels = null;
                      slot._imageAspectRatio =
                          s.aspect_ratio_for_prompt_image || 16 / 9;

                      slot._attachedAudioFile = null;
                      slot._currentServerAudioId =
                          s.prompt_audio_details?.id || null;
                      slot._currentServerAudioUrl =
                          s.prompt_audio_details?.audio_file || null;
                      if (slot._currentServerAudioUrl) {
                          const name = slot._currentServerAudioUrl.substring(
                              slot._currentServerAudioUrl.lastIndexOf("/") + 1,
                          );
                          try {
                              slot._audioFileName = decodeURIComponent(name);
                          } catch (e) {
                              slot._audioFileName = name;
                          }
                      } else {
                          slot._audioFileName = null;
                      }

                      return slot;
                  })
                : [];
            const poolCopy = currentTestData.draggable_options_pool
                ? [...currentTestData.draggable_options_pool]
                : [];
            localTestModel = new DragDropTestModel({
                ...currentTestData,
                drag_drop_slots: slotsCopy,
                draggable_options_pool: poolCopy,
            });
        }
        testCurrentServerImageId = currentTestData?.attached_image_id || null;
        testCurrentServerImageUrl =
            currentTestData?.attached_image_details?.image || null;
        if (testCurrentServerImageUrl && !testAttachedImageFile) {
            testImagePreviewUrl = testCurrentServerImageUrl.startsWith("http")
                ? testCurrentServerImageUrl
                : API_BASE_URL + testCurrentServerImageUrl;
        } else if (!testAttachedImageFile) {
            testImagePreviewUrl = null;
        }

        testCurrentServerAudioId = currentTestData?.attached_audio_id || null;
        testCurrentServerAudioUrl =
            currentTestData?.attached_audio_details?.audio_file || null;
        if (testCurrentServerAudioUrl && !testAttachedAudioFile) {
            const name = testCurrentServerAudioUrl.substring(
                testCurrentServerAudioUrl.lastIndexOf("/") + 1,
            );
            try {
                testAudioFileName = decodeURIComponent(name);
            } catch (e) {
                testAudioFileName = name;
            }
        } else if (!testAttachedAudioFile) {
            testAudioFileName = null;
        }

        if (
            localTestModel.draggable_options_pool.length === 0 &&
            currentTestData?.title !== undefined
        ) {
            localTestModel.addOptionToPool("Пример варианта 1");
            localTestModel.addOptionToPool("Пример варианта 2");
        }
        if (
            localTestModel.drag_drop_slots.length === 0 &&
            currentTestData?.title !== undefined
        ) {
            localTestModel.addSlot({
                id: generateTemporaryId(),
                correct_answer_text:
                    localTestModel.draggable_options_pool[0] || "",
            });
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
            test_type: testData.test_type,
            imgId: testData.attached_image_id,
            audId: testData.attached_audio_id,
            poolCount: testData.draggable_options_pool?.length,
            slotsCount: testData.drag_drop_slots?.length,
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
            if (testImagePreviewUrl && testImagePreviewUrl.startsWith("blob:"))
                URL.revokeObjectURL(testImagePreviewUrl);
            testImagePreviewUrl = URL.createObjectURL(file);
            testImageCrop = { x: 0, y: 0 };
            testImageZoom = 1;
            testImageCroppedAreaPixels = null;
        }
        event.target.value = null;
    }
    function onTestImageCropComplete(e) {
        testImageCroppedAreaPixels = e.detail.pixels;
    }
    async function getCroppedGeneralTestImage(imageSrc, pixelCrop) {
        if (!pixelCrop || pixelCrop.width === 0 || pixelCrop.height === 0)
            return testAttachedImageFile || null;
        const image = new Image();
        image.src = imageSrc;
        try {
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });
        } catch (error) {
            /* addNotification("Ошибка загрузки общего изображения для обрезки.", "error"); */ return null;
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
                            testAttachedImageFile?.name || "cropped_image.png",
                            { type: blob.type || "image/png" },
                        ),
                    );
                },
                testAttachedImageFile?.type || "image/png",
                0.9,
            );
        });
    }
    function removeTestAttachedImage() {
        testAttachedImageFile = null;
        if (testImagePreviewUrl && testImagePreviewUrl.startsWith("blob:"))
            URL.revokeObjectURL(testImagePreviewUrl);
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
        if (
            localTestModel.draggable_options_pool.includes(
                newOptionPoolText.trim(),
            )
        ) {
            /* addNotification("Такая опция уже есть в пуле.", "warning"); */ return;
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
        if (
            newText &&
            !localTestModel.draggable_options_pool
                .filter((o, i) => i !== index)
                .includes(newText)
        ) {
            const oldText = localTestModel.draggable_options_pool[index];
            localTestModel.draggable_options_pool[index] = newText;
            localTestModel.drag_drop_slots.forEach((slot) => {
                if (slot.correct_answer_text === oldText) {
                    slot.correct_answer_text = newText;
                }
            });
            localTestModel = localTestModel;
        } else if (!newText) {
            event.target.value = localTestModel.draggable_options_pool[index];
        } else {
            event.target.value = localTestModel.draggable_options_pool[index];
        }
    }

    function handleAddSlot() {
        const newSlot = {
            id: generateTemporaryId(),
            correct_answer_text: localTestModel.draggable_options_pool[0] || "",
            prompt_text: "",
            explanation: "",
            prompt_image_file: null,
            prompt_audio_file: null,
            _attachedImageFile: null,
            _imagePreviewUrl: null,
            _currentServerImageId: null,
            _currentServerImageUrl: null,
            _imageCrop: { x: 0, y: 0 },
            _imageZoom: 1,
            _imageCroppedAreaPixels: null,
            _imageAspectRatio: 16 / 9,
            _attachedAudioFile: null,
            _audioFileName: null,
            _currentServerAudioId: null,
            _currentServerAudioUrl: null,
        };
        localTestModel.addSlot(newSlot);
        localTestModel = localTestModel;
    }

    function handleSlotImageFileChange(slotToUpdate, event) {
        const file = event.target.files[0];
        if (file) {
            attachedSlotFiles.set(slotToUpdate.id, file);
            attachedSlotFiles = attachedSlotFiles;

            const index = localTestModel.drag_drop_slots.findIndex(
                (s) => s.id === slotToUpdate.id,
            );
            if (index !== -1) {
                const originalSlot = localTestModel.drag_drop_slots[index];

                if (
                    originalSlot._imagePreviewUrl &&
                    originalSlot._imagePreviewUrl.startsWith("blob:")
                ) {
                    URL.revokeObjectURL(originalSlot._imagePreviewUrl);
                }

                const updatedSlot = new DragDropSlotModel({
                    id: originalSlot.id,
                    prompt_text: originalSlot.prompt_text,
                    prompt_image_file: null,
                    prompt_audio_file: originalSlot.prompt_audio_file,
                    correct_answer_text: originalSlot.correct_answer_text,
                    explanation: originalSlot.explanation,
                    order: originalSlot.order,
                });

                updatedSlot._currentServerImageId = null;
                updatedSlot._imagePreviewUrl = URL.createObjectURL(file);
                updatedSlot._imageCrop = { x: 0, y: 0 };
                updatedSlot._imageZoom = 1;
                updatedSlot._imageCroppedAreaPixels = null;
                updatedSlot._imageAspectRatio = originalSlot._imageAspectRatio;

                updatedSlot._attachedAudioFile =
                    originalSlot._attachedAudioFile;
                updatedSlot._audioFileName = originalSlot._audioFileName;
                updatedSlot._currentServerAudioId =
                    originalSlot._currentServerAudioId;
                updatedSlot._currentServerAudioUrl =
                    originalSlot._currentServerAudioUrl;

                localTestModel.drag_drop_slots[index] = updatedSlot;
                localTestModel.drag_drop_slots = localTestModel.drag_drop_slots;
                localTestModel = localTestModel;
            }
        }
        event.target.value = null;
    }

    function onSlotImageCropChange(slot, e) {
        slot._imageCrop = e.detail;
        localTestModel = localTestModel;
    }
    function onSlotImageZoomChange(slot, e) {
        slot._imageZoom = e.detail;
        localTestModel = localTestModel;
    }
    function onSlotImageCropComplete(slot, e) {
        slot._imageCroppedAreaPixels = e.detail.pixels;
        localTestModel = localTestModel;
    }

    async function getCroppedSlotImage(slot, imageSrc, pixelCrop) {
        const originalFile = attachedSlotFiles.get(slot.id);

        if (
            !originalFile ||
            !pixelCrop ||
            pixelCrop.width === 0 ||
            pixelCrop.height === 0
        ) {
            return originalFile || null;
        }

        const image = new Image();
        image.src = imageSrc;
        try {
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });
        } catch (error) {
            console.error(
                "Ошибка загрузки изображения слота для обрезки:",
                error,
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
                        console.error(
                            "Не удалось создать Blob из canvas для слота",
                            slot.id,
                        );
                        resolve(null);
                        return;
                    }
                    resolve(
                        new File([blob], originalFile.name, {
                            type: originalFile.type || blob.type || "image/png",
                        }),
                    );
                },
                originalFile.type || "image/png",
                0.9,
            );
        });
    }
    function removeSlotAttachedImage(slotToRemoveImageFrom) {
        attachedSlotFiles.delete(slotToRemoveImageFrom.id);
        attachedSlotFiles = attachedSlotFiles;

        const index = localTestModel.drag_drop_slots.findIndex(
            (s) => s.id === slotToRemoveImageFrom.id,
        );
        if (index !== -1) {
            const originalSlot = localTestModel.drag_drop_slots[index];

            if (
                originalSlot._imagePreviewUrl &&
                originalSlot._imagePreviewUrl.startsWith("blob:")
            ) {
                URL.revokeObjectURL(originalSlot._imagePreviewUrl);
            }

            const updatedSlot = new DragDropSlotModel({
                id: originalSlot.id,
                prompt_text: originalSlot.prompt_text,
                prompt_image_file: null,
                prompt_audio_file: originalSlot.prompt_audio_file,
                correct_answer_text: originalSlot.correct_answer_text,
                explanation: originalSlot.explanation,
                order: originalSlot.order,
            });

            updatedSlot._attachedImageFile = null;
            updatedSlot._currentServerImageId = null;
            updatedSlot._imagePreviewUrl = null;
            updatedSlot._imageCrop = { x: 0, y: 0 };
            updatedSlot._imageZoom = 1;
            updatedSlot._imageCroppedAreaPixels = null;
            updatedSlot._imageAspectRatio = originalSlot._imageAspectRatio;

            updatedSlot._attachedAudioFile = originalSlot._attachedAudioFile;
            updatedSlot._audioFileName = originalSlot._audioFileName;
            updatedSlot._currentServerAudioId =
                originalSlot._currentServerAudioId;
            updatedSlot._currentServerAudioUrl =
                originalSlot._currentServerAudioUrl;

            localTestModel.drag_drop_slots[index] = updatedSlot;
            localTestModel.drag_drop_slots = localTestModel.drag_drop_slots;
            localTestModel = localTestModel;
        }
    }

    function handleSlotAudioFileChange(slotToUpdate, event) {
        const file = event.target.files[0];
        if (file) {
            attachedSlotAudioFiles.set(slotToUpdate.id, file);
            attachedSlotAudioFiles = attachedSlotAudioFiles;

            const index = localTestModel.drag_drop_slots.findIndex(
                (s) => s.id === slotToUpdate.id,
            );
            if (index !== -1) {
                const originalSlot = localTestModel.drag_drop_slots[index];

                const updatedSlot = new DragDropSlotModel({
                    id: originalSlot.id,
                    prompt_text: originalSlot.prompt_text,
                    prompt_image_file: originalSlot.prompt_image_file,
                    prompt_audio_file: null,
                    correct_answer_text: originalSlot.correct_answer_text,
                    explanation: originalSlot.explanation,
                    order: originalSlot.order,
                });

                updatedSlot._attachedAudioFile = file;
                updatedSlot._currentServerAudioId = null;
                updatedSlot._audioFileName = file.name;

                updatedSlot._attachedImageFile =
                    originalSlot._attachedImageFile;
                updatedSlot._currentServerImageId =
                    originalSlot._currentServerImageId;
                updatedSlot._imagePreviewUrl = originalSlot._imagePreviewUrl;
                updatedSlot._imageCrop = originalSlot._imageCrop;
                updatedSlot._imageZoom = originalSlot._imageZoom;
                updatedSlot._imageCroppedAreaPixels =
                    originalSlot._imageCroppedAreaPixels;
                updatedSlot._imageAspectRatio = originalSlot._imageAspectRatio;

                localTestModel.drag_drop_slots[index] = updatedSlot;
                localTestModel.drag_drop_slots = localTestModel.drag_drop_slots;
                localTestModel = localTestModel;
            }
        }
        event.target.value = null;
    }

    function removeSlotAttachedAudio(slotToRemoveAudioFrom) {
        attachedSlotAudioFiles.delete(slotToRemoveAudioFrom.id);
        attachedSlotAudioFiles = attachedSlotAudioFiles;

        const index = localTestModel.drag_drop_slots.findIndex(
            (s) => s.id === slotToRemoveAudioFrom.id,
        );
        if (index !== -1) {
            const originalSlot = localTestModel.drag_drop_slots[index];

            const updatedSlot = new DragDropSlotModel({
                id: originalSlot.id,
                prompt_text: originalSlot.prompt_text,
                prompt_image_file: originalSlot.prompt_image_file,
                prompt_audio_file: null,
                correct_answer_text: originalSlot.correct_answer_text,
                explanation: originalSlot.explanation,
                order: originalSlot.order,
            });

            updatedSlot._attachedAudioFile = null;
            updatedSlot._audioFileName = null;
            updatedSlot._currentServerAudioId = null;
            updatedSlot._currentServerAudioUrl = null;

            updatedSlot._attachedImageFile = originalSlot._attachedImageFile;
            updatedSlot._currentServerImageId =
                originalSlot._currentServerImageId;
            updatedSlot._imagePreviewUrl = originalSlot._imagePreviewUrl;
            updatedSlot._imageCrop = originalSlot._imageCrop;
            updatedSlot._imageZoom = originalSlot._imageZoom;
            updatedSlot._imageCroppedAreaPixels =
                originalSlot._imageCroppedAreaPixels;
            updatedSlot._imageAspectRatio = originalSlot._imageAspectRatio;

            localTestModel.drag_drop_slots[index] = updatedSlot;
            localTestModel.drag_drop_slots = localTestModel.drag_drop_slots;
            localTestModel = localTestModel;
        }
    }

    function removeSlot(index) {
        const slotToRemove = localTestModel.drag_drop_slots[index];
        if (
            slotToRemove._imagePreviewUrl &&
            slotToRemove._imagePreviewUrl.startsWith("blob:")
        ) {
            URL.revokeObjectURL(slotToRemove._imagePreviewUrl);
        }
        localTestModel.removeSlot(index);
        localTestModel = localTestModel;
    }

    function validateTest() {
        if (!localTestModel.title.trim()) {
            addNotification("Название теста не может быть пустым.", "error");
            return false;
        }
        if (localTestModel.draggable_options_pool.length === 0) {
            addNotification(
                "Пул опций не может быть пустым. Добавьте варианты для перетаскивания.",
                "error",
            );
            return false;
        }
        if (localTestModel.drag_drop_slots.length === 0) {
            addNotification(
                "Добавьте хотя бы одну ячейку для ответа (слот).",
                "error",
            );
            return false;
        }
        for (const slot of localTestModel.drag_drop_slots) {
            if (!slot.correct_answer_text) {
                addNotification(
                    "Каждый слот должен иметь выбранный правильный ответ из пула.",
                    "error",
                );
                return false;
            }
        }
        return true;
    }

    async function handleSave() {
        if (!localTestModel || !validateTest()) return;
        console.log("[DragDropForm] handleSave: Начало сохранения.");

        let finalGeneralImageFile = null;
        if (testAttachedImageFile && testImagePreviewUrl) {
            if (
                testImageCroppedAreaPixels &&
                testImageCroppedAreaPixels.width > 0 &&
                testImageCroppedAreaPixels.height > 0
            ) {
                finalGeneralImageFile = await getCroppedGeneralTestImage(
                    testImagePreviewUrl,
                    testImageCroppedAreaPixels,
                );
            } else {
                finalGeneralImageFile = testAttachedImageFile;
            }
        }

        const formData = new FormData();
        const testDefinition = localTestModel.toPayload();

        testDefinition.attached_image = finalGeneralImageFile
            ? null
            : testCurrentServerImageId;
        testDefinition.attached_audio = testAttachedAudioFile
            ? null
            : testCurrentServerAudioId;

        if (finalGeneralImageFile) {
            formData.append("attached_image_file", finalGeneralImageFile);
            console.log(
                "[DragDropForm] handleSave: Добавлен общий файл изображения:",
                finalGeneralImageFile.name,
            );
        }
        if (testAttachedAudioFile) {
            formData.append("attached_audio_file", testAttachedAudioFile);
            console.log(
                "[DragDropForm] handleSave: Добавлен общий файл аудио:",
                testAttachedAudioFile.name,
            );
        }


        Object.keys(testDefinition).forEach((key) => {
            if (testDefinition[key] === undefined) delete testDefinition[key];
        });
        formData.append("test_definition", JSON.stringify(testDefinition));
        console.log(
            "[DragDropForm] handleSave: JSON 'test_definition' добавлен:",
            JSON.stringify(testDefinition, null, 2),
        );
        console.log(
            "[DragDropForm] handleSave: Количество слотов в localTestModel.drag_drop_slots:",
            localTestModel.drag_drop_slots.length,
        );
        console.log(
            "[DragDropForm] handleSave: Содержимое attachedSlotFiles (Map):",
            new Map(attachedSlotFiles),
        );

        for (let i = 0; i < localTestModel.drag_drop_slots.length; i++) {
            const slot = localTestModel.drag_drop_slots[i];
            console.log(
                `[DragDropForm] handleSave: Обработка слота ${i + 1} (ID: ${slot.id})`,
            );

            let fileFromMap = attachedSlotFiles.get(slot.id);
            console.log(
                `[DragDropForm] handleSave: Слот ${i + 1} (ID: ${slot.id}) - файл изображения из Map:`,
                fileFromMap ? fileFromMap.name : "НЕТ ФАЙЛА В MAP",
            );

            if (fileFromMap) {
                let finalSlotImageFile = null;
                if (
                    slot._imagePreviewUrl &&
                    slot._imageCroppedAreaPixels &&
                    slot._imageCroppedAreaPixels.width > 0 &&
                    slot._imageCroppedAreaPixels.height > 0
                ) {
                    console.log(
                        `[DragDropForm] handleSave: Слот ${i + 1} (ID: ${slot.id}) - попытка обрезки изображения.`,
                    );
                    finalSlotImageFile = await getCroppedSlotImage(
                        slot,
                        slot._imagePreviewUrl,
                        slot._imageCroppedAreaPixels,
                    );
                    console.log(
                        `[DragDropForm] handleSave: Слот ${i + 1} (ID: ${slot.id}) - результат обрезки:`,
                        finalSlotImageFile
                            ? finalSlotImageFile.name
                            : "ОБРЕЗКА НЕУДАЧНА / НЕТ ФАЙЛА",
                    );
                } else {
                    finalSlotImageFile = fileFromMap;
                    console.log(
                        `[DragDropForm] handleSave: Слот ${i + 1} (ID: ${slot.id}) - используется оригинальный файл из Map:`,
                        finalSlotImageFile.name,
                    );
                }

                if (finalSlotImageFile instanceof File) {
                    formData.append(
                        `prompt_image_file_${slot.id}`,
                        finalSlotImageFile,
                    );
                    console.log(
                        `[DragDropForm] handleSave: Слот ${i + 1} (ID: ${slot.id}) - ДОБАВЛЕН файл 'prompt_image_file_${slot.id}':`,
                        finalSlotImageFile.name,
                    );
                }
            }

            let audioFileFromMap = attachedSlotAudioFiles.get(slot.id);
            if (audioFileFromMap) {
                formData.append(
                    `prompt_audio_file_${slot.id}`,
                    audioFileFromMap,
                );
                console.log(
                    `[DragDropForm] handleSave: Слот ${i + 1} (ID: ${slot.id}) - файл аудио ${audioFileFromMap.name} добавлен как 'prompt_audio_file_${slot.id}'.`,
                );
            }
        }

        console.log(
            "[DragDropForm] handleSave: Содержимое FormData перед отправкой (ключи):",
        );
        for (let pair of formData.entries()) {
            if (pair[1] instanceof File) {
                console.log(
                    `  ${pair[0]}: File (name: ${pair[1].name}, size: ${pair[1].size}, type: ${pair[1].type})`,
                );
            } else {
                console.log(`  ${pair[0]}: ${pair[1]}`);
            }
        }

        dispatch("save", formData);
        console.log("[DragDropForm] handleSave: Событие 'save' отправлено.");
    }

    onDestroy(() => {
        if (testImagePreviewUrl && testImagePreviewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(testImagePreviewUrl);
        }
        localTestModel.drag_drop_slots.forEach((slot) => {
            if (
                slot._imagePreviewUrl &&
                slot._imagePreviewUrl.startsWith("blob:")
            ) {
                URL.revokeObjectURL(slot._imagePreviewUrl);
            }
        });
    });
</script>

<div class="item-form drag-drop-test-form">
    {#if localTestModel}
        <div class="form-group">
            <label for={"dd-test-title-" + (localTestModel.id || "new")}
                >Название теста</label
            >
            <input
                type="text"
                id={"dd-test-title-" + (localTestModel.id || "new")}
                bind:value={localTestModel.title}
                placeholder="Название Drag & Drop теста"
                disabled={isLoading}
            />
        </div>
        <div class="form-group">
            <label for={"dd-test-description-" + (localTestModel.id || "new")}
                >Описание/Инструкция</label
            >
            <textarea
                id={"dd-test-description-" + (localTestModel.id || "new")}
                bind:value={localTestModel.description}
                rows="3"
                placeholder="Описание задания"
                disabled={isLoading}
            ></textarea>
        </div>

        <div class="attachments-section">
            <h4 class="attachments-header">
                Общие материалы к тесту (опционально):
            </h4>
            <div class="form-row">
                <div class="form-group attachment-control">
                    <label
                        for={"dd-test-image-upload-" +
                            (localTestModel.id || "new")}
                        >Общее изображение к тесту</label
                    >
                    {#if testImagePreviewUrl}
                        <div class="cropper-wrapper-test general-test-cropper">
                            <Cropper
                                image={testImagePreviewUrl}
                                bind:crop={testImageCrop}
                                bind:zoom={testImageZoom}
                                aspect={testImageAspectRatio}
                                on:cropcomplete={onTestImageCropComplete}
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
                                bind:value={testImageZoom}
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
                                {#each testImageAspectRatios as ar}
                                    <button
                                        type="button"
                                        class="aspect-btn"
                                        class:active={testImageAspectRatio ===
                                            ar.value}
                                        on:click={() =>
                                            (testImageAspectRatio = ar.value)}
                                        title={ar.label}>{ar.label}</button
                                    >
                                {/each}
                            </div>
                            <label
                                class="file-upload-label small"
                                for={"dd-test-image-replace-" +
                                    (localTestModel.id || "new")}
                            >
                                <ImagePlusOutline size="18px" /><span
                                    >Заменить</span
                                >
                            </label>
                            <input
                                type="file"
                                id={"dd-test-image-replace-" +
                                    (localTestModel.id || "new")}
                                class="visually-hidden"
                                accept="image/*"
                                on:change={handleTestImageFileChange}
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                class="remove-attachment-btn small"
                                on:click={removeTestAttachedImage}
                                title="Удалить изображение"
                            >
                                <Close size="18px" />
                            </button>
                        </div>
                    {:else}
                        <label
                            class="file-upload-label main-upload-trigger"
                            for={"dd-test-image-upload-input-" +
                                (localTestModel.id || "new")}
                        >
                            <ImagePlusOutline size="24px" />
                            <span
                                >{testCurrentServerImageId
                                    ? `ID: ${testCurrentServerImageId}. Загрузить новый.`
                                    : "Загрузить изображение"}</span
                            >
                        </label>
                        <input
                            type="file"
                            id={"dd-test-image-upload-input-" +
                                (localTestModel.id || "new")}
                            class="visually-hidden"
                            accept="image/*"
                            on:change={handleTestImageFileChange}
                            disabled={isLoading}
                        />
                    {/if}
                    {#if testCurrentServerImageId && !testImagePreviewUrl && !testAttachedImageFile}
                        <small class="form-hint removed-hint"
                            >Изображение (ID: {testCurrentServerImageId}) будет
                            удалено.</small
                        >
                    {/if}
                </div>
                <div class="form-group attachment-control">
                    <label
                        for={"dd-test-audio-upload-" +
                            (localTestModel.id || "new")}
                        >Общее аудио к тесту</label
                    >
                    {#if testAudioFileName}
                        <div class="audio-filename-display">
                            <span>{testAudioFileName}</span>
                            <button
                                type="button"
                                class="remove-attachment-btn small"
                                on:click={removeTestAttachedAudio}
                                title="Удалить аудио"
                            >
                                <Close size="18px" />
                            </button>
                        </div>
                    {/if}
                    <label
                        class="file-upload-label main-upload-trigger"
                        class:hidden={!!testAudioFileName}
                        for={"dd-test-audio-upload-input-" +
                            (localTestModel.id || "new")}
                    >
                        <MusicNotePlus size="24px" />
                        <span
                            >{testCurrentServerAudioId
                                ? `ID: ${testCurrentServerAudioId}. Загрузить новый.`
                                : "Загрузить аудио"}</span
                        >
                    </label>
                    <input
                        type="file"
                        id={"dd-test-audio-upload-input-" +
                            (localTestModel.id || "new")}
                        class="visually-hidden"
                        accept="audio/*"
                        on:change={handleTestAudioFileChange}
                        disabled={isLoading}
                    />
                    {#if testCurrentServerAudioId && !testAudioFileName && !testAttachedAudioFile}
                        <small class="form-hint removed-hint"
                            >Аудио (ID: {testCurrentServerAudioId}) будет
                            удалено.</small
                        >
                    {/if}
                </div>
            </div>
        </div>

        <div class="form-section">
            <h4 class="section-header">
                Пул облачков (варианты для перетаскивания):
            </h4>
            <div class="option-pool-controls">
                <input
                    type="text"
                    bind:value={newOptionPoolText}
                    placeholder="Текст нового облачка"
                    disabled={isLoading}
                />
                <button
                    type="button"
                    class="btn-add-small"
                    on:click={addOptionToDraggablePool}
                    disabled={isLoading || !newOptionPoolText.trim()}
                >
                    <PlusCircleOutline size="18px" />Добавить в пул
                </button>
            </div>
            <div class="options-pool-list">
                {#each localTestModel.draggable_options_pool as optionText, index ("pool-" + optionText + index)}
                    <div class="pool-option-item" transition:fade|local>
                        <input
                            type="text"
                            value={optionText}
                            on:change={(e) => editOptionInPool(index, e)}
                            placeholder="Текст облачка"
                            class="pool-option-input"
                        />
                        <button
                            type="button"
                            class="btn-delete-small"
                            on:click={() =>
                                removeOptionFromDraggablePool(optionText)}
                            title="Удалить из пула"
                        >
                            <DeleteOutline size="18px" />
                        </button>
                    </div>
                {/each}
                {#if localTestModel.draggable_options_pool.length === 0}
                    <p class="empty-list-message">
                        Пул опций пуст. Добавьте варианты.
                    </p>
                {/if}
            </div>
        </div>

        <div class="form-section">
            <h4 class="section-header">Ячейки для ответов (слоты):</h4>
            {#if localTestModel.drag_drop_slots.length > 0}
                <div class="slots-list">
                    {#each localTestModel.drag_drop_slots as slot, index (slot.id)}
                        <div class="slot-item" transition:slide|local>
                            <div class="slot-header">
                                <h5>Слот #{index + 1}</h5>
                                <button
                                    type="button"
                                    class="btn-delete-small"
                                    on:click={() => removeSlot(index)}
                                    title="Удалить слот"
                                    disabled={isLoading}
                                >
                                    <DeleteOutline size="18px" />
                                </button>
                            </div>
                            <div class="form-group">
                                <label
                                    for={"slot-prompt-text-" +
                                        index +
                                        "-" +
                                        slot.id}
                                    >Задание для слота (текст, опционально)</label
                                >
                                <input
                                    type="text"
                                    id={"slot-prompt-text-" +
                                        index +
                                        "-" +
                                        slot.id}
                                    bind:value={slot.prompt_text}
                                    placeholder="Текст над/рядом со слотом"
                                    disabled={isLoading}
                                />
                            </div>
                            <div class="form-row">
                                <div class="form-group attachment-control">
                                    <label
                                        for={"slot-image-upload-" +
                                            index +
                                            "-" +
                                            slot.id}
                                        >Изображение для задания</label
                                    >
                                    {#if slot._imagePreviewUrl}
                                        <div
                                            class="cropper-wrapper-test slot-cropper"
                                        >
                                            <Cropper
                                                image={slot._imagePreviewUrl}
                                                bind:crop={slot._imageCrop}
                                                bind:zoom={slot._imageZoom}
                                                aspect={slot._imageAspectRatio}
                                                on:cropcomplete={(e) =>
                                                    onSlotImageCropComplete(
                                                        slot,
                                                        e,
                                                    )}
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
                                                bind:value={slot._imageZoom}
                                                min="1"
                                                max="5"
                                                step="0.1"
                                                class="zoom-slider"
                                                on:input={() =>
                                                    (localTestModel =
                                                        localTestModel)}
                                            />
                                        </div>
                                        <div class="attachment-actions">
                                            <div class="aspect-ratio-controls">
                                                <span title="Соотношение сторон"
                                                    ><AspectRatioIcon
                                                        size="18px"
                                                    /></span
                                                >
                                                {#each slotImageAspectRatios as ar}
                                                    <button
                                                        type="button"
                                                        class="aspect-btn"
                                                        class:active={slot._imageAspectRatio ===
                                                            ar.value}
                                                        on:click={() => {
                                                            slot._imageAspectRatio =
                                                                ar.value;
                                                            localTestModel =
                                                                localTestModel;
                                                        }}
                                                        title={ar.label}
                                                        >{ar.label}</button
                                                    >
                                                {/each}
                                            </div>
                                            <label
                                                class="file-upload-label small"
                                                for={"slot-image-replace-" +
                                                    index +
                                                    "-" +
                                                    slot.id}
                                            >
                                                <ImagePlusOutline
                                                    size="18px"
                                                /><span>Заменить</span>
                                            </label>
                                            <input
                                                type="file"
                                                id={"slot-image-replace-" +
                                                    index +
                                                    "-" +
                                                    slot.id}
                                                class="visually-hidden"
                                                accept="image/*"
                                                on:change={(e) =>
                                                    handleSlotImageFileChange(
                                                        slot,
                                                        e,
                                                    )}
                                                disabled={isLoading}
                                            />
                                            <button
                                                type="button"
                                                class="remove-attachment-btn small"
                                                on:click={() =>
                                                    removeSlotAttachedImage(
                                                        slot,
                                                    )}
                                                title="Удалить изображение"
                                            >
                                                <Close size="18px" />
                                            </button>
                                        </div>
                                    {:else}
                                        <label
                                            class="file-upload-label main-upload-trigger"
                                            for={"slot-image-upload-input-" +
                                                index +
                                                "-" +
                                                slot.id}
                                        >
                                            <ImagePlusOutline size="24px" />
                                            <span
                                                >{slot._currentServerImageId
                                                    ? `ID: ${slot._currentServerImageId}. Загрузить новый.`
                                                    : "Загрузить изображение"}</span
                                            >
                                        </label>
                                        <input
                                            type="file"
                                            id={"slot-image-upload-input-" +
                                                index +
                                                "-" +
                                                slot.id}
                                            class="visually-hidden"
                                            accept="image/*"
                                            on:change={(e) =>
                                                handleSlotImageFileChange(
                                                    slot,
                                                    e,
                                                )}
                                            disabled={isLoading}
                                        />
                                    {/if}
                                    {#if slot._currentServerImageId && !slot._imagePreviewUrl && !slot._attachedImageFile}
                                        <small class="form-hint removed-hint"
                                            >Изображение (ID: {slot._currentServerImageId})
                                            будет удалено.</small
                                        >
                                    {/if}
                                </div>
                                <div class="form-group attachment-control">
                                    <label
                                        for={"slot-audio-upload-" +
                                            index +
                                            "-" +
                                            slot.id}>Аудио для задания</label
                                    >
                                    {#if slot._audioFileName}
                                        <div class="audio-filename-display">
                                            <span>{slot._audioFileName}</span>
                                            <button
                                                type="button"
                                                class="remove-attachment-btn small"
                                                on:click={() =>
                                                    removeSlotAttachedAudio(
                                                        slot,
                                                    )}
                                                title="Удалить аудио"
                                            >
                                                <Close size="18px" />
                                            </button>
                                        </div>
                                    {/if}
                                    <label
                                        class="file-upload-label main-upload-trigger"
                                        class:hidden={!!slot._audioFileName}
                                        for={"slot-audio-upload-input-" +
                                            index +
                                            "-" +
                                            slot.id}
                                    >
                                        <MusicNotePlus size="24px" />
                                        <span
                                            >{slot._currentServerAudioId
                                                ? `ID: ${slot._currentServerAudioId}. Загрузить новый.`
                                                : "Загрузить аудио"}</span
                                        >
                                    </label>
                                    <input
                                        type="file"
                                        id={"slot-audio-upload-input-" +
                                            index +
                                            "-" +
                                            slot.id}
                                        class="visually-hidden"
                                        accept="audio/*"
                                        on:change={(e) =>
                                            handleSlotAudioFileChange(slot, e)}
                                        disabled={isLoading}
                                    />
                                    {#if slot._currentServerAudioId && !slot._audioFileName && !slot._attachedAudioFile}
                                        <small class="form-hint removed-hint"
                                            >Аудио (ID: {slot._currentServerAudioId})
                                            будет удалено.</small
                                        >
                                    {/if}
                                </div>
                            </div>
                            <div class="form-group">
                                <label
                                    for={"slot-correct-answer-" +
                                        index +
                                        "-" +
                                        slot.id}
                                    >Правильное облачко для этого слота</label
                                >
                                <select
                                    id={"slot-correct-answer-" +
                                        index +
                                        "-" +
                                        slot.id}
                                    bind:value={slot.correct_answer_text}
                                    disabled={isLoading ||
                                        localTestModel.draggable_options_pool
                                            .length === 0}
                                >
                                    <option
                                        value=""
                                        disabled={slot.correct_answer_text !==
                                            ""}
                                        >-- Выберите ответ из пула --</option
                                    >
                                    {#each localTestModel.draggable_options_pool as poolOpt (poolOpt)}
                                        <option value={poolOpt}
                                            >{poolOpt}</option
                                        >
                                    {/each}
                                </select>
                                {#if localTestModel.draggable_options_pool.length === 0 && localTestModel.drag_drop_slots.length > 0}
                                    <small class="form-hint error"
                                        >Сначала добавьте опции в пул выше.</small
                                    >
                                {/if}
                            </div>
                            <div class="form-group">
                                <label
                                    for={"slot-explanation-" +
                                        index +
                                        "-" +
                                        slot.id}
                                    >Пояснение к этому слоту/ответу</label
                                >
                                <input
                                    type="text"
                                    id={"slot-explanation-" +
                                        index +
                                        "-" +
                                        slot.id}
                                    bind:value={slot.explanation}
                                    placeholder="Пояснение (опционально)"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
            <button
                type="button"
                class="add-slot-btn"
                on:click={handleAddSlot}
                disabled={isLoading}
            >
                <PlusCircleOutline size="18px" /> Добавить слот (ячейку)
            </button>
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
    .form-group label:not(.custom-checkbox-label):not(.file-upload-label) {
        margin-bottom: 7px;
        font-weight: 500;
        color: var(--color-text-muted);
        font-size: 0.9rem;
        display: block;
    }
    .form-group input[type="text"],
    .form-group input[type="number"],
    .form-group textarea,
    .form-group select {
        padding: 10px 14px;
        border: 1px solid var(--color-border-light, #d8dce6);
        border-radius: var(--spacing-border-radius-small, 8px);
        font-size: 0.95rem;
        transition:
            border-color 0.2s,
            box-shadow 0.2s;
        background-color: var(--color-bg-light, #fff);
        width: 100%;
        box-sizing: border-box;
    }
    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
        border-color: var(--color-primary, #afa4ff);
        box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 175, 164, 255), 0.2);
        outline: none;
    }
    .form-group textarea {
        line-height: 1.5;
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
        to {
            transform: rotate(360deg);
        }
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
    .form-hint {
        font-size: 0.8em;
        color: var(--color-text-muted);
        margin-top: 5px;
    }
    .form-hint.error {
        color: var(--color-danger-red);
    }
    .form-row {
        display: flex;
        gap: 20px;
        margin-bottom: 10px;
    }
    .form-row > .form-group {
        flex: 1;
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

    .drag-drop-test-form {
        min-height: auto;
        overflow: visible;
    }

    .drag-drop-test-form .form-section {
        margin-top: 25px;
        padding-top: 20px;
        border-top: 1px solid var(--color-border-light, #f0f0f0);
        clear: both;
    }
    .drag-drop-test-form .section-header,
    .drag-drop-test-form .attachments-header {
        font-size: 1.1em;
        font-weight: var(--font-weight-semi-bold);
        color: var(--color-text-dark);
        margin-bottom: 15px;
    }

    .attachments-section .attachment-control > label:first-child {
        font-size: 0.95rem;
        margin-bottom: 8px;
        color: var(--color-text-dark);
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

    .cropper-wrapper-test.general-test-cropper,
    .cropper-wrapper-test.slot-cropper {
        position: relative;
        width: 100%;
        height: 200px;
        max-height: 200px;
        background: #eef2f7;
        border-radius: var(--spacing-border-radius-small);
        overflow: hidden;
        margin-bottom: 10px;
        border: 1px solid var(--color-border-light);
        min-height: 150px;
        contain: content;
        transform: translateZ(0);
    }
    .attachment-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
        gap: 10px;
        flex-wrap: wrap;
    }
    .aspect-ratio-controls {
        display: flex;
        gap: 5px;
        align-items: center;
        color: var(--color-text-muted);
    }
    .aspect-ratio-controls > span {
        margin-right: 5px;
        display: inline-flex;
        align-items: center;
    }
    .aspect-btn {
        font-size: 0.75em;
        padding: 4px 8px;
        border: 1px solid #ccc;
        background: #f9f9f9;
        border-radius: 4px;
        cursor: pointer;
        line-height: 1.2;
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
    .remove-attachment-btn.small {
        width: 26px;
        height: 26px;
    }
    .remove-attachment-btn:hover {
        background-color: rgba(var(--color-danger-red-rgb, 255, 77, 77), 0.1);
        color: var(--color-danger-red);
        border-color: rgba(var(--color-danger-red-rgb, 255, 77, 77), 0.3);
    }
    .image-preview-wrapper {
        position: relative;
        margin-bottom: 10px;
        padding: 5px;
        border: 1px solid var(--color-border-light);
        border-radius: var(--spacing-border-radius-small);
        background-color: var(--color-bg-light);
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
    .audio-filename-display span {
        font-size: 0.9em;
        color: var(--color-text-dark);
        word-break: break-all;
        margin-right: 10px;
    }
    .form-hint.removed-hint {
        color: var(--color-danger-red);
        font-weight: 500;
    }

    .option-pool-controls {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
        align-items: center;
    }
    .option-pool-controls input[type="text"] {
        flex-grow: 1;
        margin-bottom: 0;
    }
    .btn-add-small {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        font-size: 0.85rem;
        color: var(--color-primary);
        background-color: transparent;
        border: 1px solid var(--color-primary-light);
        border-radius: var(--spacing-border-radius-button);
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
    }
    .btn-add-small:hover:not(:disabled) {
        background-color: var(--color-primary-light);
        color: var(--color-primary-dark);
        border-color: var(--color-primary);
    }
    .btn-add-small:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .options-pool-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 10px;
        background-color: var(--color-bg-light);
        border: 1px solid var(--color-border-light);
        border-radius: var(--spacing-border-radius-small);
        min-height: 40px;
    }
    .pool-option-item {
        display: flex;
        align-items: center;
        gap: 6px;
        background-color: var(--color-primary-light);
        color: var(--color-primary-dark);
        padding: 6px 8px 6px 12px;
        border-radius: 15px;
        font-size: 0.9em;
        border: 1px solid transparent;
    }
    .pool-option-input {
        background: transparent;
        border: none;
        outline: none;
        padding: 2px 4px;
        color: inherit;
        font-size: inherit;
        width: auto;
        min-width: 50px;
        border-radius: 3px;
    }
    .pool-option-input:focus {
        background-color: rgba(255, 255, 255, 0.8);
        box-shadow: 0 0 0 2px var(--color-primary);
    }
    .btn-delete-small {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 2px;
        display: inline-flex;
        opacity: 0.7;
    }
    .btn-delete-small:hover {
        opacity: 1;
        color: var(--color-danger-red);
    }
    .empty-list-message {
        width: 100%;
        text-align: center;
        font-size: 0.9em;
        color: #999;
        font-style: italic;
        padding: 10px 0;
    }

    .slots-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 15px;
        margin-top: 10px;
    }
    .slot-item {
        border: 1px solid var(--color-border-admin-button);
        border-radius: var(--spacing-border-radius-block);
        padding: 15px;
        background-color: var(--color-bg-light);
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .slot-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
    }
    .slot-header h5 {
        margin: 0;
        font-size: 1em;
        font-weight: 600;
        color: var(--color-secondary);
    }
    .slot-item .form-group {
        margin-bottom: 5px;
    }
    .slot-item .form-group label {
        font-size: 0.85em;
    }
    .add-slot-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 16px;
        font-size: 0.9rem;
        color: var(--color-secondary);
        background-color: transparent;
        border: 1px dashed var(--color-secondary);
        border-radius: var(--spacing-border-radius-button);
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 15px;
    }
    .add-slot-btn:hover:not(:disabled) {
        background-color: rgba(var(--color-secondary-rgb), 0.1);
        border-style: solid;
    }
</style>
