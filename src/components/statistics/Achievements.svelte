<script>
  import { onMount } from "svelte";
  import { api } from "../../api/api";
  import { API_BASE_URL } from "../../config.js";
  import { user } from "../../stores/user.js";
  import IconButton from "../ui/IconButton.svelte";
  import Modal from "../ui/Modal.svelte";
  import AchievementEditor from "../admin/AchievementEditor.svelte";
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";
  import {
    faTrophy,
    faPen,
    faTrash,
    faPlus,
    faLock,
    faCheckCircle,
    faStar,
  } from "@fortawesome/free-solid-svg-icons";

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

<div class="achievements-wrapper">
  <div class="header">
    <h2 class="section-title">Достижения</h2>
    {#if isAdmin}
      <button class="btn-add" on:click={openCreate} title="Добавить достижение">
        <FontAwesomeIcon icon={faPlus} />
      </button>
    {/if}
  </div>

  {#if loading}
    <div class="state-container">
      <div class="spinner"></div>
    </div>
  {:else if error}
    <div class="state-container error">
      <p>{error}</p>
      <button class="btn-retry" on:click={loadAchievements}>Повторить</button>
    </div>
  {:else if achievements.length === 0}
    <div class="state-container empty">
      <div class="empty-icon">
        <FontAwesomeIcon icon={faTrophy} />
      </div>
      <p>Нет достижений</p>
      {#if isAdmin}
        <button class="btn-primary" on:click={openCreate}>
          Создать первое
        </button>
      {/if}
    </div>
  {:else}
    <div class="achievements-list">
      {#each achievements as achievement}
        <div
          class="achievement-item"
          class:unlocked={achievement.is_unlocked || isAdmin}
          class:locked={!achievement.is_unlocked && !isAdmin}
        >
          <div class="icon-container">
            {#if achievement.icon}
              <img src={achievement.icon} alt={achievement.title} />
            {:else}
              <FontAwesomeIcon icon={faTrophy} class="default-icon" />
            {/if}
            {#if !achievement.is_unlocked && !isAdmin}
              <div class="lock-overlay">
                <FontAwesomeIcon icon={faLock} />
              </div>
            {/if}
          </div>

          <div class="content-container">
            <div class="title-row">
              <h3 class="achievement-title">{achievement.title}</h3>
              {#if achievement.is_unlocked}
                <FontAwesomeIcon icon={faCheckCircle} class="check-icon" />
              {/if}
            </div>

            <p class="achievement-desc">{achievement.description}</p>

            <div class="meta-row">
              <span class="xp-badge">
                +{achievement.xp_reward} XP
              </span>
              {#if achievement.is_unlocked}
                <span class="date-text">
                  {new Date(achievement.awarded_at).toLocaleDateString()}
                </span>
              {/if}
            </div>
          </div>

          {#if isAdmin}
            <div class="admin-actions">
              <button
                class="icon-btn"
                on:click={() => openEdit(achievement.id)}
              >
                <FontAwesomeIcon icon={faPen} />
              </button>
              <button
                class="icon-btn delete"
                on:click={() => deleteAchievement(achievement.id)}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
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
      width={600}
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
  .achievements-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-family: "Play", sans-serif;
    font-size: 1.5rem;
    font-weight: 400;
    color: var(--color-text-dark);
    margin: 0;
  }

  .btn-add {
    background: linear-gradient(
      to right,
      var(--color-auth-button-gradient-start),
      var(--color-auth-button-gradient-end)
    );
    color: white;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }

  .btn-add:hover {
    transform: scale(1.1);
  }

  .state-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: var(--color-text-muted);
    text-align: center;
    flex-grow: 1;
  }

  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid var(--color-bg-ultra-light);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .empty-icon {
    font-size: 2.5rem;
    color: var(--color-border-light);
    margin-bottom: 1rem;
  }

  .achievements-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    max-height: 600px; /* Prevent infinite growth */
    padding-right: 4px; /* Space for scrollbar */
  }

  .achievements-list::-webkit-scrollbar {
    width: 4px;
  }

  .achievements-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .achievements-list::-webkit-scrollbar-thumb {
    background: var(--color-border-light);
    border-radius: 4px;
  }

  .achievement-item {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-bg-ultra-light);
    border-radius: var(--spacing-border-radius-block);
    border: 1px solid transparent;
    transition: all 0.2s ease;
    position: relative;
  }

  .achievement-item.unlocked {
    background: white;
    border-color: var(--color-primary-light, #e0e7ff);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  }

  .achievement-item.locked {
    opacity: 0.7;
    filter: grayscale(0.8);
  }

  .achievement-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    z-index: 1;
  }

  .icon-container {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    background: white;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    font-size: 1.2rem;
    color: var(--color-text-muted);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .achievement-item.unlocked .icon-container {
    color: var(--color-primary);
    background: var(--color-bg-ultra-light);
  }

  .icon-container img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 12px;
  }

  .lock-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    font-size: 1rem;
    color: var(--color-text-muted);
  }

  .content-container {
    flex-grow: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .achievement-title {
    font-family: var(--font-family-primary);
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-dark);
    margin: 0;
    line-height: 1.2;
  }

  .check-icon {
    color: var(--color-success);
    font-size: 0.9rem;
  }

  .achievement-desc {
    font-family: var(--font-family-secondary);
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin: 0 0 0.5rem 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .meta-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.75rem;
  }

  .xp-badge {
    font-weight: 600;
    color: var(--color-primary);
    background: var(--color-bg-admin-button);
    padding: 2px 8px;
    border-radius: 10px;
  }

  .date-text {
    color: var(--color-text-muted);
  }

  .admin-actions {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .achievement-item:hover .admin-actions {
    opacity: 1;
  }

  .icon-btn {
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .icon-btn:hover {
    background: var(--color-bg-ultra-light);
    color: var(--color-primary);
  }

  .icon-btn.delete:hover {
    color: var(--color-danger-red);
  }

  .btn-primary,
  .btn-retry {
    background: linear-gradient(
      to right,
      var(--color-auth-button-gradient-start),
      var(--color-auth-button-gradient-end)
    );
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: var(--spacing-border-radius-button);
    font-family: var(--font-family-primary);
    font-weight: 600;
    cursor: pointer;
    margin-top: 1rem;
  }

  @media (max-width: 768px) {
    .admin-actions {
      opacity: 1;
      flex-direction: row;
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
    }
  }
</style>
