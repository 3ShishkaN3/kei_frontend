<script>
    import { onMount, onDestroy } from 'svelte';
    import Plyr from 'plyr';
    // ==> Импортируем CSS Plyr. Путь может отличаться в зависимости от сборщика.
    // Либо подключите его глобально.
    import 'plyr/dist/plyr.css';

    export let contentDetails = null; // { video_file: 'url', title: '...' }

    let player; // Plyr instance
    let videoElement; // HTMLVideoElement

    onMount(() => {
        if (videoElement && contentDetails?.video_file) {
            try {
                 player = new Plyr(videoElement, {
                     // Опции Plyr, если нужны: https://github.com/sampotts/plyr#options
                     title: contentDetails.title || 'Видео',
                     // Можно добавить настройки controls, quality и т.д.
                 });
            } catch (e) {
                 console.error("Ошибка инициализации Plyr:", e);
                 // Можно отобразить сообщение об ошибке пользователю
            }
        }

        return () => {
            // Уничтожаем экземпляр Plyr при размонтировании компонента
            if (player) {
                player.destroy();
                player = null;
            }
        };
    });

    // Обновляем источник, если URL меняется (хотя в этом сценарии вряд ли)
    $: if (player && videoElement && contentDetails?.video_file && videoElement.currentSrc !== contentDetails.video_file) {
         console.log("Updating Plyr source");
        // Plyr API для смены источника
         player.source = {
            type: 'video',
            title: contentDetails.title || 'Видео',
            sources: [
                {
                    src: contentDetails.video_file,
                    // Можно попытаться угадать тип по расширению, если бэкенд не отдает
                    // type: 'video/mp4',
                },
            ],
        };
    }

</script>

<div class="video-item-plyr">
     {#if contentDetails?.video_file}
        <video bind:this={videoElement} preload="metadata" playsinline>
            Ваш браузер не поддерживает видео.
        </video>
         {#if contentDetails.transcript}
             <details class="transcript">
                 <summary>Транскрипция</summary>
                 <p>{contentDetails.transcript}</p>
             </details>
         {/if}
     {:else}
        <p>Видеофайл не найден.</p>
     {/if}
</div>

<style>
    /* Стили для контейнера, если нужны */
    .video-item-plyr {
        margin-bottom: 10px;
         /* Убедимся, что плеер не вылезает */
         max-width: 100%;
         /* Можно переопределить стили Plyr здесь, если необходимо */
         /* Например: :global(.plyr--video) { ... } */
    }
    .transcript { margin-top: 10px; font-size: 0.9em; color: #444; }
    .transcript summary { cursor: pointer; font-weight: bold; margin-bottom: 5px; }

    /* Опционально: Стилизация контейнера Plyr для лучшего вида */
     :global(.plyr) {
         border-radius: 6px;
         box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
</style>