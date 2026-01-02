<script>
    import { notifications } from '../../stores/notifications.js';
    import NotificationItem from './NotificationItem.svelte';
    import { flip } from 'svelte/animate';
</script>

{#if $notifications.length > 0}
<div class="notifications-container">
    {#each $notifications as notification (notification.id)}
        <div animate:flip={{duration: 250}}>
            <NotificationItem {...notification} />
        </div>
    {/each}
</div>
{/if}

<style>
    .notifications-container {
        position: fixed;
        top: calc(var(--spacing-header-height, 80px) + 15px); 
        right: 15px;
        z-index: 2000; 
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }
    @media (max-width: 600px) {
        .notifications-container {
            top: 15px; 
            left: 15px;
            right: 15px;
            align-items: center;
        }
        :global(.notifications-container .notification-item) {
            width: 100%;
            max-width: none;
            box-sizing: border-box;
        }
    }
</style>