<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';

  export let courses = [];
  export let selectedIds = [];

  const dispatch = createEventDispatcher();

  let localSelectedIds = [...selectedIds];

  function applySelection() {
    dispatch('apply', localSelectedIds);
  }

  function forceClose() {
    dispatch('close');
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      forceClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown}/>

<div class="modal-backdrop">
  <div class="modal-content" role="dialog" aria-modal="true" 
       in:fly={{ y: -50, duration: 400, easing: quintOut }} 
       out:fly={{ y: -50, duration: 300, easing: quintOut }}>
    <h2>Выберите курсы</h2>
    <div class="course-list">
      {#each courses as course}
        <label>
          <input type="checkbox" bind:group={localSelectedIds} value={course.course_id} disabled={localSelectedIds.length === 1 && localSelectedIds[0] === course.course_id} />
          {course.course_title}
        </label>
      {/each}
    </div>
    <div class="buttons">
      <button on:click={forceClose} class="cancel-btn">Отмена</button>
      <button on:click={applySelection} class="apply-btn">Применить</button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(30, 30, 40, 0.6);
    backdrop-filter: blur(5px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--color-bg-light);
    padding: var(--spacing-padding-section);
    border-radius: var(--spacing-border-radius-card);
    min-width: 400px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  h2 {
    font-family: var(--font-family-primary);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-margin-bottom-medium);
  }

  .course-list {
    margin: var(--spacing-margin-bottom-medium) 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-gap-medium);
  }

  .course-list label {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 10px;
    border-radius: var(--spacing-border-radius-block);
    transition: background-color 0.2s;
  }

  .course-list label:hover {
    background-color: var(--color-bg-ultra-light);
  }

  .course-list input[type="checkbox"] {
    margin-right: 15px;
    transform: scale(1.2);
    accent-color: var(--color-primary);
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-gap-medium);
    margin-top: var(--spacing-margin-bottom-medium);
  }

  .apply-btn,
  .cancel-btn {
    border: none;
    padding: var(--spacing-padding-button-medium);
    border-radius: var(--spacing-border-radius-button);
    font-weight: var(--font-weight-bold);
    cursor: pointer;
    transition: all 0.2s;
  }

  .apply-btn {
    background: linear-gradient(to right, var(--color-auth-button-gradient-start), var(--color-auth-button-gradient-end));
    color: var(--color-auth-button-text);
  }

  .apply-btn:hover {
    background: linear-gradient(to right, var(--color-auth-button-gradient-hover-start), var(--color-auth-button-gradient-hover-end));
  }

  .cancel-btn {
    background-color: var(--color-bg-ultra-light);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border-light);
  }

  .cancel-btn:hover {
    background-color: #e0e0e0;
  }
</style>
