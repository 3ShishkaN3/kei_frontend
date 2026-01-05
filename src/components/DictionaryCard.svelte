<script>
    import PencilOutline from 'svelte-material-icons/PencilOutline.svelte';
    import DeleteOutline from 'svelte-material-icons/DeleteOutline.svelte';
    import { createEventDispatcher } from 'svelte';

    export let section;
    export let isAdminView;
    export let is_active = false;

    const dispatch = createEventDispatcher();

    $: textColor = 'var(--color-text-light)';

    function handleEdit() { dispatch('edit', { section }); }
    function handleDelete() { dispatch('delete', { sectionId: section.id }); }
</script>

<div
    class="dictionary-card"
    class:active={is_active}
    style="background-image: url({section.banner_image || '/placeholder-banner.jpg'})"
>
    {#if isAdminView}
        <div class="admin-controls">
            <button class="admin-icon-button edit" on:mouseup|stopPropagation={handleEdit} title="Редактировать">
                <PencilOutline size="18px" />
            </button>
            <button class="admin-icon-button delete" on:mouseup|stopPropagation={handleDelete} title="Удалить">
                <DeleteOutline size="18px" />
            </button>
        </div>
    {/if}
    <h3 class="title">{section.title}</h3>
    {#if section.is_primary && isAdminView}
        <span class="primary-badge">Основной</span>
    {/if}
</div>

<style>
    .dictionary-card {
        min-width: 280px;
        width: 65%;
        position: relative;
        aspect-ratio: 16 / 9;
        border-radius: var(--spacing-border-radius-block, 12px);
        background-size: 120%;
        background-position: center;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 20px;
        overflow: hidden;
        cursor: pointer;

        border: 2px solid rgb(0, 0, 0);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        filter: brightness(0.9); 
        transition:
            transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
            background-size 0.6s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.5s ease,
            filter 0.4s ease;
    }

    .dictionary-card:hover {
        transform: translateY(-6px);
        background-size: 115%;
        box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35);
        filter: brightness(0.95);
    }

    .dictionary-card:active {
        border: 2px solid var(--color-purple-active, #8E8BE0);
        background-size: 110%;
        transform: translateY(-4px) scale(1.015);
        box-shadow:
            0 0 0 3px rgba(142, 139, 224, 0.4),
            0 12px 32px rgba(0, 0, 0, 0.3);
        filter: brightness(1.0);
    }

    .title {
        font-size: clamp(1.3rem, 3vw, 1.8rem);
        font-weight: var(--font-weight-bold, 700);
        margin: 0;
        text-shadow: 1px 1px 4px rgba(0,0,0,0.6);
        z-index: 2;
    }

    .primary-badge {
        position: absolute;
        top: 10px;
        left: 10px;
        background-color: var(--color-purple-active, #8E8BE0);
        color: var(--color-text-light, #fff);
        font-size: 0.75rem;
        padding: 3px 8px;
        border-radius: 5px;
        font-weight: var(--font-weight-semi-bold);
        z-index: 3;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    .admin-controls {
        position: absolute;
        top: 10px;
        right: 10px;
        display: flex;
        gap: 6px;
        z-index: 10;
        background-color: rgba(255, 255, 255, 0.2);
        padding: 5px;
        border-radius: 8px;
        backdrop-filter: blur(2px);
    }

    .admin-icon-button {
        background: none;
        border: none;
        padding: 5px;
        cursor: pointer;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-muted);
        transition: background-color 0.2s, color 0.2s;
    }

    .admin-icon-button.edit:hover {
        background-color: var(--color-bg-admin-button);
        color: var(--color-text-admin-button);
    }

    .admin-icon-button.delete:hover {
        background-color: rgba(255, 77, 77, 0.2);
        color: var(--color-danger-red);
    }
</style>
