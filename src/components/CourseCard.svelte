<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { navigate } from 'svelte-routing';
    import EyeOutline from 'svelte-material-icons/EyeOutline.svelte';
    import PencilOutline from 'svelte-material-icons/PencilOutline.svelte';
    import TrashCanOutline from 'svelte-material-icons/TrashCanOutline.svelte';
    import CheckCircleOutline from 'svelte-material-icons/CheckCircleOutline.svelte';
    import ArrowRightCircleOutline from 'svelte-material-icons/ArrowRightCircleOutline.svelte';

    export let course;
    export let isEnrolled = false;
    export let currentUserRole = 'student'; // Переименовал с userRole для соответствия родительскому компоненту
    export let viewMode = 'student';

    // <!-- Проверка получения userRole -->
    // console.log('CourseCard received userRole:', currentUserRole);

    const dispatch = createEventDispatcher();

    let isHovering = false;
    let showDescriptionMobile = false;
    let textColor = "white"; // Цвет текста по умолчанию

    $: isAdmin = currentUserRole === 'admin';
    $: isTeacher = currentUserRole === 'teacher';
    $: isAssistant = currentUserRole === 'assistant';
    // <!-- Проверяем userRole перед использованием -->
    $: canEdit = currentUserRole && (isAdmin || isTeacher || (isAssistant && course.is_assistant_assigned)) && viewMode === 'admin';
    $: canDelete = currentUserRole && (isAdmin || isTeacher) && viewMode === 'admin';
    $: canEnroll = course.status === 'free' && !isEnrolled && viewMode === 'student';
    $: canViewLessons = isEnrolled && viewMode === 'student';
    $: isPaid = course.status === 'published' && !isEnrolled && viewMode === 'student';
    $: isDraft = course.status === 'draft';

    const defaultBanner = '/default_banner.jpg'; // Убедитесь, что этот файл есть в /public
    $: bannerImage = course.cover_image || defaultBanner;

    function handleEnrollClick(event) {
        event.stopPropagation();
        dispatch('enroll', course.id);
    }

    function handleGoToCourseClick(event) {
        event.stopPropagation();
        navigate(`/courses/${course.id}/lessons`);
    }

    function handleMouseEnter() {
        if (!window.matchMedia("(pointer: coarse)").matches) {
             isHovering = true;
        }
    }

    function handleMouseLeave() {
        if (!window.matchMedia("(pointer: coarse)").matches) {
            isHovering = false;
        }
    }

    function handleEditClick(event) {
        event.stopPropagation();
        dispatch('edit', course);
    }

    function handleDeleteClick(event) {
        event.stopPropagation();
        if (confirm(`Вы уверены, что хотите удалить курс "${course.title}"?`)) {
            dispatch('delete', course.id);
        }
    }

    function handleCardTap() {
        // Проверяем на "мобильность" перед переключением описания
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            showDescriptionMobile = !showDescriptionMobile;
        }
    }

    // Функция для определения цвета текста в зависимости от цвета баннера
    onMount(() => {
        // Если баннер загружен, проверим его цвет
        if (typeof window !== 'undefined') {
            setTimeout(() => {
                try {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.src = bannerImage;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        
                        // Проверяем цвет верхней части изображения, где будет текст
                        const imageData = ctx.getImageData(0, 0, canvas.width, Math.min(50, canvas.height)).data;
                        let totalBrightness = 0;
                        
                        for (let i = 0; i < imageData.length; i += 4) {
                            // Вычисляем яркость (0-255)
                            const brightness = (imageData[i] * 0.299 + imageData[i+1] * 0.587 + imageData[i+2] * 0.114);
                            totalBrightness += brightness;
                        }
                        
                        const avgBrightness = totalBrightness / (imageData.length / 4);
                        textColor = avgBrightness > 140 ? "black" : "white";
                    };
                    img.onerror = () => {
                        textColor = "white"; // По умолчанию белый, если не удалось загрузить картинку
                    };
                } catch (e) {
                    console.warn("Не удалось определить цвет баннера:", e);
                }
            }, 0);
        }
    });
</script>

<div class="course-card"
     on:mouseenter={handleMouseEnter}
     on:mouseleave={handleMouseLeave}
     on:focusin={handleMouseEnter}
     on:focusout={handleMouseLeave}
     on:click={handleCardTap}
     role="article"
     aria-labelledby="course-title-{course.id}"
     tabindex="0"  
>
    {#if isDraft && viewMode === 'admin'}
        <div class="draft-indicator">Черновик</div>
    {/if}
    
    {#if canEdit || canDelete}
         <div class="admin-actions">
            {#if canEdit}
                <button on:click={handleEditClick} aria-label="Редактировать курс {course.title}" title="Редактировать">
                    <PencilOutline size="20px" />
                </button>
            {/if}
            {#if canDelete}
                <button class="delete-button" on:click={handleDeleteClick} aria-label="Удалить курс {course.title}" title="Удалить">
                    <TrashCanOutline size="20px" />
                </button>
            {/if}
        </div>
    {/if}

    <div class="banner">
        <img src={course.cover_image || '/default_banner.jpg'} alt="Баннер курса {course.title}" loading="lazy"/>
        <div class="banner-text" style="color: {textColor}">
            <h3 id="course-title-{course.id}">{course.title}</h3>
            {#if course.subtitle}
                <p>{course.subtitle}</p>
            {/if}
        </div>
         <div class="description-overlay" class:visible={isHovering || showDescriptionMobile} tabindex="-1">
            <p>{course.description}</p>
        </div>
    </div>

    <div class="card-footer">
         {#if viewMode === 'student'}
            {#if canEnroll}
                <button class="action-button enroll" on:click={handleEnrollClick}>
                    <CheckCircleOutline size="18px" /> Записаться
                </button>
            {:else if canViewLessons}
                <button class="action-button view-lessons" on:click={handleGoToCourseClick}>
                    <ArrowRightCircleOutline size="18px" /> Перейти к курсу
                </button>
            {:else if isPaid}
                <span class="status-info paid">Курс платный</span>
            {/if}
        {:else if viewMode === 'admin'}
            <div class="admin-footer">
                <span class="status-info admin-view">
                    Статус: {course.status === 'draft' ? 'Черновик' : course.status === 'published' ? 'Опубликован' : 'Бесплатный'}
                </span>
                <button class="action-button view-as-admin" on:click={handleGoToCourseClick}>
                    <EyeOutline size="18px" /> Просмотр курса
                </button>
            </div>
        {/if}
    </div>
</div>

<style>
    /* Общие стили */
    :root {
        --pink-light: #EBC7F2;
        --pink-hover: #D8A8E8;
        --pink-active: #C18AD2;
        --purple-light: #C2B6FC;
        --purple-hover: #A8A1F5;
        --purple-active: #8E8BE0;
        --soft-blue: rgb(133, 171, 230);
        --muted-indigo: rgb(114, 113, 160);
        --text-dark: #333; /* Темно-серый для основного текста */
        --text-light: #fff;
        --text-muted: #667; /* Серый для второстепенного */
        --bg-light: #fff;
        --bg-very-light: #f9f9f9;
        --border-light: #eee;
        --orange-draft: rgba(255, 165, 0, 0.9);
        --danger-red: #dc3545;
        --danger-red-hover-bg: rgba(220, 53, 69, 0.1);
    }

    .course-card {
        background-color: var(--bg-light);
        border-radius: 15px;
        overflow: hidden;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
        position: relative;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        cursor: default;
        height: 100%;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--border-light);
    }
    /* Убираем курсор pointer по умолчанию, добавляем при :focus-visible для доступности */
    .course-card:focus-visible {
        outline: 2px solid var(--purple-light);
        outline-offset: 2px;
    }
    @media (hover: hover) {
      .course-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(194, 182, 252, 0.2); /* Фиолетовая тень */
      }
    }

    .banner {
        position: relative;
        width: 100%;
        padding-top: 56.25%; /* 16:9 aspect ratio */
        overflow: hidden;
        flex-grow: 1;
        background-color: #eee; /* Фон для случая отсутствия картинки */
    }

    .banner img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.4s ease;
    }
    @media (hover: hover) {
        .course-card:hover .banner img {
            transform: scale(1.05);
        }
    }

    .banner-text {
        position: absolute;
        top: 20px;
        left: 20px;
        /* <!-- Используем переменную для цвета текста --> */
        z-index: 2; /* Над картинкой, под оверлеем описания */
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7); /* Усиленная тень */
        pointer-events: none; /* Чтобы не мешать ховеру на карточку */
        transition: color 0.3s ease;
    }

    .banner-text h3 {
        margin: 0 0 5px 0;
        font-size: clamp(1.5rem, 4vw, 2.2rem);
        font-weight: 700;
        line-height: 1.2;
    }

    .banner-text p {
        margin: 0;
        font-size: clamp(0.9rem, 2.5vw, 1.1rem);
        font-weight: 500;
        opacity: 0.95;
        line-height: 1.3;
    }

    .description-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 35%;
        background: rgba(0, 0, 0, 0.3); /* Темный фон */
        backdrop-filter: blur(10px); /* Более сильный блюр */
        color: var(--text-light); /* Белый текст */
        padding: 15px 20px;
        opacity: 0;
        transform: translateY(100%);
        transition: opacity 0.5s ease, transform 0.5s ease, visibility 0.3s;
        /* z-index выше текста баннера */
        z-index: 3;
        overflow-y: auto;
        display: flex;
        align-items: center;
        pointer-events: none; /* По умолчанию не перехватывает события */
        visibility: hidden; /* Скрываем полностью */
        line-height: 1.5;
    }

    .description-overlay.visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto; /* Разрешаем события при видимости */
        visibility: visible;
    }

    .description-overlay p {
        margin: 0;
        font-size: clamp(0.85rem, 2.2vw, 1rem);
    }

    .card-footer {
        padding: 15px 20px;
        background-color: var(--bg-very-light);
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 65px;
        border-top: 1px solid var(--border-light);
    }

    .admin-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        gap: 10px;
    }

    /* Стилизация кнопок действий */
    .action-button {
        border: none;
        border-radius: 25px;
        padding: 10px 20px;
        font-family: 'Montserrat', sans-serif;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
        color: var(--text-light); /* Белый текст на кнопках */
    }
    
    .action-button.enroll {
        background-image: linear-gradient(to right, var(--pink-light) 0%, var(--purple-light) 100%);
    }
    .action-button.enroll:hover {
        background-image: linear-gradient(to right, var(--pink-hover) 0%, var(--purple-hover) 100%);
        transform: scale(1.05);
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
    }
    .action-button.enroll:active {
        background-image: linear-gradient(to right, var(--pink-active) 0%, var(--purple-active) 100%);
        transform: scale(0.98);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
    }

    .action-button.view-lessons, 
    .action-button.view-as-admin {
        /* Используем мягкий синий */
        background-color: var(--soft-blue);
        /* Можно добавить градиент, если есть второй похожий цвет */
    }
    .action-button.view-lessons:hover,
    .action-button.view-as-admin:hover {
        background-color: hsl(214, 64%, 65%); /* Чуть темнее */
        transform: scale(1.05);
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
    }
    .action-button.view-lessons:active,
    .action-button.view-as-admin:active {
        background-color: hsl(214, 64%, 60%); /* Еще темнее */
        transform: scale(0.98);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
    }

    .status-info {
        font-size: 0.9rem;
        color: var(--text-muted); /* Серый */
        font-weight: 500;
    }
    
    .status-info.paid {
        color: #fc8a15; /* Оранжевый для платных курсов */
        font-weight: 600;
    }
    
    .status-info.admin-view {
        color: var(--muted-indigo); /* Приглушенный индиго */
        font-weight: 600;
    }

    .draft-indicator {
        position: absolute;
        top: 10px;
        left: 10px; /* Переносим влево */
        background-color: var(--orange-draft);
        color: var(--text-light); /* Белый текст */
        padding: 3px 8px;
        border-radius: 5px;
        font-size: 0.75rem;
        font-weight: bold;
        z-index: 4; /* Выше оверлея */
        backdrop-filter: blur(2px);
    }

    .admin-actions {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 5; /* Выше всех остальных элементов */
        display: flex;
        gap: 5px;
        background: rgba(255, 255, 255, 0.8); /* Увеличили непрозрачность */
        padding: 5px;
        border-radius: 8px;
        backdrop-filter: blur(3px);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); /* Добавили тень для заметности */
    }
    
    .admin-actions button {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(114, 113, 160, 0.3);
        cursor: pointer;
        padding: 6px;
        color: var(--muted-indigo); /* Приглушенный индиго */
        border-radius: 50%;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
    }
    
    .admin-actions button:hover {
        background-color: rgba(114, 113, 160, 0.1); /* Фон цвета иконки */
        transform: scale(1.1);
    }
    
    /* Стили для кнопки удаления */
    .admin-actions button.delete-button {
        color: var(--danger-red);
        border-color: rgba(220, 53, 69, 0.3);
    }
    
    .admin-actions button.delete-button:hover {
        background-color: var(--danger-red-hover-bg);
        color: var(--danger-red);
        border-color: var(--danger-red);
    }

    /* Адаптивность */
    @media (max-width: 768px) {
        .banner-text {
            top: 15px;
            left: 15px;
        }
        .description-overlay {
            padding: 10px 15px;
            height: 40%;
        }
        .card-footer {
            padding: 10px 15px;
            min-height: 60px;
        }
        .action-button {
            padding: 8px 16px;
            font-size: 0.85rem;
        }
        .course-card {
            /* Делаем кликабельной на мобильных для показа описания */
            cursor: pointer;
        }
        /* Убираем ховер-эффект для описания на тач-устройствах */
        @media (hover: none) {
            .description-overlay {
                /* Показывается только через .visible */
                transition: opacity 0.4s ease, transform 0.4s ease; /* Сохраняем анимацию для тач */
            }
        }
        
        .admin-footer {
            flex-direction: column;
            gap: 10px;
        }
    }
</style>