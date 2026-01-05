<script>
  import { useLocation } from "svelte-routing";
  import { tick } from 'svelte';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

  const location = useLocation();

  $: if ($location) {
    handlePathChange();
  }

  async function handlePathChange() {
    await tick();
    ScrollTrigger.getAll().forEach((st) => st.kill(true));
  }
</script> 