<script>
    import { onMount, tick } from 'svelte';
    import { user } from '../stores/user.js';
    import { API_BASE_URL } from '../config.js';
    import { apiFetch } from '../api/api.js';
    import Carousel from 'svelte-carousel';
    import CourseCard from '../components/CourseCard.svelte';
    import EnrollmentSuccess from '../components/EnrollmentSuccess.svelte';
    import CourseFormModal from '../components/CourseFormModal.svelte';
    import EyeOutline from 'svelte-material-icons/EyeOutline.svelte';
    import EyeOffOutline from 'svelte-material-icons/EyeOffOutline.svelte';
    import PlusCircleOutline from 'svelte-material-icons/PlusCircleOutline.svelte';
    import ArrowLeft from 'svelte-material-icons/ArrowLeft.svelte';
    import ArrowRight from 'svelte-material-icons/ArrowRight.svelte';

    let courses = [];
    let enrollmentStatus = {};
    let isLoading = true;
    let error = null;
    let currentUserRole = null;
    let showEnrollmentSuccess = false;
    let enrollmentSuccessMessage = '';

    let viewMode = 'student';
    let isAdminOrTeacher = false;
    let isAssistant = false;

    let carouselComponent;
    let currentSlideIndex = 0;
    let totalSlides = 0;
    let isModalOpen = false;
    let editingCourse = null;
    let pageVisible = false;
    let isCarouselReady = false;
    let currentSortOrder = '-created_at'; // По умолчанию сортировка по дате создания (новые сначала) 

    const unsubscribeUser = user.subscribe(value => {
        if (value.isAuthenticated) {
            currentUserRole = value.role;
            isAdminOrTeacher = currentUserRole === 'admin' || currentUserRole === 'teacher';
            isAssistant = currentUserRole === 'assistant';
            if (!viewMode || viewMode === 'student') {
                viewMode = (isAdminOrTeacher || isAssistant) ? 'admin' : 'student';
            }
        } else {
            currentUserRole = null;
            isAdminOrTeacher = false;
            isAssistant = false;
            viewMode = 'student';
        }
        console.log('User store updated:', { currentUserRole, isAdminOrTeacher, isAssistant, viewMode });
    });

    onMount(async () => {
        window.addEventListener('keydown', handleKeyDown);
        
        await fetchData();
        
        setTimeout(() => {
            pageVisible = true;
        }, 100);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            unsubscribeUser();
        };
    });

    function handleKeyDown(e) {
        if (!carouselComponent || courses.length === 0 || !isCarouselReady) return;
        
        if (e.key === 'ArrowLeft' && currentSlideIndex > 0) {
            navigateSlide(currentSlideIndex - 1);
        } else if (e.key === 'ArrowRight' && currentSlideIndex < totalSlides - 1) {
            navigateSlide(currentSlideIndex + 1);
        }
    }

    async function fetchData() {
        isLoading = true;
        error = null;
        currentSlideIndex = 0;
        isCarouselReady = false;
        
        try {
            const coursesResponse = await fetchCoursesBasedOnViewMode();
            if (!coursesResponse.ok) {
                const errorData = await coursesResponse.json().catch(() => ({ detail: 'Не удалось загрузить курсы' }));
                throw new Error(errorData.detail || `Ошибка ${coursesResponse.status}`);
            }
            const fetchedCourses = await coursesResponse.json();
            courses = fetchedCourses; 
            totalSlides = courses.length;

            if (viewMode === 'student' && courses.length > 0) {
                await fetchAllEnrollmentStatuses(courses.map(c => c.id));
            } else {
                enrollmentStatus = {};
            }
        } catch (err) {
            console.error("Ошибка загрузки данных курсов:", err);
            error = err.message || 'Произошла ошибка при загрузке курсов.';
            courses = [];
            enrollmentStatus = {};
            totalSlides = 0;
        } finally {
            isLoading = false;
            await tick();
            if (carouselComponent && courses.length > 0) {
                try {
                    currentSlideIndex = 0;
                    await carouselComponent.goTo(0, true);
                    setTimeout(() => {
                        isCarouselReady = true;
                    }, 100);
                } catch (e) {
                    console.warn("Не удалось перейти к слайду 0:", e);
                }
            }
        }
    }

    async function fetchCoursesBasedOnViewMode() {
        let url = `${API_BASE_URL}/courses/`;
        const params = new URLSearchParams();
        
        // Для студентов и помощников с записями не отправляем параметр ordering, так как у них специальная сортировка на backend
        if (currentSortOrder && currentUserRole !== 'student' && currentUserRole !== 'assistant') {
            params.append('ordering', currentSortOrder);
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        return apiFetch(url);
    }

    async function fetchAllEnrollmentStatuses(courseIds) {
        enrollmentStatus = {};
        for (const id of courseIds) {
            try {
                const response = await apiFetch(`${API_BASE_URL}/courses/${id}/enrollment_status/`);
                if (response.ok) {
                    const data = await response.json();
                    enrollmentStatus[id] = data.enrolled;
                } else {
                    console.warn(`Не удалось получить статус записи для курса ${id}`);
                    enrollmentStatus[id] = false; 
                }
            } catch (err) {
                console.error(`Ошибка запроса статуса записи для курса ${id}:`, err);
                enrollmentStatus[id] = false;
            }
        }
    }

    async function handleEnroll(event) {
        const courseId = event.detail;
        console.log(`Попытка записи на курс ${courseId}`);
        try {
            const response = await apiFetch(`${API_BASE_URL}/courses/${courseId}/enroll/`, {
                method: 'POST'
            });
            if (response.ok || response.status === 201 || response.status === 200) { 
                enrollmentStatus = { ...enrollmentStatus, [courseId]: true }; 
                enrollmentSuccessMessage = `Вы успешно записаны на курс!`; 
                showEnrollmentSuccess = true;
                setTimeout(() => showEnrollmentSuccess = false, 5000);
                await fetchData();
            } else {
                const errorData = await response.json().catch(() => ({ detail: 'Не удалось записаться на курс.' }));
                console.error("Ошибка записи на курс:", errorData);
                alert(`Ошибка: ${errorData.detail || 'Не удалось записаться.'}`);
            }
        } catch (err) {
            console.error("Сетевая ошибка при записи на курс:", err);
            alert('Произошла ошибка сети. Попробуйте снова.');
        }
    }

    function handleCreateCourse() {
         editingCourse = null;
         isModalOpen = true;
    }

    function handleEdit(event) {
         editingCourse = event.detail;
         isModalOpen = true;
    }

    function handleCloseModal() {
         isModalOpen = false;
         editingCourse = null;
    }

    async function handleSortChange(newSortOrder) {
        if (currentSortOrder !== newSortOrder) {
            currentSortOrder = newSortOrder;
            await fetchData();
        }
    }

    async function handleSaveCourse(event) {
         const courseData = event.detail;
         const isCreating = !editingCourse;
         const url = isCreating ? `${API_BASE_URL}/courses/` : `${API_BASE_URL}/courses/${editingCourse.id}/`;
         const method = isCreating ? 'POST' : 'PUT';
         try {
             const response = await apiFetch(url, {
                 method: method,
                 body: courseData
             });
             if (response.ok || response.status === 201 || response.status === 200) {
                 handleCloseModal();
                 await fetchData();
                 alert(`Курс успешно ${isCreating ? 'создан' : 'обновлен'}!`);
             } else {
                 const errorData = await response.json().catch(() => ({ detail: `Не удалось ${isCreating ? 'создать' : 'обновить'} курс.` }));
                 console.error("Ошибка сохранения курса:", errorData);
                 let errorMessage = errorData.detail || `Ошибка ${response.status}.`;
                 if (typeof errorData === 'object' && errorData !== null) {
                      errorMessage += "\n" + Object.entries(errorData)
                          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                          .join("\n");
                 }
                 alert(`Ошибка сохранения:\n${errorMessage}`);
             }
         } catch (err) {
             console.error("Сетевая ошибка при сохранении курса:", err);
             alert('Произошла ошибка сети при сохранении. Попробуйте снова.');
         }
    }
    
    function toggleViewMode() {
        viewMode = viewMode === 'admin' ? 'student' : 'admin';
        fetchData();
    }

    async function navigateSlide(targetIndex) {
        if (!carouselComponent || 
            targetIndex < 0 || 
            targetIndex >= totalSlides || 
            targetIndex === currentSlideIndex) {
            return;
        }
        
        try {
            console.log(`Переход к слайду ${targetIndex} (текущий: ${currentSlideIndex})`);
            currentSlideIndex = targetIndex;
            await carouselComponent.goTo(targetIndex);
        } catch (e) {
            console.error("Ошибка при переходе к слайду:", e);
        }
    }

    function handleArrowClick(direction) {
        if (!carouselComponent) return;
        
        const targetIndex = direction === 'next' 
            ? Math.min(currentSlideIndex + 1, totalSlides - 1)
            : Math.max(currentSlideIndex - 1, 0);
            
        if (targetIndex !== currentSlideIndex) {
            navigateSlide(targetIndex);
        }
    }

    function handleAfterChange(event) {
        if (!event || !event.detail) return;
        
        let newIndex = null;
        
        if (typeof event.detail.currentSlide === 'number') {
            newIndex = event.detail.currentSlide;
        } else if (typeof event.detail.current === 'number') {
            newIndex = event.detail.current;
        } else if (event.detail.index !== undefined) {
            newIndex = event.detail.index;
        }
        
        if (newIndex !== null && newIndex >= 0 && newIndex < totalSlides && newIndex !== currentSlideIndex) {
            console.log(`Карусель сообщила о переходе к слайду ${newIndex} (был ${currentSlideIndex})`);
            currentSlideIndex = newIndex;
        }
    }
    
    const carouselOptions = {
        dots: false,
        arrows: false,
        infinite: false,
        initialSlide: 0,
        slidesPerGroup: 1,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: false,
        pauseOnFocus: true,
        pauseOnHover: true,
        speed: 300,
        enableSwipe: true,
        draggable: true
    };
</script>

<svelte:head>
    <title>Курсы — Kei</title>
    <meta name="og:title" content="Курсы — Kei" />
    <meta name="twitter:title" content="Курсы — Kei" />
    <meta name="description" content="Выберите курс и начните обучение на платформе Kei." />
  </svelte:head>

<div class="courses-page {pageVisible ? 'visible' : ''}" key={viewMode}>
    <h1 class="page-title entrance-animation">Курсы</h1>
    
    {#if courses.length > 0 && currentUserRole !== 'student' && currentUserRole !== 'assistant'}
        <div class="sort-controls entrance-animation">
            <span class="sort-label">Сортировать:</span>
            <button 
                class="sort-button {currentSortOrder === '-created_at' ? 'active' : ''}" 
                on:click={() => handleSortChange('-created_at')}
                title="Сначала новые курсы"
            >
                Новые сначала
            </button>
            <button 
                class="sort-button {currentSortOrder === 'created_at' ? 'active' : ''}" 
                on:click={() => handleSortChange('created_at')}
                title="Сначала старые курсы"
            >
                Старые сначала
            </button>
            <button 
                class="sort-button {currentSortOrder === 'title' ? 'active' : ''}" 
                on:click={() => handleSortChange('title')}
                title="По алфавиту"
            >
                По названию
            </button>
        </div>
    {/if}
    
    {#if isAdminOrTeacher || isAssistant}
        <div class="admin-controls entrance-animation">
             {#if isAdminOrTeacher}
                <button class="admin-button create-button" on:click={handleCreateCourse} title="Создать новый курс">
                    <PlusCircleOutline size="20px" /> Создать курс
                </button>
            {/if}
             <button class="admin-button view-toggle-button" on:click={toggleViewMode} title={viewMode === 'admin' ? 'Посмотреть как студент' : 'Вернуться в режим администрирования'}>
                 {#if viewMode === 'admin'}
                    <EyeOutline size="20px" /> Режим студента
                 {:else}
                    <EyeOffOutline size="20px" /> Режим админа
                 {/if}
            </button>
        </div>
    {/if}
    {#if isLoading}
        <p class="loading-message pulse-animation">Загрузка курсов...</p>
    {:else if error}
        <p class="error-message entrance-animation">{error}</p>
    {:else if courses.length === 0}
        <p class="no-courses-message entrance-animation">{viewMode === 'admin' ? 'Нет созданных курсов.' : 'Доступных курсов пока нет.'}</p>
    {:else}
        <div class="carousel-container entrance-animation">
             <button 
                class="carousel-arrow prev" 
                on:click={() => handleArrowClick('prev')} 
                aria-label="Предыдущий курс" 
                title="Предыдущий курс" 
                disabled={currentSlideIndex === 0}
             >
                 <ArrowLeft size="30px" />
             </button>
             <Carousel 
                bind:this={carouselComponent} 
                {...carouselOptions} 
                on:afterChange={handleAfterChange}
                uniqueKey={courses.map(c => c.id).join('-') + '-' + viewMode}
             >
                 {#each courses as course (course.id)}
                     <div class="carousel-slide">
                         <CourseCard
                             {course}
                             isEnrolled={enrollmentStatus[course.id] || false}
                             {currentUserRole}
                             {viewMode}
                             on:enroll={handleEnroll}
                             on:edit={handleEdit}
                             on:delete={handleEdit}
                         />
                     </div>
                 {/each}
             </Carousel>
             <button 
                class="carousel-arrow next" 
                on:click={() => handleArrowClick('next')} 
                aria-label="Следующий курс" 
                title="Следующий курс" 
                disabled={currentSlideIndex === courses.length - 1}
             >
                 <ArrowRight size="30px" />
             </button>
             <div class="carousel-dots-custom">
                 {#each Array(courses.length) as _, i}
                     <button 
                         class="custom-dot {i === currentSlideIndex ? 'active' : ''}" 
                         on:click={() => navigateSlide(i)}
                         aria-label="Перейти к слайду {i+1}"
                         title="Слайд {i+1}"
                     ></button>
                 {/each}
             </div>
        </div>
    {/if}
    {#if isModalOpen}
         <CourseFormModal
             courseToEdit={editingCourse}
             on:close={handleCloseModal}
             on:save={handleSaveCourse}
         />
    {/if}
    {#if showEnrollmentSuccess}
        <EnrollmentSuccess message={enrollmentSuccessMessage} />
    {/if}
</div>
<style>
    .courses-page {
        padding: 30px var(--spacing-padding-page);
        max-width: var(--max-width-page);
        margin: 0 auto;
        min-height: var(--min-height-page);
        background-color: var(--color-bg-ultra-light);
        opacity: 0.8;
        transform: translateY(20px);
        transition: opacity 0.5s ease, transform 0.5s ease;
    }

    .courses-page.visible {
        opacity: 1;
        transform: translateY(0);
    }

    .entrance-animation {
        opacity: 0;
        transform: translateY(15px);
        animation: fadeIn var(--animation-duration-entrance) ease forwards;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(15px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .pulse-animation {
        animation: pulse var(--animation-duration-pulse) infinite ease-in-out;
    }

    @keyframes pulse {
        0% { opacity: 0.5; }
        50% { opacity: 1; }
        100% { opacity: 0.5; }
    }
    .page-title {
        animation-delay: var(--animation-delay-title);
    }
    .admin-controls {
        animation-delay: var(--animation-delay-admin-controls);
    }
    .carousel-container {
        animation-delay: var(--animation-delay-carousel);
    }
    .page-title {
        text-align: center;
        font-size: var(--font-size-h1);
        color: var(--color-text-dark);
        margin-bottom: var(--spacing-margin-bottom-large);
        font-weight: var(--font-weight-bold);
    }
    .admin-controls {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-gap-medium);
        margin-bottom: var(--spacing-margin-bottom-medium);
        flex-wrap: wrap;
    }
    .admin-button {
        background-color: var(--color-bg-admin-button);
        color: var(--color-text-admin-button);
        border: var(--border-width-button) solid var(--color-border-admin-button);
        border-radius: var(--spacing-border-radius-button);
        padding: var(--spacing-padding-button);
        font-family: var(--font-family-primary);
        font-weight: var(--font-weight-semi-bold);
        cursor: pointer;
        transition: all var(--animation-duration-transition) ease;
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-gap-small);
        font-size: var(--font-size-button);
    }
    .admin-button:hover {
        background-color: var(--color-border-admin-button); 
        box-shadow: 0 2px 8px rgba(77, 68, 181, 0.1);
        transform: translateY(-1px);
    }
     .admin-button:active {
        transform: translateY(0);
        filter: brightness(0.98);
    }
    
    .sort-controls {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: var(--spacing-gap-small);
        margin-bottom: var(--spacing-margin-bottom-medium);
        flex-wrap: wrap;
    }
    
    .sort-label {
        font-size: var(--font-size-small);
        color: var(--color-text-muted);
        font-weight: var(--font-weight-medium);
    }
    
    .sort-button {
        background-color: var(--color-bg-light);
        color: var(--color-text-dark);
        border: var(--border-width-button) solid var(--color-border-light);
        border-radius: var(--spacing-border-radius-button);
        padding: 8px 16px;
        font-family: var(--font-family-primary);
        font-size: var(--font-size-small);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: all var(--animation-duration-transition) ease;
    }
    
    .sort-button:hover {
        background-color: var(--color-bg-hover);
        border-color: var(--color-purple-light);
        transform: translateY(-1px);
    }
    
    .sort-button.active {
        background-color: var(--color-purple-light);
        color: white;
        border-color: var(--color-purple-light);
        font-weight: var(--font-weight-semi-bold);
    }
    
    .sort-button:active {
        transform: translateY(0);
    }
    
    .student-sort-info {
        text-align: center;
        margin-bottom: var(--spacing-margin-bottom-medium);
        padding: 12px 20px;
        background-color: var(--color-bg-light);
        border: 1px solid var(--color-border-light);
        border-radius: var(--spacing-border-radius-button);
    }

    .admin-button.create-button {
        background-color: var(--color-bg-admin-button-create);
        color: var(--color-text-admin-button-create);
        border-color: var(--color-bg-admin-button-create);
    }
     .admin-button.create-button:hover {
        background-color: var(--color-bg-admin-button-create-hover);
        border-color: var(--color-bg-admin-button-create-hover);
    }
    .loading-message, .error-message, .no-courses-message {
        text-align: center;
        font-size: 1.1rem;
        color: var(--color-text-muted);
        margin-top: var(--spacing-margin-top-medium);
    }
    .error-message {
        color: var(--color-danger-red);
    }

    .carousel-container {
        position: relative;
        max-width: var(--max-width-carousel);
        margin: 0 auto;
        padding: 0 50px;
        padding-bottom: 50px;
    }

    :global(.carousel-container .slick-dots) {
        display: none !important;
    }
    .carousel-dots-custom {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: var(--spacing-margin-top-small);
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
    }
    .custom-dot {
        width: var(--font-size-dot);
        height: var(--font-size-dot);
        border-radius: var(--spacing-border-radius-dot);
        background-color: var(--color-purple-light);
        opacity: 0.4;
        border: none;
        cursor: pointer;
        padding: 0;
        transition: all var(--animation-duration-transition) ease;
        box-shadow: 0 1px 3px var(--color-shadow);
    }
    .custom-dot:hover {
        opacity: 0.7;
        transform: scale(1.1);
    }

    .custom-dot.active {
        background-color: var(--color-purple-active);
        opacity: 1;
        width: calc(var(--font-size-dot) + 2px);
        height: calc(var(--font-size-dot) + 2px);
        transform: scale(1.2);
        box-shadow: 0 2px 4px rgba(77, 68, 181, 0.2); /* Оставил пока так, специфичный цвет */
    }
    .carousel-slide {
        padding: 10px; /* Оставил пока так */
        min-height: var(--min-height-slide);
        display: flex;
        align-items: stretch;
        box-sizing: border-box;
        transition: transform var(--animation-duration-transition) ease, opacity var(--animation-duration-transition) ease;
    }
    :global(.slick-slide) {
        transition: opacity var(--animation-duration-transition) ease, transform var(--animation-duration-transition) ease;
    }
    :global(.slick-current) {
        z-index: 10;
    }
    :global(.slick-active) {
        z-index: 5;
    }
     .carousel-slide > :global(*) { /* Применяем к CourseCard */
        width: 100%;
        height: 100%;
        display: block; /* Убедимся, что компонент блочный */
    }
    .carousel-arrow {
        position: absolute;
        top: calc(50% - 30px); /* Корректируем позицию с учетом высоты футера карточки */
        transform: translateY(-50%);
        background: var(--color-bg-light);
        border: var(--border-width-button) solid #ddd; /* Оставил пока так, специфичный цвет */
        border-radius: var(--spacing-border-radius-dot);
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--color-purple-light);
        box-shadow: 0 2px 5px var(--color-shadow);
        transition: all var(--animation-duration-transition) ease;
        z-index: 10;
    }
    .carousel-arrow:hover:not(:disabled) {
        background: var(--color-purple-light);
        color: var(--color-text-light);
        transform: translateY(-50%) scale(1.08);
        border-color: var(--color-purple-light);
    }
    .carousel-arrow:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        background: #f0f0f0; 
        color: #aaa;
        border-color: #eee;
    }
    .carousel-arrow.prev {
        left: 0px;
    }
    .carousel-arrow.next {
        right: 0px;
    }
    @media (max-width: 900px) {
        .carousel-container {
            max-width: 600px;
            padding: 0 45px 50px;
        }
         .carousel-slide {
            min-height: 480px;
        }
    }
    @media (max-width: 768px) {
        .courses-page {
            padding: 20px var(--spacing-padding-page);
        }
         .admin-controls {
            justify-content: space-between;
        }
        .carousel-container {
            padding: 0 40px 50px;
            max-width: 100%;
        }
        .carousel-arrow {
            width: 35px;
            height: 35px;
            top: calc(50% - 35px);
        }
         .carousel-arrow.prev {
            left: 0px;
        }
        .carousel-arrow.next {
            right: 0px;
        }
         .carousel-slide {
            min-height: 460px;
            padding: 5px;
        }
    }
     @media (max-width: 480px) {
          .carousel-slide {
            min-height: 420px;
        }
        .carousel-arrow {
             width: 30px;
             height: 30px;
             top: calc(50% - 40px);
        }
         .carousel-arrow.prev { left: -5px; }
         .carousel-arrow.next { right: -5px; }
         .carousel-container { padding: 0 30px 40px; }

         .custom-dot {
             width: 10px;
             height: 10px;
        }

         .custom-dot.active {
             width: 12px;
             height: 12px;
        }
    }
</style>