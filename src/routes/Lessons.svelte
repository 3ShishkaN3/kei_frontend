<script>
    import { onMount, onDestroy, tick } from 'svelte';
    import { navigate, useLocation } from 'svelte-routing';
    import { fly } from 'svelte/transition'; 
    import { dndzone } from 'svelte-dnd-action';
    import { cubicOut } from 'svelte/easing'; 

    import { user } from '../stores/user.js';
    import { API_BASE_URL } from '../config.js';
    import { apiFetch } from '../api/api.js';
    import { reorderLessons } from '../api/lessonApi.js';
    import { addNotification } from '../stores/notifications.js';
    import { courseLessonsPagination } from '../stores/pagination.js';

    import LessonCard from '../components/LessonCard.svelte';
    import DictionarySectionCard from '../components/dictionary/DictionarySectionCard.svelte';
    import EnhancedPagination from '../components/EnhancedPagination.svelte';
    import LessonFormModal from '../components/LessonFormModal.svelte';
    import DictionarySectionFormModal from '../components/DictionarySectionFormModal.svelte';

    import PlusCircleOutline from 'svelte-material-icons/PlusCircleOutline.svelte';
    import EyeOutline from 'svelte-material-icons/EyeOutline.svelte';
    import EyeOffOutline from 'svelte-material-icons/EyeOffOutline.svelte';
    export let courseId;

    const Cookies = {
        get: (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        },
        set: (name, value, days = 30) => {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            const expires = `; expires=${date.toUTCString()}`;
            document.cookie = `${name}=${value}${expires}; path=/`;
        }
    };

    let lessons = [];
    let dictionarySections = [];
    let lessonProgress = new Map();
    let isLoadingLessons = true;
    let isLoadingSections = true;
    let errorLessons = null;
    let errorSections = null;
    let currentUserRole = null;
    let isPrivilegedUser = false;
    let viewMode = 'student'; 
    let currentPage = 1;
    let pageSize = $courseLessonsPagination.size;
    let totalLessons = 0;
    let searchTerm = '';
    let isLessonModalOpen = false; 
    let editingLesson = null;
    let isSectionModalOpen = false;
    let editingSection = null;
    let lessonsSectionContainer;
    const ADMIN_LESSON_FETCH_LIMIT = 1000;
    const DND_FLIP_DURATION = 220;
    let isReorderSaving = false;
    let preDragSnapshot = [];
    
    const location = useLocation();

    let pageTransitionDirection = 1;
    let sortIndicators = {};

    const unsubscribePagination = courseLessonsPagination.subscribe(state => {
        const searchParams = new URLSearchParams($location.search);
        const pageFromUrl = parseInt(searchParams.get('page'), 10) || 1;

        if (state.page !== pageFromUrl) {
             searchParams.set('page', state.page);
             navigate(`${$location.pathname}?${searchParams.toString()}`, { replace: true });
        }
        
        if (currentPage !== state.page) {
            pageTransitionDirection = state.page > currentPage ? 1 : -1;
            currentPage = state.page;
            
            isLoadingLessons = true;
            
            fetchLessonsInternal(false).finally(() => {
                isLoadingLessons = false;
            });
        }
    });

    $: isAdminView = isPrivilegedUser && viewMode === 'admin';
    $: displayRangeStart = totalLessons === 0
        ? 0
        : isAdminView
            ? (lessons.length > 0 ? 1 : 0)
            : (currentPage - 1) * pageSize + 1;
    $: displayRangeEnd = isAdminView
        ? lessons.length
        : Math.min(currentPage * pageSize, totalLessons);
    $: lessonCountText = totalLessons > 0
        ? (isAdminView
            ? `Показано ${lessons.length} уроков (всего ${totalLessons})`
            : `Показано ${displayRangeStart}-${displayRangeEnd} уроков из ${totalLessons}`)
        : 'Уроков нет';
    $: lessonGridKey = `${isAdminView ? 'admin' : currentPage}-${lessons.map((l) => l.id).join('-')}`; 
    $: dictionaryGridKey = `${dictionarySections.map(s => s.id).join('-')}`;
    $: lessonsDndConfig = isAdminView && lessons.length > 0
        ? {
            items: lessons,
            flipDurationMs: DND_FLIP_DURATION,
            dragDisabled: isReorderSaving || lessons.length < 2,
            dropFromOthersDisabled: true,
            dropTargetStyle: {
                border: '2px dashed var(--color-border-light, #dcdcdc)',
                borderRadius: '16px'
            },
            dragHandleSelector: '.drag-handle'
        }
        : null;
    let previousIsAdminView = null;
    $: if (previousIsAdminView !== null && previousIsAdminView !== isAdminView) {
        refreshLessonsForViewMode();
    }
    $: previousIsAdminView = isAdminView;

    const unsubscribeUser = user.subscribe(value => {
        currentUserRole = value?.role;
        const privileged = ['admin', 'teacher', 'assistant'].includes(currentUserRole);
        
        if (privileged && !isPrivilegedUser) {
            const storedViewMode = Cookies.get('viewMode');
            viewMode = storedViewMode || 'admin';
        } else if (!privileged) {
            viewMode = 'student';
        }
        isPrivilegedUser = privileged;
    });

    onMount(async () => {
        if (history.scrollRestoration) {
            history.scrollRestoration = 'manual';
        }

        if (!courseId) { return; }
        
        if (isPrivilegedUser) {
            const storedViewMode = Cookies.get('viewMode');
            viewMode = storedViewMode || 'admin';
        } else {
            viewMode = 'student';
        }

        const searchParams = new URLSearchParams($location.search);
        const pageFromUrl = parseInt(searchParams.get('page'), 10) || 1;
        
        currentPage = pageFromUrl;
        courseLessonsPagination.setPage(pageFromUrl);
        await fetchData();
    });

    onDestroy(() => { 
        if (history.scrollRestoration) {
            history.scrollRestoration = 'auto';
        }
        unsubscribeUser(); 
        unsubscribePagination();
    });

    async function fetchData() {
        isLoadingLessons = true;
        isLoadingSections = true;
        errorLessons = null;
        errorSections = null;
        
        await Promise.allSettled([
            fetchLessonsInternal(true), 
            fetchDictionarySectionsInternal()
        ]);

        isLoadingLessons = false;
        isLoadingSections = false;
        await tick(); 
    }

    async function fetchLessonsInternal(clearProgress = false) {
        if (clearProgress) {
            lessonProgress = new Map();
        }
        const effectivePage = isAdminView ? 1 : currentPage;
        const effectivePageSize = isAdminView ? ADMIN_LESSON_FETCH_LIMIT : pageSize;
        const url = new URL(`${API_BASE_URL}/courses/${courseId}/lessons/`);
        url.searchParams.append('page', effectivePage); 
        url.searchParams.append('page_size', effectivePageSize);
        if (searchTerm) url.searchParams.append('search', searchTerm);

        try {
            const response = await apiFetch(url.toString());
            if (!response.ok) throw new Error(`Ошибка загрузки уроков: ${response.statusText || response.status}`);
            const data = await response.json(); 
            lessons = data.results || []; 
            totalLessons = data.count ?? lessons.length ?? 0;
            
            courseLessonsPagination.setPageSize(pageSize);
            
            const totalPages = Math.ceil(totalLessons / pageSize);
            if (currentPage > totalPages && totalPages > 0) {
                courseLessonsPagination.setPage(totalPages);
                return; 
            } else if (currentPage > 1 && totalPages === 0) {
                courseLessonsPagination.setPage(1);
                return;
            }
            
            const nextProgress = new Map();
            lessons.forEach(lesson => {
                const p = Math.round(parseFloat(lesson.completion_percentage || 0));
                nextProgress.set(lesson.id, Number.isFinite(p) ? p : 0);
            });
            lessonProgress = nextProgress;
            

        } catch (err) { 
            console.error("Ошибка загрузки уроков:", err); 
            errorLessons = err.message; 
            lessons = []; 
            totalLessons = 0; 
        }
    }

    async function fetchDictionarySectionsInternal() {
        const url = `${API_BASE_URL}/courses/${courseId}/dictionary_sections/`;
        try {
            const response = await apiFetch(url);
            if (!response.ok) throw new Error(`Ошибка загрузки разделов: ${response.statusText || response.status}`);
            const data = await response.json(); 
            dictionarySections = data.results || [];
        } catch (err) { 
            console.error("Ошибка загрузки разделов практики:", err); 
            errorSections = err.message; 
            dictionarySections = []; 
        }
    }

    function handlePageChange(event) {
        const newPage = event.detail.page;
        courseLessonsPagination.setPage(newPage);
    }

    function toggleViewMode() {
        viewMode = viewMode === 'admin' ? 'student' : 'admin';
        Cookies.set('viewMode', viewMode);
    }

    function navigateToLesson(lessonId) {
        if (!lessonId) { console.warn("Attempted to navigate with invalid lessonId"); return; }
        navigate(`/courses/${courseId}/lessons/${lessonId}`);
    }
    
    function navigateToPractice(sectionId) {
        if (!sectionId) { console.warn("Attempted to navigate with invalid sectionId"); return; }
        console.log(`Navigating to practice section ${sectionId} for course ${courseId}`);
        navigate(`/courses/${courseId}/practice/${sectionId}`);
    }
    
       function preparePatchData(formData, originalData = {}) {
        const cleanedData = {};

        for (const [key, value] of Object.entries(formData)) {
            if (value === "" || value === null || value === undefined) {
                continue;
            }

            if (originalData[key] !== undefined && value === originalData[key]) {
                continue;
            }

            cleanedData[key] = value;
        }

        return cleanedData;
    }
    
    function cleanFormData(originalFormData) {
        const cleaned = new FormData();

        for (const [key, value] of originalFormData.entries()) {
            if (value instanceof File) {
                if (value.size > 0) {
                    cleaned.append(key, value);
                }
            } else if (value !== "" && value !== null && value !== undefined) {
                cleaned.append(key, value);
            }
        }

        return cleaned;
    }
    async function replaceCroppedImage(formData, fieldName, croppedDataUrl, filename = 'image.jpg') {
        if (!croppedDataUrl) return;

        const blob = await (await fetch(croppedDataUrl)).blob();
        const file = new File([blob], filename, { type: blob.type });

        formData.delete(fieldName);
        formData.set(fieldName, file);
    }


    function handleCreateLesson() { editingLesson = null; isSectionModalOpen = false; isLessonModalOpen = true; } 
    function handleEditLesson(event) { editingLesson = event.detail.lesson; isSectionModalOpen = false; isLessonModalOpen = true; } 
    function handleCloseLessonModal() { isLessonModalOpen = false; editingLesson = null; }
    
    async function handleSaveLesson(event) {
        const formData = event.detail;
        const isCreating = !editingLesson;

        const url = isCreating
            ? `${API_BASE_URL}/courses/${courseId}/lessons/`
            : `${API_BASE_URL}/courses/${courseId}/lessons/${editingLesson.id}/`;

        const method = isCreating ? 'POST' : 'PATCH';

        try {
            const response = await apiFetch(url, { method, body: formData });
            if (!response.ok && response.status !== 201 && response.status !== 200) {
                const errorData = await response.json().catch(() => ({ detail: `Не удалось ${isCreating ? 'создать' : 'обновить'} урок.` }));
                let errorMessage = errorData.detail || `Ошибка ${response.status}.`;
                if (typeof errorData === 'object' && errorData !== null && !errorData.detail) {
                    errorMessage += "\n" + Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join("\n");
                }
                throw new Error(errorMessage);
            }

            handleCloseLessonModal();
            isLoadingLessons = true;
            fetchLessonsInternal(true).finally(() => isLoadingLessons = false); 
        } catch (err) {
            console.error("Ошибка сохранения урока:", err);
            alert(`Ошибка сохранения:\n${err.message}`);
        }
    }

    async function handleDeleteLesson(event) {
        const { lessonId } = event.detail;
        console.log(lessonId);
        const lessonToDelete = lessons.find(l => l.id === lessonId); 
        if (!lessonToDelete || !confirm(`Удалить урок "${lessonToDelete.title}"?`)) return;
        
        const url = `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/`;
        try { 
            const response = await apiFetch(url, { method: 'DELETE' });
            if (!response.ok && response.status !== 204) { 
                const errorData = await response.json().catch(() => ({ detail: 'Не удалось удалить урок' })); 
                throw new Error(errorData.detail || `Ошибка ${response.status}`); 
            }
            isLoadingLessons = true; 
            fetchLessonsInternal(true).finally(() => isLoadingLessons = false ); 
        } catch (err) { 
            console.error("Ошибка удаления урока:", err); 
            alert(`Ошибка удаления:\n${err.message}`); 
        }
    }

    function handleCreateDictionarySection() { editingSection = null; isLessonModalOpen = false; isSectionModalOpen = true; } 
    function handleEditDictionarySection(event) { editingSection = event.detail.section; isLessonModalOpen = false; isSectionModalOpen = true; } 
    function handleCloseSectionModal() { isSectionModalOpen = false; editingSection = null; }
    
    async function handleSaveDictionarySection(event) {
        let formData = event.detail;
        const isCreating = !editingSection;

        if (formData.get('croppedImageDataUrl')) {
            await replaceCroppedImage(formData, 'banner_image', formData.get('croppedImageDataUrl'));
            formData.delete('croppedImageDataUrl');
        }

        const cleanedFormData = cleanFormData(formData);

        const url = isCreating
            ? `${API_BASE_URL}/courses/${courseId}/dictionary_sections/`
            : `${API_BASE_URL}/courses/${courseId}/dictionary_sections/${editingSection.id}/`;

        const method = isCreating ? 'POST' : 'PATCH';

        try {
            const response = await apiFetch(url, { method, body: cleanedFormData });
            if (!response.ok && response.status !== 201) {
                const errorData = await response.json().catch(() => ({ detail: `Не удалось ${isCreating ? 'создать' : 'обновить'} раздел.` }));
                let errorMessage = errorData.detail || `Ошибка ${response.status}.`;
                if (typeof errorData === 'object' && errorData !== null && !errorData.detail) {
                    errorMessage += "\n" + Object.entries(errorData).map(
                        ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`
                    ).join("\n");
                }
                throw new Error(errorMessage);
            }

            handleCloseSectionModal();
            isLoadingSections = true;
            fetchDictionarySectionsInternal().finally(() => isLoadingSections = false);
        } catch (err) {
            console.error("Ошибка сохранения раздела:", err);
            alert(`Ошибка сохранения раздела:\n${err.message}`);
        }
    }

    async function handleDeleteDictionarySection(event) {
        const { sectionId } = event.detail;
        const sectionToDelete = dictionarySections.find(s => s.id === sectionId); 
        if (!sectionToDelete || !confirm(`Удалить раздел "${sectionToDelete.title}"?`)) return;
        
        const url = `${API_BASE_URL}/courses/${courseId}/dictionary_sections/${sectionId}/`;
        try { 
             const response = await apiFetch(url, { method: 'DELETE' });
             if (!response.ok && response.status !== 204) { 
                 const errorData = await response.json().catch(() => ({ detail: 'Не удалось удалить раздел' })); 
                 throw new Error(errorData.detail || `Ошибка ${response.status}`); 
             }
            isLoadingSections = true; 
            fetchDictionarySectionsInternal().finally(() => isLoadingSections = false );
        } catch (err) { 
            console.error("Ошибка удаления раздела:", err); 
            alert(`Ошибка удаления раздела:\n${err.message}`); 
        }
    }

    async function refreshLessonsForViewMode() {
        if (!courseId) return;
        isLoadingLessons = true;
        try {
            await fetchLessonsInternal(true);
        } finally {
            isLoadingLessons = false;
        }
    }

    function handleLessonsDndConsider(event) {
        if (!isAdminView || isReorderSaving) return;
        if (!event?.detail?.items) return;
        if (preDragSnapshot.length === 0) {
            preDragSnapshot = lessons.map(lesson => ({ ...lesson }));
        }
        lessons = event.detail.items;
    }

    async function handleLessonsDndFinalize(event) {
        if (!isAdminView || !event?.detail?.items) return;
        lessons = event.detail.items;
        await persistLessonOrder();
    }

    async function persistLessonOrder() {
        if (!courseId || lessons.length === 0) return;
        const previousIds = preDragSnapshot.map((lesson) => lesson.id);
        const currentIds = lessons.map((lesson) => lesson.id);
        const isSameOrder =
            previousIds.length === currentIds.length &&
            previousIds.every((id, idx) => id === currentIds[idx]);

        if (isSameOrder) {
            preDragSnapshot = [];
            return;
        }

        const payload = lessons.map((lesson, index) => ({
            id: lesson.id,
            order: index
        }));

        isReorderSaving = true;
        try {
            await reorderLessons(courseId, payload);
            addNotification('Порядок уроков успешно обновлён.', 'success');
            await fetchLessonsInternal(false);
        } catch (err) {
            if (preDragSnapshot.length) {
                lessons = preDragSnapshot.map(lesson => ({ ...lesson }));
            }
            addNotification(`Ошибка изменения порядка уроков: ${err.message || 'Неизвестная ошибка'}`, 'error');
            await fetchLessonsInternal(false);
        } finally {
            preDragSnapshot = [];
            isReorderSaving = false;
        }
    }
</script>

<svelte:head>
    <title>Список уроков — Kei</title>
    <meta name="og:title" content="Список уроков — Kei" />
    <meta name="twitter:title" content="Список уроков — Kei" />
    <meta name="description" content="Просматривайте уроки и разделы практики выбранного курса на Kei." />
  </svelte:head>

<div class="course-lessons-page">
    <h1 class="page-title">Список уроков</h1>

    {#if isPrivilegedUser}
        <div class="view-mode-controls">
            {#if isAdminView && (currentUserRole === 'admin' || currentUserRole === 'teacher')}
                <button class="admin-button create-button" on:click={handleCreateLesson} title="Создать новый урок">
                    <PlusCircleOutline size="18px" /> Создать Урок
                </button>
            {/if}
            <button class="admin-button view-toggle-button" on:click={toggleViewMode} title={isAdminView ? 'Посмотреть как студент' : 'Вернуться в режим администратора'}>
                {#if isAdminView} <EyeOutline size="20px" /> Режим студента
                {:else} <EyeOffOutline size="20px" /> Режим администратора {/if}
            </button>
        </div>
    {/if}

    <div class="lessons-section content-box" bind:this={lessonsSectionContainer}>
        <div class="controls-header">
            <span class="lesson-count">{lessonCountText}</span>
            {#if isAdminView && lessons.length > 1}
                <span class="hint-text">{#if isReorderSaving}Сохраняем порядок...{/if}{#if !isReorderSaving}Перетащите карточку, чтобы изменить порядок{/if}</span>
            {/if}
        </div>

        {#if isLoadingLessons && lessons.length === 0} <p class="loading-message">Загрузка уроков...</p>
        {:else if errorLessons} <p class="error-message">{errorLessons}</p>
        {:else if lessons.length === 0} <p class="no-items-message">Уроков для этого курса пока нет.</p>
        {:else if Array.isArray(lessons)}
            <div class="lessons-grid-container">
                <div
                    class="lessons-grid"
                    class:loading={isLoadingLessons && lessons.length > 0}
                    use:dndzone={isAdminView ? lessonsDndConfig : {items: [], dragDisabled: true}}
                    on:consider={handleLessonsDndConsider}
                    on:finalize={handleLessonsDndFinalize}
                >
                    {#each lessons as lesson (lesson.id)}
                        <!-- Обертка карточки -->
                        <div class="lesson-card-wrapper" class:draggable={isAdminView}>
                            {#if isAdminView}
                                <button type="button" class="drag-handle">
                                    <!-- Твой SVG -->
                                </button>
                            {/if}
                            <LessonCard 
                                {lesson} 
                                progress={lessonProgress.get(lesson.id) ?? 0}
                                {isAdminView}
                                on:action={() => navigateToLesson(lesson.id)}
                                on:edit={handleEditLesson}
                                on:delete={handleDeleteLesson}
                            />
                        </div>
                    {/each}
                </div>
            </div>
            {#if !isAdminView && totalLessons > pageSize}
             <div class="pagination-container">
                                <EnhancedPagination 
                                    {currentPage} 
                                    totalPages={Math.ceil(totalLessons / pageSize)} 
                                    maxVisibleButtons={3} 
                                    showPageJump={false}
                                    on:pageChange={handlePageChange} 
                                />
             </div>
            {/if}
        {:else} <p class="error-message">Ошибка отображения уроков.</p> {/if}
    </div>

    <div class="practice-section content-box">
        <h2 class="section-title">Практика</h2>

        {#if isAdminView}
             <div class="admin-actions section-admin-actions">
                  <button class="admin-button create-button" on:click={handleCreateDictionarySection} title="Создать новый раздел практики">
                    <PlusCircleOutline size="18px" /> Создать Раздел
                 </button>
             </div>
        {/if}

        <div class="dictionary-section-container">
            {#if isLoadingSections}
                <p>Загрузка разделов...</p>
            {:else if errorSections}
                <p class="error-message">Не удалось загрузить разделы: {errorSections}</p>
            {:else if dictionarySections.length > 0}
                <div class="dictionary-grid">
                    {#each dictionarySections as section, i (section.id)}
                        <DictionarySectionCard
                            {section}
                            {courseId}
                            {isAdminView}
                            animationDelay={`${i * 50}ms`}
                            on:edit={handleEditDictionarySection}
                            on:delete={handleDeleteDictionarySection}
                        />
                    {/each}
                </div>
            {:else}
                <p class="no-content-message">В этом курсе пока нет разделов для практики.</p>
            {/if}
        </div>
    </div>
</div>

{#if isLessonModalOpen}
    <LessonFormModal {editingLesson} {courseId} on:close={handleCloseLessonModal} on:save={handleSaveLesson} />
{/if}
{#if isSectionModalOpen}
    <DictionarySectionFormModal {editingSection} {courseId} on:close={handleCloseSectionModal} on:save={handleSaveDictionarySection} />
{/if}


<style>
    .course-lessons-page { padding: 30px var(--spacing-padding-page, 20px); max-width: var(--max-width-page, 1200px); margin: 0 auto; min-height: var(--min-height-page, calc(100vh - 150px)); display: flex; flex-direction: column; gap: var(--spacing-gap-large, 30px); }
    .page-title { text-align: center; font-size: var(--font-size-h1, 2.5rem); color: var(--color-text-dark, #333); margin-bottom: 0; font-weight: var(--font-weight-bold, 700); }
    .view-mode-controls { display: flex; justify-content: flex-end; align-items: center; gap: var(--spacing-gap-medium, 15px); margin-bottom: var(--spacing-margin-bottom-medium, 20px); flex-wrap: wrap; padding-top: 15px; }
    .admin-button { background-color: var(--color-bg-admin-button); color: var(--color-text-admin-button); border: 1px solid var(--color-border-admin-button); border-radius: var(--spacing-border-radius-button, 20px); padding: var(--spacing-padding-button, 8px 15px); font-family: var(--font-family-primary); font-weight: var(--font-weight-semi-bold, 600); cursor: pointer; transition: all var(--animation-duration-transition, 0.2s) ease; display: inline-flex; align-items: center; gap: var(--spacing-gap-small, 5px); font-size: var(--font-size-button, 0.9rem); }
    .admin-button:hover { background-color: var(--color-border-admin-button); color: var(--color-bg-light); box-shadow: 0 2px 8px rgba(194, 182, 252, 0.3); transform: translateY(-1px); }
    .admin-button:active { transform: translateY(0); filter: brightness(0.95); }
    .admin-button.create-button { background-color: var(--color-bg-admin-button-create); color: var(--color-text-admin-button-create); border-color: var(--color-bg-admin-button-create); }
    .admin-button.create-button:hover { background-color: var(--color-bg-admin-button-create-hover); border-color: var(--color-bg-admin-button-create-hover); }
    .content-box { background-color: var(--color-bg-light, #fff); padding: var(--spacing-padding-box, 25px); border-radius: var(--spacing-border-radius-block, 16px); box-shadow: var(--color-block-shadow, 0 4px 15px rgba(0, 0, 0, 0.08)); }
    .loading-message, .error-message, .no-items-message { text-align: center; font-size: 1.1rem; color: var(--color-text-muted, #666); padding: 40px 20px; }
    .error-message { color: var(--color-danger-red, #dc3545); }

    .lessons-section .controls-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-margin-bottom-medium, 20px); gap: 12px; border-bottom: 1px solid var(--color-border-light, #eee); padding-bottom: 15px; }
    .lesson-count { font-size: 0.95rem; color: var(--color-text-muted, #555); flex-shrink: 0; font-weight: var(--font-weight-medium); }
    .hint-text { font-size: 0.9rem; color: var(--color-secondary, #6c63ff); display: inline-flex; align-items: center; gap: 6px; }
    .hint-text::before { content: '⇅'; font-size: 1rem; }
    .lessons-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 25px;
        margin-bottom: 30px;
        transition: opacity 0.3s ease-out;
    }
    .lessons-grid.loading {
        opacity: 0.5;
        pointer-events: none;
    }
    .lessons-grid-container { margin-bottom: var(--spacing-margin-bottom-large, 30px); }
    .pagination-container { display: flex; justify-content: flex-end; margin-top: var(--spacing-margin-top-medium, 20px); padding-right: 10px; }

    .practice-section { margin-top: var(--spacing-margin-top-medium, 30px); }
    .practice-section .section-title { font-size: var(--font-size-h2, 1.8rem); color: var(--color-text-dark, #333); margin-bottom: 0; font-weight: var(--font-weight-seми-bold, 600); border-bottom: 1px solid var(--color-border-light, #eee); padding-bottom: 10px; text-align: center; }
    .section-admin-actions { display: flex; justify-content: flex-end; margin-top: 15px; margin-bottom: var(--spacing-margin-bottom-medium, 20px); }
    .dictionary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 420px));
        gap: 35px;
        justify-content: center;
    }
    .no-content-message {
        text-align: center;
        padding: 40px;
        background-color: #f9f9f9;
        border-radius: 8px;
        color: #666;
        font-size: 1.1rem;
    }
    
    .lesson-card-wrapper {
        position: relative;
        transition: transform 0.2s ease-out;
    }
    .drag-handle {
        position: absolute;
        top: 12px;
        right: 12px;
        border: none;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 999px;
        padding: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        cursor: grab;
        color: var(--color-text-muted, #777);
        transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }
    .drag-handle:hover:not(:disabled),
    .drag-handle:focus-visible {
        background: var(--color-bg-admin-button, #ede9ff);
        color: var(--color-secondary, #6c63ff);
        outline: none;
        transform: translateY(-1px);
    }
    .drag-handle:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @media (max-width: 900px) { .lessons-grid, .dictionary-grid { gap: 20px; } }
    @media (max-width: 768px) {
        .course-lessons-page { padding: 20px var(--spacing-padding-page-mobile, 15px); }
        .page-title { font-size: 2rem; }
        .view-mode-controls { margin-bottom: 15px; padding-top: 10px;}
        .lessons-section .controls-header { flex-direction: column; align-items: stretch; padding-bottom: 10px; margin-bottom: 15px; }
        .lesson-count { text-align:center; margin-bottom: 10px; }
        .lessons-grid { grid-template-columns: 1fr; gap: 15px; }
        .lessons-grid-container { margin-bottom: 20px; }
        .pagination-container { justify-content: center; margin-top: 15px; }
        .practice-section .section-title { font-size: 1.6rem; }
        .dictionary-grid { grid-template-columns: 1fr; gap: 15px; }
    }
     @media (max-width: 600px) { .dictionary-grid { grid-template-columns: 1fr; } }
     @media (max-width: 480px) {
         .page-title { font-size: 1.7rem; }
         .content-box { padding: 15px; }
         .admin-button { font-size: 0.85rem; padding: 6px 10px; }
         .view-mode-controls { gap: 10px; }
         .lessons-grid { gap: 12px; }
     }
</style>