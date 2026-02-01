<script>
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import { fade, slide, scale } from "svelte/transition";
    import * as THREE from "three";
    import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
    import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
    import {
        WS_CONVERSATION_BASE_URL,
        API_BASE_URL,
    } from "../../../../config.js";
    import { addNotification } from "../../../../stores/notifications.js";
    import { apiFetch } from "../../../../api/api.js";

    // Props
    export let testData = null;
    export let sectionItemId = null;
    export let viewMode = "student";
    export let canStudentInteract = true;

    // State Variables
    const dispatch = createEventDispatcher();

    // UI State
    let isInteractionLocked = viewMode !== "student" || !canStudentInteract;
    let isConnecting = false;
    let isModelLoading = true;
    let isConversationActive = false;
    let isSpeaking = false; // Sensei is speaking
    let activeAudioSources = 0; // Счетчик активных аудио источников
    let subtitlesVisible = true;
    let conversationStopped = false;
    let hasConversationRecording = false;
    let isAwaitingGrading = false;

    // Data State
    let socket = null;
    let username = "Ученик";
    let subtitlesHistory = [];
    let lastSubmission = null;

    // Audio Contexts
    let audioContext;
    let micStream;
    let processor;
    let playbackContext;
    let nextStartTime = 0;

    // Audio Devices
    let audioOutputDeviceId = "default";
    let availableOutputDevices = [];
    let showDeviceSettings = false;

    // Three.js Globals
    let canvas;
    let scene, camera, renderer, clock;
    let currentVrm = null;

    // Animation Vars
    let lastBlinkTime = 0;
    let blinkInterval = 3.0;

    // Computed
    $: bgImageUrl = testData?.ai_conversation_question?.background_image_details
        ?.image
        ? `url('${testData.ai_conversation_question.background_image_details.image}')`
        : "none";

    // Lifecycle

    onMount(async () => {
        try {
            const response = await apiFetch(`${API_BASE_URL}/auth/user/`);
            if (response.ok) {
                const userData = await response.json();
                username = userData.username || "Ученик";
            }
        } catch (err) {
            console.error("User load error:", err);
        }

        initThree();
        setTimeout(() => loadModel("/Khirano.vrm"), 200);
        animate();

        // Инициализируем аудио после загрузки 3D
        setTimeout(() => {
            if (!audioContext)
                audioContext = new (window.AudioContext ||
                    window.webkitAudioContext)();
            if (audioContext.state === "suspended") audioContext.resume();
            enumerateAudioDevices();

            // Listen for device changes
            navigator.mediaDevices.ondevicechange = () => {
                enumerateAudioDevices();
            };
        }, 500);
    });

    async function enumerateAudioDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            availableOutputDevices = devices.filter(
                (d) => d.kind === "audiooutput",
            );
            // Try to find a "speaker" device if we are on mobile/default
            const speaker = availableOutputDevices.find((d) =>
                d.label.toLowerCase().includes("speaker"),
            );
            if (speaker && audioOutputDeviceId === "default") {
                // audioOutputDeviceId = speaker.deviceId; // Optionally auto-select
            }
        } catch (e) {
            console.error("Error enumerating devices", e);
        }
    }

    async function setAudioOutput(deviceId) {
        audioOutputDeviceId = deviceId;
        if (
            playbackContext &&
            typeof playbackContext.setSinkId === "function"
        ) {
            try {
                await playbackContext.setSinkId(deviceId);
                addNotification("Вывод аудио переключен", "success");
            } catch (e) {
                console.error("Failed to set audio output", e);
                addNotification(
                    "Не удалось переключить аудио: " + e.message,
                    "error",
                );
            }
        }
    }

    async function toggleSpeakerMode() {
        // Simple toggle for mobile if possible
        const speaker = availableOutputDevices.find((d) =>
            d.label.toLowerCase().includes("speaker"),
        );
        const current = availableOutputDevices.find(
            (d) => d.deviceId === audioOutputDeviceId,
        );

        let targetId = "default";
        if (
            speaker &&
            (!current || !current.label.toLowerCase().includes("speaker"))
        ) {
            targetId = speaker.deviceId;
        } else {
            // fallback to default
            targetId = "default";
        }
        await setAudioOutput(targetId);
    }

    onDestroy(() => {
        stopMicCapture();
        if (socket) socket.close();
        if (currentVrm) {
            VRMUtils.deepDispose(currentVrm.scene);
            scene.remove(currentVrm.scene);
        }
        if (renderer) renderer.dispose();
        if (audioContext && audioContext.state !== "closed")
            audioContext.close();
        if (playbackContext && playbackContext.state !== "closed")
            playbackContext.close();
    });

    function updateSubtitle(speaker, text, translated = null, isFinal = false) {
        const lastMsg = subtitlesHistory[0];

        if (lastMsg && lastMsg.speaker === speaker && !lastMsg.isFinal) {
            lastMsg.text = text;
            if (translated) lastMsg.translated = translated;
            lastMsg.isFinal = isFinal;
            subtitlesHistory = [...subtitlesHistory];
        } else {
            const newMsg = {
                id: `${Date.now()}_${Math.random()}`,
                speaker,
                text,
                translated: translated || null,
                isFinal,
            };
            subtitlesHistory = [newMsg, ...subtitlesHistory];
        }

        if (speaker === username) {
            hasConversationRecording = true;
            emitState();
        }
    }

    let translatingMessages = new Set();

    async function requestTranslation(messageId, text, sourceType) {
        if (translatingMessages.has(messageId)) return;

        translatingMessages.add(messageId);

        try {
            const response = await apiFetch(
                `${API_BASE_URL}/materials/tests/translate_subtitle/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        text: text,
                    }),
                },
            );

            if (response.ok) {
                const data = await response.json();
                updateTranslationOnly(messageId, data.translated_text);
            } else {
                console.error(
                    "Translation request failed:",
                    response.statusText,
                );
            }
        } catch (error) {
            console.error("Translation request failed:", error);
        } finally {
            translatingMessages.delete(messageId);
        }
    }

    function updateTranslationOnly(messageId, translatedText) {
        const target = subtitlesHistory.find((s) => s.id === messageId);
        if (target) {
            target.translated = translatedText;
            subtitlesHistory = [...subtitlesHistory];
        }
    }

    // WebSocket Logic
    async function startConversation() {
        if (isInteractionLocked) return;
        console.log("startConversation called");
        resetState();
        isConversationActive = true;
        isConnecting = true;
        try {
            await startMicCapture();
            connectWebSocket();
        } catch (e) {
            console.error("Start Error:", e);
            addNotification("Ошибка аудио: " + e.message, "error");
            isConnecting = false;
            isConversationActive = false;
        }
    }

    function connectWebSocket() {
        const token =
            localStorage.getItem("access") ||
            localStorage.getItem("access_token");
        const url = `${WS_CONVERSATION_BASE_URL}/ws/conversation/${testData.id}/${token ? `?token=${token}` : ""}`;
        socket = new WebSocket(url);

        socket.onopen = () => {
            socket.send(JSON.stringify({ action: "start" }));
        };

        socket.onmessage = onMessage;

        socket.onclose = () => {
            isConnecting = false;
        };
    }

    // WebSocket message handler
    function onMessage(event) {
        const data = JSON.parse(event.data);

        console.log("WebSocket message received:", data.type);

        switch (data.type) {
            case "ready":
                isConnecting = false;
                addNotification("Сенсей готов!", "success");
                break;
            case "audio_chunk":
                playAudioChunk(data.data);
                break;
            case "ai_text_chunk":
                updateSubtitle(
                    "Сенсей",
                    data.text,
                    null,
                    data.is_final || false,
                );
                break;
            case "user_text_transcript":
                updateSubtitle(username, data.text, null, data.is_final);
                break;
            case "submission_update":
                console.log("Received submission_update, closing socket");
                lastSubmission = data.submission;
                isAwaitingGrading = false;
                finishConversation(true);
                addNotification("Оценка получена!", "success");
                break;
            case "submission_error":
                console.log("Received submission_error, closing socket");
                isAwaitingGrading = false;
                finishConversation(true);
                addNotification("Ошибка оценки", "error");
                break;
            case "submission_status":
                isAwaitingGrading = true;
                break;
            case "turn_complete":
                break;
            case "error":
                addNotification(data.message, "error");
                break;
            case "ai_text_translated":
                updateTranslationOnly(data.text, data.translated);
                break;
            case "user_text_translated":
                updateTranslationOnly(data.text, data.translated);
                break;
        }
        emitState();
    }

    // Audio Logic
    async function startMicCapture() {
        try {
            micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            const source = audioContext.createMediaStreamSource(micStream);
            processor = audioContext.createScriptProcessor(4096, 1, 1);
            source.connect(processor);

            processor.onaudioprocess = (e) => {
                if (
                    !isConversationActive ||
                    !socket ||
                    socket.readyState !== WebSocket.OPEN ||
                    isSpeaking
                )
                    return;

                const inputData = e.inputBuffer.getChannelData(0);
                const nativeRate = audioContext.sampleRate;
                const targetRate = 16000;
                let pcm16 =
                    nativeRate !== targetRate
                        ? downsampleBuffer(inputData, nativeRate, targetRate)
                        : floatTo16BitPCM(inputData);
                socket.send(pcm16);
            };
        } catch (e) {
            console.error("Mic error", e);
            throw e;
        }
    }

    function stopMicCapture() {
        if (processor) {
            processor.disconnect();
            processor = null;
        }
        if (micStream) {
            micStream.getTracks().forEach((t) => t.stop());
            micStream = null;
        }
    }

    function downsampleBuffer(buffer, sampleRate, outSampleRate) {
        if (outSampleRate === sampleRate) return floatTo16BitPCM(buffer);
        const ratio = sampleRate / outSampleRate;
        const newLength = Math.round(buffer.length / ratio);
        const result = new Int16Array(newLength);
        let offsetResult = 0,
            offsetBuffer = 0;
        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
            let accum = 0,
                count = 0;
            for (
                let i = offsetBuffer;
                i < nextOffsetBuffer && i < buffer.length;
                i++
            ) {
                accum += buffer[i];
                count++;
            }
            let s = Math.max(-1, Math.min(1, accum / count));
            result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7fff;
            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }
        return result.buffer;
    }

    function floatTo16BitPCM(input) {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        return output.buffer;
    }

    function playAudioChunk(base64Data) {
        if (!playbackContext) {
            playbackContext = new (window.AudioContext ||
                window.webkitAudioContext)({ sampleRate: 24000 });

            // Apply initial output device if set
            if (
                audioOutputDeviceId !== "default" &&
                typeof playbackContext.setSinkId === "function"
            ) {
                playbackContext
                    .setSinkId(audioOutputDeviceId)
                    .catch((err) => console.warn("Initial sinkId failed", err));
            }
        }
        if (playbackContext.state === "suspended") playbackContext.resume();

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++)
            bytes[i] = binaryString.charCodeAt(i);
        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);

        let maxVol = 0;
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
            if (Math.abs(float32[i]) > maxVol) maxVol = Math.abs(float32[i]);
        }

        const buffer = playbackContext.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);

        const source = playbackContext.createBufferSource();
        source.buffer = buffer;
        source.connect(playbackContext.destination);

        const currentTime = playbackContext.currentTime;
        if (nextStartTime < currentTime) nextStartTime = currentTime;
        source.start(nextStartTime);
        nextStartTime += buffer.duration;

        isSpeaking = true;
        activeAudioSources++;

        if (currentVrm) {
            const openAmount = Math.min(1.0, maxVol * 4);
            currentVrm.expressionManager.setValue("aa", openAmount);
            setTimeout(() => {
                if (currentVrm) currentVrm.expressionManager.setValue("aa", 0);
            }, buffer.duration * 1000);
        }

        source.onended = () => {
            activeAudioSources--;
            if (activeAudioSources <= 0) {
                isSpeaking = false;
                activeAudioSources = 0;
            }
        };
    }

    function initThree() {
        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(
            30,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            20,
        );
        camera.position.set(0, 1.45, 1.2);
        camera.lookAt(0, 1.35, 0);

        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
        });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
        dirLight.position.set(0.5, 1.5, 1.5);
        scene.add(dirLight);
        scene.add(new THREE.AmbientLight(0xffffff, 0.9));

        clock = new THREE.Clock();
    }

    async function loadModel(url) {
        isModelLoading = true;
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));

        try {
            const gltf = await loader.loadAsync(url);
            VRMUtils.removeUnnecessaryJoints(gltf.scene);
            const vrm = gltf.userData.vrm;

            VRMUtils.rotateVRM0(vrm);
            vrm.scene.position.y = 0.0;

            vrm.scene.traverse((object) => {
                if (object.isMesh || object.isSkinnedMesh) {
                    if (object.name.toLowerCase().includes("ear")) {
                        object.visible = false;
                    }
                }
            });

            scene.add(vrm.scene);
            currentVrm = vrm;

            currentVrm.update(0);

            resetPose(vrm);
        } catch (e) {
            console.error("Failed to load VRM:", e);
            addNotification("Не удалось загрузить 3D модель", "error");
        } finally {
            isModelLoading = false;
        }
    }

    function resetPose(vrm) {
        try {
            const leftArm = vrm.humanoid.getNormalizedBoneNode("leftUpperArm");
            const rightArm =
                vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
            if (leftArm) leftArm.rotation.z = 1.3;
            if (rightArm) rightArm.rotation.z = -1.3;
        } catch (e) {
            console.warn(e);
        }
        vrm.expressionManager.setValue("happy", 0.15);
    }

    function animate() {
        if (!renderer || !scene || !camera) return;
        requestAnimationFrame(animate);

        const delta = Math.min(clock.getDelta(), 0.04);
        const t = clock.elapsedTime;

        if (currentVrm) {
            // BLINKING
            if (t - lastBlinkTime > blinkInterval) {
                const blinkValue = Math.min(
                    1.0,
                    (t - lastBlinkTime - blinkInterval) * 10,
                );
                currentVrm.expressionManager.setValue(
                    "blink",
                    1.0 - Math.abs(1.0 - blinkValue * 2),
                );
                if (blinkValue >= 1.0) {
                    lastBlinkTime = t;
                    blinkInterval = 2.0 + Math.random() * 4.0;
                }
            }

            // Idle

            // Дыхание (Грудь)
            const chest = currentVrm.humanoid.getNormalizedBoneNode("chest");
            if (chest) {
                chest.position.y = Math.sin(t * 1.5) * 0.005; // Вверх-вниз
                chest.rotation.x = Math.sin(t * 1.5) * 0.02; // Легкий наклон
            }

            // Голова (Случайное покачивание)
            const neck = currentVrm.humanoid.getNormalizedBoneNode("neck");
            if (neck) {
                neck.rotation.y = Math.sin(t * 0.3) * 0.05; // Поворот влево-вправо
                neck.rotation.z = Math.sin(t * 0.5) * 0.02; // Наклон уха к плечу
            }

            // Руки (Дыхание рук)
            const leftArm =
                currentVrm.humanoid.getNormalizedBoneNode("leftUpperArm");
            const rightArm =
                currentVrm.humanoid.getNormalizedBoneNode("rightUpperArm");
            if (leftArm) leftArm.rotation.z = 1.3 + Math.sin(t * 1.5) * 0.03;
            if (rightArm) rightArm.rotation.z = -1.3 - Math.sin(t * 1.5) * 0.03;

            // Тело (Легкий дрейф)
            const hips = currentVrm.humanoid.getNormalizedBoneNode("hips");
            if (hips) {
                hips.rotation.y = Math.sin(t * 0.2) * 0.02;
            }

            currentVrm.update(delta);
        }
        renderer.render(scene, camera);
    }

    // Control Flow
    function finishConversation(gradingComplete = false) {
        console.log("=== finishConversation called ===");
        console.log("gradingComplete:", gradingComplete);
        console.log("hasConversationRecording:", hasConversationRecording);
        console.log("lastSubmission:", lastSubmission);
        console.log("socket exists:", !!socket);
        if (socket) {
            console.log("socket readyState:", socket.readyState);
        }

        isConversationActive = false;
        isSpeaking = false;
        conversationStopped = true;
        stopMicCapture();

        if (socket) {
            if (
                hasConversationRecording &&
                !lastSubmission &&
                !gradingComplete
            ) {
                console.log("Starting evaluation...");
                submitConversation();
            } else {
                console.log("NOT starting evaluation - conditions not met");
            }
            if (gradingComplete) {
                console.log("Closing socket after grading complete");
                socket.close();
            } else {
                console.log("NOT closing socket - waiting for grading");
            }
        }
        emitState();
    }

    async function submitConversation() {
        if (isAwaitingGrading) return;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            addNotification("Нет соединения.", "error");
            return;
        }
        console.log("submitConversation: sending submit_for_evaluation action");
        isAwaitingGrading = true;
        socket.send(JSON.stringify({ action: "submit_for_evaluation" }));
        emitState();
    }

    function resetState() {
        subtitlesHistory = [];
        conversationStopped = false;
        hasConversationRecording = false;
        isAwaitingGrading = false;
        lastSubmission = null;
    }

    function emitState() {
        dispatch("stateChange", {
            sectionItemId,
            hasRecording: hasConversationRecording,
            awaitingGrading: isAwaitingGrading,
            conversationStopped,
            lastSubmission,
        });
    }
</script>

<div class="ai-container">
    <div class="viewport-wrapper" style="background-image: {bgImageUrl}">
        <canvas bind:this={canvas}></canvas>

        {#if isModelLoading}
            <div class="overlay loader-overlay" transition:fade>
                <div class="spinner"></div>
                <p>Зову Сенсея...</p>
            </div>
        {/if}

        {#if isConnecting && !isModelLoading}
            <div class="overlay status-overlay" transition:fade>
                <div class="spinner"></div>
                <p>Устанавливаем связь...</p>
            </div>
        {/if}

        <div class="hud-wrapper">
            {#if !isConversationActive}
                <button
                    class="glass-btn start"
                    on:click={startConversation}
                    disabled={isInteractionLocked || isModelLoading}
                    title={conversationStopped ? "Начать заново" : "Начать"}
                >
                    {#if conversationStopped}
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            ><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path
                                d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
                            /></svg
                        >
                    {:else}
                        <svg viewBox="0 0 24 24" fill="currentColor"
                            ><path
                                d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
                            /><path
                                d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
                            /></svg
                        >
                    {/if}
                </button>
            {:else}
                <div class="glass-panel" transition:scale={{ duration: 200 }}>
                    <div class="visualizer">
                        {#if isSpeaking}
                            <div class="voice-bars">
                                <span></span><span></span><span></span><span
                                ></span>
                            </div>
                        {:else}
                            <div class="recording-dot-wrapper">
                                <div class="rec-dot"></div>
                                <div class="rec-pulse"></div>
                            </div>
                        {/if}
                    </div>

                    <button
                        class="action-icon-btn stop"
                        on:click={() => finishConversation(false)}
                        title="Завершить"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor"
                            ><rect
                                x="6"
                                y="6"
                                width="12"
                                height="12"
                                rx="2"
                            /></svg
                        >
                    </button>
                </div>
            {/if}
        </div>

        {#if availableOutputDevices.length > 0}
            <div class="audio-controls-overlay">
                <button
                    class="icon-btn audio-switch"
                    on:click={toggleSpeakerMode}
                    title="Переключить динамик"
                >
                    {#if audioOutputDeviceId !== "default" && availableOutputDevices
                            .find((d) => d.deviceId === audioOutputDeviceId)
                            ?.label.toLowerCase()
                            .includes("speaker")}
                        <!-- Speaker Icon -->
                        <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            width="20"
                            height="20"
                        >
                            <path
                                d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
                            />
                        </svg>
                    {:else}
                        <!-- Headset/Default Icon -->
                        <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            width="20"
                            height="20"
                        >
                            <path
                                d="M12 1a9 9 0 0 0-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7a9 9 0 0 0-9-9z"
                            />
                        </svg>
                    {/if}
                </button>
            </div>
        {/if}
    </div>

    <div class="subtitles-box">
        <div class="subtitles-header">
            <span class="title">Диалог</span>
            <button
                class="toggle-subs"
                on:click={() => (subtitlesVisible = !subtitlesVisible)}
            >
                {subtitlesVisible ? "▼" : "▲"}
            </button>
        </div>
        {#if subtitlesVisible}
            <div class="subtitles-list" transition:slide>
                {#each subtitlesHistory as entry (entry.id)}
                    <div
                        class="sub-item"
                        class:sensei={entry.speaker === "Сенсей"}
                        class:user={entry.speaker !== "Сенсей"}
                    >
                        <div class="sub-label">{entry.speaker}</div>
                        <div class="sub-text">
                            <div class="original-text">{entry.text}</div>
                            {#if entry.translated}
                                <div class="translated-text">
                                    ({entry.translated})
                                </div>
                            {:else if entry.text && entry.text.trim().length > 0}
                                <button
                                    class="translate-btn"
                                    on:click={() =>
                                        requestTranslation(
                                            entry.id,
                                            entry.text,
                                            entry.speaker === "Сенсей"
                                                ? "ai"
                                                : "user",
                                        )}
                                    disabled={translatingMessages.has(entry.id)}
                                >
                                    {#if translatingMessages.has(entry.id)}
                                        <span class="spinner"></span>
                                        Переводим...
                                    {:else}
                                        Показать перевод
                                    {/if}
                                </button>
                            {/if}
                        </div>
                    </div>
                {/each}
                {#if subtitlesHistory.length === 0}
                    <div class="empty-subs">История пуста</div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .ai-container {
        width: 100%;
        border-radius: var(--spacing-border-radius-card);
        overflow: hidden;
        background: var(--color-bg-light);
        box-shadow: var(--color-shadow);
        position: relative;
        margin-bottom: var(--spacing-margin-bottom-medium);
    }

    .viewport-wrapper {
        position: relative;
        width: 100%;
        height: 550px;
        background-color: #2c2c2c;
        background-size: cover;
        background-position: center;
    }

    canvas {
        display: block;
        width: 100%;
        height: 100%;
    }

    /* LOADER */
    .overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(5px);
        color: #fff;
    }
    .overlay p {
        margin-top: 15px;
        font-weight: 500;
        letter-spacing: 0.5px;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255, 255, 255, 0.1);
        border-top-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        will-change: transform;
        z-index: 11;
    }

    .audio-controls-overlay {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 20;
    }

    .icon-btn.audio-switch {
        background: rgba(0, 0, 0, 0.5);
        border: none;
        border-radius: 50%;
        color: white;
        padding: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
    }
    .icon-btn.audio-switch:hover {
        background: rgba(0, 0, 0, 0.7);
    }

    /* HUD */
    .hud-wrapper {
        position: absolute;
        bottom: 30px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: flex-end;
        gap: 20px;
        z-index: 20;
        pointer-events: none;
    }

    .glass-btn {
        pointer-events: auto;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.4);
        background: rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(10px);
        color: #fff;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition:
            transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
            background 0.2s;
    }
    .glass-btn:hover {
        transform: scale(1.1);
        background: rgba(255, 255, 255, 0.4);
    }
    .glass-btn:active {
        transform: scale(0.95);
    }
    .glass-btn svg {
        width: 28px;
        height: 28px;
    }

    .glass-btn.start {
        color: var(--color-primary);
        background: #fff;
    }

    .glass-panel {
        pointer-events: auto;
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        padding: 6px 6px 6px 20px;
        border-radius: 50px;
        display: flex;
        align-items: center;
        gap: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.6);
        height: 60px;
        min-width: 140px;
        justify-content: space-between;
    }

    .visualizer {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 50px;
    }

    .action-icon-btn.stop {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(255, 77, 77, 0.1);
        color: var(--color-danger-red);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
    }
    .action-icon-btn.stop:hover {
        background: var(--color-danger-red);
        color: #fff;
    }
    .action-icon-btn.stop svg {
        width: 20px;
        height: 20px;
    }

    /* ANIMATIONS */
    .voice-bars {
        display: flex;
        align-items: center;
        gap: 4px;
        height: 20px;
    }
    .voice-bars span {
        display: block;
        width: 4px;
        background: var(--color-primary);
        border-radius: 2px;
        animation: barBounce 1s ease-in-out infinite;
    }
    .voice-bars span:nth-child(1) {
        height: 8px;
        animation-delay: 0s;
    }
    .voice-bars span:nth-child(2) {
        height: 16px;
        animation-delay: 0.1s;
    }
    .voice-bars span:nth-child(3) {
        height: 12px;
        animation-delay: 0.2s;
    }
    .voice-bars span:nth-child(4) {
        height: 6px;
        animation-delay: 0.3s;
    }

    @keyframes barBounce {
        0%,
        100% {
            transform: scaleY(1);
        }
        50% {
            transform: scaleY(2.2);
        }
    }

    .recording-dot-wrapper {
        position: relative;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .rec-dot {
        width: 12px;
        height: 12px;
        background: var(--color-danger-red);
        border-radius: 50%;
        z-index: 2;
        box-shadow: 0 0 5px rgba(255, 77, 77, 0.5);
    }
    .rec-pulse {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: rgba(255, 77, 77, 0.3);
        animation: recPulse 1.5s infinite;
    }
    @keyframes recPulse {
        0% {
            transform: scale(0.8);
            opacity: 0.8;
        }
        100% {
            transform: scale(2);
            opacity: 0;
        }
    }

    /* SUBTITLES */
    .subtitles-box {
        background: var(--color-bg-light);
        border-top: 1px solid var(--color-border-light);
        display: flex;
        flex-direction: column;
        max-height: 250px;
    }
    .subtitles-header {
        padding: 10px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--color-bg-ultra-light);
    }
    .subtitles-header .title {
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--color-text-muted);
    }
    .toggle-subs {
        background: none;
        border: none;
        cursor: pointer;
        color: #ccc;
        font-size: 0.8rem;
    }

    .subtitles-list {
        overflow-y: auto;
        padding: 16px 24px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .sub-item {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 0.95rem;
        line-height: 1.5;
        position: relative;
    }

    .sub-item.sensei {
        align-self: flex-start;
        background: var(--color-bg-ultra-light);
        color: var(--color-text-dark);
        border-left: 3px solid var(--color-primary);
    }
    .sub-item.user {
        align-self: flex-end;
        background: #f0f4ff;
        color: var(--color-text-dark);
        border-right: 3px solid var(--color-secondary);
        text-align: right;
    }

    .sub-label {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin-bottom: 4px;
        font-weight: 600;
    }
    .sub-item.sensei .sub-label {
        color: var(--color-primary);
    }
    .sub-item.user .sub-label {
        color: var(--color-secondary);
    }

    .empty-subs {
        text-align: center;
        font-size: 0.85rem;
        color: #ccc;
        font-style: italic;
    }

    /* Translation styles */
    .original-text {
        font-size: 0.9rem;
        line-height: 1.4;
        margin-bottom: 4px;
    }

    .translated-text {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        font-style: italic;
        line-height: 1.3;
    }

    .translate-btn {
        margin-top: 6px;
        padding: 4px 8px;
        font-size: 0.75rem;
        background: var(--color-primary);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: opacity 0.2s;
    }

    .translate-btn:hover:not(:disabled) {
        opacity: 0.8;
    }

    .translate-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .spinner {
        display: inline-block;
        width: 40px;
        height: 40px;
        margin-right: 12px;
        border: 4px solid rgba(var(--color-primary-rgb), 0.2);
        border-left-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
