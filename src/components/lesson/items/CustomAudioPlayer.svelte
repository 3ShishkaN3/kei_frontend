<script>
    import { onMount, onDestroy } from 'svelte';
    import Play from 'svelte-material-icons/Play.svelte';
    import Pause from 'svelte-material-icons/Pause.svelte';
    import VolumePluse from 'svelte-material-icons/VolumePlus.svelte';
    import VolumeMute from 'svelte-material-icons/VolumeMute.svelte';
    import FastForward from 'svelte-material-icons/FastForward.svelte';
    import Rewind from 'svelte-material-icons/Rewind.svelte'; // Для примера, можно убрать

    export let src = '';
    export let title = '';

    let audioPlayer; // HTMLAudioElement
    let isPlaying = false;
    let currentTime = 0;
    let duration = 0;
    let volume = 1;
    let playbackRate = 1;
    let isSeeking = false;
    let currentVolumeBeforeMute = 1;

    const supportedRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

    onMount(() => {
        if (audioPlayer) {
            audioPlayer.addEventListener('loadedmetadata', handleMetadata);
            audioPlayer.addEventListener('timeupdate', handleTimeUpdate);
            audioPlayer.addEventListener('play', () => isPlaying = true);
            audioPlayer.addEventListener('pause', () => isPlaying = false);
            audioPlayer.addEventListener('ended', () => isPlaying = false);
            audioPlayer.addEventListener('volumechange', handleVolumeChange);
            // Установим начальную громкость
            audioPlayer.volume = volume;
        }
        return () => {
            // Очистка слушателей
            if (audioPlayer) {
                audioPlayer.removeEventListener('loadedmetadata', handleMetadata);
                audioPlayer.removeEventListener('timeupdate', handleTimeUpdate);
                // ... remove other listeners
            }
        };
    });

    function handleMetadata() {
        duration = audioPlayer.duration;
    }

    function handleTimeUpdate() {
         if (!isSeeking) { // Не обновляем currentTime во время перетаскивания ползунка
            currentTime = audioPlayer.currentTime;
         }
    }

    function handleVolumeChange() {
         if (!audioPlayer.muted) {
            volume = audioPlayer.volume;
         }
    }


    function togglePlay() {
        if (!audioPlayer) return;
        if (audioPlayer.paused) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
        isPlaying = !audioPlayer.paused;
    }

    function handleSeek(event) {
         if (!audioPlayer || !duration) return;
         const seekTime = parseFloat(event.target.value);
         audioPlayer.currentTime = seekTime;
         currentTime = seekTime; // Обновляем сразу для UI
    }

    function handleSeeking(event) {
         // Обновляем currentTime во время перетаскивания для немедленного отклика
         isSeeking = true;
         currentTime = parseFloat(event.target.value);
    }

    function endSeek() {
         isSeeking = false;
         // Если время было изменено, оно уже установлено в handleSeek
    }


    function handleVolumeSeek(event) {
         if (!audioPlayer) return;
         const newVolume = parseFloat(event.target.value);
         audioPlayer.volume = newVolume;
         volume = newVolume;
         audioPlayer.muted = newVolume === 0; // Автоматически мьютим при 0
    }

    function toggleMute() {
         if (!audioPlayer) return;
         if (audioPlayer.muted) {
             audioPlayer.muted = false;
             volume = currentVolumeBeforeMute > 0.05 ? currentVolumeBeforeMute : 0.5; // Восстанавливаем или ставим 0.5
             audioPlayer.volume = volume;
         } else {
             currentVolumeBeforeMute = volume; // Запоминаем текущую громкость
             audioPlayer.muted = true;
             volume = 0; // Отображаем 0 на ползунке
         }
    }


    function changePlaybackRate() {
        if (!audioPlayer) return;
        const currentIndex = supportedRates.indexOf(playbackRate);
        const nextIndex = (currentIndex + 1) % supportedRates.length;
        playbackRate = supportedRates[nextIndex];
        audioPlayer.playbackRate = playbackRate;
    }

    function formatTime(time) {
        if (isNaN(time) || time === Infinity) return '00:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `<span class="math-inline">\{String\(minutes\)\.padStart\(2, '0'\)\}\:</span>{String(seconds).padStart(2, '0')}`;
    }

    // Style for progress bar fill
    $: progressPercent = duration ? (currentTime / duration) * 100 : 0;
    $: volumePercent = volume * 100;

</script>

<div class="custom-audio-player">
    {#if title}<p class="audio-title">{title}</p>{/if}
    <audio bind:this={audioPlayer} {src} preload="metadata"></audio>

    <div class="controls">
        <button class="control-btn play-pause-btn" on:click={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {#if isPlaying} <Pause size="24px" /> {:else} <Play size="24px" /> {/if}
        </button>

        <div class="time-display current-time">{formatTime(currentTime)}</div>

        <div class="progress-bar-container">
             <input
                type="range"
                class="progress-bar"
                min="0"
                max={duration || 0}
                bind:value={currentTime}
                on:input={handleSeeking}
                on:change={handleSeek}
                on:mouseup={endSeek}
                on:touchend={endSeek}
                aria-label="Таймлайн аудио"
                style="--progress-percent: {progressPercent}%"
            />
        </div>

        <div class="time-display duration">{formatTime(duration)}</div>

        <div class="volume-control">
            <button class="control-btn mute-btn" on:click={toggleMute} aria-label={volume === 0 ? 'Unmute' : 'Mute'}>
                 {#if volume === 0} <VolumeMute size="20px" /> {:else} <VolumePluse size="20px" /> {/if}
            </button>
             <input
                type="range"
                class="volume-slider"
                min="0"
                max="1"
                step="0.05"
                bind:value={volume}
                on:input={handleVolumeSeek}
                aria-label="Громкость"
                style="--volume-percent: {volumePercent}%"
            />
        </div>

        <button class="control-btn speed-btn" on:click={changePlaybackRate} title="Скорость воспроизведения">
            {playbackRate}x
        </button>
    </div>
</div>

<style>
    .custom-audio-player {
        background-color: #f8f8f8;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 10px 15px;
        font-family: sans-serif;
    }
    .audio-title {
        font-weight: bold;
        margin-bottom: 8px;
        font-size: 0.95em;
        color: #333;
    }
    .controls {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .control-btn {
        background: none;
        border: none;
        padding: 5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #555;
        border-radius: 4px;
        transition: background-color 0.2s;
    }
    .control-btn:hover {
         background-color: #eee;
    }
     .play-pause-btn { color: var(--color-primary); }

    .time-display {
        font-size: 0.85em;
        color: #444;
        min-width: 40px; /* Ensure space */
        text-align: center;
    }

    .progress-bar-container {
        flex-grow: 1; /* Takes up remaining space */
        position: relative;
         height: 20px; /* Height for interaction area */
         display: flex;
         align-items: center;
    }

    /* Base track style */
    input[type="range"] {
        -webkit-appearance: none; /* Override default look */
        appearance: none;
        width: 100%;
        height: 6px; /* Track height */
        background: #7885cd40; /* Base color with opacity */
        border-radius: 3px;
        cursor: pointer;
        outline: none;
         margin: 0; /* Reset margin */
    }

    /* Style for the filled part (progress/volume) */
    input[type="range"]::-webkit-slider-runnable-track {
        /* Style for Webkit/Blink */
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(to right, var(--color-primary-dark) var(--progress-percent, 0%), #7885cd40 var(--progress-percent, 0%));
    }
    input[type="range"].volume-slider::-webkit-slider-runnable-track {
        background: linear-gradient(to right, var(--color-primary-dark) var(--volume-percent, 0%), #7885cd40 var(--volume-percent, 0%));
    }

    input[type="range"]::-moz-range-track {
         /* Style for Firefox */
         width: 100%;
         height: 6px;
         background: #7885cd40;
         border-radius: 3px;
         cursor: pointer;
    }
    input[type="range"]::-moz-range-progress {
        height: 6px;
        background-color: var(--color-primary-dark); /* Darker shade for filled part */
        border-radius: 3px;
    }
     /* Reset background for the main track in FF to show progress correctly */
     input[type="range"].volume-slider::-moz-range-track {
         background: #7885cd40;
     }
     input[type="range"].volume-slider::-moz-range-progress {
         background-color: var(--color-primary-dark);
     }


    /* Thumb (handle) style */
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: var(--color-primary);
        border-radius: 50%;
        cursor: pointer;
        margin-top: -4px; /* Center thumb vertically */
    }

    input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: var(--color-primary);
        border-radius: 50%;
        cursor: pointer;
        border: none;
    }

    .volume-control {
        display: flex;
        align-items: center;
        gap: 5px;
        width: 100px; /* Fixed width for volume */
    }
     .volume-slider {
         flex-grow: 1;
     }

     .speed-btn {
         font-size: 0.8em;
         font-weight: bold;
         min-width: 40px;
         padding: 4px 6px;
         border: 1px solid #ccc;
     }
     .speed-btn:hover {
         border-color: #aaa;
         background-color: #eee;
     }

</style>