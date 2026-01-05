<script>
    import { createEventDispatcher } from 'svelte';
    import PencilOutline from 'svelte-material-icons/PencilOutline.svelte';
    import DeleteOutline from 'svelte-material-icons/DeleteOutline.svelte';

    export let entries = [];
    export let isAdminView = false;

    const dispatch = createEventDispatcher();

    function handleToggleLearned(entry) {
        dispatch('toggleLearned', entry);
    }

    function handleEdit(entry) {
        dispatch('edit', entry);
    }

    function handleDelete(entry) {
        dispatch('delete', entry);
    }
</script>

<div class="table-container">
    <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th class="col-check">Изучено</th>
                    <th class="col-term">Слово</th>
                    <th class="col-reading">Чтение</th>
                    <th class="col-translation">Перевод</th>
                    {#if isAdminView}
                        <th class="col-actions">Действия</th>
                    {/if}
                </tr>
            </thead>
            <tbody>
                {#each entries as entry (entry.id)}
                    <tr class:learned-row={entry.is_learned && !isAdminView}>
                        <td class="col-check">
                            <label class="checkbox-container">
                                <input 
                                    type="checkbox" 
                                    checked={entry.is_learned}
                                    on:change={() => handleToggleLearned(entry)}
                                    title={entry.is_learned ? 'Отметить как неизученное' : 'Отметить как изученное'}
                                />
                                <span class="checkmark"></span>
                            </label>
                        </td>
                        <td class="col-term">{entry.term}</td>
                        <td class="col-reading">{entry.reading}</td>
                        <td class="col-translation">{entry.translation}</td>
                        {#if isAdminView}
                            <td class="col-actions">
                                <button class="icon-button edit-button" title="Редактировать" on:click={() => handleEdit(entry)}>
                                    <PencilOutline size="18px"/>
                                </button>
                                <button class="icon-button danger-button" title="Удалить" on:click={() => handleDelete(entry)}>
                                    <DeleteOutline size="18px"/>
                                </button>
                            </td>
                        {/if}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>

<style>
    .table-container {
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(15px);
        border-radius: var(--spacing-border-radius-large, 16px);
        border: 2px solid rgba(194, 182, 252, 0.2);
        box-shadow: 0 8px 32px rgba(194, 182, 252, 0.2);
        overflow: hidden;
        transition: all 0.3s ease;
    }

    .table-container:hover {
        box-shadow: 0 12px 40px rgba(194, 182, 252, 0.3);
        border-color: rgba(194, 182, 252, 0.3);
    }

    .table-wrapper {
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 1rem;
        position: relative;
    }

    th, td {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid rgba(194, 182, 252, 0.15);
        vertical-align: middle;
    }

    thead {
        position: sticky;
        top: 0;
        z-index: 10;
    }

    thead th {
        background: linear-gradient(135deg, var(--color-purple-light), var(--color-pink-light));
        color: var(--color-text-light);
        font-weight: var(--font-weight-bold);
        text-transform: uppercase;
        font-size: 0.85rem;
        letter-spacing: 1px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
        box-shadow: 0 2px 8px rgba(194, 182, 252, 0.3);
    }

    tbody tr:last-child td {
        border-bottom: none;
    }

    tbody tr {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        animation: fadeIn 0.5s ease-out;
        animation-fill-mode: both;
    }

    tbody tr:hover {
        background: linear-gradient(135deg, rgba(194, 182, 252, 0.05), rgba(235, 199, 242, 0.05));
    }



    tr.learned-row {
        color: var(--color-text-muted);
        background: rgba(0, 0, 0, 0.02);
    }

    tr.learned-row .col-term,
    tr.learned-row .col-reading,
    tr.learned-row .col-translation {
        text-decoration: line-through;
        opacity: 0.6;
    }
    
    .col-check { 
        width: 100px; 
        text-align: center; 
        padding: 1rem 0.5rem;
    }
    
    .col-term { 
        font-weight: var(--font-weight-bold); 
        color: var(--color-text-dark); 
        font-size: 1.1rem;
        background: linear-gradient(45deg, var(--color-purple-active), var(--color-pink-active));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        min-width: 120px;
    }

    .col-reading {
        color: var(--color-purple-active);
        font-weight: var(--font-weight-semi-bold);
        min-width: 120px;
    }

    .col-translation {
        color: var(--color-purple-active);
        min-width: 150px;
    }
    
    .col-actions { 
        width: 120px; 
        text-align: center; 
        padding: 1rem 0.5rem;
    }
    
    .icon-button {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(5px);
        border: 2px solid transparent;
        cursor: pointer;
        padding: 8px;
        margin: 0 4px;
        border-radius: 50%;
        color: var(--color-text-muted);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .icon-button:hover { 
        transform: scale(1.1);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    }

    .icon-button.edit-button:hover {
        background: linear-gradient(135deg, var(--color-purple-light), var(--color-pink-light));
        color: var(--color-text-light);
        border-color: var(--color-purple-light);
    }

    .icon-button.danger-button:hover { 
        background: linear-gradient(135deg, #ff6b6b, #ff5252);
        color: var(--color-text-light);
        border-color: #ff6b6b;
    }

    .checkbox-container {
        display: inline-block;
        position: relative;
        cursor: pointer;
        width: 24px;
        height: 24px;
    }

    .checkbox-container input {
        position: absolute;
        opacity: 0;
        cursor: pointer;
        height: 0;
        width: 0;
    }

    .checkmark {
        position: absolute;
        top: 0;
        left: 0;
        height: 24px;
        width: 24px;
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(5px);
        border: 2px solid rgba(194, 182, 252, 0.3);
        border-radius: 6px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(194, 182, 252, 0.2);
    }

    .checkbox-container:hover .checkmark {
        background: rgba(194, 182, 252, 0.1);
        border-color: var(--color-purple-light);
        transform: scale(1.05);
    }

    .checkbox-container input:checked ~ .checkmark {
        background: linear-gradient(135deg, var(--color-purple-active), var(--color-pink-active));
        border-color: var(--color-purple-active);
        box-shadow: 0 4px 15px rgba(194, 182, 252, 0.4);
    }

    .checkmark:after {
        content: "";
        position: absolute;
        display: none;
    }

    .checkbox-container input:checked ~ .checkmark:after {
        display: block;
    }

    .checkbox-container .checkmark:after {
        left: 8px;
        top: 4px;
        width: 6px;
        height: 12px;
        border: solid white;
        border-width: 0 3px 3px 0;
        transform: rotate(45deg);
    }

    @media (max-width: 768px) {
        th, td {
            padding: 0.8rem 1rem;
            font-size: 0.9rem;
        }

        .col-check, .col-actions {
            width: 80px;
            padding: 0.8rem 0.5rem;
        }

        .col-term {
            font-size: 1rem;
            min-width: 100px;
        }

        .col-reading, .col-translation {
            min-width: 100px;
        }

        .icon-button {
            padding: 6px;
            margin: 0 2px;
        }

        .checkbox-container, .checkmark {
            width: 20px;
            height: 20px;
        }

        .checkbox-container .checkmark:after {
            left: 7px;
            top: 3px;
            width: 5px;
            height: 10px;
        }
    }

    @media (max-width: 480px) {
        .table-wrapper {
            max-height: 60vh;
        }

        th, td {
            padding: 0.6rem 0.8rem;
            font-size: 0.85rem;
        }

        thead th {
            font-size: 0.75rem;
        }

        .col-check, .col-actions {
            width: 70px;
            padding: 0.6rem 0.4rem;
        }

        .col-term {
            font-size: 0.95rem;
            min-width: 90px;
        }

        .col-reading, .col-translation {
            min-width: 90px;
        }

        .icon-button {
            padding: 4px;
            margin: 0 1px;
        }

        .checkbox-container, .checkmark {
            width: 18px;
            height: 18px;
        }

        .checkbox-container .checkmark:after {
            left: 6px;
            top: 2px;
            width: 4px;
            height: 8px;
            border-width: 0 2px 2px 0;
        }
    }

    .table-wrapper::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    .table-wrapper::-webkit-scrollbar-track {
        background: rgba(194, 182, 252, 0.1);
        border-radius: 4px;
    }

    .table-wrapper::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, var(--color-purple-light), var(--color-pink-light));
        border-radius: 4px;
    }

    .table-wrapper::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, var(--color-purple-active), var(--color-pink-active));
    }


    @keyframes fadeIn {
        0% {
            opacity: 0;
            transform: translateY(20px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }

    tbody tr:nth-child(1) { animation-delay: 0.1s; }
    tbody tr:nth-child(2) { animation-delay: 0.15s; }
    tbody tr:nth-child(3) { animation-delay: 0.2s; }
    tbody tr:nth-child(4) { animation-delay: 0.25s; }
    tbody tr:nth-child(5) { animation-delay: 0.3s; }
    tbody tr:nth-child(6) { animation-delay: 0.35s; }
    tbody tr:nth-child(7) { animation-delay: 0.4s; }
    tbody tr:nth-child(8) { animation-delay: 0.45s; }
    tbody tr:nth-child(9) { animation-delay: 0.5s; }
    tbody tr:nth-child(10) { animation-delay: 0.55s; }
</style> 