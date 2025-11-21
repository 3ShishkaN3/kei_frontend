<script>
    import { Handle, Position } from "@xyflow/svelte";
    import { onMount } from "svelte";
    import { api } from "../../../api/api";
    import { API_BASE_URL } from "../../../config.js";

    export let data;

    const triggers = [
        {
            value: "ON_LESSON_COMPLETE",
            label: "Завершение урока",
            hasParam: true,
        },
        {
            value: "ON_COURSE_COMPLETE",
            label: "Завершение курса",
            hasParam: true,
        },
        {
            value: "ON_PERFECT_LESSON",
            label: "Идеальный урок (100%)",
            hasParam: false,
        },
        { value: "ON_XP_GAIN", label: "Получение опыта", hasParam: false },
        { value: "ON_LEVEL_UP", label: "Повышение уровня", hasParam: false },
        {
            value: "ON_STREAK_UPDATE",
            label: "Обновление стрика",
            hasParam: false,
        },
        { value: "ON_WORD_LEARNED", label: "Выучено слово", hasParam: false },
        { value: "ON_KANJI_LEARNED", label: "Выучено кандзи", hasParam: false },
        { value: "ON_DAILY_LOGIN", label: "Ежедневный вход", hasParam: false },
    ];

    let courses = [];
    let lessons = [];
    let loading = true;
    let error = null;

    onMount(async () => {
        console.log("TriggerNode: Начало загрузки данных");
        try {
            const [coursesRes, lessonsRes] = await Promise.all([
                api.get(`${API_BASE_URL}/courses/`),
                api.get(`${API_BASE_URL}/lessons/all_simple/`),
            ]);

            if (coursesRes.ok) {
                const data = await coursesRes.json();
                courses = data.results || data;
                console.log("Loaded courses:", courses.length);
            } else {
                console.error("Failed to load courses:", coursesRes.status);
            }

            if (lessonsRes.ok) {
                const data = await lessonsRes.json();
                lessons = data.map((l) => ({
                    id: l.id,
                    title: `${l.course__title} - ${l.title}`,
                }));
                console.log("Loaded lessons:", lessons.length);
            } else {
                console.error("Failed to load lessons:", lessonsRes.status);
            }
        } catch (e) {
            console.error("Ошибка загрузки данных:", e);
            error = e.message;
        } finally {
            loading = false;
            console.log("TriggerNode: Загрузка завершена");
        }
    });

    $: currentTrigger = triggers.find((t) => t.value === data.trigger);
</script>

<div class="node node--trigger">
    <div class="node__header">
        <span class="node__title">🎯 Триггер</span>
    </div>
    <div class="node__content">
        <div class="node__field">
            <label class="node__label">Событие</label>
            <select class="node__select" bind:value={data.trigger}>
                <option value="" disabled>Выберите триггер</option>
                {#each triggers as t}
                    <option value={t.value}>{t.label}</option>
                {/each}
            </select>
        </div>

        {#if currentTrigger?.hasParam}
            {#if loading}
                <div class="loading">Загрузка...</div>
            {:else if error}
                <div class="error">Ошибка: {error}</div>
            {:else}
                {#if data.trigger === "ON_LESSON_COMPLETE"}
                    <div class="node__field">
                        <label class="node__label"
                            >Урок {lessons.length > 0
                                ? `(${lessons.length})`
                                : ""}</label
                        >
                        <select
                            class="node__select"
                            bind:value={data.lesson_id}
                        >
                            <option value={null}>Любой урок</option>
                            {#each lessons as lesson}
                                <option value={lesson.id}>{lesson.title}</option
                                >
                            {/each}
                        </select>
                    </div>
                {/if}

                {#if data.trigger === "ON_COURSE_COMPLETE"}
                    <div class="node__field">
                        <label class="node__label"
                            >Курс {courses.length > 0
                                ? `(${courses.length})`
                                : ""}</label
                        >
                        <select
                            class="node__select"
                            bind:value={data.course_id}
                        >
                            <option value={null}>Любой курс</option>
                            {#each courses as course}
                                <option value={course.id}>{course.title}</option
                                >
                            {/each}
                        </select>
                    </div>
                {/if}
            {/if}
        {/if}
    </div>
    <Handle type="source" position={Position.Bottom} class="node__handle" />
</div>

<style>
    .node {
        background: var(--color-bg-light);
        border: 1px solid var(--color-block-border);
        border-radius: var(--spacing-border-radius-block);
        min-width: 260px;
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

    .loading {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        font-style: italic;
        padding: 5px 0;
    }

    .error {
        font-size: 0.85rem;
        color: var(--color-error);
        padding: 5px 0;
    }

    :global(.node__handle) {
        width: 10px !important;
        height: 10px !important;
        background: var(--color-primary) !important;
    }
</style>
