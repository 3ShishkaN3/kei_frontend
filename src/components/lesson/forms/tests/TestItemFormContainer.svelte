<script>
    import { createEventDispatcher, onMount, tick } from 'svelte';
    import { 
        MCQTestModel, 
        FreeTextTestModel, 
        WordOrderTestModel,
        DragDropTestModel, // Добавили модель DragDrop
        // PronunciationTestModel, // Раскомментируй, когда будут готовы
        // SpellingTestModel     // Раскомментируй, когда будут готовы
    } from '../../../../models/testTypes.js'; 

    import MCQTestForm from './MCQTestForm.svelte';
    import WordOrderTestForm from './WordOrderTestForm.svelte'; // Добавили форму WordOrder
    import DragDropTestForm from './DragDropTestForm.svelte';   // Добавили форму DragDrop
    import FreeTextTestForm from './FreeTextTestForm.svelte';
    // import PronunciationTestForm from './PronunciationTestForm.svelte';
    // import SpellingTestForm from './SpellingTestForm.svelte';
    import { addNotification } from '../../../../stores/notifications.js'; // Для уведомлений, если нужно

    export let itemToEdit = null; 
    export let isLoading = false; 

    const dispatch = createEventDispatcher();

    let selectedTestType = 'mcq-single'; 
    let testDataForForm = null; 
    let specificTestFormComponent = null;

    const availableTestTypes = [
        { value: 'mcq-single', label: 'MCQ (Один ответ)', component: MCQTestForm, model: MCQTestModel },
        { value: 'mcq-multi', label: 'MCQ (Несколько ответов)', component: MCQTestForm, model: MCQTestModel },
        { value: 'word-order', label: 'Порядок слов (из пула)', component: WordOrderTestForm, model: WordOrderTestModel },
        { value: 'drag-and-drop', label: 'Перетаскивание (Облачка и Ячейки)', component: DragDropTestForm, model: DragDropTestModel},
        { value: 'free-text', label: 'Свободный ответ', component: FreeTextTestForm, model: FreeTextTestModel },
        // { value: 'pronunciation', label: 'Произношение', component: PronunciationTestForm, model: PronunciationTestModel },
        // { value: 'spelling', label: 'Правописание', component: SpellingTestForm, model: SpellingTestModel },
    ];

    function getFreshModelData(type) {
        const testMeta = availableTestTypes.find(t => t.value === type);
        if (testMeta && testMeta.model) {
            // Создаем дефолтный экземпляр и берем его payload для формы
            // Передаем test_type, чтобы модель правильно себя сконфигурировала
            return new testMeta.model({ title: '', test_type: type }).toPayload();
        }
        return { title: '', description: '', test_type: type }; // Общий fallback
    }
    
    onMount(() => {
        if (itemToEdit && itemToEdit.item_type === 'test' && itemToEdit.content_details) {
            selectedTestType = itemToEdit.content_details.test_type;
            // Клонируем данные для редактирования, чтобы не мутировать оригинальный itemToEdit.content_details
            testDataForForm = JSON.parse(JSON.stringify(itemToEdit.content_details));
        } else {
            testDataForForm = getFreshModelData(selectedTestType);
        }
        updateSpecificTestFormComponent();
    });

    function updateSpecificTestFormComponent() {
        const testMeta = availableTestTypes.find(t => t.value === selectedTestType);
        if (testMeta) {
            specificTestFormComponent = testMeta.component;
            // Если создаем новый тест ИЛИ тип теста изменился для нового (не для itemToEdit)
            if (!itemToEdit || (itemToEdit && itemToEdit.content_details?.test_type !== selectedTestType && !isEditingOriginalItemType())) {
                testDataForForm = getFreshModelData(selectedTestType);
            } else if (itemToEdit && itemToEdit.content_details?.test_type === selectedTestType) {
                // Если тип совпадает с редактируемым, используем данные itemToEdit
                 testDataForForm = JSON.parse(JSON.stringify(itemToEdit.content_details));
            }
            // Если тип меняется для уже существующего itemToEdit, это сложный сценарий "конвертации"
            // Пока что, если тип меняется для itemToEdit, мы сбрасываем на пустую модель нового типа.
            // Это значит, что при смене типа теста в UI для редактируемого элемента, данные старого типа теряются.
            // Если нужно сохранять/мигрировать, потребуется более сложная логика.

        } else {
            specificTestFormComponent = null;
            testDataForForm = null;
        }
        // Необходимо "заставить" Svelte обновить testDataForForm проп для дочернего компонента
        testDataForForm = testDataForForm ? {...testDataForForm} : null; 
    }

    // Хелпер, чтобы определить, редактируем ли мы оригинальный тип элемента
    function isEditingOriginalItemType() {
        return itemToEdit && itemToEdit.content_details && itemToEdit.content_details.test_type === selectedTestType;
    }
    // TestItemFormContainer.svelte
    async function handleTestFormSave(event) {
        const specificTestPayloadOrFormData = event.detail; // Это FormData из DragDropTestForm

        if (specificTestPayloadOrFormData instanceof FormData) {
            // specificTestPayloadOrFormData уже содержит все нужные файлы (включая дублирующиеся prompt_image_file)
            // и test_definition (как JSON строку).
            // Нам нужно только добавить 'item_type' и переименовать 'test_definition' в 'content_data'.

            const finalPayload = new FormData();
            finalPayload.append('item_type', 'test');

            let testDefinitionValue = null;

            // Сначала соберем все файлы и другие поля, КРОМЕ 'test_definition'
            for (const [key, value] of specificTestPayloadOrFormData.entries()) {
                if (key === 'test_definition') {
                    testDefinitionValue = value; // Сохраняем значение test_definition
                } else {
                    finalPayload.append(key, value); // Копируем все остальные поля как есть (включая файлы)
                }
            }

            if (testDefinitionValue) {
                finalPayload.append('content_data', testDefinitionValue); // Добавляем test_definition под новым именем
            } else {
                addNotification("Ошибка: данные определения теста (test_definition) отсутствуют в FormData.", "error");
                if (typeof itemFormModalRef !== 'undefined' && itemFormModalRef?.setLoading) {
                    itemFormModalRef.setLoading(false);
                } else {
                    isLoading = false;
                }
                return;
            }
            
            // Логирование для проверки
            console.log("[TestItemFormContainer] FormData перед dispatch('save'):");
            for (let pair of finalPayload.entries()) {
                if (pair[1] instanceof File) {
                    console.log(`  ${pair[0]}: File (name: ${pair[1].name})`);
                } else {
                    console.log(`  ${pair[0]}: ${pair[1]}`);
                }
            }

            dispatch('save', finalPayload);

        } else { 
            // Логика для случаев, когда payload не FormData (например, для MCQ тестов без файлов)
            const sectionItemPayload = {
                item_type: 'test',
                content_data: {
                    ...specificTestPayloadOrFormData, // Это должен быть объект JS
                    test_type: selectedTestType 
                }
            };
            // Если тип теста был изменен в контейнере (маловероятно, если форма уже отработала)
            if (specificTestPayloadOrFormData.test_type !== selectedTestType && selectedTestType) {
                sectionItemPayload.content_data.test_type = selectedTestType;
            }
            dispatch('save', sectionItemPayload);
        }
    }

    function handleTestFormCancel() {
        dispatch('close'); 
    }
</script>
      
<div class="test-item-form-container">
    <div class="form-group test-type-selector-internal">
        <label for="test-item-type-selector-in-container">Тип теста:</label>
        <select 
            id="test-item-type-selector-in-container" 
            bind:value={selectedTestType} 
            on:change={updateSpecificTestFormComponent}
            disabled={isLoading || !!itemToEdit}
            aria-label="Выберите тип создаваемого теста"
        >
            {#each availableTestTypes as testTypeOpt (testTypeOpt.value)}
                <option value={testTypeOpt.value}>{testTypeOpt.label}</option>
            {/each}
        </select>
    </div>

    {#if specificTestFormComponent && testDataForForm}
        <svelte:component 
            this={specificTestFormComponent}
            bind:isLoading={isLoading} 
            testData={testDataForForm} 
            isEditing={!!itemToEdit && itemToEdit.content_details?.test_type === selectedTestType}
            on:save={handleTestFormSave}
            on:cancel={handleTestFormCancel}
        />
    {:else if !specificTestFormComponent && selectedTestType}
        <p class="no-test-form-message">Форма для типа теста "{selectedTestType}" еще не реализована.</p>
    {:else}
        <p class="no-test-form-message">Пожалуйста, выберите тип теста.</p>
    {/if}
</div>

<style>
    .test-item-form-container {
        padding-top: 10px;
    }
    .test-type-selector-internal {
        margin-bottom: 20px;
    }
    .test-type-selector-internal label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
        color: var(--color-text-muted);
    }
    .test-type-selector-internal select {
        width: 100%;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: var(--spacing-border-radius-small);
        font-size: 1rem;
        background-color: white;
    }
    .no-test-form-message {
        text-align: center;
        color: var(--color-text-muted);
        padding: 20px;
        background-color: var(--color-bg-ultra-light);
        border-radius: var(--spacing-border-radius-small);
    }
    /* Общие стили для форм можно вынести, если они повторяются в MCQTestForm и т.д. */
    :global(.test-item-form-container .item-form) { /* Предполагая, что формы тестов будут иметь класс .item-form */
        border-top: 1px solid #eee;
        margin-top: 15px;
        padding-top: 15px;
    }
</style>