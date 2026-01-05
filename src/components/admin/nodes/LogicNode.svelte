<script>
    import { Handle, Position } from "@xyflow/svelte";

    export let data;

    const logicTypes = [
        { value: "AND", label: "И (AND)" },
        { value: "OR", label: "ИЛИ (OR)" },
    ];
</script>

<div class="node node--logic">
    <div class="node__header">
        <span class="node__title">Логика</span>
    </div>
    <div class="node__content">
        <select class="node__select" bind:value={data.logic_type}>
            {#each logicTypes as type}
                <option value={type.value}>{type.label}</option>
            {/each}
        </select>
    </div>
    <Handle type="target" position={Position.Top} class="node__handle" />
    <Handle type="source" position={Position.Bottom} class="node__handle" />
</div>

<style>
    .node {
        background: var(--color-bg-light);
        border: 1px solid var(--color-block-border);
        border-radius: var(--spacing-border-radius-block);
        min-width: 150px;
        box-shadow: 0 4px 6px var(--color-block-shadow);
        overflow: hidden;
    }

    .node--logic {
        border-top: 4px solid #9c27b0;
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

    .node__select {
        width: 100%;
        padding: 6px;
        border: 1px solid var(--color-input-border);
        border-radius: 4px;
    }

    :global(.node__handle) {
        width: 10px !important;
        height: 10px !important;
        background: #9c27b0 !important;
    }
</style>
