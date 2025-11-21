<script>
    import { Handle, Position } from "@xyflow/svelte";

    export let data;

    const variables = [
        { value: "event.score", label: "Результат (Score)" },
        { value: "event.attempts", label: "Попытки" },
        { value: "event.time_spent", label: "Затраченное время" },
        { value: "user.total_lessons", label: "Всего уроков" },
        { value: "user.streak_days", label: "Стрик (дней)" },
        { value: "user.level", label: "Уровень" },
        { value: "user.xp", label: "Опыт" },
        { value: "user.words_learned", label: "Выучено слов" },
        { value: "user.kanji_learned", label: "Выучено кандзи" },
        { value: "user.grammar_learned", label: "Изучено грамматики" },
        { value: "user.course_progress", label: "Прогресс курса (%)" },
        { value: "user.section_progress", label: "Прогресс секции (%)" },
    ];
</script>

<div class="node node--range">
    <div class="node__header">
        <span class="node__title">Диапазон</span>
    </div>
    <div class="node__content">
        <div class="node__field">
            <label class="node__label">Переменная</label>
            <select class="node__select" bind:value={data.variable}>
                <option value="" disabled>Выберите переменную</option>
                {#each variables as v}
                    <option value={v.value}>{v.label}</option>
                {/each}
            </select>
        </div>
        <div class="node__field">
            <label class="node__label">Значение от и до</label>
            <div class="range-inputs">
                <input
                    type="number"
                    bind:value={data.min}
                    class="node__input"
                    placeholder="Min"
                />
                <span>-</span>
                <input
                    type="number"
                    bind:value={data.max}
                    class="node__input"
                    placeholder="Max"
                />
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
        min-width: 240px;
        box-shadow: 0 4px 6px var(--color-block-shadow);
        overflow: hidden;
    }

    .node--range {
        border-top: 4px solid #00bcd4; /* Cyan for range */
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

    .node__select {
        width: 100%;
        padding: 6px;
        border: 1px solid var(--color-input-border);
        border-radius: 4px;
    }

    .range-inputs {
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .node__input {
        width: 100%;
        padding: 6px;
        border: 1px solid var(--color-input-border);
        border-radius: 4px;
    }

    :global(.node__handle) {
        width: 10px !important;
        height: 10px !important;
        background: #00bcd4 !important;
    }
</style>
