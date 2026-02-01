<script>
    import { createEventDispatcher, onDestroy } from "svelte";
    import Close from "svelte-material-icons/Close.svelte";
    import { fade, fly } from "svelte/transition";
    import { addNotification } from "../../stores/notifications.js";

    export let isOpen = false;
    export let title = "Введите значение";
    export let prompt = "Значение:";
    export let initialValue = "";
    export let inputType = "text";
    export let required = true;
    export let isLoading = false;

    let value = "";
    let inputElement;

    const dispatch = createEventDispatcher();
    function handleKeydown(event) {
        if (event.key === "Escape") {
            handleClose();
        }
    }
    function handleGlobalKeydown(event) {
        if (isOpen && event.key === "Escape") {
            handleClose();
        }
    }
    function autoFocus(node) {
        if (node) {
            node.focus();
        }

        return {
            destroy() {},
        };
    }
    $: if (isOpen) {
        value = initialValue;

        window.addEventListener("keydown", handleGlobalKeydown);
    } else {
        window.removeEventListener("keydown", handleGlobalKeydown);
    }

    onDestroy(() => {
        window.removeEventListener("keydown", handleGlobalKeydown);
    });

    onDestroy(() => {
        window.removeEventListener("keydown", handleKeydown);
    });

    function handleSubmit() {
        if (required && !value.trim()) {
            addNotification("Поле не может быть пустым.", "warning");
            return;
        }
        dispatch("submit", value);
    }

    function handleClose() {
        dispatch("close");
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
    <div class="simple-modal-backdrop" transition:fade={{ duration: 200 }}>
        <div
            class="simple-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            transition:fly={{ y: -20, duration: 300 }}
        >
            <button
                class="close-button"
                on:click={handleClose}
                aria-label="Закрыть"
            >
                <Close size="20px" />
            </button>
            <h3 id="modal-title">{title}</h3>
            <form on:submit|preventDefault={handleSubmit}>
                <label for="simple-input">{prompt}</label>
                {#if inputType === "number"}
                    <input
                        use:autoFocus
                        type="number"
                        id="simple-input"
                        bind:value
                        {required}
                        placeholder="0"
                    />
                {:else}
                    <input
                        use:autoFocus
                        type="text"
                        id="simple-input"
                        bind:value
                        {required}
                        placeholder=""
                    />
                {/if}
                <div class="modal-actions">
                    <button
                        type="button"
                        class="cancel-btn"
                        on:click={handleClose}
                        disabled={isLoading}>Отмена</button
                    >
                    <button type="submit" class="save-btn" disabled={isLoading}>
                        {#if isLoading}
                            <span class="spinner"></span>
                        {:else}
                            Сохранить
                        {/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<style>
    .simple-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.65);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1100;
        padding: 15px;
    }
    .simple-modal-content {
        background: white;
        padding: 25px 30px;
        border-radius: 8px;
        width: 100%;
        max-width: 450px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.25);
        position: relative;
    }
    .close-button {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
        color: #888;
        line-height: 1;
    }
    .close-button:hover {
        color: #333;
    }
    h3 {
        margin-top: 0;
        margin-bottom: 15px;
        color: #333;
        font-size: 1.2rem;
    }
    label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        font-size: 0.9em;
        color: #444;
    }
    input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 0.95em;
        box-sizing: border-box;
        margin-bottom: 20px;
    }
    .modal-actions {
        margin-top: 10px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }
    .modal-actions button {
        padding: 9px 16px;
        border-radius: 5px;
        border: none;
        cursor: pointer;
        font-weight: 600;
        transition: background-color 0.2s;
        font-size: 0.9rem;
    }
    .cancel-btn {
        background-color: #f0f0f0;
        color: #333;
    }
    .cancel-btn:hover {
        background-color: #e0e0e0;
    }
    .save-btn {
        background-color: var(--color-primary);
        color: white;
        min-width: 100px;
    }
    .save-btn:hover {
        background-color: var(--color-primary-dark, #9d92f7);
    }
    .save-btn:disabled {
        background-color: #cccccc;
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
        vertical-align: middle;
        margin-right: 5px;
    }
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
