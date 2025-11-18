<script>
    import { createEventDispatcher } from 'svelte';
    import ChevronLeft from 'svelte-material-icons/ChevronLeft.svelte';
    import ChevronRight from 'svelte-material-icons/ChevronRight.svelte';
    import { fade } from 'svelte/transition';

    export let currentPage = 1;
    export let totalPages = 1;
    export let maxVisibleButtons = 3; // Number of page number buttons to show
    export let showPageJump = false; // Show input to jump to specific page
    // Track paginator range start for flipping visible page buttons
    let pageRangeStart = 1;

    const dispatch = createEventDispatcher();

    let pageJumpInput = currentPage;

    // Calculate the range of page number buttons to display
    $: visiblePages = (() => {
        if (totalPages <= maxVisibleButtons) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const start = pageRangeStart;
        const end = Math.min(start + maxVisibleButtons - 1, totalPages);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    })();

    // Keep `pageRangeStart` clamped to valid bounds, but do NOT auto-move
    // the visible block to include `currentPage`. This lets arrows flip
    // visible blocks independently of which page is active.
    $: {
        const maxStart = Math.max(totalPages - maxVisibleButtons + 1, 1);
        if (pageRangeStart < 1) pageRangeStart = 1;
        else if (pageRangeStart > maxStart) pageRangeStart = maxStart;
    }

    // Add functions to flip paginator range
    function shiftPaginatorLeft() {
        // Переключаемся на предыдущий блок страниц (сдвиг на maxVisibleButtons)
        const newStart = Math.max(1, pageRangeStart - maxVisibleButtons);
        if (newStart !== pageRangeStart) {
            pageRangeStart = newStart;
        }
    }

    function shiftPaginatorRight() {
        // Переключаемся на следующий блок страниц (сдвиг на maxVisibleButtons)
        const maxStart = Math.max(totalPages - maxVisibleButtons + 1, 1);
        const newStart = Math.min(maxStart, pageRangeStart + maxVisibleButtons);
        if (newStart !== pageRangeStart) {
            pageRangeStart = newStart;
        }
    }

    $: pageJumpInput = currentPage; // Update input when currentPage changes

    function goToPage(page) {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            dispatch('pageChange', { page });
        }
    }

    function handlePageJump() {
        const targetPage = parseInt(pageJumpInput);
        if (!isNaN(targetPage)) {
            goToPage(targetPage);
        }
    }

    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            handlePageJump();
        }
    }
</script>

{#if totalPages > 1}
<div class="pagination-container" in:fade={{ duration: 300, delay: 100 }}>
    <div class="pagination">
        <button
            class="arrow"
            disabled={pageRangeStart === 1}
            on:click={shiftPaginatorLeft}
            aria-label="Предыдущие страницы"
            title="Предыдущие страницы"
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
            disabled={pageRangeStart + maxVisibleButtons - 1 >= totalPages}
            on:click={shiftPaginatorRight}
            aria-label="Следующие страницы"
            title="Следующие страницы"
        >
            <ChevronRight size="24px"/>
        </button>
    </div>

    {#if showPageJump}
        <div class="page-jump" in:fade={{ duration: 300, delay: 200 }}>
            <span class="jump-label">Перейти на страницу:</span>
            <input
                type="number"
                min="1"
                max={totalPages}
                bind:value={pageJumpInput}
                on:keydown={handleKeyDown}
                class="page-input"
                title="Введите номер страницы"
            />
            <button
                class="jump-button"
                on:click={handlePageJump}
                title="Перейти"
            >
                Перейти
            </button>
        </div>
    {/if}

    <div class="page-info">
        Страница {currentPage} из {totalPages}
    </div>
</div>
{/if}

<style>
    .pagination-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        margin: 2rem 0;
    }

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

    /* Page Jump Styles */
    .page-jump {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        padding: 0.75rem 1rem;
        border-radius: var(--spacing-border-radius-button, 8px);
        border: 1px solid rgba(194, 182, 252, 0.2);
        box-shadow: 0 2px 10px rgba(194, 182, 252, 0.1);
    }

    .jump-label {
        font-size: 0.9rem;
        color: var(--color-text-muted, #666);
        font-weight: var(--font-weight-medium, 500);
        white-space: nowrap;
    }

    .page-input {
        width: 80px;
        padding: 0.4rem 0.6rem;
        border: 1px solid rgba(194, 182, 252, 0.3);
        border-radius: var(--spacing-border-radius-small, 4px);
        background: rgba(255, 255, 255, 0.8);
        color: var(--color-text-dark, #333);
        font-size: 0.9rem;
        text-align: center;
        transition: all 0.3s ease;
    }

    .page-input:focus {
        outline: none;
        border-color: var(--color-purple-active, #8b5cf6);
        background: rgba(255, 255, 255, 1);
        box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
    }

    .jump-button {
        min-width: auto;
        height: auto;
        padding: 0.4rem 0.8rem;
        border-radius: var(--spacing-border-radius-small, 4px);
        background: linear-gradient(135deg, var(--color-purple-active), var(--color-pink-active));
        color: var(--color-text-light, #fff);
        border: none;
        font-size: 0.85rem;
        font-weight: var(--font-weight-semi-bold, 600);
    }

    .jump-button:hover {
        background: linear-gradient(135deg, var(--color-purple-hover), var(--color-pink-hover));
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }

    /* Page Info */
    .page-info {
        font-size: 0.85rem;
        color: var(--color-text-muted, #666);
        font-weight: var(--font-weight-medium, 500);
        text-align: center;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .pagination-container {
            gap: 0.75rem;
        }

        .page-jump {
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.5rem;
        }

        .jump-label {
            font-size: 0.8rem;
        }

        .page-input {
            width: 100px;
        }
    }
</style> 