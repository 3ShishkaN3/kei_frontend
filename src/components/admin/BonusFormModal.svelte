<script>
    import { createEventDispatcher } from "svelte";
    import { fade, scale } from "svelte/transition";

    export let bonus = null;
    export let isOpen = false;

    const dispatch = createEventDispatcher();

    let title = "";
    let description = "";
    let price = 100;
    let bonusType = "video";
    let videoFile = null;
    let isLoading = false;
    let error = "";

    $: if (isOpen && bonus) {
        title = bonus.title;
        description = bonus.description;
        price = bonus.price;
        bonusType = bonus.bonus_type;
    } else if (isOpen && !bonus) {
        title = "";
        description = "";
        price = 100;
        bonusType = "video";
        videoFile = null;
    }

    function handleFileChange(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            videoFile = files[0];
        }
    }

    async function handleSubmit() {
        if (!title || !price) {
            error = "Заполните обязательные поля";
            return;
        }

        isLoading = true;
        error = "";

        try {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("description", description);
            formData.append("price", price);
            formData.append("bonus_type", bonusType);

            if (videoFile) {
                formData.append("video_file", videoFile);
            }

            dispatch("save", formData);
        } catch (err) {
            error = err.message;
        } finally {
            isLoading = false;
        }
    }

    function close() {
        dispatch("close");
    }
</script>

{#if isOpen}
    <div class="modal-backdrop" on:click={close} transition:fade>
        <div class="modal-content" on:click|stopPropagation transition:scale>
            <h2>{bonus ? "Редактировать бонус" : "Создать бонус"}</h2>

            <div class="form-group">
                <label for="title">Название</label>
                <input
                    type="text"
                    id="title"
                    bind:value={title}
                    placeholder="Название бонуса"
                />
            </div>

            <div class="form-group">
                <label for="description">Описание</label>
                <textarea
                    id="description"
                    bind:value={description}
                    placeholder="Описание"
                ></textarea>
            </div>

            <div class="form-group">
                <label for="price">Цена (монет)</label>
                <input type="number" id="price" bind:value={price} min="0" />
            </div>

            <div class="form-group">
                <label for="type">Тип</label>
                <select id="type" bind:value={bonusType}>
                    <option value="video">Видео</option>
                    <option value="copybook">Прописи</option>
                    <option value="avatar_frame">Рамка</option>
                </select>
            </div>

            {#if bonusType === "video"}
                <div class="form-group">
                    <label for="video">Видео файл</label>
                    <input
                        type="file"
                        id="video"
                        accept="video/*"
                        on:change={handleFileChange}
                    />
                    {#if bonus && bonus.video_url && !videoFile}
                        <p class="file-hint">
                            Текущее видео загружено. Загрузите новое, чтобы
                            заменить.
                        </p>
                    {/if}
                </div>
            {/if}

            {#if error}
                <div class="error">{error}</div>
            {/if}

            <div class="actions">
                <button class="cancel-btn" on:click={close} disabled={isLoading}
                    >Отмена</button
                >
                <button
                    class="save-btn"
                    on:click={handleSubmit}
                    disabled={isLoading}
                >
                    {isLoading ? "Сохранение..." : "Сохранить"}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-content {
        background: white;
        padding: 30px;
        border-radius: var(--spacing-border-radius-card);
        width: 90%;
        max-width: 500px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    h2 {
        margin-top: 0;
        color: var(--color-text-dark);
        margin-bottom: 20px;
    }

    .form-group {
        margin-bottom: 15px;
    }

    label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
        color: var(--color-text-dark);
    }

    input,
    textarea,
    select {
        width: 100%;
        padding: 10px;
        border: 1px solid var(--color-border-light);
        border-radius: 8px;
        font-family: inherit;
    }

    textarea {
        resize: vertical;
        min-height: 80px;
    }

    .actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
    }

    .save-btn {
        background: var(--color-primary);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
    }

    .cancel-btn {
        background: #eee;
        color: #333;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
    }

    .error {
        color: var(--color-danger-red);
        margin-top: 10px;
        font-size: 0.9rem;
    }

    .file-hint {
        font-size: 0.8rem;
        color: #666;
        margin-top: 5px;
    }
</style>
