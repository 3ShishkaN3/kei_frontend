<script>
	import { onMount, tick, onDestroy, createEventDispatcher } from 'svelte';
	import { link } from 'svelte-routing';
	import { fade, fly, slide } from 'svelte/transition';
	export let courseId;
	export let lessonId;

	import { user } from '../stores/user.js';
	import { API_BASE_URL } from '../config.js';
	import * as lessonApi from '../api/lessonApi.js';
    import { addNotification } from '../stores/notifications.js';

	import EyeOutline from 'svelte-material-icons/EyeOutline.svelte';
	import EyeOffOutline from 'svelte-material-icons/EyeOffOutline.svelte';
	import PlusCircleOutline from 'svelte-material-icons/PlusCircleOutline.svelte';
	import PencilOutline from 'svelte-material-icons/PencilOutline.svelte';
	import DeleteOutline from 'svelte-material-icons/DeleteOutline.svelte';
	import ChevronDoubleUp from 'svelte-material-icons/ChevronDoubleUp.svelte';
	import ChevronDoubleDown from 'svelte-material-icons/ChevronDoubleDown.svelte';
	import ArrowUpBoldOutline from 'svelte-material-icons/ArrowUpBoldOutline.svelte';
	import ArrowDownBoldOutline from 'svelte-material-icons/ArrowDownBoldOutline.svelte';
	import Icon1 from 'svelte-material-icons/Numeric1CircleOutline.svelte';
	import Icon2 from 'svelte-material-icons/Numeric2CircleOutline.svelte';
	import Icon3 from 'svelte-material-icons/Numeric3CircleOutline.svelte';
	import Icon4 from 'svelte-material-icons/Numeric4CircleOutline.svelte';
	import HomeOutline from 'svelte-material-icons/HomeOutline.svelte';
    import FolderPlusOutline from 'svelte-material-icons/FolderPlusOutline.svelte';
    import MenuIcon from 'svelte-material-icons/Menu.svelte';
    import CloseIcon from 'svelte-material-icons/Close.svelte';

	import LoadingIndicator from '../components/utils/LoadingIndicator.svelte';
	import ErrorMessage from '../components/utils/ErrorMessage.svelte';
	import TextItemDisplay from '../components/lesson/items/TextItemDisplay.svelte';
	import ImageItemDisplay from '../components/lesson/items/ImageItemDisplay.svelte';
	import AudioItemDisplay from '../components/lesson/items/AudioItemDisplay.svelte';
	import VideoItemDisplay from '../components/lesson/items/VideoItemDisplay.svelte';
	import DocumentItemDisplay from '../components/lesson/items/DocumentItemDisplay.svelte';
	import TestItemDisplay from '../components/lesson/items/TestItemDisplay.svelte';
	import SectionItemFormModal from '../components/lesson/SectionItemFormModal.svelte';
    import SimpleInputModal from '../components/utils/SimpleInputModal.svelte';
    import ConfirmModal from '../components/utils/ConfirmModal.svelte';

	let lessonData = null;
	let courseTitle = '';
	let isLoading = true;
    let isSectionLoading = false;
	let error = null;
	let viewMode = 'student';
	let currentUserRole = null;
	let isAdminOrStaff = false;
    
    let sections = [];
    let currentSectionId = null;
    let currentSectionData = null;

    let studentSubmissionsMap = {}; 

	let isMobileSidebarOpen = false;
	let isItemModalOpen = false;
	let editingItem = null;
    let targetSectionIdForItem = null;
    let itemFormModalRef; 

    let isSectionModalOpen = false;
    let editingSection = null;
    let sectionModalTitle = '';
    let sectionModalPrompt = '';
    let sectionModalInitialValue = '';

    let isConfirmModalOpen = false;
    let confirmModalTitle = '';
    let confirmModalMessage = '';
    let confirmAction = null;

    const LAST_SECTION_STORAGE_KEY_PREFIX = 'lastActiveSection_lesson_';

	const dispatch = createEventDispatcher();

	const unsubscribeUser = user.subscribe((value) => {
		currentUserRole = value?.role;
		isAdminOrStaff = ['admin', 'teacher', 'assistant'].includes(currentUserRole);
		if (isAdminOrStaff && viewMode === 'student') {
			viewMode = 'admin';
		} else if (!isAdminOrStaff) {
			viewMode = 'student';
		}
	});

	onMount(async () => {
		if (courseId && lessonId) {
            let lastActiveSectionId = null;
            if (typeof localStorage !== 'undefined') {
                const storedId = localStorage.getItem(`${LAST_SECTION_STORAGE_KEY_PREFIX}${lessonId}`);
                if (storedId) {
                    lastActiveSectionId = parseInt(storedId, 10);
                }
            }
			await loadLessonData(lastActiveSectionId);
		} else {
            const msg = "Не удалось получить ID курса или урока.";
			error = msg;
            addNotification(msg, 'error');
			isLoading = false;
		}
	});

    onDestroy(() => { 
        unsubscribeUser(); 
    });

	async function loadLessonData(setActiveSectionId = null, preserveSubmissions = false) {
		if (!preserveSubmissions) {
            isLoading = true; 
        }
        if (lessonData && !isSectionLoading && !preserveSubmissions) {
             isSectionLoading = true; 
        }
		error = null;
		try {
			const data = await lessonApi.fetchLessonDetails(courseId, lessonId);
			lessonData = data;
			courseTitle = data.course_title || `Курс #${courseId}`;
            
            const newSections = (data.sections || []).sort((a, b) => a.order - b.order);
            sections = newSections;

            let targetId = setActiveSectionId; 

            if (!targetId && currentSectionId && newSections.some(s => s.id === currentSectionId)) {
                targetId = currentSectionId; 
            }
            
            if (targetId && newSections.some(s => s.id === targetId)) {
                currentSectionId = targetId;
            } else if (newSections.length > 0) {
                currentSectionId = newSections[0].id;
            } else {
                currentSectionId = null;
            }

            if (!preserveSubmissions) {
                studentSubmissionsMap = {}; 
                newSections.forEach(section => {
                    (section.items || []).forEach(item => {
                        if (item.item_type === 'test' && item.content_details?.student_submission_details) {
                            studentSubmissionsMap[item.id] = item.content_details.student_submission_details;
                        }
                    });
                });
                studentSubmissionsMap = {...studentSubmissionsMap};
            }

		} catch (err) {
			error = err.message || 'Неизвестная ошибка загрузки урока.';
            addNotification(error, 'error');
            sections = [];
            currentSectionId = null;
		} finally {
			if (isLoading && !isSectionLoading && !preserveSubmissions) { 
                isLoading = false;
            }
            if(isSectionLoading && !preserveSubmissions) { 
                isSectionLoading = false;
            }
		}
	}

    $: {
        if (currentSectionId && sections.length > 0) {
            const foundSection = sections.find(s => s.id === currentSectionId);
            if (foundSection) {
                 currentSectionData = {
                     ...foundSection,
                     items: (foundSection.items || []).sort((a, b) => a.order - b.order)
                 };
                 if (typeof localStorage !== 'undefined' && lessonId && currentSectionId) {
                    localStorage.setItem(`${LAST_SECTION_STORAGE_KEY_PREFIX}${lessonId}`, currentSectionId.toString());
                 }
            } else {
                 currentSectionData = null; 
                 if (sections.length > 0 && !sections.some(s => s.id === currentSectionId)) { 
                    currentSectionId = sections[0].id; 
                 } else if (sections.length === 0) {
                    currentSectionId = null;
                 }
            }
        } else if (sections.length === 0) { 
            currentSectionData = null;
            currentSectionId = null;
        } else { 
            currentSectionData = null;
        }
    }

    function switchSection(sectionId) {
        if (currentSectionId !== sectionId) {
            currentSectionId = sectionId; // Это вызовет реактивный блок $: {} для сохранения в localStorage
            if (isMobileSidebarOpen) isMobileSidebarOpen = false;
            const mainContentEl = document.querySelector('.lesson-main-content');
            if (mainContentEl) {
                 mainContentEl.scrollTo({ top: 0, behavior: 'auto' });
            }
        }
    }

    function openCreateSectionModal() {
        editingSection = null;
        sectionModalTitle = "Создать новый раздел";
        sectionModalPrompt = "Название нового раздела:";
        sectionModalInitialValue = "";
        isSectionModalOpen = true;
    }

    function openEditSectionModal(section) {
        editingSection = section;
        sectionModalTitle = "Редактировать раздел";
        sectionModalPrompt = "Новое название раздела:";
        sectionModalInitialValue = section.title;
        isSectionModalOpen = true;
    }

    async function saveSection(event) {
        const newTitle = event.detail.trim();
        if (!newTitle) return;
        isSectionLoading = true;
        try {
            let savedSection;
            if (editingSection) {
                savedSection = await lessonApi.updateSection(courseId, lessonId, editingSection.id, { title: newTitle });
            } else {
                savedSection = await lessonApi.createSection(courseId, lessonId, { title: newTitle });
            }
            isSectionModalOpen = false;
            await loadLessonData(savedSection.id, true); // preserveSubmissions = true
            addNotification(`Раздел успешно ${editingSection ? 'обновлен' : 'создан'}!`, 'success');
        } catch (err) {
             addNotification(`Не удалось сохранить раздел: ${err.message || 'Неизвестная ошибка'}`, 'error');
        } finally {
             isSectionLoading = false;
        }
    }

    async function confirmDeleteSection(sectionId) {
        confirmModalTitle = "Удаление раздела";
        confirmModalMessage = `Вы уверены, что хотите удалить этот раздел и ВСЕ его содержимое? Это действие необратимо.`;
        confirmAction = async () => {
            isSectionLoading = true;
            const previousSectionIdIfActive = currentSectionId === sectionId ? null : currentSectionId;
            try {
                await lessonApi.deleteSection(courseId, lessonId, sectionId);
                // Определяем, какая секция должна стать активной после удаления
                const remainingSections = sections.filter(s => s.id !== sectionId);
                let newActiveSectionId = null;
                if (remainingSections.length > 0) {
                    if (currentSectionId === sectionId) { // Если удалили активную
                        newActiveSectionId = remainingSections[0].id; // Активируем первую из оставшихся
                    } else if (remainingSections.some(s => s.id === currentSectionId)) { // Если активная не удалена
                        newActiveSectionId = currentSectionId;
                    } else { // Активная была, но ее нет среди оставшихся (не должно быть, но на всякий)
                        newActiveSectionId = remainingSections[0].id;
                    }
                }
                if (typeof localStorage !== 'undefined' && lessonId && newActiveSectionId === null) {
                    localStorage.removeItem(`${LAST_SECTION_STORAGE_KEY_PREFIX}${lessonId}`);
                }
                await loadLessonData(newActiveSectionId, true); 
                addNotification('Раздел успешно удален.', 'success');
            } catch (err) {
                addNotification(`Не удалось удалить раздел: ${err.message || 'Неизвестная ошибка'}`, 'error');
                await loadLessonData(previousSectionIdIfActive, true);
            } finally {
                isSectionLoading = false;
                isConfirmModalOpen = false; 
            }
        };
        isConfirmModalOpen = true;
	}

    async function moveSection(sectionId, direction) {
        const currentIndex = sections.findIndex(s => s.id === sectionId);
        if (currentIndex === -1) return;
        let targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= sections.length) return;

        let currentSectionsCopy = JSON.parse(JSON.stringify(sections));
        const sectionToMove = currentSectionsCopy[currentIndex];
        const otherSection = currentSectionsCopy[targetIndex];
        const tempOrder = sectionToMove.order;
        sectionToMove.order = otherSection.order;
        otherSection.order = tempOrder;
        
        currentSectionsCopy.sort((a, b) => a.order - b.order);
        sections = [...currentSectionsCopy]; 
        
        const payload = [ { id: sectionToMove.id, order: sectionToMove.order }, { id: otherSection.id, order: otherSection.order } ];
        
        isSectionLoading = true;
        try {
            const updatedSectionsFromServer = await lessonApi.reorderSections(courseId, lessonId, payload);
            sections = [...updatedSectionsFromServer.sort((a,b) => a.order - b.order)]; 
            addNotification('Порядок разделов успешно изменен.', 'success');
        } catch (err) {
            addNotification(`Ошибка изменения порядка разделов: ${err.message || 'Неизвестная ошибка'}`, 'error');
            await loadLessonData(currentSectionId, true); 
        } finally {
            isSectionLoading = false;
        }
    }

    function toggleViewMode() { viewMode = viewMode === 'admin' ? 'student' : 'admin'; }

	function openAddItemModal() {
        if (!currentSectionId) { addNotification("Сначала выберите или создайте раздел.", 'warning'); return; }
		editingItem = null;
        targetSectionIdForItem = currentSectionId;
		isItemModalOpen = true;
	}

	function openEditItemModal(item) {
		editingItem = item;
        targetSectionIdForItem = item.section;
		isItemModalOpen = true;
	}

    async function deleteItem(item) {
        confirmModalTitle = "Удаление элемента";
        confirmModalMessage = `Удалить элемент "${item.content_details?.title || item.item_type}"?`;
        confirmAction = async () => {
            isSectionLoading = true;
            try {
                await lessonApi.deleteSectionItem(courseId, lessonId, item.section, item.id);
                await loadLessonData(currentSectionId, true);
                addNotification('Элемент удален.', 'success');
            } catch (err) {
                addNotification(`Ошибка удаления элемента: ${err.message || 'Неизвестная ошибка'}`, 'error');
            } finally {
                isSectionLoading = false;
                isConfirmModalOpen = false;
            }
        };
        isConfirmModalOpen = true;
    }

    async function moveItem(item, direction) {
        if (!currentSectionData?.items) return;
        
        let itemsArrayCopy = [...currentSectionData.items];
        const currentIndex = itemsArrayCopy.findIndex(i => i.id === item.id);
        if (currentIndex === -1) return;
        let targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= itemsArrayCopy.length) return;

        const itemToMove = itemsArrayCopy[currentIndex];
        const otherItem = itemsArrayCopy[targetIndex];
        const tempOrder = itemToMove.order;
        itemToMove.order = otherItem.order;
        otherItem.order = tempOrder;
        
        itemsArrayCopy.sort((a, b) => a.order - b.order);
        currentSectionData = { ...currentSectionData, items: itemsArrayCopy };
        const sectionIndex = sections.findIndex(s => s.id === currentSectionId);
        if (sectionIndex !== -1) {
            sections[sectionIndex] = { ...sections[sectionIndex], items: [...currentSectionData.items] };
            sections = [...sections]; 
        }
        lessonData = {...lessonData, sections: sections };

        const payload = [ { id: itemToMove.id, order: itemToMove.order }, { id: otherItem.id, order: otherItem.order } ];
        
        isSectionLoading = true;
        try {
            const updatedItemsFromServer = await lessonApi.reorderSectionItems(courseId, lessonId, currentSectionId, payload);
            currentSectionData = { ...currentSectionData, items: updatedItemsFromServer.sort((a,b) => a.order - b.order) };
            if (sectionIndex !== -1) {
                 sections[sectionIndex] = { ...sections[sectionIndex], items: [...currentSectionData.items] };
                 sections = [...sections];
            }
            lessonData = {...lessonData, sections: sections };
            addNotification('Порядок элементов успешно изменен.', 'success');
        } catch (err) {
            addNotification(`Ошибка изменения порядка элементов: ${err.message || 'Неизвестная ошибка'}`, 'error');
            await loadLessonData(currentSectionId, true); 
        } finally {
            isSectionLoading = false;
        }
    }

    function closeItemModal() { 
        isItemModalOpen = false; 
        editingItem = null; 
        targetSectionIdForItem = null; 
    }

    async function saveItem(event) {
        const itemPayload = event.detail;
		const isCreating = !editingItem;
        let targetSecId = editingItem ? editingItem.section : targetSectionIdForItem;

        if (!targetSecId) { 
            addNotification("Ошибка: раздел не определен.", 'error'); 
            if (itemFormModalRef) itemFormModalRef.setLoading(false);
            return; 
        }
        isSectionLoading = true;
        try {
            if (isCreating) {
                await lessonApi.createSectionItem(courseId, lessonId, targetSecId, itemPayload);
            } else {
                await lessonApi.updateSectionItem(courseId, lessonId, targetSecId, editingItem.id, itemPayload);
            }
            closeItemModal();
            await loadLessonData(targetSecId, true); 
            addNotification(`Элемент успешно ${isCreating ? 'добавлен' : 'обновлен'}.`, 'success');
		} catch (err) {
			addNotification(`Ошибка сохранения элемента: ${err.message || 'Неизвестная ошибка'}`, 'error');
            if (itemFormModalRef) itemFormModalRef.setLoading(false); 
		} finally {
            isSectionLoading = false; 
        }
	}

	function getSectionIcon(index) {
        const icons = [Icon1, Icon2, Icon3, Icon4];
        return index < icons.length ? icons[index] : HomeOutline;
	}

    async function handleTestSubmitEvent(event) {
        const { testId, sectionItemId, answers, fileData } = event.detail;
        
        isSectionLoading = true; 
        try {
            let payloadToSend;
            if (fileData && (fileData.audio || fileData.image)) {
                payloadToSend = new FormData();
                payloadToSend.append('section_item_id', sectionItemId.toString());
                payloadToSend.append('answers', JSON.stringify(answers));
                if (fileData.audio) {
                    payloadToSend.append('submitted_audio_file', fileData.audio, fileData.audio.name);
                }
                if (fileData.image) {
                    payloadToSend.append('submitted_image_file', fileData.image, fileData.image.name);
                }
            } else {
                payloadToSend = { 
                    section_item_id: sectionItemId, 
                    answers: answers,
                };
            }
            
            const submissionResult = await lessonApi.submitTestAnswers(testId, payloadToSend);

            const testTitleFromResult = submissionResult?.test?.title || `Тест #${testId}`;
            addNotification(`Тест "${testTitleFromResult}" отправлен! Статус: ${submissionResult.status}`, 'success');
            
            studentSubmissionsMap = {
                ...studentSubmissionsMap,
                [sectionItemId]: submissionResult 
            };
            // Не вызываем loadLessonData, чтобы studentSubmissionsMap не перезаписался,
            // если бэкенд не отдает student_submission_details с lessonData.
            // Обновление studentSubmissionsMap должно вызвать реактивность в TestItemDisplay.

        } catch(err) {
             addNotification(`Ошибка отправки теста: ${err.message || 'Неизвестная ошибка'}`, 'error');
        } finally {
            isSectionLoading = false;
        }
    }

    function handleOverlayClick(event) {
        if (isMobileSidebarOpen && event.target === event.currentTarget) {
            isMobileSidebarOpen = false;
        }
    }

    function handleNotifyEvent(event) {
        const { type, message } = event.detail;
        if (typeof addNotification === 'function') {
            addNotification(message, type);
        } else {
            console.warn("addNotification function is not available to handle notify event:", event.detail);
        }
    }
</script>
<!-- Добавляем on:click={handleOverlayClick} -->
<div 
    class="lesson-page-container {isAdminOrStaff && viewMode === 'admin' ? 'admin-view' : 'student-view'}"
    class:sidebar-mobile-active={isMobileSidebarOpen}
    in:fade="{{duration: 250}}"
    on:click={handleOverlayClick}
>
	{#if isLoading && !lessonData } <LoadingIndicator message="Загрузка урока..." />
	{:else if error && !lessonData}
		<ErrorMessage message={error} />
	{:else if lessonData}
		<div class="lesson-header" in:fly="{{ y: -20, duration: 300, delay: 50 }}">
			<h1 class="lesson-title">
				<a href={`/courses/${courseId}/lessons`} use:link class="course-link" title="К списку уроков">{courseTitle}</a>
                 <span class="separator">-</span>
                 <span class="lesson-name">{lessonData.title}</span>
			</h1>
            {#if isAdminOrStaff}
                <div class="admin-controls-header">
                    <button class="admin-button view-toggle-button" on:click={toggleViewMode} title={viewMode === 'admin' ? 'Студенческий вид' : 'Режим преподавателя'}>
                         <svelte:component this={viewMode === 'admin' ? EyeOutline : EyeOffOutline} size="18px" />
                         <span>{viewMode === 'admin' ? 'Студент' : 'Админ'}</span>
                    </button>
                </div>
            {/if}
		</div>

        <button
            class="sidebar-toggle-button"
            on:click={() => isMobileSidebarOpen = !isMobileSidebarOpen}
            aria-label={isMobileSidebarOpen ? 'Закрыть разделы' : 'Открыть разделы'}
            title={isMobileSidebarOpen ? 'Закрыть разделы' : 'Открыть разделы'}
        >
            <svelte:component this={isMobileSidebarOpen ? CloseIcon : MenuIcon} size="24px" />
            {#if !isMobileSidebarOpen}<span>Разделы</span>{/if}
        </button>

		<div class="lesson-content-layout">
            <main class="lesson-main-content">
                {#if isSectionLoading && lessonData } <div class="content-loader" transition:fade="{{duration:150}}">
                        <LoadingIndicator message="Обновление..." />
                    </div>
                {/if}

                {#if currentSectionData}
                    <div class="section-content-area" key={currentSectionId} in:fade="{{duration: 350, delay:50}}" out:fade="{{duration: 150}}">
                        <h2 class="current-section-title">{currentSectionData.title}</h2>
                        {#if currentSectionData.items && currentSectionData.items.length > 0}
                            <div class="section-items-list">
                                {#each currentSectionData.items as item, itemIndex (item.id)}
                                    <div class="section-item-wrapper" in:fly="{{ y: 10, duration: 300, delay: itemIndex * 60 }}">
                                         {#if isAdminOrStaff && viewMode === 'admin'}
                                            <div class="item-admin-controls">
                                                <button title="Редактировать" on:click={() => openEditItemModal(item)} class="item-admin-btn edit-btn" disabled={isSectionLoading}><PencilOutline size="16px" /></button>
                                                <button title="Вверх" on:click={() => moveItem(item, 'up')} class="item-admin-btn move-btn" disabled={itemIndex === 0 || isSectionLoading}><ChevronDoubleUp size="16px" /></button>
                                                <button title="Вниз" on:click={() => moveItem(item, 'down')} class="item-admin-btn move-btn" disabled={itemIndex === currentSectionData.items.length - 1 || isSectionLoading}><ChevronDoubleDown size="16px" /></button>
                                                <button title="Удалить" on:click={() => deleteItem(item)} class="item-admin-btn delete-btn" disabled={isSectionLoading}><DeleteOutline size="16px" /></button>
                                            </div>
                                        {/if}
                                        {#if item.item_type === 'text'} <TextItemDisplay contentDetails={item.content_details} />
										{:else if item.item_type === 'image'} <ImageItemDisplay contentDetails={item.content_details} />
                                        {:else if item.item_type === 'audio'} <AudioItemDisplay contentDetails={item.content_details} />
                                        {:else if item.item_type === 'video'} <VideoItemDisplay contentDetails={item.content_details} />
                                        {:else if item.item_type === 'document'} <DocumentItemDisplay contentDetails={item.content_details} />
                                        {:else if item.item_type === 'test'}
                                            <TestItemDisplay 
                                                testData={item.content_details} 
                                                sectionItemId={item.id} 
                                                on:submitTest={handleTestSubmitEvent} 
                                                {viewMode}
                                                studentSubmission={studentSubmissionsMap[item.id] || null}
                                                on:notify={handleNotifyEvent}
                                            />
										{:else} <p class="error-message">Неизвестный тип элемента: {item.item_type}</p> {/if}
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <p class="no-content-message main">В этом разделе пока нет материалов.</p>
                        {/if}
                        {#if isAdminOrStaff && viewMode === 'admin'}
                             <div class="add-item-container">
                                <button class="admin-button add-item-button" on:click={openAddItemModal} disabled={isSectionLoading}>
                                    <PlusCircleOutline size="18px" /> Добавить элемент
                                </button>
                            </div>
                        {/if}
                    </div>
                {:else if sections.length > 0 && !isSectionLoading}
                    <p class="no-content-message main">Выберите раздел для просмотра.</p>
                {:else if !isSectionLoading && !(isAdminOrStaff && viewMode === 'admin')}
                     <p class="no-content-message main">В этом уроке пока нет содержимого.</p>
                {/if}
			</main>
			<aside class="lesson-sidebar {isMobileSidebarOpen ? 'mobile-open' : ''}" in:fly="{{ x: isAdminOrStaff && !isMobileSidebarOpen ? 0 : (isMobileSidebarOpen ? 0 : 50), duration: 300, delay: 100 }}">
                <div class="sidebar-header">
				    <h2 class="sidebar-title">Разделы</h2>
                    {#if isAdminOrStaff && viewMode === 'admin'}
                        <button class="admin-button create-section-btn" on:click={openCreateSectionModal} title="Создать новый раздел">
                             <FolderPlusOutline size="18px" />
                        </button>
                    {/if}
                </div>
				<nav class="sidebar-nav">
					{#if sections.length > 0}
                        <ul>
                            {#each sections as section, index (section.id)}
                                <li class="section-list-item" class:active={currentSectionId === section.id} transition:fade|local="{{duration:200}}">
                                    <div class="section-link-content">
                                        <button
                                            class="section-link"
                                            on:click={() => switchSection(section.id)}
                                            title={section.title}
                                        >
                                            <span class="section-icon-wrapper" key={section.id}>
                                                <svelte:component this={getSectionIcon(index)} size="20px" />
                                            </span>
                                            <span class="section-title-text">{section.title}</span>
                                        </button>
                                        {#if isAdminOrStaff && viewMode === 'admin'}
                                            <div class="section-admin-controls">
                                                 <button title="Редактировать" on:click={() => openEditSectionModal(section)} class="section-admin-btn edit-btn" disabled={isSectionLoading}><PencilOutline size="15px" /></button>
                                                 <button title="Вверх" on:click={() => moveSection(section.id, 'up')} class="section-admin-btn move-btn" disabled={index === 0 || isSectionLoading}><ArrowUpBoldOutline size="15px" /></button>
                                                 <button title="Вниз" on:click={() => moveSection(section.id, 'down')} class="section-admin-btn move-btn" disabled={index === sections.length - 1 || isSectionLoading}><ArrowDownBoldOutline size="15px" /></button>
                                                 <button title="Удалить" on:click={() => confirmDeleteSection(section.id)} class="section-admin-btn delete-btn" disabled={isSectionLoading}><DeleteOutline size="15px" /></button>
                                            </div>
                                        {/if}
                                    </div>
                                </li>
                            {/each}
                        </ul>
                    {:else}
                         <p class="no-content-message sidebar">Разделы еще не созданы.</p>
                         {#if isAdminOrStaff && viewMode === 'admin'}
                             <button class="admin-button create-section-btn-empty" on:click={openCreateSectionModal}>
                                 <FolderPlusOutline size="18px" /> Создать первый раздел
                             </button>
                         {/if}
                    {/if}
				</nav>
			</aside>
		</div>
	{:else if !isLoading && !lessonData && error}
		<ErrorMessage message={error} />
	{:else if !isLoading && !lessonData}
        <p class="no-content-message">Не удалось загрузить данные урока.</p>
    {/if}


    {#if isItemModalOpen}
        <SectionItemFormModal 
            bind:this={itemFormModalRef} 
            bind:isOpen={isItemModalOpen} 
            itemToEdit={editingItem} 
            {courseId} 
            {lessonId} 
            targetSectionId={targetSectionIdForItem} 
            {isAdminOrStaff} 
            on:save={saveItem} 
            on:close={closeItemModal}
        />
    {/if}

     {#if isSectionModalOpen}
          <SimpleInputModal
             bind:isOpen={isSectionModalOpen}
             title={sectionModalTitle}
             prompt={sectionModalPrompt}
             initialValue={sectionModalInitialValue}
             on:submit={saveSection}
             on:close={() => isSectionModalOpen = false}
             isLoading={isSectionLoading}
           />
     {/if}

     {#if isConfirmModalOpen}
        <ConfirmModal
            bind:isOpen={isConfirmModalOpen}
            title={confirmModalTitle}
            message={confirmModalMessage}
            confirmButtonText="Да, удалить"
            confirmButtonClass="confirm-btn-danger"
            isLoading={isSectionLoading}
            on:confirm={() => {
                if (confirmAction) confirmAction();
            }}
            on:cancel={() => {
                isConfirmModalOpen = false;
                confirmAction = null;
            }}
        />
    {/if}
</div>

<style>
	.lesson-page-container {
		padding: clamp(40px, 6vw, 60px) var(--spacing-padding-page);
		max-width: var(--max-width-page);
		margin: 0 auto;
		min-height: calc(var(--min-height-page) + 50px);
        opacity: 0;
        animation: pageFadeIn 0.4s ease-out forwards;
	}
    @keyframes pageFadeIn {
        to { opacity: 1; }
    }

	.lesson-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--spacing-gap-medium);
		margin-bottom: var(--spacing-margin-bottom-large);
		border-bottom: 1px solid var(--color-border-light);
		padding-bottom: var(--spacing-padding-medium);
	}
    .lesson-title {
        font-family: var(--font-family-primary);
        font-size: clamp(1.7rem, 4.5vw, 2.5rem);
        color: var(--color-text-dark);
        font-weight: var(--font-weight-bold);
        margin: 0;
        line-height: 1.2;
    }
    .course-link { color: var(--color-secondary); text-decoration: none; transition: color 0.2s; }
    .course-link:hover { color: var(--color-primary); text-decoration: underline; }
    .separator { margin: 0 0.5em; color: var(--color-text-muted); font-weight: var(--font-weight-regular); }
    .lesson-name { color: var(--color-text-dark); }

    .admin-controls-header .admin-button {
        font-size: 0.8rem;
        padding: 6px 12px;
        background-color: var(--color-bg-admin-button);
        color: var(--color-text-admin-button);
        border-color: var(--color-border-admin-button);
    }
    .admin-controls-header .admin-button:hover {
        background-color: var(--color-border-admin-button);
    }
     .admin-controls-header .admin-button span { margin-left: 5px; }

	.lesson-content-layout {
		display: grid;
		gap: var(--spacing-gap-large);
	}

    @media (min-width: 992px) {
        .lesson-content-layout {
            grid-template-columns: minmax(0, 1fr) 280px;
        }
        .lesson-sidebar {
            grid-column: 2 / 3;
            position: sticky;
            top: calc(var(--spacing-header-height, 80px) + 20px);
            height: calc(100vh - var(--spacing-header-height, 80px) - 40px);
            overflow-y: auto;
        }
         .lesson-main-content {
            grid-column: 1 / 2;
            margin-right: clamp(25px, 3vw, 40px);
        }
         .sidebar-toggle-button { display: none; }
    }

	.lesson-sidebar {
        border-radius: var(--spacing-border-radius-block);
        background-color: var(--color-bg-light);
        padding: var(--spacing-padding-block);
        box-shadow: var(--color-shadow);
        transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
	}
    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-margin-bottom-small);
        padding-bottom: var(--spacing-padding-small);
        border-bottom: 1px solid var(--color-border-light);
    }
    .sidebar-title {
        font-family: var(--font-family-primary);
        font-size: clamp(1.1rem, 2.5vw, 1.3rem);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-dark);
        margin: 0;
    }
    .create-section-btn {
        background: none;
        border: none;
        color: var(--color-primary);
        cursor: pointer;
        padding: 3px;
        display: flex;
        align-items: center;
        border-radius: 50%;
        padding: var(--spacing-padding-button);
    }
    .create-section-btn:hover { background-color: var(--color-bg-admin-button); color: var(--color-text-admin-button); }

    .sidebar-nav ul { list-style: none; padding: 0; margin: 0; }
    .section-list-item { position: relative; }
    .section-link-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid var(--color-border-light);
        transition: background-color 0.15s ease-out;
    }
    .sidebar-nav li:first-child .section-link-content { border-top: none; }
    .section-list-item:hover > .section-link-content { background-color: #f8f6ff; }

    .section-link {
        flex-grow: 1;
        display: flex;
        align-items: center;
        padding: 10px 6px;
        text-decoration: none;
        color: var(--color-text-muted);
        font-size: 0.9rem;
        border-radius: var(--spacing-border-radius-small);
        transition: color 0.2s, font-weight 0.2s, background-color 0.2s;
        cursor: pointer;
        background: none; border: none; text-align: left;
        width: 100%;
    }
    .section-list-item.active > .section-link-content {
        background-color: #EDEAFE;
    }
    .section-list-item.active .section-link {
        color: var(--color-primary);
        font-weight: var(--font-weight-bold);
    }

    .section-icon-wrapper {
        flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
        width: 28px; height: 28px; border-radius: 50%;
        background-color: #DFDBFF; color: var(--color-primary-dark, #5845d8);
        margin-right: 10px; transition: transform 0.2s ease, background-color 0.2s, color 0.2s;
    }
    .section-link-content:hover .section-icon-wrapper { transform: scale(1.03); }
    .section-list-item.active .section-icon-wrapper {
        background-color: var(--color-primary); color: white; transform: scale(1.05);
    }

    .section-title-text {
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 130px;
    }
    .section-admin-controls { display: flex; opacity: 0; transition: opacity 0.2s; margin-left: auto; }
    .section-list-item:hover .section-admin-controls,
    .section-list-item.active .section-admin-controls { opacity: 1; }

    .section-admin-btn { background: none; border: none; padding: 4px; cursor: pointer; color: var(--color-text-muted); }
    .section-admin-btn:hover { color: var(--color-text-dark); }
    .section-admin-btn:disabled { color: #bbb; cursor: not-allowed; }
    .section-admin-btn.edit-btn:hover:not(:disabled) { color: var(--color-blue, blue); }
    .section-admin-btn.delete-btn:hover:not(:disabled) { color: var(--color-danger-red); }
    .section-admin-btn.move-btn:hover:not(:disabled) { color: var(--color-secondary); }

	.lesson-main-content {
		background-color: var(--color-bg-light);
        padding: clamp(25px, 3vw, 40px);
        border-radius: var(--spacing-border-radius-block);
        box-shadow: var(--color-shadow);
        min-height: 450px;
        position: relative;
	}
    .content-loader {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        background-color: rgba(255,255,255,0.7);
        display: flex; align-items: center; justify-content: center;
        z-index: 10;
    }
    .current-section-title {
        font-family: var(--font-family-primary);
        font-size: clamp(1.4rem, 3.5vw, 2rem);
        color: var(--color-text-dark);
        font-weight: var(--font-weight-semi-bold);
        margin-top: 0;
        margin-bottom: var(--spacing-margin-bottom-medium);
        padding-bottom: var(--spacing-padding-small);
        border-bottom: 2px solid var(--color-primary-light);
    }

    .section-items-list {
        display: flex; flex-direction: column;
        gap: clamp(20px, 3vw, 30px);
    }
    .section-item-wrapper { position: relative; animation: itemFadeIn 0.4s ease-out; }
    @keyframes itemFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); }}

    .no-content-message {
        text-align: center; font-size: 1rem; color: var(--color-text-muted);
        padding: 30px 15px; background-color: var(--color-bg-ultra-light);
        border-radius: var(--spacing-border-radius-small);
        border: 1px dashed var(--color-border-light);
    }
    .no-content-message.sidebar { font-size: 0.9em; padding: 15px 10px; }
    .no-content-message.main { margin-top: 20px; }

    .create-section-btn-empty {
        display: flex; align-items: center; justify-content: center; gap: 8px;
        width: calc(100% - 10px); margin: 15px 5px; padding: 10px;
        background-color: var(--color-primary-light); color: var(--color-primary-dark);
        border: none; border-radius: var(--spacing-border-radius-small); font-weight: var(--font-weight-medium);
        cursor: pointer; transition: background-color 0.2s;
    }
    .create-section-btn-empty:hover { background-color: var(--color-primary); color: white; }

    .admin-button {
        background-color: var(--color-bg-admin-button);
        color: var(--color-text-admin-button);
        border: 1px solid var(--color-border-admin-button);
        border-radius: var(--spacing-border-radius-button);
        padding: var(--spacing-padding-button);
        font-weight: var(--font-weight-semi-bold);
        cursor: pointer;
        transition: all var(--animation-duration-transition) ease;
        display: inline-flex; align-items: center; gap: var(--spacing-gap-small);
        font-size: 0.9rem;
    }
    .admin-button:hover {
        background-color: var(--color-border-admin-button);
        box-shadow: 0 2px 8px rgba(77, 68, 181, 0.1);
    }
     .admin-button:disabled {
         opacity: 0.6;
         cursor: not-allowed;
     }
    .add-item-container { margin-top: var(--spacing-margin-bottom-large); text-align: center; border-top: 1px dashed var(--color-border-light); padding-top: var(--spacing-padding-medium); }
    .add-item-button {
         background-color: var(--color-bg-admin-button-create);
         color: var(--color-text-admin-button-create);
         border-color: var(--color-bg-admin-button-create);
         padding: var(--spacing-padding-button);
    }
    .add-item-button:hover:not(:disabled) { background-color: var(--color-bg-admin-button-create-hover); }

    .item-admin-controls {
        position: absolute;
        top: 5px;
        right: 5px;
        z-index: 5;
        display: flex;
        gap: 4px;
        background-color: rgba(255,255,255,0.8);
        padding: 2px 5px;
        border-radius: var(--spacing-border-radius-small);
        opacity: 0;
        transform: translateY(-10px);
        transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .section-item-wrapper:hover .item-admin-controls { opacity: 1; transform: translateY(0); }
    .item-admin-btn {
        background: none; border: none; padding: 4px; cursor: pointer; color: var(--color-text-muted);
    }
    .item-admin-btn:hover { color: var(--color-text-dark); }
    .item-admin-btn:disabled { color: #bbb; cursor: not-allowed; }
    .item-admin-btn.edit-btn:hover:not(:disabled) { color: var(--color-blue, blue); }
    .item-admin-btn.delete-btn:hover:not(:disabled) { color: var(--color-danger-red); }
    .item-admin-btn.move-btn:hover:not(:disabled) { color: var(--color-secondary); }

	.sidebar-toggle-button {
        display: none;
        width: auto;
        padding: 8px 15px;
        margin-bottom: var(--spacing-margin-bottom-medium);
        background-color: var(--color-bg-light);
        border: 1px solid var(--color-border-light);
        border-radius: var(--spacing-border-radius-button);
        text-align: left;
        font-weight: var(--font-weight-semi-bold);
        cursor: pointer; color: var(--color-primary);
        align-items: center; gap: 8px;
        box-shadow: var(--color-shadow); position: sticky; top: calc(var(--spacing-header-height, 80px) + 10px);
        z-index: 990;
        transition: background-color 0.2s ease;
    }
    .sidebar-toggle-button:hover {
        background-color: var(--color-bg-ultra-light);
    }

	@media (max-width: 991px) {
        .lesson-content-layout { grid-template-columns: 1fr; }
        .lesson-sidebar {
            position: fixed;
            top: 0; 
            left: 0;
            width: clamp(280px, 75vw, 320px);
            height: 100vh; 
            background-color: var(--color-bg-light);
            z-index: 1005; /* Сайдбар должен быть выше оверлея */
            transform: translateX(-105%);
            transition: transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
            box-shadow: 3px 0 15px rgba(0,0,0,0.15);
            overflow-y: auto;
            padding-top: calc(var(--spacing-header-height, 80px) + 20px); 
            padding-left: 20px;
            padding-right: 20px;
            padding-bottom: 20px;
            box-sizing: border-box; 
            border-radius: 0;
        }
        .lesson-sidebar.mobile-open { transform: translateX(0); }
        .sidebar-toggle-button { display: inline-flex; }
        .lesson-page-container {padding: clamp(30px, 8vw, 50px) var(--spacing-padding-page);}
        /* Оверлей, который появляется, когда сайдбар открыт на мобильных */
        .lesson-page-container.sidebar-mobile-active::before {
            content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(0,0,0,0.4); 
            z-index: 1000; /* Оверлей ниже сайдбара, но выше остального контента */
            opacity: 1; visibility: visible; transition: opacity 0.3s ease;
        }
        /* Скрытие оверлея по умолчанию */
        .lesson-page-container::before {
             content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
             background-color: rgba(0,0,0,0.4); z-index: 1000;
             opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0s 0.3s;
        }
	}

     @media (max-width: 768px) {
        .lesson-page-container { padding: clamp(30px, 8vw, 50px) var(--spacing-padding-page); }
        .lesson-header { margin-bottom: var(--spacing-margin-bottom-medium); }
        .lesson-main-content { padding: clamp(20px, 4vw, 30px); }
     }

     @media (max-width: 480px) {
         .lesson-title { font-size: 1.4rem; }
         .admin-controls-header .admin-button span { display: none; }
         .admin-controls-header .admin-button { padding: 8px; }
         .item-admin-controls { opacity: 0.9; transform: translateY(0); top: 2px; right: 2px; background: rgba(240,240,255,0.95); padding: 3px; gap: 5px;}
         .section-title-text { max-width: 100px; }
         .lesson-sidebar { 
             width: clamp(250px, 80vw, 300px); 
             padding-top: calc(var(--spacing-header-height, 70px) + 70px); 
             padding-left: 15px;
             padding-right: 15px;
             padding-bottom: 15px;
         }
         .sidebar-toggle-button {
            top: calc(var(--spacing-header-height, 70px) + 5px); 
            padding: 6px 10px;
         }
     }
    .error-message {
        color: var(--color-danger-red);
        background-color: rgba(255, 77, 77, 0.1);
        border: 1px solid var(--color-danger-red);
        padding: 0.5rem;
        border-radius: var(--spacing-border-radius-small);
        margin: 0.5rem 0;
    }

</style>