<script>
    import { Handle, Position } from "@xyflow/svelte";
    import { onMount } from "svelte";
    import { api } from "../../../api/api";
    import { API_BASE_URL } from "../../../config.js";

    export let data;

    let achievements = [];
    let loading = true;

    onMount(async () => {
        try {
            const response = await api.get(
                `${API_BASE_URL}/achievements/admin/achievements/`,
            );
            if (response.ok) {
                achievements = await response.json();
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    });
</script>

<div class="node node--achievement">
    <div class="node__header">
        <span class="node__title">Есть достижение</span>
    </div>
    <div class="node__content">
        <div class="node__field">
            <label class="node__label">Требуемое достижение</label>
            {#if loading}
                <span class="loading-text">Загрузка...</span>
            {:else}
                <select class="node__select" bind:value={data.achievement_id}>
                    <option value="" disabled>Выберите достижение</option>
                    {#each achievements as ach}
                        <option value={ach.id}>{ach.title}</option>
                    {/each}
                </select>
            {/if}
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

    .node--achievement {
        border-top: 4px solid #e91e63;
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

    .loading-text {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        font-style: italic;
    }

    :global(.node__handle) {
        width: 10px !important;
        height: 10px !important;
        background: #e91e63 !important;
    }
</style>
