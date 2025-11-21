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
    import ImagePlus from "svelte-material-icons/ImagePlus.svelte";
    import Cropper from "svelte-easy-crop";
    import { addNotification } from "../../stores/notifications.js";

    import TriggerNode from "./nodes/TriggerNode.svelte";
    import ConditionNode from "./nodes/ConditionNode.svelte";
    import LogicNode from "./nodes/LogicNode.svelte";
    import TimeNode from "./nodes/TimeNode.svelte";
    import RangeNode from "./nodes/RangeNode.svelte";
    import AchievementCheckNode from "./nodes/AchievementCheckNode.svelte";

    // Node Types Mapping
    const nodeTypes = {
        trigger: TriggerNode,
        condition: ConditionNode,
        logic: LogicNode,
        time: TimeNode,
        range: RangeNode,
        achievement_check: AchievementCheckNode,
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

    // Image handling
    let image_file = null;
    let image_preview = null;
    let showCropper = false;
    let crop = { x: 0, y: 0 };
    let zoom = 1;
    let croppedAreaPixels = null;
    let image_for_cropper = null;

    import { onMount, createEventDispatcher } from "svelte";
    import { api } from "../../api/api";
    import { API_BASE_URL } from "../../config.js";

    export let id = null; // Prop from parent if editing
    const dispatch = createEventDispatcher();

    // Helper to add new nodes
    function addNode(type, label) {
        const id = `node-${Math.random().toString(36).substr(2, 9)}`;
        const yOffset = 200 + $nodes.length * 50;

        let initialData = {};
        if (type === "condition")
            initialData = { variable: "", operator: "==", value: "" };
        if (type === "trigger") initialData = { trigger: "ON_LESSON_COMPLETE" };
        if (type === "logic") initialData = { logic_type: "AND" };
        if (type === "time")
            initialData = { start_time: "00:00", end_time: "23:59" };
        if (type === "range")
            initialData = { variable: "", min: "0", max: "100" };
        if (type === "achievement_check") initialData = { achievement_id: "" };

        nodes.update((n) => [
            ...n,
            {
                id,
                type,
                position: { x: 250, y: yOffset },
                data: initialData,
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
                    if (data.icon) {
                        image_preview = data.icon.startsWith("http")
                            ? data.icon
                            : `${API_BASE_URL}${data.icon}`;
                    }
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

    async function getCroppedImg(imageSrc, pixelCrop) {
        const image = new Image();
        image.src = imageSrc;
        await new Promise((resolve) => {
            image.onload = resolve;
        });
        const canvas = document.createElement("canvas");
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height,
        );
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, "image/png");
        });
    }

    function handleFileChange(e) {
        const file = e.target.files[0];
        if (file) {
            image_file = file;
            image_for_cropper = URL.createObjectURL(file);
            showCropper = true;
            crop = { x: 0, y: 0 };
            zoom = 1;
        }
    }

    function onCropComplete(e) {
        croppedAreaPixels = e.detail.pixels;
    }

    function removeImage() {
        image_file = null;
        image_preview = null;
        showCropper = false;
        image_for_cropper = null;
    }

    async function saveAchievement() {
        const graph = {
            nodes: $nodes,
            edges: $edges,
        };

        const payload = new FormData();
        payload.append("title", achievementTitle);
        payload.append("description", achievementDescription);
        payload.append("xp_reward", achievementXP);
        payload.append("rule_graph", JSON.stringify(graph));
        payload.append("is_active", "true");

        if (image_file && showCropper && croppedAreaPixels) {
            const blob = await getCroppedImg(
                image_for_cropper,
                croppedAreaPixels,
            );
            payload.append("icon", blob, "icon.png");
        } else if (image_file) {
            payload.append("icon", image_file);
        }

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
                addNotification("Достижение сохранено!", "success");
                dispatch("save");
            } else {
                const err = await response.json();
                addNotification(
                    `Ошибка сохранения: ${JSON.stringify(err)}`,
                    "error",
                );
            }
        } catch (e) {
            console.error(e);
            addNotification("Ошибка соединения при сохранении", "error");
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
            <label>Иконка</label>
            <div class="image-upload-container">
                {#if showCropper && image_for_cropper}
                    <div class="cropper-wrapper">
                        <Cropper
                            image={image_for_cropper}
                            bind:crop
                            bind:zoom
                            aspect={1}
                            on:cropcomplete={onCropComplete}
                        />
                    </div>
                    <div class="cropper-controls">
                        <button
                            class="btn btn--secondary btn-sm"
                            on:click={removeImage}
                        >
                            <Close size="16px" /> Удалить
                        </button>
                    </div>
                {:else if image_preview}
                    <div class="image-preview">
                        <img src={image_preview} alt="Icon preview" />
                        <button class="btn-icon-remove" on:click={removeImage}>
                            <Close size="16px" />
                        </button>
                    </div>
                {:else}
                    <label class="upload-placeholder">
                        <ImagePlus size="32px" />
                        <span>Загрузить иконку</span>
                        <input
                            type="file"
                            accept="image/*"
                            on:change={handleFileChange}
                            hidden
                        />
                    </label>
                {/if}
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
            <h3>Конструктор правил</h3>
            <div class="node-toolbar">
                <button
                    class="btn-icon-text"
                    on:click={() => addNode("trigger", "Триггер")}
                >
                    <Plus size="16px" /> Триггер
                </button>
                <button
                    class="btn-icon-text"
                    on:click={() => addNode("condition", "Условие")}
                >
                    <Plus size="16px" /> Условие
                </button>
                <button
                    class="btn-icon-text"
                    on:click={() => addNode("logic", "Логика")}
                >
                    <Plus size="16px" /> Логика
                </button>
                <button
                    class="btn-icon-text"
                    on:click={() => addNode("time", "Время")}
                >
                    <Plus size="16px" /> Время
                </button>
                <button
                    class="btn-icon-text"
                    on:click={() => addNode("range", "Диапазон")}
                >
                    <Plus size="16px" /> Диапазон
                </button>
                <button
                    class="btn-icon-text"
                    on:click={() => addNode("achievement_check", "Достижение")}
                >
                    <Plus size="16px" /> Достижение
                </button>
            </div>
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

    .image-upload-container {
        border: 2px dashed var(--color-border-light);
        border-radius: var(--spacing-border-radius-block);
        padding: 1rem;
        display: flex;
        justify-content: center;
        background: var(--color-bg-very-light);
    }

    .upload-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        color: var(--color-text-muted);
    }

    .upload-placeholder:hover {
        color: var(--color-primary);
    }

    .cropper-wrapper {
        position: relative;
        width: 100%;
        height: 300px;
        background: #333;
    }

    .cropper-controls {
        margin-top: 10px;
        display: flex;
        justify-content: flex-end;
    }

    .image-preview {
        position: relative;
        width: 100px;
        height: 100px;
    }

    .image-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 8px;
    }

    .btn-icon-remove {
        position: absolute;
        top: -8px;
        right: -8px;
        background: var(--color-danger-red, #ff4d4f);
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .btn-sm {
        padding: 6px 12px;
        font-size: 0.85rem;
    }
</style>
