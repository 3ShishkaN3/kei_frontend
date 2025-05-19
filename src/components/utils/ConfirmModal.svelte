<script>
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import CloseIcon from 'svelte-material-icons/Close.svelte';
    import AlertCircleOutlineIcon from 'svelte-material-icons/AlertCircleOutline.svelte'; // Иконка для предупреждения

    export let isOpen = false;
    export let title = "Подтверждение";
    export let message = "Вы уверены, что хотите выполнить это действие?";
    export let confirmButtonText = "Да, удалить";
    export let cancelButtonText = "Отмена";
    export let confirmButtonClass = "confirm-btn-danger"; // Класс для кнопки подтверждения (например, для красного цвета)
    export let isLoading = false; // Если нужно показывать загрузку на кнопке подтверждения

    const dispatch = createEventDispatcher();

    function handleConfirm() {
        dispatch('confirm');
    }

    function handleCancel() {
        dispatch('cancel');
    }

    function handleGlobalKeydown(event) {
        if (isOpen) {
            if (event.key === 'Escape') {
                handleCancel();
            } else if (event.key === 'Enter' && !isLoading) {
                // По Enter можно подтверждать, если фокус не на другой кнопке
                // Для простоты, если активно модальное окно, Enter подтверждает
                handleConfirm();
            }
        }
    }

    onMount(() => {
        window.addEventListener('keydown', handleGlobalKeydown);
    });

    onDestroy(() => {
        window.removeEventListener('keydown', handleGlobalKeydown);
    });
</script>

{#if isOpen}
<div class="confirm-modal-backdrop" on:click|self={handleCancel} transition:fade="{{duration: 200}}">
    <div class="confirm-modal-content" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" transition:fly="{{y: -30, duration: 300}}">
        <button class="close-button" on:click={handleCancel} aria-label="Закрыть">
            <CloseIcon size="22px" />
        </button>
        <div class="modal-header">
            <AlertCircleOutlineIcon size="28px" class="warning-icon"/>
            <h3 id="confirm-modal-title">{title}</h3>
        </div>
        <p class="modal-message">{message}</p>
        <div class="modal-actions">
            <button type="button" class="cancel-btn" on:click={handleCancel} disabled={isLoading}>
                {cancelButtonText}
            </button>
            <button type="button" class="confirm-btn {confirmButtonClass}" on:click={handleConfirm} disabled={isLoading}>
                {#if isLoading}
                    <span class="spinner"></span> Загрузка...
                {:else}
                    {confirmButtonText}
                {/if}
            </button>
        </div>
    </div>
</div>
{/if}

<style>
    .confirm-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1200; /* Выше чем SimpleInputModal и NotificationsContainer */
        padding: 20px;
        box-sizing: border-box;
    }
    .confirm-modal-content {
        background: var(--color-bg-light, white);
        padding: 25px 30px;
        border-radius: var(--spacing-border-radius-block, 12px);
        width: 100%;
        max-width: 480px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        position: relative;
        text-align: center;
    }
    .modal-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-bottom: 15px;
    }
    .warning-icon {
        color: var(--color-danger-red, #ff4d4d);
    }
    #confirm-modal-title {
        margin: 0;
        color: var(--color-text-dark, #333);
        font-size: 1.3rem;
        font-weight: var(--font-weight-bold);
    }
    .close-button {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
        color: var(--color-text-muted, #777);
        line-height: 1;
        transition: color 0.2s;
    }
    .close-button:hover { color: var(--color-text-dark, #333); }

    .modal-message {
        font-size: 1rem;
        color: var(--color-text-muted, #555);
        margin-bottom: 25px;
        line-height: 1.6;
    }
    .modal-actions {
        margin-top: 20px;
        display: flex;
        justify-content: center; /* Центрируем кнопки */
        gap: 15px;
    }
    .modal-actions button {
        padding: 10px 20px;
        border-radius: var(--spacing-border-radius-button, 20px);
        border: none;
        cursor: pointer;
        font-weight: var(--font-weight-semi-bold);
        transition: background-color 0.2s, opacity 0.2s;
        font-size: 0.95rem;
        min-width: 120px;
    }
    .cancel-btn {
        background-color: var(--color-bg-ultra-light, #f0f0f0);
        color: var(--color-text-dark, #333);
        border: 1px solid var(--color-border-light, #ddd);
    }
    .cancel-btn:hover { background-color: #e0e0e0; }

    .confirm-btn {
        color: var(--color-text-light, white);
    }
    .confirm-btn.confirm-btn-danger {
        background-color: var(--color-danger-red, #ff4d4d);
    }
    .confirm-btn.confirm-btn-danger:hover:not(:disabled) {
        background-color: #e63939; /* Darker red */
    }
    /* Другие стили для confirm-btn, если нужны (например, primary) */
    .confirm-btn.confirm-btn-primary {
        background-color: var(--color-primary, #AFA4FF);
    }
     .confirm-btn.confirm-btn-primary:hover:not(:disabled) {
        background-color: var(--color-primary-dark, #9d92f7);
    }

    .confirm-btn:disabled {
        background-color: #cccccc;
        opacity: 0.7;
        cursor: not-allowed;
    }
    .spinner {
        display: inline-block;
        width: 1em;
        height: 1em;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 1s ease-in-out infinite;
        vertical-align: text-bottom; /* Или middle */
        margin-right: 8px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
</style>