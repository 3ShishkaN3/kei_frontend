<script>
    import { createEventDispatcher } from 'svelte';
    import ChevronLeft from 'svelte-material-icons/ChevronLeft.svelte';
    import ChevronRight from 'svelte-material-icons/ChevronRight.svelte';
    import { fade } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';

    export let currentPage = 1;
    export let totalItems = 0;
    export let pageSize = 10;
    export let maxVisibleButtons = 3;
    export let storeKey = null;

    const dispatch = createEventDispatcher();

    $: totalPages = Math.ceil(totalItems / pageSize);

    $: visiblePages = (() => {
        if (totalPages <= maxVisibleButtons) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const half = Math.floor(maxVisibleButtons / 2);
        let start = currentPage - half;
        let end = currentPage + half;

        if (maxVisibleButtons % 2 === 0) {
            start = currentPage - half + 1;
            end = currentPage + half;
        }

        if (start <= 1) {
            start = 1;
            end = maxVisibleButtons;
        } else if (end >= totalPages) {
            start = totalPages - maxVisibleButtons + 1;
            end = totalPages;
        }

        start = Math.max(1, start);

        return Array.from({ length: Math.min(maxVisibleButtons, totalPages - start + 1) }, (_, i) => start + i);
    })();

    let currentKey = `page-${currentPage}`;

    function goToPage(page) {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            currentKey = `page-${page}`;
            dispatch('changePage', { page });
        }
    }
</script>

{#if totalPages > 1}
<div class="pagination" in:fade={{ duration: 300, delay: 100 }}>
    <button
        class="arrow"
        disabled={currentPage === 1}
        on:click={() => goToPage(currentPage - 1)}
        aria-label="Предыдущая страница"
        title="Предыдущая страница"
    >
        <ChevronLeft size="24px"/>
    </button>

    {#each visiblePages as pageNum (pageNum)}
        <div class="button-wrapper" in:fade={{ duration: 200, delay: 50 * (pageNum - visiblePages[0]) }}>
            <button
                class="page-number"
                class:active={pageNum === currentPage}
                on:click={() => goToPage(pageNum)}
                aria-current={pageNum === currentPage ? 'page' : undefined}
                aria-label="Страница {pageNum}"
                title="Страница {pageNum}"
            >
                {pageNum}
            </button>
        </div>
    {/each}

    <button
        class="arrow"
        disabled={currentPage === totalPages}
        on:click={() => goToPage(currentPage + 1)}
        aria-label="Следующая страница"
        title="Следующая страница"
    >
        <ChevronRight size="24px"/>
    </button>
</div>
{/if}

<style>
    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
    }

    .button-wrapper {
        display: flex;
        align-items: center;
    }

    button {
        min-width: 36px;
        height: 36px;
        padding: 0 6px;
        border: 1px solid var(--color-border-light, #ccc);
        border-radius: 50%;
        background-color: var(--color-bg-light, #fff);
        color: var(--color-text-muted, #555);
        font-weight: var(--font-weight-medium, 500);
        cursor: pointer;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        transition: all 0.3s ease;
        font-size: 0.9rem;
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background-color: var(--color-input-bg, #f5f5f5);
    }

    button:not(:disabled):hover {
        border-color: var(--color-text-muted, #888);
        color: var(--color-text-dark, #333);
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        transform: translateY(-1px);
    }

    button.page-number.active {
        background: linear-gradient(135deg, #D1DFFA 0%, #FFBED7 100%);
        color: var(--color-text-dark, #333);
        border-color: transparent;
        font-weight: var(--font-weight-bold, 700);
        cursor: default;
        box-shadow: 0 2px 5px rgba(200, 200, 255, 0.4);
    }

    button.arrow {
         padding: 0;
         transition: transform 0.2s ease;
    }
    
    button.arrow:not(:disabled):hover {
        transform: translateX(0) scale(1.05);
    }

    button.arrow:first-child:not(:disabled):hover {
        transform: translateX(-2px);
    }

    button.arrow:last-child:not(:disabled):hover {
        transform: translateX(2px);
    }

    button.arrow:disabled :global(svg) {
        color: #bbb;
    }
</style>