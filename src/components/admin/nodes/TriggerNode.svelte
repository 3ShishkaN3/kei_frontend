<script>
    import { Handle, Position } from "@xyflow/svelte";

    export let data;

    const triggers = [
        { value: "ON_LESSON_COMPLETE", label: "Завершение урока" },
        { value: "ON_COURSE_COMPLETE", label: "Завершение курса" },
        { value: "ON_TEST_PASSED", label: "Прохождение теста" },
        { value: "ON_SECTION_COMPLETE", label: "Завершение секции" },
        { value: "DAILY_CHECK", label: "Ежедневная проверка" },
    ];
</script>

<div class="node node--trigger">
    <div class="node__header">
        <span class="node__title">Триггер</span>
    </div>
    <div class="node__content">
        <label class="node__label" for="trigger-select">Событие</label>
        <select
            id="trigger-select"
            class="node__select"
            bind:value={data.trigger}
        >
            {#each triggers as trigger}
                <option value={trigger.value}>{trigger.label}</option>
            {/each}
        </select>
    </div>
    <Handle type="source" position={Position.Bottom} class="node__handle" />
</div>

<style>
    .node {
        background: var(--color-bg-light);
        border: 1px solid var(--color-block-border);
        border-radius: var(--spacing-border-radius-block);
        min-width: 220px;
        box-shadow: 0 4px 6px var(--color-block-shadow);
        transition: var(--block-shadow-transition);
        overflow: hidden;
    }

    .node:hover {
        box-shadow: 0 6px 12px var(--color-block-shadow-hover);
    }

    .node--trigger {
        border-top: 4px solid var(--color-primary);
    }

    .node__header {
        background: var(--color-bg-ultra-light);
        padding: 10px 15px;
        border-bottom: 1px solid var(--color-block-border);
    }

    .node__title {
        font-family: var(--font-family-primary);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-dark);
        font-size: 1rem;
    }

    .node__content {
        padding: 15px;
    }

    .node__label {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        margin-bottom: 5px;
        display: block;
    }

    .node__select {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--color-input-border);
        border-radius: var(--spacing-input-border-radius);
        background: var(--color-input-bg);
        color: var(--color-text-dark);
        font-family: var(--font-family-secondary);
        outline: none;
        transition: var(--input-transition);
    }

    .node__select:focus {
        border-color: var(--color-input-focus-border);
        box-shadow: 0 0 0 3px var(--color-input-focus-shadow);
    }

    :global(.node__handle) {
        width: 10px !important;
        height: 10px !important;
        background: var(--color-primary) !important;
    }
</style>
