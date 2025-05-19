<script>
    import { createEventDispatcher } from 'svelte';
    import { DraggableItemModel } from '../../../../models/testTypes.js';
    import { nanoid } from 'nanoid';
    import PlusCircleOutline from 'svelte-material-icons/PlusCircleOutline.svelte';
    import DeleteOutline from 'svelte-material-icons/DeleteOutline.svelte';
    import CheckboxMarked from 'svelte-material-icons/CheckboxMarked.svelte';
    import CheckboxBlankOutline from 'svelte-material-icons/CheckboxBlankOutline.svelte';

    export let items = []; // Массив DraggableItemModel
    export let isLoading = false;
    export let title = "Элементы для перетаскивания (облачка)";

    const dispatch = createEventDispatcher();

    function addItem() {
        const newItem = new DraggableItemModel({ id: `temp_drag_${nanoid(6)}`, text: '', is_distractor: false });
        items = [...items, newItem];
        dispatch('change', items);
    }

    function removeItem(index) {
        if (items.length <= 1 && items.some(it => !it.is_distractor)) {
            // Предотвращаем удаление последнего не-дистрактора, если есть хотя бы один слот/цель, которая на него ссылается
            // Более сложная логика проверки ссылок нужна будет в родительских формах.
            // Здесь простое ограничение: не удалять последний, если он не дистрактор.
            // addNotification("Нельзя удалить последний элемент, если он не является лишним.", "warning");
            // return;
        }
        items.splice(index, 1);
        items = [...items];
        dispatch('change', items);
    }

    function updateItem() {
        // Эта функция вызывается при изменении текста в input,
        // так как bind:value работает. Нужно только сообщить родителю.
        dispatch('change', items);
    }
    function toggleDistractor(index) {
        items[index].is_distractor = !items[index].is_distractor;
        items = [...items];
        dispatch('change', items);
    }
</script>

<div class="draggable-items-manager">
    <h5 class="manager-title">{title}</h5>
    {#if items.length === 0}
        <p class="no-items-message">Пока нет элементов. Добавьте первый.</p>
    {/if}
    {#each items as item, index (item.id)}
        <div class="draggable-item-entry">
            <div class="form-group item-text-group">
                <label for={`draggable-item-text-${item.id}`}>Текст облачка #{index + 1}</label>
                <input 
                    type="text" 
                    id={`draggable-item-text-${item.id}`}
                    bind:value={item.text} 
                    on:input={updateItem}
                    placeholder="Текст на облачке" 
                    disabled={isLoading} 
                />
            </div>
            <div class="form-group-custom-checkbox item-distractor-group">
                <input 
                    type="checkbox" 
                    id={`draggable-item-distractor-${item.id}`}
                    class="custom-checkbox-input"
                    checked={item.is_distractor}
                    on:change={() => toggleDistractor(index)}
                    disabled={isLoading}
                />
                <label for={`draggable-item-distractor-${item.id}`} class="custom-checkbox-label small-label">
                    <span class="checkbox-visual small-visual">
                        {#if item.is_distractor} <CheckboxMarked size="16px"/> {:else} <CheckboxBlankOutline size="16px"/> {/if}
                    </span>
                    Лишний (дистрактор)
                </label>
            </div>
            <button 
                type="button" 
                class="remove-item-btn" 
                on:click={() => removeItem(index)} 
                title="Удалить облачко"
                disabled={isLoading}
            >
                <DeleteOutline size="18px" />
            </button>
        </div>
    {/each}
    <button type="button" class="add-item-btn-small" on:click={addItem} disabled={isLoading}>
        <PlusCircleOutline size="16px" /> Добавить облачко
    </button>
</div>

<style>
    .draggable-items-manager { margin-bottom: 20px; padding: 15px; border: 1px solid #e9ecef; border-radius: 8px; background-color: #fdfdff; }
    .manager-title { font-size: 1em; font-weight: 600; color: var(--color-text-dark); margin-top: 0; margin-bottom: 12px; }
    .no-items-message { font-size: 0.9em; color: #777; font-style: italic; }
    .draggable-item-entry { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dotted #f0f0f0; }
    .draggable-item-entry:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .item-text-group { flex-grow: 1; margin-bottom: 0 !important; }
    .item-text-group label { font-size: 0.85em !important; margin-bottom: 4px !important; }
    .item-text-group input { font-size: 0.9em !important; padding: 8px 10px !important; }
    
    .item-distractor-group { margin-bottom: 8px; /* Выровнять с инпутом */ }
    .custom-checkbox-label.small-label { font-size: 0.85em !important; }
    .checkbox-visual.small-visual { width: 18px !important; height: 18px !important; margin-right: 6px !important; }
    .checkbox-visual.small-visual :global(svg) { width: 14px; height: 14px; }

    .remove-item-btn { background: none; border: none; color: #999; cursor: pointer; padding: 5px; align-self: center; margin-bottom: 8px; /* Примерно на уровень инпута */}
    .remove-item-btn:hover { color: var(--color-danger-red); }
    .add-item-btn-small { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 0.85em; color: var(--color-primary); background-color: transparent; border: 1px dashed var(--color-primary); border-radius: 20px; cursor: pointer; margin-top: 10px; }
    .add-item-btn-small:hover { background-color: rgba(var(--color-primary-rgb), 0.05); }
</style>