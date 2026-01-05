<script>
	import { onMount, onDestroy, tick } from 'svelte';
    import { fly, slide, fade } from 'svelte/transition';

	import Play from 'svelte-material-icons/Play.svelte';
	import Pause from 'svelte-material-icons/Pause.svelte';
	import VolumeHigh from 'svelte-material-icons/VolumeHigh.svelte';
	import VolumeMute from 'svelte-material-icons/VolumeOff.svelte';
    import FileDocumentOutline from 'svelte-material-icons/FileDocumentOutline.svelte';
    import ChevronDown from 'svelte-material-icons/ChevronDown.svelte';
    import ChevronUp from 'svelte-material-icons/ChevronUp.svelte';


	export let contentDetails;

	let audioPlayer;
	let isPlaying = false;
	let currentTime = 0;
	let duration = 0;
	let volume = 0.75;
	let progressPercent = 0;
    let showTranscript = false;
    let isMuted = false;
    let previousVolume = 0.75;

	$: finalFullAudioUrl = contentDetails?.audio_file;

	function togglePlay() {
		if (!audioPlayer) return;
		if (audioPlayer.paused || audioPlayer.ended) {
			audioPlayer.play().catch(error => console.error("Error playing audio:", error));
		} else {
			audioPlayer.pause();
		}
	}

	function formatTime(time) {
        if (isNaN(time) || time === Infinity || !isFinite(time)) return '0:00';
		const minutes = Math.floor(time / 60);
		const seconds = Math.floor(time % 60).toString().padStart(2, '0');
		return `${minutes}:${seconds}`;
	}

    function updateProgress() {
        if (!audioPlayer || !isFinite(audioPlayer.currentTime) || !isFinite(duration) || duration === 0) {
            progressPercent = 0;
            currentTime = 0;
            return;
        }
        currentTime = audioPlayer.currentTime;
        progressPercent = (currentTime / duration) * 100;
    }

	function handleTimeUpdate() { updateProgress(); }

	function handleLoadedMetadata() {
        if (!audioPlayer) return;
		duration = audioPlayer.duration;
        if (!isFinite(duration)) duration = 0;
        
        audioPlayer.volume = volume; 
        isMuted = audioPlayer.muted || audioPlayer.volume === 0;
        if (isMuted && volume > 0) previousVolume = volume;
        else if (isMuted && volume === 0) previousVolume = 0.5;

        updateProgress();
	}

	function handleSeek(event) {
		if (!audioPlayer || !isFinite(duration) || duration === 0) return;
		const progressBar = event.currentTarget;
        const rect = progressBar.getBoundingClientRect();
		const clickPosition = (event.clientX - rect.left) / rect.width;
        const newTime = clickPosition * duration;
        if (isFinite(newTime)) {
		    audioPlayer.currentTime = newTime;
            updateProgress();
        }
	}

	function handleVolumeChange(event) {
		if (!audioPlayer) return;
        const newVolume = parseFloat(event.target.value);
		audioPlayer.volume = newVolume;
        volume = newVolume;
        isMuted = newVolume === 0;
        if (!isMuted) previousVolume = newVolume;
	}

    function toggleMute() {
        if (!audioPlayer) return;
        if (audioPlayer.muted || audioPlayer.volume === 0) {
            audioPlayer.muted = false;
            audioPlayer.volume = previousVolume > 0.01 ? previousVolume : 0.5;
            volume = audioPlayer.volume;
            isMuted = false;
        } else {
            previousVolume = audioPlayer.volume;
            audioPlayer.muted = true;
            isMuted = true;
        }
    }

    let srcObserver;

    onMount(() => {
        if (audioPlayer) {
            const onPlay = () => isPlaying = true;
            const onPause = () => isPlaying = false;
            const onEnded = () => { 
                isPlaying = false; 
                progressPercent = 0;
                audioPlayer.currentTime = 0; 
            };
            const onVolumeChangeInternal = () => {
                if (!audioPlayer) return;
                volume = audioPlayer.volume;
                isMuted = audioPlayer.muted || audioPlayer.volume === 0;
                if (!isMuted && audioPlayer.volume > 0.01) previousVolume = audioPlayer.volume;
            };

            audioPlayer.addEventListener('play', onPlay);
            audioPlayer.addEventListener('pause', onPause);
            audioPlayer.addEventListener('ended', onEnded);
            audioPlayer.addEventListener('timeupdate', handleTimeUpdate);
            audioPlayer.addEventListener('loadedmetadata', handleLoadedMetadata);
            audioPlayer.addEventListener('volumechange', onVolumeChangeInternal);
            audioPlayer.addEventListener('error', (e) => {
                console.error("Audio player error:", e);
                duration = 0; isPlaying = false; progressPercent = 0; currentTime = 0;
            });
            
            audioPlayer.volume = volume;
            isMuted = audioPlayer.muted || audioPlayer.volume === 0;
            if (isMuted && volume > 0) previousVolume = volume;
            else if (isMuted && volume === 0) previousVolume = 0.5;


            srcObserver = new MutationObserver((mutationsList) => {
                for(const mutation of mutationsList) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                        isPlaying = false; currentTime = 0; duration = 0; progressPercent = 0;
                        audioPlayer.load();
                    }
                }
            });
            srcObserver.observe(audioPlayer, { attributes: true, attributeFilter: ['src'] });

            return () => {
                if (srcObserver) srcObserver.disconnect();
                if (audioPlayer) {
                    audioPlayer.removeEventListener('play', onPlay);
                    audioPlayer.removeEventListener('pause', onPause);
                    audioPlayer.removeEventListener('ended', onEnded);
                    audioPlayer.removeEventListener('timeupdate', handleTimeUpdate);
                    audioPlayer.removeEventListener('loadedmetadata', handleLoadedMetadata);
                    audioPlayer.removeEventListener('volumechange', onVolumeChangeInternal);
                    // audioPlayer.removeEventListener('error', ...);
                }
            };
        }
    });

    $: if (audioPlayer && finalFullAudioUrl && audioPlayer.currentSrc !== finalFullAudioUrl) {
        console.log("Reactive change of finalFullAudioUrl, currentSrc:", audioPlayer.currentSrc, "newUrl:", finalFullAudioUrl);
    }
</script>

      
<div class="audio-item-display-enhanced">
	{#if contentDetails?.title}
		<h3 class="item-title-enhanced audio-title">{contentDetails.title}</h3>
	{/if}

	{#if finalFullAudioUrl}
		<audio bind:this={audioPlayer} src={finalFullAudioUrl} preload="metadata" style="display: none;"></audio>
		
        <div class="custom-audio-player-enhanced" class:playing={isPlaying}>
            <button 
                class="play-pause-btn-enhanced" 
                on:click={togglePlay} 
                title={isPlaying ? 'Пауза' : 'Воспроизвести'} 
                disabled={!isFinite(duration) && !audioPlayer?.src}
                aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
            >
                <svelte:component this={isPlaying ? Pause : Play} size="28px" />
            </button>

            <div class="timeline-wrapper">
                <div class="time-display current">{formatTime(currentTime)}</div>
                <div class="progress-bar-interactive-area" on:mousedown={(e) => { if(e.button === 0 && isFinite(duration) && duration > 0) handleSeek(e); }}>
                    <input 
                        type="range" 
                        class="progress-slider-input" 
                        min="0" 
                        max={duration > 0 && isFinite(duration) ? duration : 1}
                        step="0.1" 
                        bind:value={currentTime}
                        on:input={(e) => { if (audioPlayer && isFinite(duration) && duration > 0) audioPlayer.currentTime = parseFloat(e.currentTarget.value); }}
                        disabled={!isFinite(duration) || duration === 0}
                        aria-label="Таймлайн аудио"
                    />
                    <div class="progress-track">
                        <div class="progress-filled" style="width: {progressPercent}%"></div>
                    </div>
                </div>
                <div class="time-display duration">{formatTime(duration)}</div>
            </div>
            
            <div class="volume-section">
                <button class="mute-btn-enhanced" on:click={toggleMute} title={isMuted ? 'Включить звук' : 'Выключить звук'} aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}>
                    <svelte:component this={isMuted || volume === 0 ? VolumeMute : VolumeHigh} size="22px" />
                </button>
                <div class="volume-slider-wrapper">
                    <input 
                        type="range" 
                        class="volume-slider-input" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        bind:value={volume} 
                        on:input={handleVolumeChange} 
                        disabled={isMuted && volume > 0}
                        aria-label="Громкость"
                    />
                </div>
            </div>
        </div>

        {#if contentDetails.transcript}
        <div class="transcript-section-enhanced">
            <button class="transcript-toggle-enhanced" on:click={() => showTranscript = !showTranscript} aria-expanded={showTranscript}>
                <FileDocumentOutline size="18px" />
                <span>Транскрипция</span>
                <svelte:component this={showTranscript ? ChevronUp : ChevronDown} size="20px" />
            </button>
            {#if showTranscript}
                <div class="transcript-content-enhanced" transition:slide|local={{duration:300}}>
                    <pre>{contentDetails.transcript}</pre>
                </div>
            {/if}
        </div>
        {/if}
	{:else}
		<p class="no-content-message-small">Аудиофайл не загружен.</p>
	{/if}
</div>

<style>
.audio-item-display-enhanced {
    background-color: var(--color-bg-ultra-light, #f8f6ff);
    padding: clamp(15px, 3vw, 20px);
    border-radius: var(--spacing-border-radius-block, 12px);
    box-shadow: 0 4px 12px rgba(var(--color-primary-rgb, 175, 164, 255), 0.1);
    margin-bottom: 20px;
}
.item-title-enhanced.audio-title {
    font-size: clamp(1.1em, 2.5vw, 1.3em);
    font-weight: var(--font-weight-semi-bold);
    color: var(--color-primary-dark, #5845d8);
    margin-top: 0;
    margin-bottom: 15px;
    word-break: break-word;
}

.custom-audio-player-enhanced {
    display: flex;
    align-items: center;
    gap: clamp(10px, 2vw, 15px);
    background-color: var(--color-bg-light, #fff);
    padding: clamp(10px, 2vw, 15px);
    border-radius: var(--spacing-border-radius-card, 24px);
    box-shadow: var(--color-shadow, rgba(0,0,0,0.08)); 
    transition: box-shadow 0.3s ease;
    flex-wrap: nowrap;
}
.custom-audio-player-enhanced.playing {
    box-shadow: 0 0 15px rgba(var(--color-secondary-rgb, 109, 127, 201), 0.3);
}

.play-pause-btn-enhanced {
    background-color: var(--color-primary, #AFA4FF);
    color: white;
    border: none;
    border-radius: 50%;
    width: clamp(40px, 8vw, 48px);
    height: clamp(40px, 8vw, 48px);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease;
    flex-shrink: 0;
}
.play-pause-btn-enhanced:hover:not(:disabled) {
    background-color: var(--color-primary-dark, #8679f0);
}
.play-pause-btn-enhanced:active:not(:disabled) {
    transform: scale(0.95);
}
.play-pause-btn-enhanced:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    opacity: 0.7;
}

.timeline-wrapper {
    display: flex;
    align-items: center;
    flex-grow: 1;
    gap: clamp(8px, 1.5vw, 12px);
    min-width: 0;
}
.time-display {
    font-size: clamp(0.8em, 2vw, 0.9em);
    color: var(--color-text-muted, #555);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}
.time-display.current { text-align: right; }
.time-display.duration { text-align: left; }

.progress-bar-interactive-area {
    flex-grow: 1;
    height: 20px;
    position: relative;
    cursor: pointer;
    display: flex;
    align-items: center;
    min-width: 80px;
}
.progress-slider-input {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
    z-index: 2;
}
.progress-track {
    width: 100%;
    height: 6px;
    background-color: var(--color-purple-light, #e0d8ff);
    border-radius: 3px;
    position: relative;
    overflow: hidden;
}
.progress-filled {
    height: 100%;
    background-color: var(--color-secondary, #6D7FC9);
    border-radius: 3px;
    transition: width 0.05s linear;
    position: absolute;
    left: 0;
    top: 0;
}

.volume-section {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}
.mute-btn-enhanced {
    background: none; border: none;
    color: var(--color-text-muted);
    cursor: pointer; padding: 5px; border-radius: 50%;
    display: flex;
    transition: color 0.2s ease, background-color 0.2s ease;
}
.mute-btn-enhanced:hover {
    color: var(--color-primary);
    background-color: rgba(var(--color-primary-rgb), 0.1);
}
.volume-slider-wrapper {
    width: clamp(60px, 12vw, 80px);
    height: 20px;
    display: flex;
    align-items: center;
}
.volume-slider-input {
    width: 100%;
    height: 5px;
    -webkit-appearance: none; appearance: none;
    background: var(--color-purple-light, #e0d8ff);
    border-radius: 3px;
    cursor: pointer;
    transition: opacity 0.2s ease;
    margin: 0;
}
.volume-slider-input:disabled { opacity: 0.5; cursor: not-allowed; }
.volume-slider-input::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 14px; height: 14px;
    background: var(--color-secondary, #6D7FC9);
    border-radius: 50%; cursor: pointer;
    box-shadow: 0 0 2px rgba(0,0,0,0.2);
}
.volume-slider-input::-moz-range-thumb {
    width: 14px; height: 14px;
    background: var(--color-secondary, #6D7FC9);
    border-radius: 50%; border: none; cursor: pointer;
    box-shadow: 0 0 2px rgba(0,0,0,0.2);
}

.transcript-section-enhanced { margin-top: 20px; }
.transcript-toggle-enhanced {
    display: inline-flex; align-items: center; gap: 8px;
    background-color: var(--color-bg-light); color: var(--color-secondary);
    border: 1px solid var(--color-purple-light, #e0d8ff);
    padding: 8px 15px; border-radius: var(--spacing-border-radius-button);
    cursor: pointer; font-size: 0.9rem; font-weight: var(--font-weight-medium);
    transition: all 0.2s ease;
}
.transcript-toggle-enhanced:hover {
    background-color: var(--color-purple-light, #e0d8ff);
    color: var(--color-primary-dark); border-color: var(--color-secondary);
}
.transcript-toggle-enhanced > :global(svg):last-child {
    margin-left: auto; transition: transform 0.3s ease;
}
.transcript-toggle-enhanced[aria-expanded="true"] > :global(svg):last-child {
    transform: rotate(180deg);
}
.transcript-content-enhanced {
    margin-top: 10px; padding: 15px; background-color: var(--color-bg-light);
    border: 1px solid var(--color-border-light, #eee);
    border-radius: var(--spacing-border-radius-small);
    max-height: 250px; overflow-y: auto;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.04);
}
.transcript-content-enhanced pre {
    white-space: pre-wrap; word-wrap: break-word;
    font-family: 'Noto Sans JP', var(--font-family-secondary), sans-serif;
    font-size: 0.95rem; line-height: 1.7; color: var(--color-text-muted); margin: 0;
}
.no-content-message-small {
    font-style: italic; color: #888; font-size: 0.9rem;
    text-align: center; padding: 10px;
}

@media (max-width: 680px) {
    .custom-audio-player-enhanced {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
    }
    .play-pause-btn-enhanced {
        align-self: center;
        margin-bottom: 5px;
    }
    .timeline-wrapper {
        width: 100%;
        order: 1;
    }
    .volume-section {
        width: 100%;
        justify-content: center;
        order: 2;
    }
    .volume-slider-wrapper {
        flex-grow: 1;
        max-width: 200px;
    }
}
@media (max-width: 400px) {
    .item-title-enhanced.audio-title { font-size: 1em; }
    .play-pause-btn-enhanced { width: 38px; height: 38px; }
    .play-pause-btn-enhanced :global(svg) { transform: scale(0.9); }
    .time-display { font-size: 0.75em; }
    .mute-btn-enhanced :global(svg) { transform: scale(0.9); }
    .transcript-toggle-enhanced { padding: 6px 10px; font-size: 0.85rem; }
}
</style>