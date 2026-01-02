
<script>
    import { createEventDispatcher } from 'svelte';
  
    export let x = 0;
    export let y = 0;
    export let visible = false;
    export let options = [];
  
    const dispatch = createEventDispatcher();
  
    function handleClick(option) {
      if (option.action) {
        dispatch('select', { action: option.action });
      }
      if (option.type !== 'color-trigger' && option.action !== 'eyedropper') {
          dispatch('close');
      }
    }
  
    function selectPaletteColor(colorValue) {
      dispatch('select', { action: 'set_color', value: colorValue });
      dispatch('close');
    }
  
    function requestNativeColorPicker(event, option) {
      event.stopPropagation();
      dispatch('requestColorPicker', { x: event.clientX, y: event.clientY, option });
    }
  </script>
  
  {#if visible}
    <div
      class="custom-context-menu"
      style="top: {y}px; left: {x}px;"
      on:click|stopPropagation
      on:contextmenu|preventDefault
    >
      <ul>
        {#each options as option}
          <li>
            {#if option.type === 'separator'}
              <hr />
            {:else if option.type === 'color-palette'}
              <div class="color-palette-container">
                <span class="palette-label">{option.label}:</span>
                <div class="palette-colors">
                  {#each option.colors as color}
                    <button
                      class="palette-color-button"
                      style="background-color: {color};"
                      title="Выбрать {color}"
                      on:click={() => selectPaletteColor(color)}
                      aria-label="Выбрать цвет {color}"
                    ></button>
                  {/each}
                </div>
                {#if option.allowMore}
                  <button class="palette-more-button" on:click={(e) => requestNativeColorPicker(e, option)}>Другой...</button>
                {/if}
              </div>
            {:else if option.type === 'eyedropper-trigger'}
               <button on:click={() => handleClick(option)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="menu-icon">
                      <path d="m18 3 3 3-8 8h-3v-3Z"></path><path d="m15 6-3.4 3.4"></path><path d="M9 12H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1"></path>
                  </svg>
                  {option.label}
              </button>
            {:else}
              <button on:click={() => handleClick(option)}>
                {option.label}
              </button>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  
  <style>
    .custom-context-menu {
      position: fixed;
      background-color: white;
      border: 1px solid #ccc;
      box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      min-width: 180px;
      max-width: 280px;
      border-radius: var(--spacing-border-radius-small, 6px);
      max-height: min(350px, 80vh);
      display: flex;
      flex-direction: column;
    }
    .custom-context-menu ul {
      list-style: none;
      padding: 5px 0;
      margin: 0;
      overflow-y: auto;
      flex-grow: 1;
      &::-webkit-scrollbar {
        width: 6px;
      }
      &::-webkit-scrollbar-thumb {
        background-color: #ccc;
        border-radius: 3px;
      }
      &::-webkit-scrollbar-track {
        background-color: #f1f1f1;
      }
    }
    .custom-context-menu li button {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 9px 15px;
      text-align: left;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.9rem;
      gap: 8px;
    }
    .custom-context-menu li button:hover {
      background-color: #f0f0f0;
    }
    .custom-context-menu hr {
      border: none;
      border-top: 1px solid #eee;
      margin: 4px 0;
    }
  
    .menu-icon {
      opacity: 0.7;
    }
  
    .color-palette-container {
      padding: 5px 12px 8px 12px;
    }
    .palette-label {
      display: block;
      margin-bottom: 6px;
      font-size: 0.8rem;
      color: #777;
      font-weight: 500;
    }
    .palette-colors {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .palette-color-button {
      width: 22px;
      height: 22px;
      border: 1px solid rgba(0,0,0,0.15);
      padding: 0;
      cursor: pointer;
      border-radius: 4px;
      transition: transform 0.1s ease-out;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.3);
    }
    .palette-color-button:hover {
      border-color: #333;
      transform: scale(1.15);
    }
    .palette-more-button {
      margin-top: 8px;
      font-size: 0.8rem;
      padding: 4px 8px;
      background: #f7f7f7;
      border: 1px solid #ddd;
      border-radius: 3px;
      cursor: pointer;
      color: #333;
    }
    .palette-more-button:hover {
      background: #e9e9e9;
      border-color: #ccc;
    }
  </style>