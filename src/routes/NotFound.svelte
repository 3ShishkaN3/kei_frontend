<script>
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";

  onMount(() => {
    navigate("/", { replace: true });
  });
</script>

<svelte:head>
  <title>Страница не найдена — Kei</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<p>Страница не найдена. Перенаправление...</p>
