<script>
  import { onMount } from "svelte";
  import { api } from "../../api/api";
  import { API_BASE_URL } from "../../config.js";
  import { user } from "../../stores/user.js";
  import IconButton from "../ui/IconButton.svelte";
  import Modal from "../ui/Modal.svelte";
  import AchievementEditor from "../admin/AchievementEditor.svelte";

  let achievements = [];
  let loading = true;
  let error = "";
  let currentUser = null;

  // Modal state
  let showEditor = false;
  let editingId = null;

  user.subscribe((u) => {
    currentUser = u;
  });

  $: isAdmin = currentUser && currentUser.role === "admin";

  async function loadAchievements() {
    loading = true;
    try {
      // Admins use admin endpoint to see all, users use public endpoint
      const endpoint = isAdmin
        ? `${API_BASE_URL}/achievements/admin/achievements/`
        : `${API_BASE_URL}/achievements/achievements/`;

      const response = await api.get(endpoint);
      if (response.ok) {
        try {
          const data = await response.json();
          // Admin endpoint returns paginated result (results array), public might return list or paginated
          achievements = Array.isArray(data) ? data : data.results || [];
        } catch (jsonError) {
          console.error("Failed to parse JSON:", jsonError);
          error = "Ошибка данных сервера";
        }
      } else {
        console.error("API Error:", response.status);
        error = "Ошибка загрузки данных";
      }
    } catch (e) {
      error = "Не удалось загрузить достижения";
      console.error(e);
    } finally {
      loading = false;
    }
  }

  onMount(loadAchievements);

  async function deleteAchievement(id) {
    if (!confirm("Вы уверены, что хотите удалить это достижение?")) return;
    try {
      const response = await api.delete(
        `${API_BASE_URL}/achievements/admin/achievements/${id}/`,
      );
      if (response.ok) {
        achievements = achievements.filter((a) => a.id !== id);
      } else {
        alert("Ошибка удаления");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка соединения");
    }
  }

  function openCreate() {
    editingId = null;
    showEditor = true;
  }

  function openEdit(id) {
    editingId = id;
    showEditor = true;
  }

  function handleSave() {
    showEditor = false;
    loadAchievements();
  }
</script>

<div class="achievements-page">
  <div class="header">
    <h2 class="page-title">Достижения</h2>
    {#if isAdmin}
      <button class="btn-add" on:click={openCreate}>+ Добавить</button>
    {/if}
  </div>

  {#if loading}
    <div class="loading">Загрузка...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if achievements.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🏆</div>
      <p class="empty-text">Пока нет достижений.</p>
      {#if isAdmin}
        <p class="empty-subtext">
          Создайте первое достижение, чтобы мотивировать учеников!
        </p>
        <button class="btn-primary" on:click={openCreate}
          >Создать достижение</button
        >
      {/if}
    </div>
  {:else}
    <div class="achievements-grid">
      {#each achievements as achievement}
        <div
          class="achievement-card"
          class:unlocked={achievement.is_unlocked || isAdmin}
        >
          <div class="achievement-icon">
            {#if achievement.icon}
              <img src={achievement.icon} alt={achievement.title} />
            {:else}
              <div class="default-icon">🏆</div>
            {/if}
          </div>
          <div class="achievement-info">
            <h3 class="achievement-title">{achievement.title}</h3>
            <p class="achievement-desc">{achievement.description}</p>
            <div class="achievement-meta">
              <span class="xp-badge">+{achievement.xp_reward} XP</span>
              {#if achievement.is_unlocked}
                <span class="date-badge"
                  >Получено: {new Date(
                    achievement.awarded_at,
                  ).toLocaleDateString()}</span
                >
              {/if}
            </div>
          </div>
          {#if isAdmin}
            <div class="admin-actions">
              <IconButton
                title="Редактировать"
                on:click={() => openEdit(achievement.id)}
                size={24}>✎</IconButton
              >
              <IconButton
                title="Удалить"
                on:click={() => deleteAchievement(achievement.id)}
                size={24}
                color="var(--color-danger)">🗑</IconButton
              >
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if showEditor}
    <Modal
      open={showEditor}
      title={editingId ? "Редактирование" : "Создание достижения"}
      onClose={() => (showEditor = false)}
      width="90vw"
    >
      <AchievementEditor
        id={editingId}
        on:save={handleSave}
        on:cancel={() => (showEditor = false)}
      />
    </Modal>
  {/if}
</div>

<style>
  .achievements-page {
    padding: var(--spacing-padding-block);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-margin-bottom-medium);
  }

  .page-title {
    font-family: var(--font-family-primary);
    font-size: 1.5rem;
    color: var(--color-text-dark);
    margin: 0;
  }

  .btn-add,
  .btn-primary {
    background: linear-gradient(
      90deg,
      var(--color-auth-button-gradient-start),
      var(--color-auth-button-gradient-end)
    );
    color: var(--color-auth-button-text);
    border: none;
    padding: 8px 16px;
    border-radius: var(--spacing-border-radius-button);
    cursor: pointer;
    font-family: var(--font-family-primary);
    font-weight: var(--font-weight-medium);
    transition: all 0.3s ease;
  }

  .btn-add:hover,
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    background: var(--color-bg-light);
    border-radius: var(--spacing-border-radius-card);
    text-align: center;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 1.2rem;
    color: var(--color-text-dark);
    margin-bottom: 0.5rem;
  }

  .empty-subtext {
    color: var(--color-text-muted);
    margin-bottom: 1.5rem;
  }

  .achievements-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--spacing-gap-medium);
  }

  .achievement-card {
    background: var(--color-bg-light);
    border: 1px solid var(--color-block-border);
    border-radius: var(--spacing-border-radius-card);
    padding: var(--spacing-padding-block);
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-gap-medium);
    transition: var(--block-shadow-transition);
    opacity: 0.7;
    filter: grayscale(1);
    position: relative;
  }

  .achievement-card.unlocked {
    opacity: 1;
    filter: none;
    box-shadow: 0 4px 12px var(--color-shadow);
    border-color: var(--color-primary);
  }

  .achievement-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px var(--color-shadow-hover);
  }

  .achievement-icon {
    width: 60px;
    height: 60px;
    flex-shrink: 0;
    background: var(--color-bg-ultra-light);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    overflow: hidden;
  }

  .achievement-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .achievement-info {
    flex-grow: 1;
  }

  .achievement-title {
    font-family: var(--font-family-primary);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-dark);
    margin: 0 0 5px 0;
    font-size: 1.1rem;
  }

  .achievement-desc {
    font-family: var(--font-family-secondary);
    color: var(--color-text-muted);
    font-size: 0.9rem;
    margin: 0 0 10px 0;
    line-height: 1.4;
  }

  .achievement-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .xp-badge {
    background: var(--color-primary-light, #e0e7ff);
    color: var(--color-primary-dark);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: bold;
  }

  .date-badge {
    background: var(--color-success-bg);
    color: var(--color-success);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
  }

  .admin-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-left: auto;
  }

  .loading,
  .error {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-muted);
  }
</style>
