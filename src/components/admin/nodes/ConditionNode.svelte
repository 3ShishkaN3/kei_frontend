<script>
    import { Handle, Position } from "@xyflow/svelte";

    export let data;

    const facts = [
        { value: "event.score", label: "Результат (Score)" },
        { value: "event.attempts", label: "Попытки" },
        { value: "user.total_lessons", label: "Всего уроков" },
        { value: "user.streak_days", label: "Стрик (дней)" },
        { value: "user.level", label: "Уровень" },
        { value: "user.xp", label: "Опыт" },
    ];

    const operators = [
        { value: "==", label: "Равно (==)" },
        { value: "!=", label: "Не равно (!=)" },
        { value: ">", label: "Больше (>)" },
        { value: "<", label: "Меньше (<)" },
        { value: ">=", label: "Больше или равно (>=)" },
        { value: "<=", label: "Меньше или равно (<=)" },
    ];
</script>

<div class="node node--condition">
    <div class="node__header">
        <span class="node__title">Условие</span>
    </div>
    <div class="node__content">
        <div class="node__field">
            <label class="node__label" for="fact-select">Факт</label>
            <select
                id="fact-select"
                class="node__select"
                bind:value={data.fact}
            >
                <option value="" disabled>Выберите факт</option>
                {#each facts as fact}
                    <option value={fact.value}>{fact.label}</option>
                {/each}
            </select>
        </div>
        <div class="node__field">
            <label class="node__label" for="operator-select">Оператор</label>
            <select
                id="operator-select"
                class="node__select"
                bind:value={data.operator}
            >
                {#each operators as op}
                    <option value={op.value}>{op.label}</option>
                {/each}
            </select>
        </div>
        <div class="node__field">
            <label class="node__label" for="value-input">Значение</label>
            <input
                id="value-input"
                class="node__input"
                type="text"
                bind:value={data.value}
                placeholder="Например: 100"
            />
        </div>
    </div>
    <Handle type="target" position={Position.Top} class="node__handle" />
    <Handle type="source" position={Position.Bottom} class="node__handle" />

    <style>
        .node {
            background: var(--color-bg-light);
            border: 1px solid var(--color-block-border);
            border-radius: var(--spacing-border-radius-block);
            min-width: 240px;
            box-shadow: 0 4px 6px var(--color-block-shadow);
            transition: var(--block-shadow-transition);
            overflow: hidden;
        }

        .node:hover {
            box-shadow: 0 6px 12px var(--color-block-shadow-hover);
        }

        .node--condition {
            border-top: 4px solid var(--color-secondary);
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

        .node__field {
            margin-bottom: 12px;
        }

        .node__field:last-child {
            margin-bottom: 0;
        }

        .node__label {
            font-size: 0.8rem;
            color: var(--color-text-muted);
            margin-bottom: 4px;
            display: block;
        }

        .node__select,
        .node__input {
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

        .node__select:focus,
        .node__input:focus {
            border-color: var(--color-input-focus-border);
            box-shadow: 0 0 0 3px var(--color-input-focus-shadow);
        }

        :global(.node__handle) {
            width: 10px !important;
            height: 10px !important;
            background: var(--color-secondary) !important;
        }
    </style>
</div>
