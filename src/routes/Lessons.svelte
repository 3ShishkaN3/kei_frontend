<script>
    // src/routes/CourseLessons.svelte
    import { onMount, onDestroy, tick } from 'svelte';
    import { navigate } from 'svelte-routing';
    // Import fly for item transitions
    import { fade, fly } from 'svelte/transition'; 
    // Import nicer easing functions
    import { cubicOut } from 'svelte/easing'; 

    import { user } from '../stores/user.js';
    import { API_BASE_URL } from '../config.js';
    import { apiFetch } from '../api/api.js';
    import { courseLessonsPagination } from '../stores/pagination.js'; // Import our pagination store

    // Import Child Components
    import LessonCard from '../components/LessonCard.svelte';
    import DictionaryCard from '../components/DictionaryCard.svelte';
    import Pagination from '../components/Pagination.svelte';
    import LessonFormModal from '../components/LessonFormModal.svelte';
    import DictionarySectionFormModal from '../components/DictionarySectionFormModal.svelte';

    // Import Icons
    import ArrowUpBold from 'svelte-material-icons/ArrowUpBold.svelte';
    import ArrowDownBold from 'svelte-material-icons/ArrowDownBold.svelte';
    import PencilOutline from 'svelte-material-icons/PencilOutline.svelte';
    import PlusCircleOutline from 'svelte-material-icons/PlusCircleOutline.svelte';
    import EyeOutline from 'svelte-material-icons/EyeOutline.svelte';
    import EyeOffOutline from 'svelte-material-icons/EyeOffOutline.svelte';
    import DeleteOutline from 'svelte-material-icons/DeleteOutline.svelte';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
    // --- Props ---
    export let courseId;

    // --- State Variables ---
    let lessons = [];
    let dictionarySections = [];
    let lessonProgress = new Map(); // Note: You'll need to fetch real progress data eventually
    let isLoadingLessons = true;
    let isLoadingSections = true;
    let errorLessons = null;
    let errorSections = null;
    let currentUserRole = null;
    let isPrivilegedUser = false;
    let viewMode = 'student';
    let currentPage = $courseLessonsPagination.page; // Use store's initial value
    let pageSize = $courseLessonsPagination.size;
    let totalLessons = 0;
    let sortField = '-created_at';
    let searchTerm = '';
    let isLessonModalOpen = false; // Explicitly for Lesson Modal
    let editingLesson = null;
    let isSectionModalOpen = false; // Explicitly for Section Modal
    let editingSection = null;
    
    // Animation state for page transitions
    // Determines the fly direction when paginating
    let pageTransitionDirection = 1; // 1 for forward, -1 for backward

    // Subscribe to pagination store
    const unsubscribePagination = courseLessonsPagination.subscribe(state => {
        if (currentPage !== state.page) {
            // Determine transition direction based on page change
            pageTransitionDirection = state.page > currentPage ? 1 : -1;
            currentPage = state.page;
            
            // Only fetch if we're mounted (avoid initial double fetch)
            // previousLessons = [...lessons]; // Removed this - individual item transitions are better
            if (!isLoadingLessons) {
                isLoadingLessons = true;
                // Fetch new lessons without clearing progress to keep existing values during transition
                // Clear progress only on initial load or full refresh, NOT on pagination
                fetchLessonsInternal(false).finally(() => { 
                    isLoadingLessons = false;
                });
            }
        }
        pageSize = state.size;
    });

    // --- Computed Properties ---
    $: isAdminView = isPrivilegedUser && viewMode === 'admin';
    $: displayRangeStart = totalLessons === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    $: displayRangeEnd = Math.min(currentPage * pageSize, totalLessons);
    $: lessonCountText = totalLessons > 0 ? `Показано ${displayRangeStart}-${displayRangeEnd} уроков из ${totalLessons}` : 'Уроков нет';
    $: sortIndicators = {
        created_at: sortField.includes('created_at') ? (sortField.startsWith('-') ? 'desc' : 'asc') : null,
        title: sortField.includes('title') ? (sortField.startsWith('-') ? 'desc' : 'asc') : null,
        updated_at: sortField.includes('updated_at') ? (sortField.startsWith('-') ? 'desc' : 'asc') : null,
    };
    // Key for lesson grid transition based on data influencing factors
    // This key is less needed now that items have transitions, but can help Svelte track the *list* state
    $: lessonGridKey = `${currentPage}-${sortField}-${totalLessons}-${lessons.length}`; 
    // Key for dictionary section grid transition
    $: dictionaryGridKey = `${dictionarySections.map(s => s.id).join('-')}`; // Changes if sections are added/removed

    // --- Lifecycle & User Subscription ---
    const unsubscribeUser = user.subscribe(value => {
        currentUserRole = value?.role;
        isPrivilegedUser = ['admin', 'teacher', 'assistant'].includes(currentUserRole);
        // Update viewMode based on privilege, but avoid overriding if already set by toggle
        if (!isPrivilegedUser) {
             viewMode = 'student';
         } else if (isPrivilegedUser && typeof viewMode === 'undefined') { // Set initial if privileged
             viewMode = 'admin';
         }
    });

    onMount(async () => {
        if (!courseId) { /* Error Handling */ return; }
        // Set initial viewMode after mount based on role
        viewMode = isPrivilegedUser ? 'admin' : 'student';
        
        // Update current page from store if needed
        // currentPage is already initialized from the store, so this might be redundant unless store is async
        // currentPage = $courseLessonsPagination.page; 
        
        await fetchData();
    });

    onDestroy(() => { 
        unsubscribeUser(); 
        unsubscribePagination();
    });

    // --- Data Fetching ---
    async function fetchData() {
        isLoadingLessons = true;
        isLoadingSections = true;
        errorLessons = null;
        errorSections = null;
        
        // Fetch lessons clears progress only on initial full load (clearProgress = true)
        await Promise.allSettled([
            fetchLessonsInternal(true), 
            fetchDictionarySectionsInternal()
        ]);

        isLoadingLessons = false;
        isLoadingSections = false;
        // Ensure DOM updates before potential transitions
        await tick(); 
    }

    async function fetchLessonsInternal(clearProgress = false) {
        // If clearing progress (initial load/refresh), reset the map
        if (clearProgress) {
            lessonProgress = new Map(); // Create a new Map to trigger reactivity
        }
        const url = new URL(`${API_BASE_URL}/courses/${courseId}/lessons/`);
        url.searchParams.append('page', currentPage); 
        url.searchParams.append('page_size', pageSize);
        url.searchParams.append('ordering', sortField); 
        if (searchTerm) url.searchParams.append('search', searchTerm);

        try {
            const response = await apiFetch(url.toString());
            if (!response.ok) throw new Error(`Ошибка загрузки уроков: ${response.statusText || response.status}`);
            const data = await response.json(); 
            lessons = data.results || []; 
            totalLessons = data.count || 0;
            
            // Update pagination store with total items info if needed
            courseLessonsPagination.setPageSize(pageSize);
            
            // Handle case where current page is now beyond total pages (e.g., deleted last item on a page)
            const totalPages = Math.ceil(totalLessons / pageSize);
            if (currentPage > totalPages && totalPages > 0) {
                courseLessonsPagination.setPage(totalPages); // This will trigger another fetch via the store subscription
                // Exit this fetch to avoid state inconsistency, the subscription will handle the next one
                return; 
            } else if (currentPage > 1 && totalPages === 0) {
                // If we were on page > 1 but now there are no items
                courseLessonsPagination.setPage(1); // Go back to page 1
                return; // Exit this fetch
            }
            
            // Assign (or update) dummy progress for new/existing lessons
            // If progress wasn't cleared, existing lesson IDs will keep their value in the map
            lessons.forEach(lesson => {
                // Only set if the lesson ID is NOT already in the map (meaning it's a new lesson or initial load)
                if (!lessonProgress.has(lesson.id)) {
                    // Assign a random progress value
                    const randomProgress = Math.random() < 0.1 ? 0 : (Math.random() < 0.2 ? 100 : Math.floor(Math.random() * 91));
                    lessonProgress.set(lesson.id, randomProgress); 
                } 
            });
            
            // Trigger reactivity for the map if needed (e.g., if new items were added)
            // Using lessonProgress = new Map(lessonProgress) can force update if just values change
            // but Svelte's {#each} with keys handles item changes well. Updating map directly is usually enough.
            lessonProgress = lessonProgress; // Svelte needs assignment to trigger reactivity for Maps/Sets
            

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

    // --- Event Handlers ---
    function handlePageChange(event) {
        const newPage = event.detail.page;
        // Update the pagination store rather than directly setting currentPage
        // The store subscription will handle setting currentPage and fetching data
        courseLessonsPagination.setPage(newPage);
    }

    function handleSort(field) {
        let newSortField;
        if (sortField === field) newSortField = `-${field}`; 
        else if (sortField === `-${field}`) newSortField = field; 
        else newSortField = field;
        
        if (newSortField !== sortField) {
            sortField = newSortField; 
            // Reset to page 1 on sort change
            courseLessonsPagination.setPage(1);
            isLoadingLessons = true;
            // Clear progress on sort change as the list is completely new
            fetchLessonsInternal(true).finally(() => isLoadingLessons = false ); 
        }
    }

    function toggleViewMode() { viewMode = viewMode === 'admin' ? 'student' : 'admin'; }

    // --- Navigation ---
    function navigateToLesson(lessonId) {
        console.log(lessonId);
        if (!lessonId) { console.warn("Attempted to navigate with invalid lessonId"); return; }
        console.log(`Navigating to lesson ${lessonId} for course ${courseId}`);
        navigate(`/courses/${courseId}/lessons/${lessonId}`);
    }
    
    function navigateToPractice(sectionId) {
        if (!sectionId) { console.warn("Attempted to navigate with invalid sectionId"); return; }
        console.log(`Navigating to practice section ${sectionId} for course ${courseId}`);
        navigate(`/courses/${courseId}/practice/${sectionId}`);
    }
    
    // Helper functions for forms (kept as is)
       function preparePatchData(formData, originalData = {}) {
        const cleanedData = {};

        for (const [key, value] of Object.entries(formData)) {
            if (value === "" || value === null || value === undefined) {
                continue; // не добавляем пустые поля в запрос
            }

            if (originalData[key] !== undefined && value === originalData[key]) {
                continue; // если значение не изменилось — не отправляем
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
                    cleaned.append(key, value); // если выбран файл
                }
            } else if (value !== "" && value !== null && value !== undefined) {
                cleaned.append(key, value);  // текстовые поля только непустые
            }
        }

        return cleaned;
    }
    async function replaceCroppedImage(formData, fieldName, croppedDataUrl, filename = 'image.jpg') {
        if (!croppedDataUrl) return;

        const blob = await (await fetch(croppedDataUrl)).blob();
        const file = new File([blob], filename, { type: blob.type });

        formData.delete(fieldName); // удалить старый файл
        formData.set(fieldName, file); // установить новый
    }


    // --- Lesson Admin Actions ---
    function handleCreateLesson() { editingLesson = null; isSectionModalOpen = false; isLessonModalOpen = true; } 
    function handleEditLesson(event) { editingLesson = event.detail.lesson; isSectionModalOpen = false; isLessonModalOpen = true; } 
    function handleCloseLessonModal() { isLessonModalOpen = false; editingLesson = null; }
    
    async function handleSaveLesson(event) {
        let formData = event.detail;
        const isCreating = !editingLesson;

        if (formData.get('croppedImageDataUrl')) {
            await replaceCroppedImage(formData, 'cover_image', formData.get('croppedImageDataUrl'));
            formData.delete('croppedImageDataUrl');
        }

        const cleanedFormData = cleanFormData(formData);

        const url = isCreating
            ? `${API_BASE_URL}/courses/${courseId}/lessons/`
            : `${API_BASE_URL}/courses/${courseId}/lessons/${editingLesson.id}/`;

        const method = isCreating ? 'POST' : 'PATCH';

        try {
            const response = await apiFetch(url, { method, body: cleanedFormData });
            if (!response.ok && response.status !== 201) {
                const errorData = await response.json().catch(() => ({ detail: `Не удалось ${isCreating ? 'создать' : 'обновить'} урок.` }));
                let errorMessage = errorData.detail || `Ошибка ${response.status}.`;
                if (typeof errorData === 'object' && errorData !== null && !errorData.detail) {
                    errorMessage += "\n" + Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join("\n");
                }
                throw new Error(errorMessage);
            }

            handleCloseLessonModal();
            isLoadingLessons = true;
            // Clear progress on save/create as the list state might change significantly
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
            // Clear progress on delete as the list state changes
            fetchLessonsInternal(true).finally(() => isLoadingLessons = false ); 
        } catch (err) { 
            console.error("Ошибка удаления урока:", err); 
            alert(`Ошибка удаления:\n${err.message}`); 
        }
    }

    // --- Dictionary Section Admin Actions ---
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
            // Fetch sections after save/create/delete
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
</script>

<div class="course-lessons-page">
    <h1 class="page-title">Список уроков</h1>

    {#if isPrivilegedUser}
        <div class="view-mode-controls">
            {#if isAdminView && (currentUserRole === 'admin' || currentUserRole === 'teacher')}
                <button class="admin-button create-button" on:click={handleCreateLesson} title="Создать новый урок">
                    <PlusCircleOutline size="18px" /> Создать Урок
                </button>
            {/if}
            <button class="admin-button view-toggle-button" on:click={toggleViewMode} title={isAdminView ? 'Посмотреть как студент' : 'Вернуться в режим управления'}>
                {#if isAdminView} <EyeOutline size="20px" /> Режим студента
                {:else} <EyeOffOutline size="20px" /> Режим управления {/if}
            </button>
        </div>
    {/if}

    <div class="lessons-section content-box">
        <div class="controls-header">
            <span class="lesson-count">{lessonCountText}</span>
            {#if lessons.length > 0}
                <div class="sort-controls">
                    <span>Сортировать:</span>
                    <button class="sort-button" on:click={() => handleSort('created_at')} class:active={sortIndicators.created_at}>
                        Новое <span class="sort-icon">{#if sortIndicators.created_at === 'asc'}<ArrowUpBold size="18px"/>{/if}{#if sortIndicators.created_at === 'desc'}<ArrowDownBold size="18px"/>{/if}</span>
                    </button>
                    <button class="sort-button" on:click={() => handleSort('title')} class:active={sortIndicators.title}>
                        Название <span class="sort-icon">{#if sortIndicators.title === 'asc'}<ArrowUpBold size="18px"/>{/if}{#if sortIndicators.title === 'desc'}<ArrowDownBold size="18px"/>{/if}</span>
                    </button>
                    <button class="sort-button" on:click={() => handleSort('updated_at')} class:active={sortIndicators.updated_at}>
                        Обновление <span class="sort-icon">{#if sortIndicators.updated_at === 'asc'}<ArrowUpBold size="18px"/>{/if}{#if sortIndicators.updated_at === 'desc'}<ArrowDownBold size="18px"/>{/if}</span>
                    </button>
                </div>
            {/if}
        </div>

        {#if isLoadingLessons} <p class="loading-message">Загрузка уроков...</p>
        {:else if errorLessons} <p class="error-message">{errorLessons}</p>
        {:else if lessons.length === 0} <p class="no-items-message">Уроков для этого курса пока нет.</p>
        {:else if Array.isArray(lessons)}
                                    <div class="lessons-grid-container" key={lessonGridKey}>
                 <div class="lessons-grid">
                    {#each lessons as lesson, i (lesson.id)}
                                                <div class="grid-item-wrapper" 
                              title={lesson.title}
                              in:fly={{ 
                                 y: 30 * pageTransitionDirection, // Fly from above/below based on direction
                                 x: 0, // No horizontal movement
                                 duration: 400, 
                                 delay: i * 50, // Staggered delay for each item
                                 easing: cubicOut 
                             }}
                        >
                                                        <LessonCard on:action={(e) => navigateToLesson(lesson.id)} {lesson} progress={lessonProgress.get(lesson.id) || 0} {isAdminView}
                                on:edit={handleEditLesson}   on:delete={handleDeleteLesson} />
                        </div>
                    {/each}
                </div>
            </div>
            {#if totalLessons > pageSize}
             <div class="pagination-container">
                                <Pagination {currentPage} totalItems={totalLessons} {pageSize} maxVisibleButtons={3} on:changePage={handlePageChange} />
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

        {#if isLoadingSections} <p class="loading-message">Загрузка разделов практики...</p>
        {:else if errorSections} <p class="error-message">{errorSections}</p>
        {:else if Array.isArray(dictionarySections) && dictionarySections.length > 0}
                                    <div class="dictionary-grid-container" key={dictionaryGridKey}>
                <div class="dictionary-grid">
                    {#each dictionarySections as section, i (section.id)}
                                                <div class="grid-item-wrapper" 
                              on:click={() => navigateToPractice(section.id)} 
                              title={section.title}
                              in:fly={{ 
                                 y: 20, // Fly slightly from top
                                 x: 0,
                                 duration: 300, 
                                 delay: i * 40, // Staggered delay
                                 easing: cubicOut 
                             }}
                        >
                                                        <DictionaryCard {section} {isAdminView}
                                on:edit={handleEditDictionarySection}    on:delete={handleDeleteDictionarySection} />
                        </div>
                    {/each}
                </div>
             </div>
        {:else if !isLoadingSections} <p class="no-items-message">Разделов практики пока нет.</p>
        {:else} <p class="error-message">Ошибка отображения разделов практики.</p> {/if}
    </div>
</div>

{#if isLessonModalOpen}
    <LessonFormModal {editingLesson} {courseId} on:close={handleCloseLessonModal} on:save={handleSaveLesson} />
{/if}
{#if isSectionModalOpen}
    <DictionarySectionFormModal {editingSection} {courseId} on:close={handleCloseSectionModal} on:save={handleSaveDictionarySection} />
{/if}


<style>
    /* Remove the keyframes anim as we're using Svelte transitions */
    /* @keyframes fade-in-anim { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } */
    
    /* Remove base opacity/transition from containers, items will handle entry */
    .lessons-grid-container, .dictionary-grid-container { /* opacity: 1; */ }

    /* --- General Layout --- */
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

    /* --- Lessons Section --- */
    .lessons-section .controls-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-margin-bottom-medium, 20px); gap: 15px; border-bottom: 1px solid var(--color-border-light, #eee); padding-bottom: 15px; }
    .lesson-count { font-size: 0.95rem; color: var(--color-text-muted, #555); flex-shrink: 0; font-weight: var(--font-weight-medium); }
    .sort-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .sort-controls span:first-child { font-size: 0.9rem; color: var(--color-text-muted, #666); margin-right: 5px; }
    .sort-button { background-color: var(--color-bg-ultra-light, #f8f8f8); border: 1px solid var(--color-border-light, #e0e0e0); border-radius: 20px; padding: 6px 14px; cursor: pointer; font-size: 0.85rem; font-weight: var(--font-weight-medium); color: var(--color-text-muted, #555); display: inline-flex; align-items: center; gap: 5px; transition: all 0.25s ease-out; position: relative; overflow: hidden; }
    .sort-button:hover { background-color: #f0f0f0; border-color: #d0d0d0; color: var(--color-text-dark, #333); transform: translateY(-1px); box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
    .sort-button.active { background-color: var(--color-bg-admin-button); border-color: var(--color-border-admin-button); color: var(--color-text-admin-button); font-weight: var(--font-weight-semi-bold); box-shadow: 0 1px 4px rgba(194, 182, 252, 0.3); }
    .sort-button .sort-icon { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; color: inherit; transition: transform 0.2s ease; }
    .sort-button.active .sort-icon { transform: scale(1.1); }
    .sort-button:not(.active) .sort-icon { opacity: 0.6; }
    .lessons-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-gap-grid, 25px); }
    .lessons-grid-container { margin-bottom: var(--spacing-margin-bottom-large, 30px); /* Handles spacing */ } 
    .pagination-container { display: flex; justify-content: flex-end; margin-top: var(--spacing-margin-top-medium, 20px); padding-right: 10px; }
    .grid-item-wrapper { transition: transform 0.2s ease-out;}

    /* --- Practice Section --- */
    .practice-section { margin-top: var(--spacing-margin-top-medium, 30px); }
    .practice-section .section-title { font-size: var(--font-size-h2, 1.8rem); color: var(--color-text-dark, #333); margin-bottom: 0; font-weight: var(--font-weight-semi-bold, 600); border-bottom: 1px solid var(--color-border-light, #eee); padding-bottom: 10px; text-align: center; }
    .section-admin-actions { display: flex; justify-content: flex-end; margin-top: 15px; margin-bottom: var(--spacing-margin-bottom-medium, 20px); }
    .dictionary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-gap-grid, 25px);}
    .dictionary-grid-container { margin-top: 20px; } /* Container for transition, adjust spacing if needed */
    .dictionary-grid .grid-item-wrapper {  place-items: center; display: grid; }
    
    /* --- Grid Item Wrapper Styles for Hover, Active, Shadow, and Transition --- */
    .lessons-grid .grid-item-wrapper {
        /* Base styles for cards */
        background-color: var(--color-bg-card, #ffffff);
        border-radius: var(--spacing-border-radius-block, 12px);
        box-shadow: var(--color-card-shadow, 0 2px 10px rgba(0, 0, 0, 0.08));
        overflow: hidden; 
        place-items: center; 
        transition: transform 0.3s ease-out, box-shadow 0.3s ease-out; 
    }

    .lessons-grid .grid-item-wrapper {
        /* Base styles for cards */
        background-color: var(--color-bg-card, #ffffff);
        border-radius: var(--spacing-border-radius-block, 12px);
        box-shadow: var(--color-card-shadow, 0 2px 10px rgba(0, 0, 0, 0.08));
        overflow: hidden; 
        place-items: center; 
        transition: transform 0.3s ease-out, box-shadow 0.3s ease-out; 
    }

    .lessons-grid .grid-item-wrapper:hover {
        transform: translateY(-5px); /* Lift effect on hover */
        box-shadow: var(--color-card-shadow-hover, 0 8px 20px rgba(0, 0, 0, 0.15)); /* Stronger shadow on hover */
    }

    .lessons-grid .grid-item-wrapper:active {
        transform: translateY(-2px); /* Subtle press effect */
        box-shadow: var(--color-card-shadow-active, 0 4px 12px rgba(0, 0, 0, 0.12)); /* Slightly less shadow than hover */
        filter: brightness(0.98); /* Subtle darken */
    }


    /* --- Practice Section --- */
    .practice-section { margin-top: var(--spacing-margin-top-medium, 30px); }
    .practice-section .section-title { font-size: var(--font-size-h2, 1.8rem); color: var(--color-text-dark, #333); margin-bottom: 0; font-weight: var(--font-weight-semi-bold, 600); border-bottom: 1px solid var(--color-border-light, #eee); padding-bottom: 10px; text-align: center; }
    .section-admin-actions { display: flex; justify-content: flex-end; margin-top: 15px; margin-bottom: var(--spacing-margin-bottom-medium, 20px); }
    .dictionary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-gap-grid, 25px);}
    .dictionary-grid-container { margin-top: 20px; } 
    /* Remove specific dictionary wrapper centering if using general grid-item-wrapper styles */
    /* .dictionary-grid .grid-item-wrapper { place-items: center; display: grid; } */ 
    
    /* --- Responsiveness --- */
    @media (max-width: 900px) { .lessons-grid, .dictionary-grid { gap: 20px; } }
    @media (max-width: 768px) {
        .course-lessons-page { padding: 20px var(--spacing-padding-page-mobile, 15px); }
        .page-title { font-size: 2rem; }
        .view-mode-controls { margin-bottom: 15px; padding-top: 10px;}
        .lessons-section .controls-header { flex-direction: column; align-items: stretch; padding-bottom: 10px; margin-bottom: 15px; }
        .lesson-count { text-align: center; margin-bottom: 10px; }
        .sort-controls { justify-content: center; }
        .lessons-grid { grid-template-columns: 1fr; gap: 15px; }
        .lessons-grid-container { margin-bottom: 20px; }
        .pagination-container { justify-content: center; margin-top: 15px; }
        .practice-section .section-title { font-size: 1.6rem; }
        .dictionary-grid { gap: 15px; }
    }
     @media (max-width: 600px) { .dictionary-grid { grid-template-columns: 1fr; } }
     @media (max-width: 480px) {
         .page-title { font-size: 1.7rem; }
         .content-box { padding: 15px; }
         .admin-button { font-size: 0.85rem; padding: 6px 10px; }
         .sort-button { font-size: 0.8rem; padding: 4px 8px; }
         .view-mode-controls { gap: 10px; }
         .lessons-grid { gap: 12px; }
     }
</style>