<script>
    import { onMount, onDestroy } from 'svelte';
    import { fly } from 'svelte/transition';

    export let message = "Вы успешно записаны на курс!";
    export let duration = 5000;

    let visible = true;
    let timeoutId;

    onMount(() => {
        timeoutId = setTimeout(() => {
            visible = false;
        }, duration);
    });

    onDestroy(() => {
        clearTimeout(timeoutId);
    });
</script>

{#if visible}
<div class="notification" transition:fly={{ y: 20, duration: 300 }}>
    <p>{message}</p>
</div>
{/if}

<style>
    .notification {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(77, 68, 181, 0.9);
        color: white;
        padding: 15px 30px;
        border-radius: 25px;
        box-shadow: 0 4px 15px rgba(77, 68, 181, 0.4);
        z-index: 1000;
        font-family: 'Montserrat', sans-serif;
        font-weight: 600;
        backdrop-filter: blur(5px);
        text-align: center;
    }
    p {
        margin: 0;
    }
</style>