<script>
  export let completed = 0; // in percent
  export let inProgress = 0; // in percent

  const radius = 85;
  const strokeWidth = 25;
  const circumference = 2 * Math.PI * radius;

  $: completedOffset = circumference - (completed / 100) * circumference;
  $: inProgressOffset = circumference - ((completed + inProgress) / 100) * circumference;
</script>

<div class="chart-wrapper">
  <svg viewBox="0 0 200 200">
    <!-- Background Circle -->
    <circle
      class="background-circle"
      cx="100"
      cy="100"
      r={radius}
      stroke-width={strokeWidth}
    />
    <!-- Completed Circle -->
    <circle
      class="progress-circle completed"
      cx="100"
      cy="100"
      r={radius}
      stroke-width={strokeWidth}
      stroke-dasharray={circumference}
      stroke-dashoffset={completedOffset}
    />
    <!-- In Progress Circle -->
    <circle
      class="progress-circle in-progress"
      cx="100"
      cy="100"
      r={radius}
      stroke-width={strokeWidth}
      stroke-dasharray={circumference}
      stroke-dashoffset={inProgressOffset}
    />
  </svg>
</div>

<style>
  .chart-wrapper {
    width: 100%;
    max-width: 300px;
    margin: auto;
  }
  svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  .background-circle {
    fill: none;
    stroke: #e6e9f0; /* Light grey for not-started */
  }
  .progress-circle {
    fill: none;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.5s ease-out;
  }
  .completed {
    stroke: #a8c5e5; /* Light blue from screenshot */
  }
  .in-progress {
    stroke: #6c6f93; /* Dark blue/purple from screenshot */
  }
</style>
