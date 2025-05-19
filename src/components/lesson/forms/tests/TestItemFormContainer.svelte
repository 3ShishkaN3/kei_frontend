<script>
    import { createEventDispatcher, onMount } from 'svelte';
    // Импортируем модели тестов для определения доступных типов
    import { 
        MCQTestModel, 
        FreeTextTestModel, 
        WordOrderTestModel,
        MatchingTestModel,
        PronunciationTestModel,
        SpellingTestModel
    } from '../../../../models/testTypes.js'; // Путь к моделям

    // Позже мы создадим эти компоненты форм
    import MCQTestForm from './MCQTestForm.svelte';

    
    import { SentenceOrderTestModel, DragToMatchTestModel /* ... другие модели ... */ } from '../../../../models/testTypes.js';
    import SentenceOrderTestForm from './SentenceOrderTestForm.svelte';
    import DragToMatchTestForm from './DragToMatchTestForm.svelte';
    export let itemToEdit = null; // Если редактируем существующий SectionItem с тестом
    export let isLoading = false; // Управляется из родительской модалки

    const dispatch = createEventDispatcher();

    let selectedTestType = 'mcq-single'; // Тип теста по умолчанию для нового
    let testDataForForm = null; // Данные конкретного теста для передачи в его форму
    let specificTestFormComponent = null;

    // Определяем доступные типы тестов и их компоненты форм
    const availableTestTypes = [
        { value: 'mcq-single', label: 'MCQ (Один ответ)', component: MCQTestForm, model: MCQTestModel },
        { value: 'mcq-multi', label: 'MCQ (Несколько ответов)', component: MCQTestForm, model: MCQTestModel }, // Использует ту же форму, но с другой логикой
        { value: 'sentence-order', label: 'Порядок слов/фраз', component: SentenceOrderTestForm, model: SentenceOrderTestModel },
        { value: 'drag-to-match', label: 'Соотнесение (перетаскивание)', component: DragToMatchTestForm, model: DragToMatchTestModel },
        // Добавьте другие типы по мере их реализации
    ];

    onMount(() => {
        if (itemToEdit && itemToEdit.item_type === 'test' && itemToEdit.content_details) {
            selectedTestType = itemToEdit.content_details.test_type; // test_type из TestSerializer
            // testDataForForm должен содержать только данные самого теста (без id SectionItem и т.д.)
            testDataForForm = { ...itemToEdit.content_details }; 
        } else {
            // Для нового теста создаем пустую модель на основе selectedTestType
            const testMeta = availableTestTypes.find(t => t.value === selectedTestType);
            if (testMeta && testMeta.model) {
                // Создаем экземпляр модели с минимальными обязательными полями или пустыми значениями
                // Это нужно, чтобы передать в форму теста ожидаемую структуру
                testDataForForm = new testMeta.model({ title: '', test_type: selectedTestType }).toPayload();
            }
        }
        updateSpecificTestFormComponent();
    });

    function updateSpecificTestFormComponent() {
        const testMeta = availableTestTypes.find(t => t.value === selectedTestType);
        if (testMeta) {
            specificTestFormComponent = testMeta.component;
            if (!itemToEdit || itemToEdit.content_details?.test_type !== selectedTestType) {
                // Если создаем новый тест или меняем тип существующего (сложный случай, пока не реализуем смену типа существующего)
                // Для нового: создаем пустую модель
                const modelInstance = new testMeta.model({ title: '', test_type: selectedTestType });
                testDataForForm = modelInstance.toPayload(); // Получаем структуру для формы
            }
        } else {
            specificTestFormComponent = null;
        }
    }

    function handleTestFormSave(event) {
    const specificTestPayloadOrFormData = event.detail;

    if (specificTestPayloadOrFormData instanceof FormData) {
        // Файлы и JSON теста (под ключом 'test_definition') находятся в specificTestPayloadOrFormData
        const finalSectionItemPayload = new FormData();
        finalSectionItemPayload.append('item_type', 'test'); // Тип элемента для SectionItem

        let testDefinitionJsonString = null;
        const filesToForward = {};

        for (const [key, value] of specificTestPayloadOrFormData.entries()) {
            if (key === 'test_definition') { // JSON-строка с данными теста
                testDefinitionJsonString = value; // Это уже JSON.stringify(testDefinition) из MCQTestForm
            } else { 
                // Это файлы (например, 'attached_image_file', 'attached_audio_file')
                // Эти файлы должны быть обработаны TestSerializer на бэкенде
                filesToForward[key] = value;
            }
        }

        if (!testDefinitionJsonString) {
            addNotification("Ошибка: данные определения теста отсутствуют в FormData.", "error");
            // Возможно, стоит также сообщить об ошибке setLoading(false) в родительскую модалку
            if (typeof this.$parent.setLoading === 'function') { // Эвристика, лучше через dispatch
                 // this.$parent не рекомендуется, лучше dispatch('error') и родитель сам обработает
            }
            return;
        }
        
        // Передаем JSON-описание теста в 'content_data' для SectionItemSerializer
        // SectionItemSerializer.validate затем передаст это + файлы в TestSerializer
        finalSectionItemPayload.append('content_data', testDefinitionJsonString);

        // Добавляем сами файлы в FormData для SectionItem, чтобы они дошли до TestSerializer
        for (const key in filesToForward) {
            finalSectionItemPayload.append(key, filesToForward[key]);
        }
        
        dispatch('save', finalSectionItemPayload);

    } else { // Если пришел JSON (тесты без файлов)
        const sectionItemPayload = {
            item_type: 'test',
            content_data: { // Это поле 'content_data' будет распарсено SectionItemSerializer.validate
                ...specificTestPayloadOrFormData, // Это уже объект теста (title, description, mcq_options, etc.)
                // test_type уже должен быть внутри specificTestPayloadOrFormData
            }
        };
        if (specificTestPayloadOrFormData.test_type !== selectedTestType && selectedTestType) {
             // Если тип в контейнере отличается от типа в данных формы (маловероятно, но для консистентности)
            sectionItemPayload.content_data.test_type = selectedTestType;
        }
        dispatch('save', sectionItemPayload);
    }
}

    function handleTestFormCancel() {
        dispatch('close'); // Просто закрываем модалку
    }

</script>

<div class="test-item-form-container">
    <div class="form-group test-type-selector-internal">
        <label for="test-item-type">Тип теста:</label>
        <select 
            id="test-item-type" 
            bind:value={selectedTestType} 
            on:change={updateSpecificTestFormComponent}
            disabled={isLoading || !!itemToEdit}
        >
            {#each availableTestTypes as testTypeOpt}
                <option value={testTypeOpt.value}>{testTypeOpt.label}</option>
            {/each}
        </select>
    </div>

    {#if specificTestFormComponent && testDataForForm}
        <svelte:component 
            this={specificTestFormComponent}
            bind:isLoading={isLoading} 
            testData={testDataForForm} 
            isEditing={!!itemToEdit}
            on:save={handleTestFormSave}
            on:cancel={handleTestFormCancel}
        />
    {:else}
        <p class="no-test-form-message">Выберите тип теста или форма для данного типа еще не реализована.</p>
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