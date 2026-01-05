<script>
    import { onDestroy, onMount } from 'svelte';
    import { fly, fade } from 'svelte/transition';
    import { removeNotification } from '../../stores/notifications.js';
    import CloseIcon from 'svelte-material-icons/Close.svelte';

    export let id;
    export let message;
    export let type = 'info'; // 'info', 'success', 'warning', 'error'
    export let duration = 5000;
    export let startTime;

    let progress = 100;
    let interval;
    const radius = 14;
    const circumference = 2 * Math.PI * radius;

    const typeStyles = {
        info: {
            bg: 'var(--color-soft-blue, #85abe6)',
            border: 'var(--color-secondary, #6D7FC9)',
            progress: 'var(--color-secondary, #6D7FC9)',
            text: 'var(--color-text-light, white)'
        },
        success: {
            bg: 'var(--color-success, #2ecc71)',
            border: 'var(--color-success-dark, #27ae60)',
            progress: 'var(--color-success-dark, #27ae60)',
            text: 'var(--color-text-light, white)'
        },
        warning: {
            bg: 'var(--color-pink-light, #EBC7F2)',
            border: 'var(--color-pink-hover, #D8A8E8)',
            progress: 'var(--color-pink-hover, #D8A8E8)',
            text: 'var(--color-text-dark, #333)'
        },
        error: {
            bg: 'var(--color-danger-red, #ff4d4d)',
            border: 'var(--color-danger-red-dark, #c0392b)',
            progress: 'var(--color-danger-red-dark, #c0392b)',
            text: 'var(--color-text-light, white)'
        },
    };

    $: currentStyle = typeStyles[type] || typeStyles.info;
    $: strokeDashoffset = circumference - (progress / 100) * circumference;

    onMount(() => {
        const updateRate = 50; // ms
        interval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            progress = Math.max(0, 100 - (elapsedTime / duration) * 100);
            if (progress <= 0) {
                clearInterval(interval);
            }
        }, updateRate);

        return () => clearInterval(interval);
    });

    function handleClose() {
        clearInterval(interval);
        removeNotification(id);
    }
</script>

<div
    class="notification-item"
    style="background-color: {currentStyle.bg}; border-left: 4px solid {currentStyle.border}; color: {currentStyle.text};"
    in:fly="{{ x: 300, duration: 300, delay: 50 }}"
    out:fade="{{ duration: 250 }}"
    role="alert"
    aria-live="assertive"
>
    <div class="timer-container">
        <svg class="progress-ring" width="36" height="36" viewBox="0 0 36 36">
            <circle
                class="progress-ring__circle--bg"
                stroke="rgba(255, 255, 255, 0.3)"
                stroke-width="3"
                fill="transparent"
                r={radius}
                cx="18"
                cy="18"
            />
            <circle
                class="progress-ring__circle--fg"
                stroke={currentStyle.progress}
                stroke-width="3"
                fill="transparent"
                r={radius}
                cx="18"
                cy="18"
                style="stroke-dasharray: {circumference} {circumference}; stroke-dashoffset: {strokeDashoffset};"
            />
        </svg>
    </div>
    <span class="message">{message}</span>
    <button on:click={handleClose} class="close-button" aria-label="Закрыть уведомление" style="color: {currentStyle.text};">
        <CloseIcon size="18px" />
    </button>
</div>

<style>
    .notification-item {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        border-radius: var(--spacing-border-radius-button, 20px);
        box-shadow: 0 4px 12px var(--color-shadow, rgba(0, 0, 0, 0.15));
        margin-bottom: 12px;
        min-width: 280px;
        max-width: 360px;
        position: relative;
        overflow: hidden;
    }

    .timer-container {
        margin-right: 10px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .progress-ring {
        transform: rotate(-90deg); 
    }

    .progress-ring__circle--fg {
        transition: stroke-dashoffset 0.05s linear;
        stroke-linecap: round;
    }
    
    .message {
        flex-grow: 1;
        font-size: 0.85rem;
        font-family: var(--font-family-primary);
        font-weight: var(--font-weight-medium);
        line-height: 1.3;
    }

    .close-button {
        background: none;
        border: none;
        font-size: 1.2rem;
        line-height: 1;
        margin-left: 8px;
        padding: 2px;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .close-button:hover {
        opacity: 1;
    }
</style>