<script>
    import { Handle, Position } from "@xyflow/svelte";

    export let data;

    const days = [
        { value: 0, label: "Пн" },
        { value: 1, label: "Вт" },
        { value: 2, label: "Ср" },
        { value: 3, label: "Чт" },
        { value: 4, label: "Пт" },
        { value: 5, label: "Сб" },
        { value: 6, label: "Вс" },
    ];

    if (!data.days) data.days = [];

    function toggleDay(dayValue) {
        if (data.days.includes(dayValue)) {
            data.days = data.days.filter((d) => d !== dayValue);
        } else {
            data.days = [...data.days, dayValue];
        }
    }
</script>

<div class="node node--time">
    <div class="node__header">
        <span class="node__title">Время</span>
    </div>
    <div class="node__content">
        <div class="node__field">
            <label class="node__label">Интервал</label>
            <div class="time-inputs">
                <input
                    type="time"
                    bind:value={data.start_time}
                    class="node__input"
                />
                <span>-</span>
                <input
                    type="time"
                    bind:value={data.end_time}
                    class="node__input"
                />
            </div>
        </div>
        <div class="node__field">
            <label class="node__label">Дни недели</label>
            <div class="days-grid">
                {#each days as day}
                    <button
                        class="day-btn {data.days.includes(day.value)
                            ? 'active'
                            : ''}"
                        on:click={() => toggleDay(day.value)}
                    >
                        {day.label}
                    </button>
                {/each}
            </div>
        </div>
    </div>
    <Handle type="target" position={Position.Top} class="node__handle" />
    <Handle type="source" position={Position.Bottom} class="node__handle" />
</div>

<style>
    .node {
        background: var(--color-bg-light);
        border: 1px solid var(--color-block-border);
        border-radius: var(--spacing-border-radius-block);
        min-width: 220px;
        box-shadow: 0 4px 6px var(--color-block-shadow);
        overflow: hidden;
    }

    .node--time {
        border-top: 4px solid #ff9800;
    }

    .node__header {
        background: var(--color-bg-ultra-light);
        padding: 8px 12px;
        border-bottom: 1px solid var(--color-block-border);
    }

    .node__title {
        font-family: var(--font-family-primary);
        font-weight: bold;
        font-size: 0.9rem;
    }

    .node__content {
        padding: 10px;
    }

    .node__field {
        margin-bottom: 10px;
    }

    .node__label {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        margin-bottom: 4px;
        display: block;
    }

    .time-inputs {
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .node__input {
        padding: 4px;
        border: 1px solid var(--color-input-border);
        border-radius: 4px;
        font-size: 0.9rem;
    }

    .days-grid {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
    }

    .day-btn {
        padding: 4px 6px;
        font-size: 0.75rem;
        border: 1px solid var(--color-border-light);
        background: var(--color-bg-very-light);
        border-radius: 4px;
        cursor: pointer;
    }

    .day-btn.active {
        background: var(--color-primary);
        color: white;
        border-color: var(--color-primary);
    }

    :global(.node__handle) {
        width: 10px !important;
        height: 10px !important;
        background: #ff9800 !important;
    }
</style>
