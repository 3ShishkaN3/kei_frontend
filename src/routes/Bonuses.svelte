<script>
    import { onMount } from "svelte";
    import { getBonuses, buyBonus } from "../api/bonusApi.js";
    import { getLearningStats } from "../api/progressApi.js";
    import { addNotification } from "../stores/notifications.js";
    import { fade } from "svelte/transition";

    let bonuses = [];
    let userCoins = 0;
    let activeTab = "video"; // video, copybook, avatar_frame
    let isLoading = true;

    onMount(async () => {
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
    });

    async function handleBuy(bonus) {
        if (userCoins < bonus.price) {
            addNotification("Недостаточно монет", "error");
            return;
        }

        try {
            const result = await buyBonus(bonus.id);
            userCoins = result.coins; // Update coins from response

            // Update bonus state to purchased
            // We need to re-fetch or manually update. The result might not contain the full bonus object with video_url if the API structure is different.
            // But wait, the buy endpoint returns {'detail': ..., 'coins': ...}. It does NOT return the video_url.
            // So I need to fetch the bonuses again to get the video_url, OR I can just reload the list.
            // Reloading is safer to get the video_url.

            const updatedBonuses = await getBonuses();
            bonuses = Array.isArray(updatedBonuses) ? updatedBonuses : [];

            addNotification("Бонус успешно куплен!", "success");
        } catch (error) {
            console.error(error);
            addNotification(error.message || "Ошибка покупки", "error");
        }
    }
</script>

<div class="page-container">
    <!-- Header with Coins -->
    <div class="header-section">
        <h1>Магазин бонусов</h1>
        <div class="coin-balance">
            <span class="coin-icon">🪙</span>
            <span class="coin-amount">{userCoins}</span>
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
                    <div class="card-content">
                        <h3>{bonus.title}</h3>
                        <p>{bonus.description || ""}</p>
                        {#if bonus.is_purchased}
                            <div class="purchased-badge">Куплено</div>
                            {#if bonus.video_url}
                                <video
                                    controls
                                    src={bonus.video_url}
                                    class="preview-video"
                                ></video>
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

<style>
    .page-container {
        max-width: var(--max-width-page);
        margin: 0 auto;
        padding: var(--spacing-padding-page);
        padding-top: 100px; /* Offset for fixed header */
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
    }

    .bonus-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 30px var(--color-shadow-hover);
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
