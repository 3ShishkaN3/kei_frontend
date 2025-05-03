<script>
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";

  onMount(() => {
    navigate("/", { replace: true });
  });
</script>

<p>Страница не найдена. Перенаправление...</p>
