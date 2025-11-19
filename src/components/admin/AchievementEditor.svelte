<script>
    import { writable } from "svelte/store";
    import {
        SvelteFlow,
        Background,
        Controls,
        BackgroundVariant,
    } from "@xyflow/svelte";
    import "@xyflow/svelte/dist/style.css";
    import Plus from "svelte-material-icons/Plus.svelte";
    import ContentSave from "svelte-material-icons/ContentSave.svelte";
    import Close from "svelte-material-icons/Close.svelte";

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
                // alert("Достижение сохранено!"); // Removed alert for better UX
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
    <div class="editor-content">
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
                rows="3"
            ></textarea>
        </div>

        <div class="flow-header">
            <h3>Условия получения</h3>
            <button class="btn-icon-text" on:click={addCondition}>
                <Plus size="18px" />
                <span>Добавить условие</span>
            </button>
        </div>

        <div class="flow-container">
            <SvelteFlow {nodes} {edges} {nodeTypes} fitView>
                <Controls />
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={12}
                    size={1}
                />
            </SvelteFlow>
        </div>
    </div>

    <div class="editor-actions">
        <button class="btn btn--secondary" on:click={cancel}>
            <Close size="18px" />
            <span>Отмена</span>
        </button>
        <button class="btn btn--primary" on:click={saveAchievement}>
            <ContentSave size="18px" />
            <span>Сохранить</span>
        </button>
    </div>
</div>

<style>
    .achievement-editor {
        display: flex;
        flex-direction: column;
        height: 80vh;
        box-sizing: border-box;
        background: var(--color-bg-light);
        /* Removed padding as it might be handled by modal */
    }

    .editor-content {
        flex-grow: 1;
        overflow-y: auto;
        padding: 0 4px; /* Small padding for scrollbar space */
        display: flex;
        flex-direction: column;
    }

    .editor-meta {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: var(--spacing-gap-medium);
        margin-bottom: var(--spacing-margin-bottom-small);
    }

    .form-group {
        display: flex;
        flex-direction: column;
        margin-bottom: 1rem;
    }

    .form-group.full-width {
        width: 100%;
        margin-bottom: var(--spacing-margin-bottom-medium);
    }

    label {
        font-family: var(--font-family-primary);
        font-size: 0.9rem;
        color: var(--color-text-muted);
        margin-bottom: 8px;
        font-weight: 500;
    }

    input,
    textarea {
        padding: 12px 16px;
        border: 1px solid var(--color-border-light);
        border-radius: var(--spacing-border-radius-input);
        background: var(--color-bg-very-light);
        font-family: var(--font-family-secondary);
        font-size: 1rem;
        color: var(--color-text-dark);
        transition: all 0.2s ease;
    }

    input:focus,
    textarea:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-transparent);
        outline: none;
        background: #fff;
    }

    .flow-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .flow-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--color-text-dark);
        font-weight: 600;
    }

    .btn-icon-text {
        display: flex;
        align-items: center;
        gap: 6px;
        background: transparent;
        border: 1px solid var(--color-primary);
        color: var(--color-primary);
        padding: 6px 12px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.2s ease;
    }

    .btn-icon-text:hover {
        background: var(--color-primary-light);
    }

    .flow-container {
        flex-grow: 1;
        background: #fff;
        border-radius: var(--spacing-border-radius-block);
        border: 1px solid var(--color-border-light);
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
        overflow: hidden;
        min-height: 300px;
        margin-bottom: 1rem;
    }

    .editor-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 1rem;
        border-top: 1px solid var(--color-border-light);
        margin-top: auto;
    }

    .btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border: none;
        border-radius: var(--spacing-border-radius-button);
        font-family: var(--font-family-primary);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.95rem;
    }

    .btn--primary {
        background: linear-gradient(
            90deg,
            var(--color-auth-button-gradient-start),
            var(--color-auth-button-gradient-end)
        );
        color: var(--color-auth-button-text);
        box-shadow: 0 4px 10px rgba(var(--color-primary-rgb), 0.3);
    }

    .btn--primary:hover {
        background: linear-gradient(
            90deg,
            var(--color-auth-button-gradient-hover-start),
            var(--color-auth-button-gradient-hover-end)
        );
        transform: translateY(-2px);
        box-shadow: 0 6px 15px rgba(var(--color-primary-rgb), 0.4);
    }

    .btn--secondary {
        background: var(--color-bg-light);
        color: var(--color-text-muted);
        border: 1px solid var(--color-border-light);
    }

    .btn--secondary:hover {
        background: var(--color-bg-very-light);
        color: var(--color-text-dark);
        border-color: var(--color-border-dark);
    }
</style>
