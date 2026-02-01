<script>
    import BookOpenVariant from "svelte-material-icons/BookOpenVariant.svelte";
    import PencilOutline from "svelte-material-icons/PencilOutline.svelte";
    import DeleteOutline from "svelte-material-icons/DeleteOutline.svelte";
    import Lock from "svelte-material-icons/Lock.svelte";
    import { createEventDispatcher } from "svelte";
    import { addNotification } from "../stores/notifications.js";

    export let lesson;
    export let progress;
    export let isAdminView;
    export let animationDelay = "0s";

    const dispatch = createEventDispatcher();

    $: progressText =
        progress === 0
            ? "Не начато"
            : progress === 100
              ? "Завершено"
              : `Завершено на ${progress}%`;

    $: isLocked = lesson.is_locked;

    $: buttonText = isLocked
        ? "Закрыто"
        : progress === 0
          ? "Начать"
          : progress === 100
            ? "Повторить"
            : "Продолжить";

    $: coverStyle = lesson.cover_image
        ? `background-image: url(${lesson.cover_image});`
        : "background-color: var(--color-purple-light, #e0dffc);";

    function handleEdit() {
        dispatch("edit", { lesson });
    }

    function handleDelete() {
        dispatch("delete", { lessonId: lesson.id });
    }

    function handleAction() {
        if (isLocked) {
            addNotification(
                "Завершите предыдущий урок, чтобы открыть этот.",
                "warning",
            );
            return;
        }
        console.log(`Action clicked for lesson ${lesson.id}`);
        // Example: navigate(`/lessons/${lesson.id}`);
        dispatch("action", { lessonId: lesson.id });
    }
</script>

<div
    class="lesson-card"
    style="animation-delay: {animationDelay};"
    class:admin-view={isAdminView}
>
    <slot name="dragHandle"></slot>
    {#if isAdminView}
        <div class="admin-controls">
            <button
                class="admin-icon-button edit"
                on:click|stopPropagation={handleEdit}
                title="Редактировать"
            >
                <PencilOutline size="20px" />
            </button>
            <button
                class="admin-icon-button delete"
                on:click|stopPropagation={handleDelete}
                title="Удалить"
            >
                <DeleteOutline size="20px" />
            </button>
        </div>
    {/if}

    <div class="card-content">
        <div class="top-section">
            <div
                class="icon-container"
                style={coverStyle}
                class:locked={isLocked}
            >
                {#if isLocked}
                    <div class="lock-overlay">
                        <Lock size="32px" />
                    </div>
                {/if}
                {#if !lesson.cover_image && !isLocked}
                    <BookOpenVariant size="48px" class="default-icon" />
                {/if}
            </div>
            <div class="info-wrapper">
                <div class="title-progress-group">
                    <h3 class="title">{lesson.title}</h3>
                    {#if isLocked}
                        <p class="progress-text">Недоступно</p>
                    {:else}
                        <p class="progress-text">{progressText}</p>
                    {/if}
                </div>
                <div class="section-count" title="Количество разделов">
                    <span class="section-label">Разделов:</span>
                    <span class="section-number"
                        >{lesson.section_count || 0}</span
                    >
                </div>
            </div>
        </div>

        <div class="progress-bar-container">
            <div class="progress-bar" style="width: {progress}%"></div>
        </div>

        <div class="bottom-section">
            <button
                class="action-button"
                class:locked-btn={isLocked}
                on:click={handleAction}
                disabled={isLocked}
            >
                {#if isLocked}
                    <Lock size="16px" style="margin-right: 5px;" />
                {/if}
                {buttonText}
            </button>
        </div>
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

    .lesson-card {
        background-color: var(--color-block-bg, #fff);
        border-radius: var(--spacing-border-radius-block, 16px);
        box-shadow: var(--color-block-shadow, 0 3px 10px rgba(0, 0, 0, 0.06));
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition:
            box-shadow 0.3s ease,
            transform 0.3s ease;
        position: relative;
        border: 1px solid var(--color-border-light, #f0f0f0);
        opacity: 0;
        transform: translateY(20px);
        animation: card-enter 0.5s ease-out forwards;
    }
    .lesson-card.locked {
        filter: grayscale(1);
        opacity: 0.8;
        pointer-events: none; /* Disable hovering effects basically, but we want click on button to show notification? Actually if pointer-events none, no events. */
    }
    /* Allow pointer events for the button to show toast? or just disable */

    .lesson-card:hover {
        box-shadow: var(
            --color-block-shadow-hover,
            0 6px 18px rgba(0, 0, 0, 0.1)
        );
        transform: translateY(-5px);
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
        transition:
            background-color 0.2s,
            color 0.2s;
    }
    .admin-icon-button.edit:hover {
        background-color: var(--color-bg-admin-button);
        color: var(--color-text-admin-button);
    }
    .admin-icon-button.delete:hover {
        background-color: rgba(255, 77, 77, 0.2);
        color: var(--color-danger-red);
    }

    .card-content {
        padding: 20px;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }

    .top-section {
        display: flex;
        align-items: flex-start;
        gap: 15px;
        margin-bottom: 15px;
    }

    .icon-container {
        width: 85px;
        height: 85px;
        flex-shrink: 0;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-size: cover;
        background-position: center;
        transition: transform 0.3s ease;
    }
    .lesson-card:hover .icon-container {
        transform: scale(1.05);
    }
    .icon-container :global(svg) {
        color: #ccc;
    }
    .default-icon {
        color: var(--color-purple-active);
    }

    .icon-container.locked::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 12px;
    }
    .lock-overlay {
        position: absolute;
        z-index: 2;
        color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        filter: brightness(0.8);
    }

    .info-wrapper {
        flex-grow: 1;
        min-width: 0;
        display: flex;
        justify-content: space-between;
        min-height: 70px;
    }

    .title-progress-group {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin-bottom: 8px;
    }

    .title {
        font-size: 1.5rem;
        font-weight: var(--font-weight-bold, 700);
        color: var(--color-text-dark, #333);
        margin: 0 0 6px 0;
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .progress-text {
        font-size: 0.9rem;
        color: var(--color-text-muted, #555);
        margin: 0;
        line-height: 1.4;
    }

    .section-count {
        font-size: 0.9rem;
        font-weight: var(--font-weight-medium);
        color: var(--color-text-muted);
        background-color: #f7f7f7;
        padding: 5px 10px;
        border-radius: 6px;
        align-self: flex-start;
        display: inline-flex;
        align-items: baseline;
        gap: 5px;
        border: 1px solid #eee;
    }
    .section-label {
        font-size: 0.8rem;
        color: #888;
    }
    .section-number {
        font-weight: var(--font-weight-bold);
        color: var(--color-secondary);
        font-size: 1rem;
    }

    .progress-bar-container {
        height: 8px;
        background-color: var(--color-border-light, #f0f0f0);
        border-radius: 4px;
        overflow: hidden;
        margin: 20px 0 20px 0;
    }

    .progress-bar {
        height: 100%;
        background: linear-gradient(
            to bottom,
            var(--color-soft-blue, #a1c4fd),
            var(--color-purple-hover, #c2e9fb)
        );
        border-radius: 4px;
        transition: width 0.6s cubic-bezier(0.25, 1, 0.5, 1);
    }

    .bottom-section {
        margin-top: 20px;
        text-align: center;
    }

    .action-button {
        width: 100%;
        padding: 12px 20px;
        border: none;
        border-radius: var(--spacing-border-radius-button, 20px);
        background: linear-gradient(
            to bottom,
            rgb(161, 132, 194),
            rgb(164, 182, 216)
        );
        color: var(--color-text-light, #fff);
        font-weight: var(--font-weight-semi-bold, 600);
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 5px rgba(160, 160, 200, 0.2);
    }
    .action-button:hover {
        filter: brightness(1.1);
        box-shadow: 0 4px 12px rgba(160, 160, 200, 0.3);
        transform: translateY(-2px);
    }
    .action-button:active {
        filter: brightness(0.95);
        transform: translateY(0);
    }

    .action-button.locked-btn {
        background: #ccc;
        cursor: not-allowed;
        box-shadow: none;
    }
    .action-button.locked-btn:hover {
        transform: none;
        box-shadow: none;
    }

    @media (max-width: 480px) {
        .title {
            font-size: 1.1rem;
            min-height: calc(1.1rem * 1.35 * 2);
        }
        .icon-container {
            width: 70px;
            height: 70px;
        }
        .info-wrapper {
            min-height: 60px;
        }
        .section-count {
            font-size: 0.8rem;
        }
        .section-number {
            font-size: 0.9rem;
        }
        .action-button {
            font-size: 0.9rem;
            padding: 10px 15px;
        }
        .progress-text {
            font-size: 0.85rem;
        }
    }
</style>
