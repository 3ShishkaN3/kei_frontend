<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { fly } from 'svelte/transition';
    import VolumeHigh from 'svelte-material-icons/VolumeHigh.svelte';
    import VolumeOff from 'svelte-material-icons/VolumeOff.svelte';
    import CheckCircleOutline from 'svelte-material-icons/CheckCircleOutline.svelte';
    import PencilOutline from 'svelte-material-icons/PencilOutline.svelte';
    import DeleteOutline from 'svelte-material-icons/DeleteOutline.svelte';
    import { API_BASE_URL } from '../../config';

    export let entry;
    export let isAdminView = false;

    let flipped = false;
    let audio;
    let isPlaying = false;
    let cardElement;

    const dispatch = createEventDispatcher();

    // Reset flip state when entry changes (for carousel navigation)
    $: if (entry) {
        flipped = false;
    }

    function handleFlip() {
        flipped = !flipped;
    }

    function playAudio(event) {
        event.stopPropagation();
        if (entry.pronunciation_audio && !isPlaying) {
            const audioUrl = entry.pronunciation_audio.startsWith('http') 
                ? entry.pronunciation_audio 
                : `${API_BASE_URL}${entry.pronunciation_audio}`;
            
            if (!audio) {
                audio = new Audio(audioUrl);
            }
            
            isPlaying = true;
            audio.play()
                .then(() => {
                    audio.addEventListener('ended', () => {
                        isPlaying = false;
                    });
                })
                .catch(e => {
                    console.error("Audio playback failed:", e);
                    isPlaying = false;
                });
        }
    }

    function handleToggleLearned(event) {
        event.stopPropagation();
        dispatch('toggleLearned', entry);
    }

    function handleEdit(event) {
        event.stopPropagation();
        dispatch('edit', entry);
    }

    function handleDelete(event) {
        event.stopPropagation();
        dispatch('delete', entry);
    }

    onMount(() => {
        // Add keyboard navigation
        const handleKeydown = (event) => {
            if (event.key === 'Space' && cardElement && cardElement.contains(event.target)) {
                event.preventDefault();
                handleFlip();
            }
        };
        
        document.addEventListener('keydown', handleKeydown);
        
        return () => {
            document.removeEventListener('keydown', handleKeydown);
        };
    });
</script>

<div class="card-scene" bind:this={cardElement}>
    <div class="card-container" on:click={handleFlip} role="button" tabindex="0" aria-label="Карточка: {entry.term}. Нажмите для переворота.">
        <div class="card-inner" class:flipped>
            <!-- Передняя сторона -->
            <div class="card-face card-front">
                {#if isAdminView}
                    <div class="admin-actions">
                        <button class="icon-button edit-button" title="Редактировать" on:click={handleEdit}>
                            <PencilOutline size="18px"/>
                        </button>
                        <button class="icon-button danger-button" title="Удалить" on:click={handleDelete}>
                            <DeleteOutline size="18px"/>
                        </button>
                    </div>
                {:else}
                    <div class="learned-action">
                        <button class="learned-button" class:learned={entry.is_learned} on:click={handleToggleLearned}>
                            <CheckCircleOutline size="16px" />
                        </button>
                    </div>
                {/if}
                
                <div class="main-content">
                    <span class="term">{entry.term}</span>
                </div>
                
                {#if entry.pronunciation_audio}
                    <button class="audio-button" class:playing={isPlaying} on:click={playAudio} aria-label="Воспроизвести произношение">
                        <div class="audio-icon">
                            {#if isPlaying}
                                <VolumeOff size="20px" />
                            {:else}
                                <VolumeHigh size="20px" />
                            {/if}
                        </div>
                        <div class="audio-ripple" class:active={isPlaying}></div>
                    </button>
                {/if}
            </div>

            <!-- Задняя сторона -->
            <div class="card-face card-back">
                {#if isAdminView}
                    <div class="admin-actions">
                        <button class="icon-button edit-button" title="Редактировать" on:click={handleEdit}>
                            <PencilOutline size="18px"/>
                        </button>
                        <button class="icon-button danger-button" title="Удалить" on:click={handleDelete}>
                            <DeleteOutline size="18px"/>
                        </button>
                    </div>
                {:else}
                    <div class="learned-action">
                        <button class="learned-button" class:learned={entry.is_learned} on:click={handleToggleLearned}>
                            <CheckCircleOutline size="16px" />
                        </button>
                    </div>
                {/if}
                
                <div class="main-content">
                    <div class="reading-section">
                        <p class="reading">{entry.reading}</p>
                    </div>
                    <div class="translation-section">
                        <p class="translation">{entry.translation}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .card-scene {
        position: relative;
        width: 100%;
        max-width: 550px;
        margin: 0 auto 3rem auto;
    }
    
    .card-container {
        perspective: 1200px;
        width: 100%;
        height: 350px;
        cursor: pointer;
        transition: transform 1s ease;
    }

    .card-container:hover {
        transform: scale(1.02);
    }
    
    .card-inner {
        position: relative;
        width: 100%;
        height: 100%;
        transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        transform-style: preserve-3d;
        border-radius: var(--spacing-border-radius-card, 20px);
        transform-origin: 50% 50%;
        left: 0;
        top: 0;
    }

    .card-inner.flipped {
        transform: rotateY(180deg);
    }

    .card-face {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 2rem;
        border-radius: var(--spacing-border-radius-card, 20px);
        transition: all 0.3s ease;
        transform-origin: center center;
        transform-style: preserve-3d;
    }

    .card-front {
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(15px);
        border: 2px solid rgba(194, 182, 252, 0.2);
        left: 0;
        top: 0;
    }

    .card-back {
        transform: rotateY(180deg);
        background: rgba(139, 131, 224);
        backdrop-filter: blur(15px);
        border: 2px solid rgba(139, 131, 224, 0.6);
        left: 0;
        top: 0;
    }

    .card-face:hover {
        border-color: rgba(194, 182, 252, 0.4);
    }

    .main-content {
        text-align: center;
        width: 100%;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-width: 0;
        position: relative;
        z-index: 10;
    }

    .term {
        font-size: clamp(2.8rem, 8vw, 4.5rem);
        font-weight: var(--font-weight-bold);
        background: linear-gradient(45deg, var(--color-purple-active), var(--color-pink-active));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
        line-height: 1.2;
        margin: 0;
        transition: transform 0.3s ease;
        word-break: break-word;
        hyphens: auto;
        position: relative;
        z-index: 10;
    }

    .card-face:hover .term {
        transform: scale(1.05);
    }

    .reading-section {
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid rgba(255, 255, 255, 0.7);
        animation: slideInUp 0.6s ease-out;
        width: 100%;
        position: relative;
        z-index: 10;
    }

    .reading {
        font-size: clamp(1.8rem, 4vw, 2.5rem);
        color: rgba(255, 255, 255, 1);
        font-weight: var(--font-weight-semi-bold);
        margin: 0;
        line-height: 1.3;
        word-break: break-word;
        hyphens: auto;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        position: relative;
        z-index: 10;
    }

    .translation-section {
        margin-top: 1rem;
        animation: slideInUp 0.8s ease-out;
        width: 100%;
        position: relative;
        z-index: 10;
    }

    .translation {
        font-size: clamp(1.3rem, 3vw, 1.8rem);
        color: rgba(255, 255, 255, 0.95);
        font-weight: var(--font-weight-medium);
        margin: 0;
        line-height: 1.4;
        word-break: break-word;
        hyphens: auto;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        position: relative;
        z-index: 10;
    }

    .learned-action {
        position: absolute;
        top: 20px;
        left: 20px;
        z-index: 10;
    }

    .learned-button {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid var(--color-purple-light);
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        color: var(--color-purple-active);
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: bounceIn 0.6s ease-out;
    }

    .learned-button:hover {
        transform: scale(1.1);
        background: linear-gradient(135deg, rgba(194, 182, 252, 0.2), rgba(235, 199, 242, 0.2));
    }

    .learned-button.learned {
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        border-color: #4CAF50;
        animation: successPulse 0.6s ease-out;
    }

    .learned-button.learned:hover {
        background: linear-gradient(135deg, #45a049, #3d8b40);
        border-color: #45a049;
    }

    .audio-button {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        border: 2px solid var(--color-purple-light);
        border-radius: 50%;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--color-purple-active);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 5;
        animation: bounceIn 0.8s ease-out;
    }

    .audio-button:hover {
        background: linear-gradient(135deg, var(--color-purple-light), var(--color-pink-light));
        color: var(--color-text-light);
        transform: scale(1.1);
    }

    .audio-button.playing {
        background: linear-gradient(135deg, var(--color-purple-active), var(--color-pink-active));
        color: var(--color-text-light);
        animation: pulse 1.5s infinite;
    }

    .audio-ripple {
        position: absolute;
        top: -4px;
        left: -4px;
        right: -4px;
        bottom: -4px;
        border: 2px solid var(--color-purple-light);
        border-radius: 50%;
        opacity: 0;
        transform: scale(1);
        transition: all 0.3s ease;
    }

    .audio-ripple.active {
        opacity: 0.6;
        transform: scale(1.2);
        animation: ripple 1.5s infinite;
    }

    .admin-actions {
        position: absolute;
        top: 15px;
        right: 15px;
        display: flex;
        gap: 10px;
        z-index: 10;
    }
    
    .icon-button {
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        border: 2px solid var(--color-border-light);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--color-text-muted);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        animation: bounceIn 0.6s ease-out;
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

    /* Animations */
    @keyframes bounceIn {
        0% {
            transform: scale(0.3);
            opacity: 0;
        }
        50% {
            transform: scale(1.05);
        }
        70% {
            transform: scale(0.9);
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }

    @keyframes slideInUp {
        0% {
            transform: translateY(30px);
            opacity: 0;
        }
        100% {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes successPulse {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.2);
        }
        100% {
            transform: scale(1);
        }
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }

    @keyframes ripple {
        0% {
            transform: scale(1);
            opacity: 0.6;
        }
        100% {
            transform: scale(1.4);
            opacity: 0;
        }
    }

    /* Focus styles for accessibility */
    .card-container:focus {
        outline: none;
    }

    .card-container:focus-visible {
        outline: 2px solid var(--color-purple-active);
        outline-offset: 2px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .card-container {
            height: 320px;
        }

        .card-face {
            padding: 1.5rem;
        }

        .term {
            font-size: clamp(2.2rem, 6vw, 3.5rem);
        }

        .reading {
            font-size: clamp(1.5rem, 3vw, 2rem);
        }

        .translation {
            font-size: clamp(1.1rem, 2.5vw, 1.5rem);
        }

        .audio-button {
            width: 45px;
            height: 45px;
            top: 15px;
            right: 15px;
        }

        .learned-button {
            width: 35px;
            height: 35px;
            top: 15px;
            left: 15px;
        }

        .admin-actions {
            top: 10px;
            right: 10px;
            gap: 8px;
        }

        .icon-button {
            width: 36px;
            height: 36px;
        }
    }

    @media (max-width: 480px) {
        .card-scene {
            max-width: 95%;
            margin: 0 auto 2rem auto;
        }

        .card-container {
            height: 300px;
            min-width: 280px;
        }

        .card-face {
            padding: 1.2rem;
            min-width: 0;
        }

        .main-content {
            width: 100%;
            min-width: 0;
            overflow-wrap: break-word;
        }

        .term {
            font-size: clamp(2rem, 5vw, 3rem);
            line-height: 1.1;
            max-width: 100%;
        }

        .reading {
            font-size: clamp(1.3rem, 2.5vw, 1.8rem);
            line-height: 1.2;
            max-width: 100%;
        }

        .translation {
            font-size: clamp(1rem, 2vw, 1.3rem);
            line-height: 1.3;
            max-width: 100%;
        }

        .audio-button {
            width: 40px;
            height: 40px;
            top: 12px;
            right: 12px;
        }

        .learned-button {
            width: 32px;
            height: 32px;
            top: 12px;
            left: 12px;
        }

        .admin-actions {
            top: 8px;
            right: 8px;
            gap: 6px;
        }

        .icon-button {
            width: 32px;
            height: 32px;
        }

        .reading-section {
            margin-bottom: 1rem;
            padding-bottom: 0.8rem;
        }
    }
</style>