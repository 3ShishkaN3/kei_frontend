<script>
    import CustomAudioPlayer from './CustomAudioPlayer.svelte';
    export let contentDetails = null; // { audio_file: 'url', title: '...', transcript: '...' }
</script>

{#if contentDetails?.audio_file}
    <div class="audio-item">
         <CustomAudioPlayer src={contentDetails.audio_file} title={contentDetails.title} />
         {#if contentDetails.transcript}
             <details class="transcript">
                 <summary>Транскрипция</summary>
                 <p>{contentDetails.transcript}</p>
             </details>
         {/if}
    </div>
{:else}
     <p>Аудиофайл не найден.</p>
{/if}
<style>
    .audio-item { margin-bottom: 10px; }
    .transcript { margin-top: 10px; font-size: 0.9em; color: #444; }
    .transcript summary { cursor: pointer; font-weight: bold; margin-bottom: 5px; }
</style>