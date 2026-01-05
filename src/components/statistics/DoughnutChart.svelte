<script>
  import { onMount, afterUpdate } from "svelte";
  import Chart from "chart.js/auto";

  const ChartConstructor = Chart?.default || Chart;

  export let data = [];
  export let labels = [];
  export let colors = [];

  let canvas;
  let chart;

  onMount(() => {
    const ctx = canvas.getContext("2d");
    chart = new ChartConstructor(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,
        cutout: "65%",
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
          },
        },
      },
    });
  });

  afterUpdate(() => {
    if (chart) {
      chart.data.datasets[0].data = data;
      chart.update();
    }
  });
</script>

<div class="chart-container">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-container {
    position: relative;
    width: 400px;
    height: 400px;
    margin: auto;
  }

  canvas {
    max-width: 100%;
    max-height: 100%;
  }

  @media (max-width: 768px) {
    .chart-container {
      width: 300px;
      height: 300px;
    }
  }

  @media (max-width: 576px) {
    .chart-container {
      width: 250px;
      height: 250px;
    }
  }
</style>
