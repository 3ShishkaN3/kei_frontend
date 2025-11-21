<script>
    import { Handle, Position } from "@xyflow/svelte";
    import { onMount } from "svelte";
    import { api } from "../../../api/api";
    import { API_BASE_URL } from "../../../config.js";

    export let data;

    let courses = [];
    let lessons = [];
    let loading = true;

    onMount(async () => {
        try {
            const [coursesRes, lessonsRes] = await Promise.all([
                api.get(`${API_BASE_URL}/courses/`),
                api.get(`${API_BASE_URL}/lessons/all_simple/`),
            ]);

            if (coursesRes.ok) {
                const coursesData = await coursesRes.json();
                courses = coursesData.results || coursesData;
            }

            if (lessonsRes.ok) {
                const lessonsData = await lessonsRes.json();
                lessons = lessonsData.map((l) => ({
                    id: l.id,
                    title: `${l.course__title} - ${l.title}`,
                }));
            }
        } catch (e) {
            console.error("Ошибка загрузки данных:", e);
        } finally {
            loading = false;
        }
    });

    const variables = [
        { value: "user.xp", label: "Опыт (XP) всего" },
        { value: "user.level", label: "Уровень пользователя" },
        { value: "user.streak_days", label: "Дней подряд (Стрик)" },
        { value: "user.days_since_registration", label: "Дней с регистрации" },
        { value: "user.total_lessons", label: "Всего завершенных уроков" },
        { value: "user.perfect_lessons", label: "Количество идеальных уроков" },
        { value: "user.words_learned", label: "Выучено слов" },
        { value: "user.kanji_learned", label: "Выучено кандзи" },
        { value: "user.grammar_learned", label: "Изучено грамматических тем" },
        { value: "user.course_progress", label: "Прогресс текущего курса (%)" },
        {
            value: "user.section_progress",
            label: "Прогресс текущей секции (%)",
        },
        { value: "event.lesson_id", label: "Урок" },
        { value: "event.course_id", label: "Курс" },
        { value: "event.score", label: "Результат (Score) в %" },
        { value: "event.attempts", label: "Количество попыток" },
        { value: "event.time_spent", label: "Затраченное время (сек)" },
        { value: "event.errors", label: "Количество ошибок" },
    ];

    const operators = [
        { value: "==", label: "Равно" },
        { value: "!=", label: "Не равно" },
        { value: ">", label: "Больше чем" },
        { value: "<", label: "Меньше чем" },
        { value: ">=", label: "Больше или равно" },
        { value: "<=", label: "Меньше или равно" },
    ];

    $: needsLessonDropdown = data.variable === "event.lesson_id";
    $: needsCourseDropdown = data.variable === "event.course_id";
</script>

<div class="node node--condition">
    <div class="node__header">
        <span class="node__title">Условие</span>
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
            <label class="node__label">Оператор</label>
            <select class="node__select" bind:value={data.operator}>
                {#each operators as op}
                    <option value={op.value}>{op.label}</option>
                {/each}
            </select>
        </div>
        <div class="node__field">
            <label class="node__label">Значение</label>
            {#if needsLessonDropdown}
                {#if loading}
                    <div class="loading">Загрузка уроков...</div>
                {:else}
                    <select class="node__select" bind:value={data.value}>
                        <option value="">Выберите урок</option>
                        {#each lessons as lesson}
                            <option value={lesson.id}>{lesson.title}</option>
                        {/each}
                    </select>
                {/if}
            {:else if needsCourseDropdown}
                {#if loading}
                    <div class="loading">Загрузка курсов...</div>
                {:else}
                    <select class="node__select" bind:value={data.value}>
                        <option value="">Выберите курс</option>
                        {#each courses as course}
                            <option value={course.id}>{course.title}</option>
                        {/each}
                    </select>
                {/if}
            {:else}
                <input
                    class="node__input"
                    type="text"
                    bind:value={data.value}
                    placeholder="Например: 100"
                />
            {/if}
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

        .loading {
            font-size: 0.85rem;
            color: var(--color-text-muted);
            font-style: italic;
            padding: 8px 10px;
        }

        :global(.node__handle) {
            width: 10px !important;
            height: 10px !important;
            background: var(--color-secondary) !important;
        }
    </style>
</div>
