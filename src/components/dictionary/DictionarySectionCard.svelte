<script>
    import { navigate } from 'svelte-routing';
    import { createEventDispatcher } from 'svelte';
    import PencilOutline from 'svelte-material-icons/PencilOutline.svelte';
    import DeleteOutline from 'svelte-material-icons/DeleteOutline.svelte';

    export let section;
    export let courseId;
    export let isAdminView = false;
    export let animationDelay = '0s';

    const dispatch = createEventDispatcher();
    const fallbackImage = '/banner-info.jpg'; // A fallback image in public folder

    function handleNavigate() {
        if (courseId && section.id) {
            navigate(`/courses/${courseId}/practice/${section.id}`);
        }
    }

    function handleEdit(e) {
        e.stopPropagation();
        dispatch('edit', { section });
    }

    function handleDelete(e) {
        e.stopPropagation();
        dispatch('delete', { sectionId: section.id });
    }
</script>

<div 
    class="section-card" 
    style="animation-delay: {animationDelay}; --bg-image: url('{section.banner_image || fallbackImage}');" 
    on:click={handleNavigate}
    role="button"
    tabindex="0"
    on:keydown={(e) => e.key === 'Enter' && handleNavigate()}
>
    {#if isAdminView}
        <div class="admin-controls">
            <button class="admin-button" on:click={handleEdit} title="Редактировать раздел">
                <PencilOutline size="18px" />
            </button>
            <button class="admin-button" on:click={handleDelete} title="Удалить раздел">
                <DeleteOutline size="18px" />
            </button>
        </div>
    {/if}

    <div class="title-container">
        <h3 class="title">{section.title}</h3>
    </div>
</div>

<style>
    @keyframes card-enter {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .section-card {
        position: relative;
        aspect-ratio: 3 / 2;
        border-radius: var(--spacing-border-radius-block, 16px);
        overflow: hidden;
        cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding: 15px;
        color: white;
        
        border: 2px solid transparent;
        transition: border-color 0.3s ease, box-shadow 0.3s ease;

        /* Animation */
        opacity: 0;
        transform: translateY(20px);
        animation: card-enter 0.5s ease-out forwards;
    }

    .section-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: var(--bg-image);
        background-size: cover;
        background-position: center;
        transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        z-index: 1;
    }
    
    .section-card::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.4);
        transition: background-color 0.3s ease;
        z-index: 2;
    }

    .section-card:hover {
        border-color: var(--color-purple-light);
        box-shadow: var(--color-block-shadow-hover, 0 6px 18px rgba(0,0,0,0.2));
    }

    .section-card:hover::before {
        transform: scale(1.05);
    }
    
    .section-card:active::before {
        transform: scale(1.02);
    }

    .section-card:hover::after {
        background-color: rgba(0, 0, 0, 0.55);
    }

    .title-container {
        position: relative;
        z-index: 3;
        padding: 10px;
        background: rgba(0,0,0,0.2);
        border-radius: 8px;
        transition: background-color 0.3s ease;
    }
    
    .title {
        font-size: clamp(1.1rem, 4vw, 1.5rem);
        font-weight: var(--font-weight-bold, 700);
        margin: 0;
        text-shadow: 2px 2px 8px rgba(0,0,0,0.8);
    }

    .admin-controls {
        position: absolute;
        top: 10px;
        right: 10px;
        display: flex;
        gap: 8px;
        z-index: 10;
    }

    .admin-button {
        background: rgba(30, 30, 30, 0.6);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        width: 38px;
        height: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.2s ease, transform 0.2s ease;
    }

    .admin-button:hover {
        background: rgba(0, 0, 0, 0.8);
        transform: scale(1.1);
    }
</style> 