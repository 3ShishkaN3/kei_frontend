<script>
    import { writable } from "svelte/store";
    import {
        SvelteFlow,
        Background,
        Controls,
        BackgroundVariant,
    } from "@xyflow/svelte";
    import "@xyflow/svelte/dist/style.css";

    import TriggerNode from "./nodes/TriggerNode.svelte";
    import ConditionNode from "./nodes/ConditionNode.svelte";

    // Node Types Mapping
    const nodeTypes = {
        trigger: TriggerNode,
        condition: ConditionNode,
    };

    // Initial Nodes
    const initialNodes = [
        {
            id: "1",
            type: "trigger",
            position: { x: 250, y: 50 },
            data: { trigger: "ON_LESSON_COMPLETE" },
        },
    ];

    const initialEdges = [];

    const nodes = writable(initialNodes);
    const edges = writable(initialEdges);

    let achievementTitle = "";
    let achievementDescription = "";
    let achievementXP = 0;

    import { onMount, createEventDispatcher } from "svelte";
    import { api } from "../../api/api";
    import { API_BASE_URL } from "../../config.js";

    export let id = null; // Prop from parent if editing
    const dispatch = createEventDispatcher();

    // Helper to add new condition node
    function addCondition() {
        const id = `node-${Math.random().toString(36).substr(2, 9)}`;
        nodes.update((n) => [
            ...n,
            {
                id,
                type: "condition",
                position: { x: 250, y: 200 + n.length * 50 },
                data: { fact: "", operator: "==", value: "" },
            },
        ]);
    }

    onMount(async () => {
        if (id) {
            try {
                const response = await api.get(
                    `${API_BASE_URL}/achievements/admin/achievements/${id}/`,
                );
                if (response.ok) {
                    const data = await response.json();
                    achievementTitle = data.title;
                    achievementDescription = data.description;
                    achievementXP = data.xp_reward;
                    if (data.rule_graph) {
                        nodes.set(data.rule_graph.nodes || initialNodes);
                        edges.set(data.rule_graph.edges || initialEdges);
                    }
                } else {
                    alert("Ошибка загрузки достижения");
                }
            } catch (e) {
                console.error(e);
                alert("Ошибка соединения");
            }
        }
    });

    async function saveAchievement() {
        const graph = {
            nodes: $nodes,
            edges: $edges,
        };

        const payload = {
            title: achievementTitle,
            description: achievementDescription,
            xp_reward: achievementXP,
            rule_graph: graph,
            is_active: true,
        };

        try {
            let response;
            if (id) {
                response = await api.put(
                    `${API_BASE_URL}/achievements/admin/achievements/${id}/`,
                    payload,
                );
            } else {
                response = await api.post(
                    `${API_BASE_URL}/achievements/admin/achievements/`,
                    payload,
                );
            }

            if (response.ok) {
                alert("Достижение сохранено!");
                dispatch("save");
            } else {
                const err = await response.json();
                alert(`Ошибка сохранения: ${JSON.stringify(err)}`);
            }
        } catch (e) {
            console.error(e);
            alert("Ошибка соединения при сохранении");
        }
    }

    function cancel() {
        dispatch("cancel");
    }
</script>

<div class="achievement-editor">
    <div class="editor-header">
        <h2 class="editor-title">
            {id ? "Редактировать" : "Создать"} достижение
        </h2>
        <div class="editor-controls">
            <button class="btn btn--secondary" on:click={addCondition}
                >+ Условие</button
            >
        </div>
    </div>

    <div class="editor-meta">
        <div class="form-group">
            <label for="title">Название</label>
            <input
                id="title"
                type="text"
                bind:value={achievementTitle}
                placeholder="Например: Снайпер"
            />
        </div>
        <div class="form-group">
            <label for="xp">Опыт (XP)</label>
            <input
                id="xp"
                type="number"
                bind:value={achievementXP}
                placeholder="100"
            />
        </div>
    </div>
    <div class="form-group full-width">
        <label for="desc">Описание</label>
        <textarea
            id="desc"
            bind:value={achievementDescription}
            placeholder="Описание достижения..."
        ></textarea>
    </div>

    <div class="flow-container">
        <SvelteFlow {nodes} {edges} {nodeTypes} fitView>
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </SvelteFlow>
    </div>

    <div class="editor-actions">
        <button class="btn btn--secondary" on:click={cancel}>Отмена</button>
        <button class="btn btn--primary" on:click={saveAchievement}
            >Сохранить</button
        >
    </div>
</div>

<style>
    .achievement-editor {
        display: flex;
        flex-direction: column;
        height: 80vh;
        box-sizing: border-box;
        background: var(--color-bg-ultra-light);
    }

    .editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-margin-bottom-medium);
    }

    .editor-title {
        font-family: var(--font-family-primary);
        font-size: 1.5rem;
        color: var(--color-text-dark);
        font-weight: var(--font-weight-bold);
        margin: 0;
    }

    .editor-controls {
        display: flex;
        gap: var(--spacing-gap-small);
    }

    .editor-meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-gap-medium);
        margin-bottom: var(--spacing-margin-bottom-small);
    }

    .form-group {
        display: flex;
        flex-direction: column;
    }

    .form-group.full-width {
        width: 100%;
        margin-bottom: var(--spacing-margin-bottom-medium);
    }

    label {
        font-family: var(--font-family-secondary);
        font-size: 0.9rem;
        color: var(--color-text-muted);
        margin-bottom: 5px;
    }

    input,
    textarea {
        padding: var(--spacing-input-padding);
        border: 1px solid var(--color-input-border);
        border-radius: var(--spacing-input-border-radius);
        background: var(--color-input-bg);
        font-family: var(--font-family-secondary);
        font-size: 1rem;
        transition: var(--input-transition);
    }

    input:focus,
    textarea:focus {
        border-color: var(--color-input-focus-border);
        box-shadow: 0 0 0 3px var(--color-input-focus-shadow);
        outline: none;
    }

    .btn {
        padding: var(--spacing-padding-button-medium);
        border: none;
        border-radius: var(--spacing-border-radius-button);
        font-family: var(--font-family-primary);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .btn--primary {
        background: linear-gradient(
            90deg,
            var(--color-auth-button-gradient-start),
            var(--color-auth-button-gradient-end)
        );
        color: var(--color-auth-button-text);
    }

    .btn--primary:hover {
        background: linear-gradient(
            90deg,
            var(--color-auth-button-gradient-hover-start),
            var(--color-auth-button-gradient-hover-end)
        );
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .btn--secondary {
        background: var(--color-bg-light);
        color: var(--color-text-dark);
        border: 1px solid var(--color-border-light);
    }

    .btn--secondary:hover {
        background: var(--color-simple-button-hover-bg);
    }

    .flow-container {
        flex-grow: 1;
        background: #fff;
        border-radius: var(--spacing-border-radius-block);
        box-shadow: 0 4px 12px var(--color-shadow);
        overflow: hidden;
        min-height: 300px;
        margin-bottom: 1rem;
    }

    .editor-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }
</style>
