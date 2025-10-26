<script>
  import { onMount } from 'svelte';
  import { getCourseProgress } from '../../api/progressApi.js';
  import { user } from '../../stores/user.js';
  import DoughnutChart from './DoughnutChart.svelte';
  import CourseSelectionModal from './CourseSelectionModal.svelte';

  let currentUser;
  user.subscribe(value => currentUser = value);

  let coursesProgress = [];
  let selectedCourseIds = [];
  let aggregatedProgress = null;
  let isLoading = true;
  let showModal = false;

    onMount(async () => {
    try {
      const response = await getCourseProgress();
      const progressData = response.results || response; // Handle cases where data is nested
      if (progressData && progressData.length > 0) {
        coursesProgress = progressData;
        // По умолчанию выбираем первый курс
        if (coursesProgress.length > 0) {
          selectedCourseIds = [coursesProgress[0].course_id];
          updateAggregatedProgress();
        }
      }
    } catch (error) {
      console.error("Ошибка при загрузке прогресса курсов:", error);
    } finally {
      isLoading = false;
    }
  });

  function updateAggregatedProgress() {
    const selected = coursesProgress.filter(p => selectedCourseIds.includes(p.course_id));
    if (selected.length === 0) {
      aggregatedProgress = null;
      return;
    }

    const total = selected.reduce((acc, curr) => {
      acc.total_lessons += parseInt(curr.total_lessons, 10) || 0;
      acc.completed_lessons += parseInt(curr.completed_lessons, 10) || 0;
      acc.in_progress_lessons += parseInt(curr.in_progress_lessons, 10) || 0;
      return acc;
    }, { total_lessons: 0, completed_lessons: 0, in_progress_lessons: 0 });

    aggregatedProgress = {
      course_title: selected.length > 1 ? 'нескольким курсам' : selected[0].course_title,
      ...total
    };
  }

  function handleApplySelection(event) {
    selectedCourseIds = event.detail;
    updateAggregatedProgress();
    showModal = false;
  }

    function calculatePercentages(progress) {
    if (!progress || progress.total_lessons === 0) {
      return { completed: 0, inProgress: 0, notStarted: 100 };
    }
    const completed = (progress.completed_lessons / progress.total_lessons) * 100;
    const inProgress = (progress.in_progress_lessons / progress.total_lessons) * 100;
    const notStarted = Math.max(0, 100 - completed - inProgress);
    return { completed, inProgress, notStarted };
  }

  $: percentages = calculatePercentages(aggregatedProgress);
</script>

{#if showModal}
  <CourseSelectionModal 
    courses={coursesProgress}
    selectedIds={selectedCourseIds}
    on:apply={handleApplySelection}
    on:close={() => showModal = false} 
  />
{/if}

<div class="progress-wrapper">
  <div class="header">
    <button class="course-select-btn" on:click={() => showModal = true}>Выбрать курс</button>
  </div>
  <div class="content">
    <div class="chart-container">
      {#if isLoading}
        <p>Загрузка...</p>
      {:else if aggregatedProgress}
        <DoughnutChart 
          data={[percentages.completed, percentages.inProgress, percentages.notStarted]}
          labels={['Завершено', 'Начато', 'Не начато']}
          colors={['#a8c5e5', '#6c6f93', '#e6e9f0']}
        />
      {:else}
        <p>Нет данных о прогрессе.</p>
      {/if}
    </div>
    <div class="legend-container">
      {#if aggregatedProgress}
        <h3 class="title">
          {#if currentUser.role === 'admin' || currentUser.role === 'teacher'}
            Общий прогресс учеников по {aggregatedProgress.course_title}:
          {:else}
            Прогресс прохождения по {aggregatedProgress.course_title}:
          {/if}
        </h3>
        <div class="legend-wrapper">
          <ul class="legend-list">
            <li>
              <span class="dot completed"></span>
              Завершено уроков:
              <span class="percentage">{percentages.completed.toFixed(1)}%</span>
            </li>
            <li>
              <span class="dot in-progress"></span>
              Начато уроков:
              <span class="percentage">{percentages.inProgress.toFixed(1)}%</span>
            </li>
            <li>
              <span class="dot not-started"></span>
              Не начато уроков:
              <span class="percentage">{percentages.notStarted.toFixed(1)}%</span>
            </li>
          </ul>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .progress-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: 'Play', sans-serif;
  }

  .header {
    display: flex;
    justify-content: flex-start;
    margin-top: 0;
    margin-bottom: 0;
  }

  .course-select-btn {
    background: linear-gradient(to right, var(--color-auth-button-gradient-start), var(--color-auth-button-gradient-end));
    color: var(--color-auth-button-text);
    border: none;
    padding: var(--spacing-padding-button-medium);
    border-radius: var(--spacing-border-radius-button);
    font-weight: var(--font-weight-bold);
    cursor: pointer;
    transition: all var(--animation-duration-transition) ease;
  }

  .course-select-btn:hover {
    background: linear-gradient(to right, var(--color-auth-button-gradient-hover-start), var(--color-auth-button-gradient-hover-end));
  }

  .content {
    display: flex;
    flex-grow: 1;
    gap: 1rem;
    align-items: flex-start;
    padding: 0;
  }

  @media (max-width: 768px) {
    .content {
      flex-direction: column;
      gap: 2rem;
    }
    
    .chart-container {
      min-height: 300px;
      max-height: 300px;
      justify-content: center;
    }
    
    .legend-container {
      min-height: auto;
    }
    
    .legend-wrapper {
      margin-top: 1rem;
      margin-bottom: 1rem;
    }
  }

  @media (max-width: 576px) {
    .content {
      gap: 1.5rem;
    }
    
    .chart-container {
      min-height: 250px;
      max-height: 250px;
    }
    
    .title {
      font-size: 1.5rem;
    }
    
    .legend-list li {
      font-size: 1rem;
      margin-bottom: 1.5rem;
    }
  }

  .chart-container {
    flex: 1;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    min-height: 400px;
    max-height: 400px;
    padding: 0;
  }

  .legend-container {
    flex: 1;
    margin-bottom: 0;
    padding-top: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 400px;
  }

  .legend-wrapper {
    margin-top: 4rem;
    margin-bottom: 4rem;
  }

  .title {
    font-size: 2rem;
    font-weight: 400;
    color: var(--color-text-dark);
    margin-bottom: 1rem;
    margin-top: 1rem;
    line-height: 1.3;
  }

  .legend-list {
    list-style: none;
    padding: 0;
    margin: 0;
    margin-bottom: 2rem;
  }

  .legend-list li {
    display: flex;
    align-items: center;
    margin-bottom: 3rem;
    font-size: 1.2rem;
    color: var(--color-text-main);
  }

  .dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    margin-right: 12px;
  }

  .dot.completed {
    background-color: #a8c5e5; /* Light blue from screenshot */
  }

  .dot.in-progress {
    background-color: #6c6f93; /* Dark blue/purple from screenshot */
  }

  .dot.not-started {
    background-color: #e6e9f0; /* Light grey for not-started */
  }

  .legend-list li > span:not(.dot) {
    margin-left: auto;
  }

  .percentage {
    font-weight: 400;
  }
</style>
