<script>
    import { createEventDispatcher, onMount } from 'svelte';

    export let isOpen = false;
    export let sectionToEdit = null; // { id: number, title: string } | null
    export let lessonId, courseId; // Для API вызовов (хотя для секций они в URL)

    const dispatch = createEventDispatcher();

    let title = '';
    let formError = null;
    let isLoading = false;

    $: if (isOpen) {
        // Заполняем форму при открытии для редактирования
        title = sectionToEdit?.title || '';
        formError = null;
        isLoading = false;
    }

    async function handleSubmit() {
        if (!title.trim()) {
            formError = "Название раздела не может быть пустым.";
            return;
        }
        formError = null;
        isLoading = true;

        const payload = { title: title.trim() };
        // Порядок будет обрабатываться на бэкенде или при создании/перемещении

        dispatch('save', {
            isEditing: !!sectionToEdit,
            sectionId: sectionToEdit?.id,
            data: payload
        });
        // isLoading = false; // Сбросится в родительском компоненте
    }

    function closeModal() {
         // Не сбрасываем isLoading здесь, родитель управляет им
        dispatch('close');
    }

</script>

{#if isOpen}
<div class="modal-backdrop" on:click|self={closeModal}>
	<div class="modal-content" on:click|stopPropagation>
		<h3>{sectionToEdit ? 'Редактировать раздел' : 'Создать раздел'}</h3>
		<form on:submit|preventDefault={handleSubmit}>
			{#if formError}<p class="error-message">{formError}</p>{/if}

			<div class="form-group">
				<label for="section-title">Название раздела:</label>
				<input id="section-title" type="text" bind:value={title} required placeholder="Введите название...">
			</div>

			<div class="modal-actions">
				<button type="button" class="cancel-btn" on:click={closeModal} disabled={isLoading}>Отмена</button>
				<button type="submit" class="save-btn" disabled={isLoading}>
					{#if isLoading} Сохранение... {:else} {sectionToEdit ? 'Сохранить' : 'Создать'} {/if}
				</button>
			</div>
		</form>
	</div>
</div>
{/if}

<style>
	/* Используем стили, похожие на SectionItemFormModal */
    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1010; padding: 20px;} /* z-index выше чем у предыдущей */
    .modal-content { background: white; padding: 25px 30px; border-radius: 8px; width: 100%; max-width: 500px; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
    .modal-content h3 { margin-top: 0; margin-bottom: 20px; color: #333; text-align: center; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.9em; color: #444; }
    input[type="text"] { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95em; box-sizing: border-box; }
    .error-message { color: var(--color-danger-red); background: #ffebee; border: 1px solid var(--color-danger-red); padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 0.9em;}
    .modal-actions { margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #eee; padding-top: 15px; }
    .modal-actions button { padding: 10px 18px; border-radius: 5px; border: none; cursor: pointer; font-weight: 600; transition: background-color 0.2s; }
    .cancel-btn { background-color: #f0f0f0; color: #333; }
    .cancel-btn:hover { background-color: #e0e0e0; }
    .save-btn { background-color: var(--color-primary); color: white; }
    .save-btn:hover { background-color: var(--color-primary-dark); }
    .save-btn:disabled { background-color: #cccccc; cursor: not-allowed; }
</style>