<script>
    import { onMount } from "svelte";
    import {
        getBonuses,
        buyBonus,
        createBonus,
        updateBonus,
        deleteBonus,
    } from "../api/bonusApi.js";
    import { getLearningStats } from "../api/progressApi.js";
    import { addNotification } from "../stores/notifications.js";
    import { user } from "../stores/user.js";
    import { fade } from "svelte/transition";
    import BonusFormModal from "../components/admin/BonusFormModal.svelte";

    let bonuses = [];
    let userCoins = 0;
    let activeTab = "video"; // video, copybook, avatar_frame
    let isLoading = true;
    let isTeacher = false;
    let showModal = false;
    let selectedBonus = null;

    user.subscribe((value) => {
        isTeacher = value.role === "teacher" || value.role === "admin";
    });

    async function loadData() {
        try {
            const [bonusesData, statsData] = await Promise.all([
                getBonuses(),
                getLearningStats(),
            ]);
            bonuses = Array.isArray(bonusesData) ? bonusesData : [];
            userCoins = statsData.coins;
        } catch (error) {
            console.error(error);
            addNotification("Ошибка загрузки данных", "error");
        } finally {
            isLoading = false;
        }
    }

    onMount(loadData);

    async function handleBuy(bonus) {
        if (userCoins < bonus.price) {
            addNotification("Недостаточно монет", "error");
            return;
        }

        try {
            const result = await buyBonus(bonus.id);
            userCoins = result.coins;

            const updatedBonuses = await getBonuses();
            bonuses = Array.isArray(updatedBonuses) ? updatedBonuses : [];

            addNotification("Бонус успешно куплен!", "success");
        } catch (error) {
            console.error(error);
            addNotification(error.message || "Ошибка покупки", "error");
        }
    }

    function openCreateModal() {
        selectedBonus = null;
        showModal = true;
    }

    function openEditModal(bonus) {
        selectedBonus = bonus;
        showModal = true;
    }

    async function handleSave(event) {
        const formData = event.detail;
        try {
            if (selectedBonus) {
                await updateBonus(selectedBonus.id, formData);
                addNotification("Бонус обновлен", "success");
            } else {
                await createBonus(formData);
                addNotification("Бонус создан", "success");
            }
            showModal = false;
            await loadData();
        } catch (error) {
            addNotification(error.message || "Ошибка сохранения", "error");
        }
    }

    async function handleDelete(bonus) {
        if (!confirm(`Вы уверены, что хотите удалить бонус "${bonus.title}"?`))
            return;

        try {
            await deleteBonus(bonus.id);
            addNotification("Бонус удален", "success");
            await loadData();
        } catch (error) {
            addNotification(error.message || "Ошибка удаления", "error");
        }
    }
</script>

<div class="page-container">
    <div class="header-section">
        <h1>Магазин бонусов</h1>
        <div class="header-controls">
            <div class="coin-balance">
                <span class="coin-icon">🪙</span>
                <span class="coin-amount">{userCoins}</span>
            </div>
            {#if isTeacher}
                <button class="create-btn" on:click={openCreateModal}
                    >+ Добавить бонус</button
                >
            {/if}
        </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
        <button
            class:active={activeTab === "video"}
            on:click={() => (activeTab = "video")}>Видео</button
        >
        <button
            class:active={activeTab === "copybook"}
            on:click={() => (activeTab = "copybook")}>Прописи</button
        >
        <button
            class:active={activeTab === "avatar_frame"}
            on:click={() => (activeTab = "avatar_frame")}>Рамки</button
        >
    </div>

    <!-- Content -->
    {#if isLoading}
        <div class="loading">Загрузка...</div>
    {:else if activeTab === "video"}
        <div class="bonus-grid" in:fade>
            {#each bonuses.filter((b) => b.bonus_type === "video") as bonus (bonus.id)}
                <div class="bonus-card">
                    {#if isTeacher}
                        <div class="admin-controls">
                            <button
                                class="edit-btn"
                                on:click={() => openEditModal(bonus)}>✎</button
                            >
                            <button
                                class="delete-btn"
                                on:click={() => handleDelete(bonus)}>🗑</button
                            >
                        </div>
                    {/if}
                    <div class="card-content">
                        <h3>{bonus.title}</h3>
                        <p>{bonus.description || ""}</p>
                        {#if bonus.is_purchased || isTeacher}
                            {#if bonus.is_purchased}<div
                                    class="purchased-badge"
                                >
                                    Куплено
                                </div>{/if}
                            {#if bonus.video_url}
                                <video
                                    controls
                                    src={bonus.video_url}
                                    class="preview-video"
                                >
                                    <track kind="captions" />
                                </video>
                            {:else}
                                <div class="video-placeholder">
                                    Видео доступно (ссылка не найдена)
                                </div>
                            {/if}
                        {:else}
                            <div class="price-tag">{bonus.price} 🪙</div>
                            <button
                                class="buy-btn"
                                on:click={() => handleBuy(bonus)}>Купить</button
                            >
                        {/if}
                    </div>
                </div>
            {/each}
            {#if bonuses.filter((b) => b.bonus_type === "video").length === 0}
                <p>Нет доступных видео-бонусов.</p>
            {/if}
        </div>
    {:else}
        <div class="placeholder-section" in:fade>
            <h2>В разработке</h2>
            <p>Этот раздел скоро появится!</p>
        </div>
    {/if}
</div>

<BonusFormModal
    isOpen={showModal}
    bonus={selectedBonus}
    on:close={() => (showModal = false)}
    on:save={handleSave}
/>

<style>
    .page-container {
        max-width: var(--max-width-page);
        margin: 0 auto;
        padding: var(--spacing-padding-page);
        padding-top: 100px;
        min-height: var(--min-height-page);
    }

    .header-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-margin-bottom-large);
        flex-wrap: wrap;
        gap: 20px;
    }

    .header-controls {
        display: flex;
        gap: 15px;
        align-items: center;
    }

    h1 {
        font-family: var(--font-family-primary);
        font-size: var(--font-size-h1);
        color: var(--color-text-dark);
        margin: 0;
    }

    .coin-balance {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--color-bg-light);
        padding: 10px 20px;
        border-radius: var(--spacing-border-radius-button);
        box-shadow: 0 4px 10px var(--color-shadow);
        font-size: 1.2rem;
        font-weight: var(--font-weight-bold);
        color: var(--color-text-dark);
    }

    .coin-icon {
        font-size: 1.5rem;
    }

    .create-btn {
        background: var(--color-primary);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: var(--spacing-border-radius-button);
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 10px var(--color-shadow);
    }

    .tabs {
        display: flex;
        gap: 10px;
        margin-bottom: var(--spacing-margin-bottom-large);
        border-bottom: 1px solid var(--color-border-light);
        padding-bottom: 10px;
        overflow-x: auto;
    }

    .tabs button {
        background: none;
        border: none;
        padding: 10px 20px;
        font-family: var(--font-family-primary);
        font-size: 1.1rem;
        font-weight: var(--font-weight-medium);
        color: var(--color-text-muted);
        cursor: pointer;
        border-radius: var(--spacing-border-radius-button);
        transition: all 0.3s ease;
    }

    .tabs button:hover {
        background: var(--color-bg-ultra-light);
        color: var(--color-primary);
    }

    .tabs button.active {
        background: var(--color-primary);
        color: white;
        box-shadow: 0 4px 10px var(--color-shadow);
    }

    .bonus-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 30px;
    }

    .bonus-card {
        background: var(--color-bg-light);
        border-radius: var(--spacing-border-radius-card);
        box-shadow: 0 10px 20px var(--color-shadow);
        overflow: hidden;
        transition:
            transform 0.3s ease,
            box-shadow 0.3s ease;
        display: flex;
        flex-direction: column;
        position: relative;
    }

    .bonus-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 30px var(--color-shadow-hover);
    }

    .admin-controls {
        position: absolute;
        top: 10px;
        right: 10px;
        display: flex;
        gap: 5px;
        z-index: 10;
    }

    .edit-btn,
    .delete-btn {
        background: rgba(255, 255, 255, 0.9);
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    }

    .delete-btn {
        color: var(--color-danger-red);
    }

    .card-content {
        padding: 20px;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }

    .bonus-card h3 {
        margin: 0 0 10px 0;
        font-family: var(--font-family-primary);
        font-size: 1.3rem;
        color: var(--color-text-dark);
        padding-right: 60px;
    }

    .bonus-card p {
        color: var(--color-text-muted);
        font-size: 0.95rem;
        line-height: 1.5;
        margin-bottom: 20px;
        flex-grow: 1;
    }

    .price-tag {
        font-size: 1.2rem;
        font-weight: bold;
        color: var(--color-primary-dark);
        margin-bottom: 15px;
    }

    .buy-btn {
        background: linear-gradient(
            135deg,
            var(--color-primary) 0%,
            var(--color-secondary) 100%
        );
        color: white;
        border: none;
        padding: 12px;
        border-radius: var(--spacing-border-radius-button);
        font-weight: bold;
        cursor: pointer;
        transition: transform 0.2s;
        width: 100%;
    }

    .buy-btn:hover {
        transform: scale(1.02);
        filter: brightness(1.1);
    }

    .purchased-badge {
        background: var(--color-success);
        color: white;
        padding: 8px 15px;
        border-radius: 20px;
        display: inline-block;
        font-weight: bold;
        margin-bottom: 15px;
        align-self: flex-start;
    }

    .preview-video {
        width: 100%;
        border-radius: var(--spacing-border-radius-block);
        margin-top: 10px;
        background: black;
    }

    .video-placeholder {
        background: #eee;
        padding: 20px;
        text-align: center;
        border-radius: var(--spacing-border-radius-block);
        color: #777;
    }

    .placeholder-section {
        text-align: center;
        padding: 50px;
        background: var(--color-bg-light);
        border-radius: var(--spacing-border-radius-card);
        box-shadow: 0 10px 20px var(--color-shadow);
    }

    .placeholder-section h2 {
        color: var(--color-secondary);
        margin-bottom: 10px;
    }

    .loading {
        text-align: center;
        font-size: 1.5rem;
        color: var(--color-text-muted);
        padding: 50px;
    }

    @media (max-width: 768px) {
        .header-section {
            flex-direction: column;
            align-items: flex-start;
        }

        .tabs {
            padding-bottom: 5px;
        }
    }
</style>
