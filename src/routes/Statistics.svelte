<script>
  import Achievements from '../components/statistics/Achievements.svelte';
  import CourseProgress from '../components/statistics/CourseProgress.svelte';
</script>

<div class="statistics-page">
  <section class="main-section">
    <div class="progress-container">
      <CourseProgress />
    </div>
    <div class="achievements-container">
       <Achievements />
    </div>
  </section>
</div>

<style>
  .statistics-page {
    padding: var(--spacing-padding-page);
    max-width: var(--max-width-page);
    margin: 0 auto;
  }

  .main-section {
    display: flex;
    min-height: 70vh;
    gap: 2rem;
  }

  @media (max-width: 992px) {
    .main-section {
      flex-direction: column;
      min-height: auto;
    }
  }

  .progress-container {
    flex: 3; /* 75% */
    background-color: var(--color-bg-light);
    border-radius: var(--spacing-border-radius-card);
    padding: var(--spacing-padding-block);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  }

  .achievements-container {
    flex: 1; /* 25% */
    background-color: var(--color-bg-light);
    border-radius: var(--spacing-border-radius-card);
    padding: var(--spacing-padding-block);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  }
</style>
