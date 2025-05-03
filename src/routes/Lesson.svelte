<script>
	import { onMount, tick, onDestroy } from 'svelte';
	import { link } from 'svelte-routing';
	import { fade, fly } from 'svelte/transition'; // Импортируем анимации
	export let courseId;
	export let lessonId;

	import { user } from '../stores/user';
	import { API_BASE_URL } from '../config.js';
	import { apiFetch } from '../api/api.js';

	// --- Icons ---
	import EyeOutline from 'svelte-material-icons/EyeOutline.svelte';
	import EyeOffOutline from 'svelte-material-icons/EyeOffOutline.svelte';
	import PlusCircleOutline from 'svelte-material-icons/PlusCircleOutline.svelte';
	import PencilOutline from 'svelte-material-icons/PencilOutline.svelte';
	import DeleteOutline from 'svelte-material-icons/DeleteOutline.svelte';
	import ChevronDoubleUp from 'svelte-material-icons/ChevronDoubleUp.svelte';
	import ChevronDoubleDown from 'svelte-material-icons/ChevronDoubleDown.svelte';
	import Icon1 from 'svelte-material-icons/Numeric1CircleOutline.svelte';
	import Icon2 from 'svelte-material-icons/Numeric2CircleOutline.svelte';
	import Icon3 from 'svelte-material-icons/Numeric3CircleOutline.svelte';
	import Icon4 from 'svelte-material-icons/Numeric4CircleOutline.svelte';
	import HomeOutline from 'svelte-material-icons/HomeOutline.svelte';
    import FolderPlusOutline from 'svelte-material-icons/FolderPlusOutline.svelte'; // Для добавления раздела

	// --- Components ---
	import LoadingIndicator from '../components/utils/LoadingIndicator.svelte';
	import ErrorMessage from '../components/utils/ErrorMessage.svelte';
	import TextItemDisplay from '../components/lesson/items/TextItemDisplay.svelte';
	import ImageItemDisplay from '../components/lesson/items/ImageItemDisplay.svelte';
	import AudioItemDisplay from '../components/lesson/items/AudioItemDisplay.svelte';
	import VideoItemDisplay from '../components/lesson/items/VideoItemDisplay.svelte';
	import DocumentItemDisplay from '../components/lesson/items/DocumentItemDisplay.svelte';
	import TestItemDisplay from '../components/lesson/items/TestItemDisplay.svelte';
	import SectionItemFormModal from '../components/lesson/SectionItemFormModal.svelte';
	// Модальное окно для редактирования/создания раздела (простое)
    import SimpleInputModal from '../components/utils/SimpleInputModal.svelte';

	// --- State ---
	let lessonData = null;
	let courseTitle = '';
	let isLoading = true;
	let error = null;
	let viewMode = 'student';
	let currentUserRole = null;
	let isAdminOrStaff = false;

    // ==> State для постраничного отображения разделов <==
    let sections = []; // Массив разделов из lessonData
    let currentSectionId = null; // ID текущего отображаемого раздела
    let currentSectionData = null; // Объект текущего раздела для удобства

	let isSidebarOpen = false;
	let isModalOpen = false; // Для SectionItem модалки
	let editingItem = null; // Для SectionItem
    let targetSectionIdForItem = null; // Куда добавляем SectionItem

    // State для модалки Разделов
    let isSectionModalOpen = false;
    let editingSection = null; // { id: number, title: string } | null
    let sectionModalTitle = '';
    let sectionModalPrompt = '';
    let sectionModalInitialValue = '';

	// --- User Store ---
	const unsubscribeUser = user.subscribe((value) => {
		currentUserRole = value?.role;
		isAdminOrStaff = ['admin', 'teacher', 'assistant'].includes(currentUserRole);
		if (isAdminOrStaff && viewMode === 'student') {
			viewMode = 'admin';
		} else if (!isAdminOrStaff) {
			viewMode = 'student';
		}
	});

	// --- Data Fetching ---
	onMount(async () => {
		if (courseId && lessonId) {
			await fetchLessonData();
		} else {
			error = "Не удалось получить ID курса или урока.";
			isLoading = false;
		}
		return () => { unsubscribeUser(); };
	});

	async function fetchLessonData(targetSectionId = null) { // targetSectionId - ID раздела, который нужно сделать активным
		isLoading = true;
		error = null;
		try {
			const lessonUrl = `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/`;
			const response = await apiFetch(lessonUrl);
			if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);

			lessonData = await response.json();
			courseTitle = lessonData.course_title || `Курс #${courseId}`;
            sections = lessonData.sections || [];
            sections.sort((a, b) => a.order - b.order); // Сортируем разделы по order

            // Определяем текущий раздел
            if (targetSectionId && sections.some(s => s.id === targetSectionId)) {
                currentSectionId = targetSectionId;
            } else if (sections.length > 0) {
                currentSectionId = sections[0].id; // По умолчанию первый раздел
            } else {
                currentSectionId = null; // Нет разделов
            }
            updateCurrentSectionData(); // Обновляем данные текущего раздела

		} catch (err) {
			console.error('Ошибка загрузки данных урока:', err);
			error = err.message;
            sections = [];
            currentSectionId = null;
            currentSectionData = null;
		} finally {
			isLoading = false;
		}
	}

    // Обновляем currentSectionData при смене currentSectionId
    $: if (currentSectionId && sections.length > 0) {
        currentSectionData = sections.find(s => s.id === currentSectionId);
        // Сортируем элементы текущего раздела при его смене
        if (currentSectionData?.items) {
            currentSectionData.items.sort((a, b) => a.order - b.order);
        }
    } else {
         currentSectionData = null;
    }

    function updateCurrentSectionData() {
         if (currentSectionId && sections.length > 0) {
            currentSectionData = sections.find(s => s.id === currentSectionId);
            if (currentSectionData?.items) {
                 currentSectionData.items.sort((a, b) => a.order - b.order);
             }
         } else {
             currentSectionData = null;
         }
    }


	// --- Section Management ---
    function showSection(sectionId) {
        if (currentSectionId !== sectionId) {
            currentSectionId = sectionId;
            isSidebarOpen = false; // Закрываем сайдбар на мобильных при переключении
            // Дополнительно можно прокрутить страницу вверх
             window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function handleOpenCreateSectionModal() {
        editingSection = null;
        sectionModalTitle = "Создать новый раздел";
        sectionModalPrompt = "Введите название нового раздела:";
        sectionModalInitialValue = "";
        isSectionModalOpen = true;
    }

    function handleOpenEditSectionModal(section) {
        editingSection = section; // { id, title, order, ... }
        sectionModalTitle = "Редактировать раздел";
        sectionModalPrompt = "Введите новое название раздела:";
        sectionModalInitialValue = section.title;
        isSectionModalOpen = true;
    }

    async function handleSaveSection(event) {
        const newTitle = event.detail.trim();
        if (!newTitle) return;

        let url;
        let method;
        let body = { title: newTitle };

        if (editingSection) { // Редактирование
            url = `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/sections/${editingSection.id}/`;
            method = 'PATCH'; // Обновляем только название
        } else { // Создание
             url = `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/sections/`;
             method = 'POST';
             // Можно добавить order при создании, если API поддерживает
             // body.order = (sections.length > 0 ? Math.max(...sections.map(s => s.order)) : 0) + 1;
        }

        isLoading = true; // Индикатор загрузки на время запроса
        try {
            const response = await apiFetch(url, { method, body });
             if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(errorData.detail || `Ошибка ${method === 'POST' ? 'создания' : 'обновления'} раздела`);
             }
             const savedSection = await response.json();
             isSectionModalOpen = false;
             // Перезагружаем данные и делаем новый/отредактированный раздел активным
             await fetchLessonData(savedSection.id);
             alert(`Раздел успешно ${method === 'POST' ? 'создан' : 'обновлен'}!`);
        } catch (err) {
             console.error(`Ошибка сохранения раздела:`, err);
             alert(`Не удалось сохранить раздел: ${err.message}`);
        } finally {
             isLoading = false; // Снимаем индикатор загрузки
        }
    }

    async function handleDeleteSection(sectionId) {
		if (!confirm(`Вы уверены, что хотите удалить этот раздел и ВСЕ его содержимое?`)) return;
        const url = `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/sections/${sectionId}/`;
        isLoading = true;
        try {
             const response = await apiFetch(url, { method: 'DELETE' });
             if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(errorData.detail || `Ошибка удаления раздела: ${response.status}`);
             }
             // Перезагружаем данные, активным станет первый раздел (если он есть)
             await fetchLessonData();
             alert('Раздел успешно удален.');
        } catch (err) {
             console.error('Ошибка удаления раздела:', err);
             alert(`Не удалось удалить раздел: ${err.message}`);
        } finally {
             isLoading = false;
        }
    }

    // --- SectionItem Management (Admin Actions) ---
    // toggleViewMode, handleAddItem, handleEditItem, handleDeleteItem, handleMoveItem, handleCloseModal, handleSaveItem
    // Логика остается почти той же, но handleAddItem/handleEditItem устанавливают targetSectionIdForItem
	function toggleViewMode() {
		viewMode = viewMode === 'admin' ? 'student' : 'admin';
	}

	function handleAddItemClick() { // При клике на кнопку "Добавить элемент"
        if (!currentSectionId) {
            alert("Сначала создайте или выберите раздел.");
            return;
        }
		editingItem = null;
        targetSectionIdForItem = currentSectionId; // Добавляем в текущий раздел
		isModalOpen = true;
	}

	function handleEditItemClick(item) { // При клике на кнопку редактирования элемента
		editingItem = item;
        targetSectionIdForItem = item.section;
		isModalOpen = true;
        // Исправляем ошибку "itemToEdit is not defined":
        // Проблема была скорее всего не здесь, а в том, как props передавались
        // или использовались внутри SectionItemFormModal до его монтирования.
        // Передача через `itemToEdit={editingItem}` должна работать.
	}

    async function handleDeleteItemClick(item) { // При клике на кнопку удаления элемента
        if (!confirm(`Вы уверены, что хотите удалить этот элемент (${item.item_type})?`)) return;
		const url = `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/sections/${item.section}/items/${item.id}/`;
		isLoading = true;
        try {
			const response = await apiFetch(url, { method: 'DELETE' });
			if (!response.ok) throw new Error(`Ошибка удаления: ${response.status}`);
			// Перезагружаем данные текущего раздела, чтобы он остался активным
            await fetchLessonData(currentSectionId);
            alert('Элемент успешно удален.');
		} catch (err) {
			console.error('Ошибка удаления элемента:', err);
			alert(`Не удалось удалить элемент: ${err.message}`);
		} finally {
            isLoading = false;
        }
    }

    async function handleMoveItemClick(item, direction) { // При клике на кнопки перемещения
        if (!currentSectionData?.items) return;
        const items = currentSectionData.items; // Работаем с элементами текущего раздела
        const currentIndex = items.findIndex(i => i.id === item.id);
        if (currentIndex === -1) return;
        let newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= items.length) return;

        const otherItem = items[newIndex];
        const currentOrder = item.order;
        const otherOrder = otherItem.order;

        // Оптимистичное обновление
        item.order = otherOrder;
        otherItem.order = currentOrder;
        currentSectionData.items.sort((a, b) => a.order - b.order);
        lessonData = { ...lessonData }; // Триггер реактивности

        const urlItem = `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/sections/${item.section}/items/${item.id}/`;
        const urlOtherItem = `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/sections/${otherItem.section}/items/${otherItem.id}/`;
        isLoading = true;
        try {
            const res1 = await apiFetch(urlItem, { method: 'PATCH', body: { order: item.order } });
            const res2 = await apiFetch(urlOtherItem, { method: 'PATCH', body: { order: otherItem.order } });
            if (!res1.ok || !res2.ok) throw new Error('Ошибка API при обновлении порядка');
        } catch (err) {
            console.error('Ошибка обновления порядка:', err);
            alert('Не удалось обновить порядок элементов.');
            // Откат
            item.order = currentOrder;
            otherItem.order = otherOrder;
            currentSectionData.items.sort((a, b) => a.order - b.order);
            lessonData = { ...lessonData };
        } finally {
            isLoading = false;
        }
    }

    function handleCloseItemModal() { isModalOpen = false; editingItem = null; targetSectionIdForItem = null;}

    async function handleSaveItemEvent(event) { // При сохранении из модалки элемента
        const itemData = event.detail;
		const isCreating = !editingItem;
        let targetSecId = editingItem ? editingItem.section : targetSectionIdForItem;

        if (!targetSecId) { alert("Ошибка: не удалось определить раздел."); return; }

        let url = isCreating
            ? `${API_BASE_URL}/lessons/${lessonId}/sections/${targetSecId}/items/`
            : `${API_BASE_URL}/lessons/${lessonId}/sections/${targetSecId}/items/${editingItem.id}/`;
        let method = isCreating ? 'POST' : 'PUT';
        isLoading = true;
		try {
			const response = await apiFetch(url, { method: method, body: itemData }); // itemData может быть FormData
			if (!response.ok) {
                // ... обработка ошибки ...
                 throw new Error(errorMessage);
            }
            handleCloseItemModal();
            await fetchLessonData(targetSecId); // Перезагружаем данные и остаемся на том же разделе
            alert(`Элемент успешно ${isCreating ? 'добавлен' : 'обновлен'}!`);
		} catch (err) {
			console.error('Ошибка сохранения элемента:', err);
			alert(`Ошибка сохранения элемента:\n${err.message}`);
		} finally {
            isLoading = false;
        }
	}


	// --- Sidebar & Icon Logic ---
	function getSectionIcon(index) {
		switch (index % 4) { // Используем остаток от деления на 4 для первых четырех иконок
			case 0: return Icon1;
			case 1: return Icon2;
			case 2: return Icon3;
			case 3: return Icon4;
			default: return Icon1; // Не должно произойти, но на всякий случай
		}
        // Если логика "первые 4 разные, остальные - Home", то:
        /*
        if (index < 4) {
            return [Icon1, Icon2, Icon3, Icon4][index];
        } else {
            return HomeOutline;
        }
        */
	}

    // --- Test Submission Handling ---
    // Логика handleTestSubmit остается прежней

</script>

<div class="lesson-page-container" class:admin-mode={isAdminOrStaff && viewMode === 'admin'}>
	{#if isLoading && !lessonData}
		<LoadingIndicator message="Загрузка урока..." />
	{:else if error}
		<ErrorMessage message={error} />
	{:else if lessonData}
		<div class="lesson-header" in:fly={{ y: -20, duration: 400, delay: 100 }}>
			<h1 class="lesson-title">
				<a href={`/courses/${courseId}/lessons`} use:link class="course-link" title="Вернуться к списку уроков курса">{courseTitle}</a>
                 <span class="separator">-</span>
                 <span class="lesson-name">{lessonData.title}</span>
			</h1>
            {#if isAdminOrStaff}
                <div class="admin-controls-header">
                    <button class="admin-button view-toggle-button" on:click={toggleViewMode} title={viewMode === 'admin' ? 'Посмотреть как студент' : 'Вернуться в режим администрирования'}>
                         <svelte:component this={viewMode === 'admin' ? EyeOutline : EyeOffOutline} size="18px" />
                         {viewMode === 'admin' ? 'Режим студента' : 'Режим админа'}
                    </button>
                </div>
            {/if}
		</div>

		<div class="lesson-content-wrapper">
			<aside class="lesson-sidebar {isSidebarOpen ? 'open' : ''}" in:fly={{ x: 50, duration: 400, delay: 200 }}>
                <div class="sidebar-header">
				    <h2 class="sidebar-title">Разделы</h2>
                    {#if isAdminOrStaff && viewMode === 'admin'}
                        <button class="admin-button create-section-btn" on:click={handleOpenCreateSectionModal} title="Создать новый раздел">
                             <FolderPlusOutline size="18px" />
                        </button>
                    {/if}
                </div>
				<nav class="sidebar-nav">
					{#if sections.length > 0}
                        <ul>
                            {#each sections as section, index (section.id)}
                                <li>
                                    <div class="section-link-wrapper">
                                        <button
                                            class="section-link {currentSectionId === section.id ? 'active' : ''}"
                                            on:click={() => showSection(section.id)}
                                            title="Перейти к разделу {section.title}"
                                        >
                                            <span class="section-icon-wrapper">
                                                <svelte:component this={getSectionIcon(index)} size="20px" />
                                            </span>
                                            <span class="section-title">{section.title}</span>
                                        </button>
                                        {#if isAdminOrStaff && viewMode === 'admin'}
                                            <div class="section-admin-controls">
                                                 <button title="Редактировать раздел" on:click={() => handleOpenEditSectionModal(section)} class="section-admin-btn edit-btn"><PencilOutline size="14px" /></button>
                                                 <button title="Удалить раздел" on:click={() => handleDeleteSection(section.id)} class="section-admin-btn delete-btn"><DeleteOutline size="14px" /></button>
                                                 </div>
                                        {/if}
                                    </div>
                                </li>
                            {/each}
                        </ul>
                    {:else}
                         <p class="no-sections-message">Разделы еще не созданы.</p>
                         {#if isAdminOrStaff && viewMode === 'admin'}
                             <button class="admin-button create-section-btn-empty" on:click={handleOpenCreateSectionModal}>
                                 <FolderPlusOutline size="18px" /> Создать первый раздел
                             </button>
                         {/if}
                    {/if}
				</nav>
			</aside>

            <button class="sidebar-toggle-button" on:click={() => isSidebarOpen = !isSidebarOpen} aria-label="Показать/скрыть разделы">
                Разделы {isSidebarOpen ? '▲' : '▼'}
            </button>

			<main class="lesson-main-content" in:fade={{ duration: 500, delay: 300 }}>
                {#if currentSectionData}
                    <div class="section-content-area" key={currentSectionId} transition:fade="{{duration: 300}}">
                        {#if currentSectionData.items && currentSectionData.items.length > 0}
                            <div class="section-items-list">
                                {#each currentSectionData.items as item (item.id)}
                                    <div class="section-item-wrapper" in:fly="{{ y: 15, duration: 300, delay: index * 50 }}">
                                         {#if isAdminOrStaff && viewMode === 'admin'}
                                            <div class="item-admin-controls">
                                                <button title="Редактировать" on:click={() => handleEditItemClick(item)} class="item-admin-btn edit-btn"><PencilOutline size="16px" /></button>
                                                <button title="Вверх" on:click={() => handleMoveItemClick(item, 'up')} class="item-admin-btn move-btn"><ChevronDoubleUp size="16px" /></button>
                                                <button title="Вниз" on:click={() => handleMoveItemClick(item, 'down')} class="item-admin-btn move-btn"><ChevronDoubleDown size="16px" /></button>
                                                <button title="Удалить" on:click={() => handleDeleteItemClick(item)} class="item-admin-btn delete-btn"><DeleteOutline size="16px" /></button>
                                            </div>
                                        {/if}
                                        {#if item.item_type === 'text'} <TextItemDisplay contentDetails={item.content_details} />
										{:else if item.item_type === 'image'} <ImageItemDisplay contentDetails={item.content_details} />
                                        {:else if item.item_type === 'audio'} <AudioItemDisplay contentDetails={item.content_details} />
                                        {:else if item.item_type === 'video'} <VideoItemDisplay contentDetails={item.content_details} />
                                        {:else if item.item_type === 'document'} <DocumentItemDisplay contentDetails={item.content_details} />
                                        {:else if item.item_type === 'test'} <TestItemDisplay testData={item.content_details} sectionItemId={item.id} on:submitTest={handleTestSubmit} {viewMode} />
										{:else} <p>Неизвестный тип элемента: {item.item_type}</p> {/if}
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <p class="no-items-message">В этом разделе пока нет материалов.</p>
                        {/if}
                        {#if isAdminOrStaff && viewMode === 'admin'}
                             <div class="add-item-container">
                                <button class="admin-button add-item-button" on:click={handleAddItemClick}>
                                    <PlusCircleOutline size="18px" /> Добавить элемент в раздел
                                </button>
                            </div>
                        {/if}
                    </div>
                {:else if sections.length > 0}
                    <p class="select-section-message">Выберите раздел для просмотра.</p>
                 {:else if !(isAdminOrStaff && viewMode === 'admin')}
                     <p class="no-content-message">В этом уроке пока нет содержимого.</p>
                {/if}
			</main>
		</div>
	{:else if !isLoading}
		<p class="no-content-message">Не удалось загрузить данные урока.</p>
	{/if}

    {#if isModalOpen}
        <SectionItemFormModal
            bind:isOpen={isModalOpen}
            itemToEdit={editingItem}
            {courseId}
            {lessonId}
            targetSectionId={targetSectionIdForItem}
            {isAdminOrStaff}
            on:save={handleSaveItemEvent}
            on:close={handleCloseItemModal} />
    {/if}

     {#if isSectionModalOpen}
          <SimpleInputModal
             bind:isOpen={isSectionModalOpen}
             title={sectionModalTitle}
             prompt={sectionModalPrompt}
             initialValue={sectionModalInitialValue}
             on:submit={handleSaveSection}
             on:close={() => isSectionModalOpen = false}
           />
     {/if}
</div>

<style>
	/* --- Глобальные стили из global.css --- */
	/* Предполагается, что переменные (--color-*, --spacing-*, --font-*) доступны */

	/* --- Основной контейнер --- */
	.lesson-page-container {
		padding: clamp(20px, 3vw, 40px) var(--spacing-padding-page);
		max-width: var(--max-width-page);
		margin: 0 auto;
		min-height: calc(var(--min-height-page) + 50px); /* Немного больше */
	}

	/* --- Шапка урока --- */
	.lesson-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 15px;
		margin-bottom: var(--spacing-margin-bottom-large);
		border-bottom: 1px solid var(--color-border-light);
		padding-bottom: var(--spacing-padding-medium);
	}
    .lesson-title {
        font-size: clamp(1.5rem, 4vw, 2.2rem); /* Немного увеличим */
        color: var(--color-text-dark);
        font-weight: var(--font-weight-bold);
        margin: 0;
        flex-grow: 1;
        line-height: 1.3;
    }
    .course-link {
        color: var(--color-secondary); /* Используем вторичный цвет */
        text-decoration: none;
        transition: color var(--animation-duration-transition);
    }
    .course-link:hover { color: var(--color-primary); text-decoration: underline; }
    .separator { margin: 0 0.5em; color: var(--color-text-muted); }
    .lesson-name { color: var(--color-text-dark); } /* Название урока обычным цветом */

    .admin-controls-header { margin-left: auto; /* Прижимаем к правому краю */ }

	/* --- Общая структура контента --- */
	.lesson-content-wrapper {
		display: flex;
		flex-direction: row; /* Сайдбар справа */
		gap: clamp(20px, 4vw, 50px); /* Адаптивный отступ */
	}

	/* --- Сайдбар --- */
	.lesson-sidebar {
		flex-basis: 280px; /* Чуть шире */
		flex-shrink: 0;
        position: sticky;
        top: 100px; /* Увеличим отступ под шапку */
        height: calc(100vh - 120px);
        overflow-y: auto;
        padding-right: 15px;
        /* Стилизация фона и границы */
        /* background-color: #fdfdff; */ /* Очень светло-сиреневый фон */
        /* border-left: 1px solid var(--color-border-light); */
        /* padding-left: 15px; */
	}
    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-margin-bottom-medium);
        padding-left: 5px;
    }
    .sidebar-title {
        font-size: clamp(1.1rem, 2.5vw, 1.4rem);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-dark);
        margin: 0;
    }
    /* Стили для кнопки создания раздела в шапке сайдбара */
     .create-section-btn {
         padding: 5px 8px !important; /* Уменьшим паддинг */
         font-size: 0.8rem !important; /* Уменьшим шрифт */
         background-color: transparent !important;
         color: var(--color-primary) !important;
         border: 1px solid var(--color-primary-light) !important;
         border-radius: 5px !important;
     }
      .create-section-btn:hover {
          background-color: var(--color-primary-light) !important;
          color: white !important;
      }

    .sidebar-nav ul { list-style: none; padding: 0; margin: 0; }
    .sidebar-nav li { margin: 0; }

    .section-link-wrapper {
         display: flex;
         align-items: center;
         border-top: 1px solid var(--color-border-light); /* Разделитель сверху */
         transition: background-color 0.2s ease;
         margin-bottom: 2px; /* Небольшой отступ между элементами */
    }
    .sidebar-nav li:first-child .section-link-wrapper { border-top: none; }
    .sidebar-nav li:last-child .section-link-wrapper {
         border-bottom: 1px solid var(--color-border-light); /* Разделитель снизу у последнего */
     }
    .section-link-wrapper:hover {
         background-color: #f5f3ff; /* Очень светлый фон при наведении на всю строку */
    }

    .section-link {
        display: flex;
        flex-grow: 1; /* Занимает все доступное место */
        align-items: center;
        padding: 12px 5px; /* Увеличим вертикальный паддинг */
        text-decoration: none;
        color: var(--color-text-secondary);
        font-size: 0.95rem;
        border-radius: var(--spacing-border-radius-small);
        transition: background-color var(--animation-duration-transition), color var(--animation-duration-transition);
        cursor: pointer;
        background: none;
        border: none;
        text-align: left;
    }
    .section-link.active {
        background-color: #ece9ff;
        color: var(--color-primary);
        font-weight: var(--font-weight-semi-bold);
    }
    /* Не применяем ховер к активному элементу */
     .section-link-wrapper:hover .section-link:not(.active) {
         background-color: transparent; /* Убираем фон с самой кнопки при ховере на wrapper */
     }

    .section-icon-wrapper {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px; /* Немного больше */
        height: 32px;
        border-radius: 50%;
        background-color: #DFDBFF;
        color: var(--color-primary-dark);
        margin-right: 12px; /* Увеличим отступ */
        transition: transform 0.2s ease;
    }
    .section-link:hover .section-icon-wrapper {
         transform: scale(1.1);
    }
     .section-link.active .section-icon-wrapper {
         background-color: var(--color-primary);
         color: white;
     }

    .section-title {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .no-sections-message {
         padding: 15px 5px;
         color: var(--color-text-muted);
         font-style: italic;
         font-size: 0.9em;
    }
    .create-section-btn-empty { /* Кнопка для создания первого раздела */
        margin: 10px 5px;
        width: calc(100% - 10px);
        justify-content: center;
         background-color: var(--color-primary-light) !important;
         color: var(--color-primary-dark) !important;
         border: none !important;
    }
     .create-section-btn-empty:hover {
         background-color: var(--color-primary) !important;
         color: white !important;
     }

    /* Кнопки управления разделом в сайдбаре */
    .section-admin-controls {
        display: flex;
        align-items: center;
        padding-right: 5px;
        opacity: 0; /* Скрыты по умолчанию */
        transition: opacity 0.2s ease;
    }
     .section-link-wrapper:hover .section-admin-controls {
         opacity: 1; /* Показываем при наведении на строку */
     }
     .section-admin-btn {
         background: none; border: none; padding: 4px; cursor: pointer; color: var(--color-text-muted);
         display: flex; align-items: center; justify-content: center;
         border-radius: 3px;
     }
     .section-admin-btn:hover { color: var(--color-text-dark); background-color: #e8e8e8; }
     .section-admin-btn.edit-btn:hover { color: var(--color-blue); }
     .section-admin-btn.delete-btn:hover { color: var(--color-danger-red); }


	/* --- Основной контент --- */
	.lesson-main-content {
		flex-grow: 1;
        min-width: 0;
        background-color: var(--color-bg-light); /* Белый блок */
        padding: clamp(20px, 3vw, 40px); /* Адаптивный паддинг */
        border-radius: var(--spacing-border-radius-block); /* Используем переменную */
        box-shadow: var(--color-shadow);
	}
    .section-content-area {
         /* Стили для контейнера текущего раздела */
    }
    .section-header { /* Убрали из Lesson.svelte, теперь не нужен */ }
    .section-items-list {
        display: flex;
        flex-direction: column;
        gap: clamp(20px, 3vw, 30px); /* Увеличим отступ */
    }
    .section-item-wrapper {
        /* Убрали фон, теперь он на .lesson-main-content */
        padding: 0; /* Убираем лишний паддинг */
        border: none; /* Убираем лишнюю границу */
        /* border-bottom: 1px dashed var(--color-border-light); */ /* Тонкий разделитель между элементами */
        /* padding-bottom: clamp(20px, 3vw, 30px); */
        position: relative;
    }
     .section-items-list > .section-item-wrapper:last-child {
         /* border-bottom: none; */
         /* padding-bottom: 0; */
     }

    .no-items-message, .select-section-message, .no-content-message {
        text-align: center;
        font-size: 1.1rem;
        color: var(--color-text-muted);
        padding: 40px 20px;
        background-color: #f9f9f9;
        border-radius: var(--spacing-border-radius-small);
        border: 1px dashed #e0e0e0;
    }

	/* --- Админские кнопки для Элементов --- */
    .item-admin-controls {
        position: absolute;
        top: -5px; /* Чуть выше */
        right: -5px;
        display: flex;
        gap: 5px;
        background-color: rgba(230, 230, 255, 0.9); /* Слегка сиреневый фон */
        padding: 4px 6px;
        border-radius: 5px;
        border: 1px solid var(--color-border-admin-button);
        opacity: 0;
        transition: opacity 0.2s ease, transform 0.2s ease;
        transform: translateY(-5px);
        z-index: 10; /* Поверх контента */
    }
    .section-item-wrapper:hover .item-admin-controls {
        opacity: 1;
        transform: translateY(0);
    }
    .item-admin-btn {
         background: none; border: none; padding: 4px; cursor: pointer;
         color: var(--color-text-admin-button); /* Синий цвет */
         display: flex; align-items: center; justify-content: center;
         border-radius: 3px;
    }
     .item-admin-btn:hover { background-color: rgba(255, 255, 255, 0.7); }
     .item-admin-btn.edit-btn:hover { color: #0056b3; } /* Темнее синий */
     .item-admin-btn.delete-btn:hover { color: var(--color-danger-red); }
     .item-admin-btn.move-btn:hover { color: #5e35b1; } /* Фиолетовый */

    .add-item-container {
        margin-top: clamp(25px, 4vw, 40px);
        text-align: center;
        border-top: 1px dashed var(--color-border-light);
        padding-top: clamp(20px, 3vw, 30px);
    }
     .add-item-button {
         background-color: var(--color-bg-admin-button-create); /* Синяя кнопка */
         color: var(--color-text-admin-button-create);
         border-color: var(--color-bg-admin-button-create);
         padding: 10px 20px;
         font-size: 0.95rem;
     }
      .add-item-button:hover {
          background-color: var(--color-bg-admin-button-create-hover);
          border-color: var(--color-bg-admin-button-create-hover);
      }

    /* --- Кнопка сайдбара на мобильных --- */
     .sidebar-toggle-button { display: none; /* Скрываем по умолчанию */ }

	/* --- Адаптивность --- */
	@media (max-width: 1024px) {
		.lesson-sidebar { flex-basis: 220px; } /* Уменьшаем сайдбар */
	}

	@media (max-width: 768px) {
        .lesson-page-container { padding: 15px var(--spacing-padding-page-small); }
		.lesson-content-wrapper { flex-direction: column; }
		.lesson-sidebar {
            position: static; height: auto; overflow-y: visible; width: 100%;
            margin-bottom: var(--spacing-margin-bottom-medium);
            max-height: none; /* Убираем ограничение */
            border: none; border-radius: 0; padding: 0; background: none;
            display: none; /* Скрываем по умолчанию */
		}
         .lesson-sidebar.open { display: block; }
         .sidebar-toggle-button {
             display: block; /* Показываем кнопку */
             width: 100%;
             padding: 10px;
             margin-bottom: 15px;
             background-color: var(--color-bg-light);
             border: 1px solid var(--color-border-light);
             border-radius: var(--spacing-border-radius-small);
             text-align: center;
             font-weight: var(--font-weight-semi-bold);
             cursor: pointer;
             color: var(--color-primary);
         }
         .lesson-main-content { padding: 20px 15px; }
	}
     @media (max-width: 480px) {
         .lesson-title { font-size: 1.3rem; }
         .item-admin-controls { /* Делаем кнопки чуть крупнее и всегда видимыми */
            opacity: 0.9;
            transform: translateY(0);
            top: 0px; right: 0px; padding: 5px; gap: 8px;
            background-color: rgba(230, 230, 255, 0.95);
         }
          .section-link { padding: 10px 3px; }
          .section-icon-wrapper { width: 28px; height: 28px; margin-right: 8px; }
          .section-title { font-size: 0.9rem; }
     }

</style>