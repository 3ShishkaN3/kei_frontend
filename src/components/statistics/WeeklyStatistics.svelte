<script>
  import { onMount } from 'svelte';
  import { getDailyStats } from '../../api/progressApi.js';
  import { user as userStore } from '../../stores/user.js';

  let currentPeriod = 'week'; // 'week' или 'month'
  let dailyStats = [];
  let isLoading = true;
  let maxLessons = 0;
  let isTransitioning = false;
  let hoveredItem = null;
  let tooltipX = 0;
  let tooltipY = 0;
  let currentUser = null;

  userStore.subscribe((u) => {
    currentUser = u && u.isAuthenticated ? { role: u.role } : null;
  });

  $: periodLabel = currentPeriod === 'week' ? 'неделю' : 'месяц';
  $: buttonLabel = currentPeriod === 'week' ? 'Неделя' : 'Месяц';

  onMount(async () => {
    await loadStats();
  });

  async function loadStats() {
    isLoading = true;
    try {
      dailyStats = await getDailyStats(currentPeriod);
      maxLessons = Math.max(...dailyStats.map(day => day.completed_lessons), 1);
    } catch (error) {
      console.error('Ошибка при загрузке ежедневной статистики:', error);
    } finally {
      isLoading = false;
    }
  }

  async function togglePeriod() {
    isTransitioning = true;
    
    // Небольшая задержка для анимации
    setTimeout(async () => {
      currentPeriod = currentPeriod === 'week' ? 'month' : 'week';
      await loadStats();
      isTransitioning = false;
    }, 150);
  }

  function getBarHeight(lessons) {
    if (maxLessons === 0) return '0%';
    return `${(lessons / maxLessons) * 100}%`;
  }

  function getSquareColor(lessons) {
    if (lessons === 0) return 'var(--color-bg-ultra-light)';
    
    // Создаем градацию цветов от пастельного оранжевого к пастельному красному
    const intensity = lessons / maxLessons;
    
    if (intensity <= 0.2) return 'var(--color-pastel-yellow)';
    if (intensity <= 0.4) return 'var(--color-pastel-orange)';
    if (intensity <= 0.6) return '#ffcc99'; // переходный цвет
    if (intensity <= 0.8) return '#ff9999'; // переходный цвет  
    return 'var(--color-pastel-red)';
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = today - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дня назад`;
    
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short' 
    });
  }

  function handleMouseEnter(event, item) {
    hoveredItem = item;
    tooltipX = event.clientX;
    tooltipY = event.clientY;
  }

  function handleMouseLeave() {
    hoveredItem = null;
  }

  function handleMouseMove(event) {
    if (hoveredItem) {
      tooltipX = event.clientX;
      tooltipY = event.clientY;
    }
  }

</script>

<svelte:window on:mousemove={handleMouseMove} />

<div class="weekly-stats-container">
  <div class="header">
    <h2 class="title">Статистика за {periodLabel}:</h2>
    <button class="period-toggle" on:click={togglePeriod}>
      {buttonLabel}
    </button>
  </div>

  <div class="stats-content">
    {#if isLoading}
      <div class="loading">Загрузка...</div>
    {:else if isTransitioning}
      <div class="loading">Переключение...</div>
    {:else if currentPeriod === 'week'}
      <!-- Недельный вид - столбцы -->
      <div class="week-view fade-in">
        {#each dailyStats as day, index}
          <div class="day-column" 
               role="button"
               tabindex="0"
               on:mouseenter={(e) => handleMouseEnter(e, day)}
               on:mouseleave={handleMouseLeave}>
            <div class="day-bar">
              <div class="bar-fill" style="height: {getBarHeight(day.completed_lessons)}"></div>
            </div>
            <div class="day-label">{formatDate(day.date).slice(0, 3)}</div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- Месячный вид - сетка -->
      <div class="month-view fade-in">
        <div class="activity-grid">
          {#each dailyStats as day, index}
            <div class="activity-square" 
                 role="button"
                 tabindex="0"
                 style="background-color: {getSquareColor(day.completed_lessons)}"
                 on:mouseenter={(e) => handleMouseEnter(e, day)}
                 on:mouseleave={handleMouseLeave}>
            </div>
          {/each}
        </div>
        
        <!-- Легенда -->
        <div class="legend">
          <span class="legend-label">Меньше</span>
          <div class="legend-squares">
            <div class="legend-square" style="background-color: var(--color-bg-ultra-light)"></div>
            <div class="legend-square" style="background-color: var(--color-pastel-yellow)"></div>
            <div class="legend-square" style="background-color: var(--color-pastel-orange)"></div>
            <div class="legend-square" style="background-color: #ffcc99"></div>
            <div class="legend-square" style="background-color: #ff9999"></div>
            <div class="legend-square" style="background-color: var(--color-pastel-red)"></div>
          </div>
          <span class="legend-label">Больше ({maxLessons})</span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Tooltip -->
  {#if hoveredItem}
    <div class="tooltip" style="left: {tooltipX + 10}px; top: {tooltipY - 30}px;">
      <div class="tooltip-date">{formatDate(hoveredItem.date)}</div>
      <div class="tooltip-lessons">
        {hoveredItem.completed_lessons} {hoveredItem.completed_lessons === 1 ? 'урок' : hoveredItem.completed_lessons < 5 ? 'урока' : 'уроков'}
      </div>
    </div>
  {/if}
  </div>

  

<style>
  .weekly-stats-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    background-color: var(--color-bg-light);
    border-radius: var(--spacing-border-radius-card);
    padding: var(--spacing-padding-block);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    font-family: 'Play', sans-serif;
    min-height: 320px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .title {
    font-family: 'Play', sans-serif;
    font-size: 1.5rem;
    font-weight: 400;
    color: var(--color-text-dark);
    margin: 0;
  }

  .period-toggle {
    background: linear-gradient(to right, var(--color-auth-button-gradient-start), var(--color-auth-button-gradient-end));
    color: var(--color-auth-button-text);
    border: none;
    padding: 8px 16px;
    border-radius: var(--spacing-border-radius-button);
    font-weight: var(--font-weight-bold);
    cursor: pointer;
    transition: all var(--animation-duration-transition) ease;
    font-size: 0.9rem;
  }

  .period-toggle:hover {
    background: linear-gradient(to right, var(--color-auth-button-gradient-hover-start), var(--color-auth-button-gradient-hover-end));
  }

  .stats-content {
    min-height: 175px;
    position: relative;
  }

  /* Анимации переходов */
  .fade-in {
    animation: fadeIn 0.4s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .loading {
    text-align: center;
    color: var(--color-text-muted);
    padding: 2rem;
  }

  /* Недельный вид */
  .week-view {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    height: 200px;
    gap: 8px;
  }

  .day-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    outline: none;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .day-column:focus {
    box-shadow: 0 0 0 2px var(--color-primary);
  }

  .day-bar {
    width: 100%;
    height: 150px;
    background-color: var(--color-bg-ultra-light);
    border-radius: 4px;
    position: relative;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .bar-fill {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, var(--color-pastel-blue), var(--color-pastel-purple));
    transition: height 0.3s ease;
    border-radius: 4px;
  }

  .day-label {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    text-align: center;
  }

  /* Месячный вид */
  .month-view {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: visible;
  }

  .activity-grid {
    display: grid;
    grid-template-columns: repeat(11, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 5px;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    contain: layout;
    isolation: isolate;
  }

  .activity-square {
    width: 18px;
    height: 18px;
    border-radius: 3px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    /* transform: scale(1); */
    transform-origin: center;
    will-change: transform;
    contain: layout style;
  }

  .activity-square:hover {
    transform: scale(1.15);
    border: 1px solid var(--color-text-muted);
    z-index: 100;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    position: relative;
  }

  .activity-square:focus {
    outline: none;
    transform: scale(1.15);
    box-shadow: 0 0 0 2px var(--color-primary);
    z-index: 100;
    position: relative;
  }

  /* Увеличенный размер для больших экранов */
  @media (min-width: 1200px) {
    .activity-grid {
      max-width: 1800px;
      gap: 15px;
      padding: 52px;
    }
  }

  /* Еще больше для очень широких экранов */
  @media (min-width: 1600px) {
    .activity-grid {
      max-width: 2200px;
      gap: 22px;
      padding: 60px;
    }
  }

  .legend {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .legend-squares {
    display: flex;
    gap: 2px;
  }

  .legend-square {
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }

  .legend-label {
    font-size: 0.75rem;
  }

  /* Ensure stats container stays responsive (existing rules kept) */
  .weekly-stats-container { width: 100%; box-sizing: border-box; }


  /* Tooltip */
  .tooltip {
    position: fixed;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.8rem;
    pointer-events: none;
    z-index: 1000;
    white-space: nowrap;
  }

  .tooltip-date {
    font-weight: bold;
    margin-bottom: 2px;
  }

  .tooltip-lessons {
    color: #ccc;
  }


  /* Адаптивность */
  @media (max-width: 768px) {
    .weekly-stats-container {
      padding: 1rem;
    }

    .header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .title {
      font-size: 1.3rem;
    }

    .week-view {
      height: 150px;
      gap: 4px;
    }

    .day-bar {
      height: 120px;
    }

    .activity-grid {
      max-width: 450px;
      padding: 15px;
    }

    .activity-square {
      width: 15px;
      height: 15px;
    }
  }

  @media (max-width: 480px) {
    .header {
      align-items: center;
    }

    .title {
      text-align: center;
      font-size: 1.2rem;
    }

    .week-view {
      height: 120px;
      gap: 2px;
    }

    .day-bar {
      height: 100px;
    }

    .day-label {
      font-size: 0.7rem;
    }

    .activity-grid {
      max-width: 350px;
      padding: 10px;
      gap: 3px;
    }

    .activity-square {
      width: 12px;
      height: 12px;
    }

    .legend {
      font-size: 0.7rem;
    }

    .legend-square {
      width: 8px;
      height: 8px;
    }
  }
</style>
