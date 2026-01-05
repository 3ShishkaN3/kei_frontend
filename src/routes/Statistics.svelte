<script>
  import UserMiniProfile from "../components/statistics/UserMiniProfile.svelte";
  import Achievements from "../components/statistics/Achievements.svelte";
  import CourseProgress from "../components/statistics/CourseProgress.svelte";
  import WeeklyStatistics from "../components/statistics/WeeklyStatistics.svelte";
  import Calendar from "../components/statistics/Calendar.svelte";
  import StudentsAdminPanel from "../components/statistics/StudentsAdminPanel.svelte";
  import { user as userStore } from "../stores/user.js";

  let currentUser = null;
  let userRole = null;
  userStore.subscribe((u) => {
    currentUser = u && u.isAuthenticated ? { role: u.role } : null;
    userRole = u && u.isAuthenticated ? u.role : null;
  });

  $: isAdminOrTeacher = userRole === "admin" || userRole === "teacher";
</script>

<svelte:head>
  <title>Личный кабинет — Kei</title>
  <meta name="og:title" content="Личный кабинет — Kei" />
  <meta name="twitter:title" content="Личный кабинет — Kei" />
  <meta
    name="description"
    content="Ваш прогресс, достижения и активность на платформе Kei."
  />
</svelte:head>

<div class="statistics-page">
  <section class="main-section">
    <div class="left-column">
      <UserMiniProfile />
      <div class="course-progress-card">
        <CourseProgress />
      </div>
    </div>
    <div class="achievements-container">
      <Achievements />
    </div>
  </section>

  <section class="weekly-stats-section">
    <WeeklyStatistics />
  </section>

  <section class="calendar-section">
    <div class="calendar-card">
      <h2 class="calendar-title">Календарь</h2>
      <Calendar {currentUser} />
    </div>
  </section>

  {#if isAdminOrTeacher}
    <section class="admin-section">
      <StudentsAdminPanel {userRole} />
    </section>
  {/if}
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

  .left-column {
    flex: 3; /* 75% */
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .course-progress-card {
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

  .weekly-stats-section {
    margin-top: 2rem;
    display: flex;
    justify-content: center;
  }

  .calendar-section {
    width: var(--spacing-main-width);
    max-width: var(--spacing-main-max-width);
    margin: 24px auto 0;
    box-sizing: border-box;
    padding: 0 0 24px 0;
  }
  .calendar-card {
    background: var(--color-block-bg);
    border: 1px solid var(--color-block-border);
    border-radius: var(--spacing-border-radius-card);
    padding: var(--spacing-block-padding);
    box-shadow: 0 4px 20px var(--color-block-shadow);
  }
  .calendar-title {
    margin: 0 0 12px 0;
    color: var(--color-text-dark);
    font-weight: 400;
    font-family: "Play", sans-serif;
    font-size: 1.5rem;
  }
  @media (max-width: 992px) {
    .calendar-section {
      width: 100%;
      padding: 0 12px 24px;
    }
  }

  .admin-section {
    margin-top: 2rem;
  }
</style>
