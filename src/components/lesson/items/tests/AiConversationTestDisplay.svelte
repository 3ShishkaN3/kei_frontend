<script>
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import { fade } from "svelte/transition";
    import * as THREE from "three";
    import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
    import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
    import { WS_BASE_URL, API_BASE_URL } from "../../../../config.js";
    import { addNotification } from "../../../../stores/notifications.js";
    import { apiFetch } from "../../../../api/api.js";

    export let testData = null;
    export let sectionItemId = null;
    export let viewMode = "student";
    export let canStudentInteract = true;

    let audioContext;
    let micStream;
    let processor;
    let playbackContext;
    let nextStartTime = 0;

    $: bgImageUrl = testData?.ai_conversation_question?.background_image_details
        ?.image
        ? `url('${testData.ai_conversation_question.background_image_details.image}')`
        : testData?.attached_image_details?.image
          ? `url('${testData.attached_image_details.image}')`
          : "none";

    export async function startConversation() {
        chatLog = [];
        subtitles = "Подключение к сенсею...";
        isConversationActive = true;

        try {
            await startMicCapture();
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ action: "start" }));
            } else {
                connectWebSocket();
            }
            addNotification("Разговор начат. Сенсей слушает!", "info");
        } catch (e) {
            console.error("Failed to start conversation:", e);
            addNotification("Ошибка доступа к микрофону", "error");
        }
        return true;
    }

    async function startMicCapture() {
        if (!audioContext) {
            audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();
        }

        if (audioContext.state === "suspended") {
            await audioContext.resume();
        }

        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

            let pcm16;
            if (nativeRate !== 16000) {
                pcm16 = downsampleBuffer(inputData, nativeRate, 16000);
            } else {
                pcm16 = floatTo16BitPCM(inputData);
            }

            socket.send(pcm16);
        };
    }

    function downsampleBuffer(buffer, sampleRate, outSampleRate) {
        if (outSampleRate === sampleRate) {
            return floatTo16BitPCM(buffer);
        }
        if (outSampleRate > sampleRate) {
            throw "downsampling rate show be smaller than original sample rate";
        }
        var sampleRateRatio = sampleRate / outSampleRate;
        var newLength = Math.round(buffer.length / sampleRateRatio);
        var result = new Int16Array(newLength);
        var offsetResult = 0;
        var offsetBuffer = 0;

        while (offsetResult < result.length) {
            var nextOffsetBuffer = Math.round(
                (offsetResult + 1) * sampleRateRatio,
            );
            var accum = 0,
                count = 0;
            for (
                var i = offsetBuffer;
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
        let output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            let s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        return output.buffer;
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

    const dispatch = createEventDispatcher();

    let canvas;
    let scene, camera, renderer, clock;
    let currentVrm = null;
    let mixer = null;
    let socket = null;
    let subtitles = "";
    let chatLog = [];
    let isConnecting = true;
    let isConversationActive = false;
    let isListening = false;
    let isSpeaking = false;
    let isThinking = false;
    let currentSubtitleEntry = { speaker: "", text: "", translated: "" };
    let username = "Ученик";
    let subtitlesVisible = false;
    let modelLoaded = false;
    
    function isModelReflection(text) {
        if (!text) return true;
        const lowerText = text.toLowerCase();
        const reflectionPatterns = [
            "focusing on",
            "i've crafted",
            "i'm integrating",
            "the goal is",
            "aiming for",
            "sticking to",
            "maintaining",
            "solidify",
            "beginner-friendly",
            "contextually relevant",
            "initiating",
            "i am now",
            "my plan is",
            "my greeting"
        ];
        return text.trim().startsWith("**") || reflectionPatterns.some(pattern => lowerText.includes(pattern));
    }

    onMount(async () => {
        try {
            const response = await apiFetch(`${API_BASE_URL}/auth/user/`);
            if (response.ok) {
                const userData = await response.json();
                username = userData.username || "Ученик";
            }
        } catch (err) {
            console.error("Ошибка загрузки username:", err);
        }
        
        initThree();
        loadVrm("/Khirano.vrm").catch((err) =>
            console.error("Failed to load VRM:", err),
        );
        animate();
        connectWebSocket();
    });

    onDestroy(() => {
        if (socket) socket.close();
        if (renderer) renderer.dispose();
        stopMicCapture();
    });

    function initThree() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(
            30,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            20,
        );
        camera.position.set(0, 1.9, 2.0);

        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
        });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputEncoding = THREE.sRGBEncoding;

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(0, 1.5, 2).normalize();
        scene.add(mainLight);
        
        const topLight = new THREE.DirectionalLight(0xffffff, 0.6);
        topLight.position.set(0, 2, 0).normalize();
        scene.add(topLight);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        clock = new THREE.Clock();
    }

    async function loadVrm(url) {
        const loader = new GLTFLoader();
        loader.register((parser) => {
            return new VRMLoaderPlugin(parser);
        });

        const gltf = await loader.loadAsync(url);
        const vrm = gltf.userData.vrm;
        scene.add(vrm.scene);
        currentVrm = vrm;

        VRMUtils.rotateVRM0(vrm);
        vrm.scene.scale.set(1.6, 1.6, 1.6);
        vrm.scene.position.y = -0.3;
        
        vrm.scene.scale.set(0.1, 0.1, 0.1);
        let scale = 0.1;
        const targetScale = 1.6;
        const fadeIn = setInterval(() => {
            scale += (targetScale - scale) * 0.1;
            if (Math.abs(scale - targetScale) < 0.01) {
                scale = targetScale;
                clearInterval(fadeIn);
                modelLoaded = true;
            }
            vrm.scene.scale.set(scale, scale, scale);
        }, 16);
        
        console.log("VRM loaded:", vrm);
    }

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();

        if (currentVrm) {
            if (elapsed - lastBlinkTime > blinkInterval) {
                const blinkValue = Math.min(
                    1.0,
                    (elapsed - lastBlinkTime - blinkInterval) * 10,
                );
                currentVrm.expressionManager.setValue(
                    "blink",
                    1.0 - Math.abs(1.0 - blinkValue * 2),
                );
                if (blinkValue >= 1.0) {
                    lastBlinkTime = elapsed;
                    blinkInterval = 2.0 + Math.random() * 4.0;
                }
            }

            currentVrm.expressionManager.setValue("happy", 0.15);

            const chest = currentVrm.humanoid.getNormalizedBoneNode("chest");
            if (chest) {
                if (chestBaseY === 0) {
                    chestBaseY = chest.position.y;
                }
                const breathAmount = Math.sin(elapsed * 1.2) * 0.02;
                chest.position.y = chestBaseY + breathAmount;
            }

            const neck = currentVrm.humanoid.getNormalizedBoneNode("neck");
            if (neck && !isSpeaking) {
                const headSway = Math.sin(elapsed * 0.5) * 0.05;
                neck.rotation.z = headSway;
            }

            const leftUpperArm =
                currentVrm.humanoid.getNormalizedBoneNode("leftUpperArm");
            const rightUpperArm =
                currentVrm.humanoid.getNormalizedBoneNode("rightUpperArm");
            if (leftUpperArm) {
                leftUpperArm.rotation.z = 1.3 + Math.sin(elapsed * 0.3) * 0.05;
            }
            if (rightUpperArm) {
                rightUpperArm.rotation.z = -1.3 + Math.sin(elapsed * 0.3) * 0.05;
            }

            const hips = currentVrm.humanoid.getNormalizedBoneNode("hips");
            if (hips && !isSpeaking) {
                const bodySway = Math.sin(elapsed * 0.4) * 0.01;
                hips.rotation.z = bodySway;
            }

            currentVrm.update(delta);
        }
        renderer.render(scene, camera);
    }

    let lastBlinkTime = 0;
    let blinkInterval = 3.0;
    let chestBaseY = 0;

    function connectWebSocket() {
        const token =
            localStorage.getItem("access") ||
            localStorage.getItem("access_token");
        const url = `${WS_BASE_URL}/ws/conversation/${testData.id}/${token ? `?token=${token}` : ""}`;
        socket = new WebSocket(url);

        socket.onopen = () => {
            isConnecting = false;
            console.log("Connected to AI Conversation");
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "ready") {
                isConnecting = false;
                currentSubtitleEntry = { speaker: "", text: "", translated: "" };
            } else if (data.type === "audio_chunk") {
                handleAudioChunk(data.data);
            } else if (data.type === "ai_text_chunk") {
                if (isModelReflection(data.text)) {
                    console.log("Пропущено внутреннее размышление модели:", data.text);
                    return;
                }
                
                if (currentSubtitleEntry.speaker !== "Сенсей") {
                    if (currentSubtitleEntry.text && currentSubtitleEntry.speaker) {
                        chatLog.push({ ...currentSubtitleEntry, timestamp: Date.now() });
                    }
                    currentSubtitleEntry = { speaker: "Сенсей", text: data.text, translated: "" };
                } else {
                    currentSubtitleEntry.text += data.text;
                }
                currentSubtitleEntry = { ...currentSubtitleEntry };
            } else if (data.type === "ai_text_translated") {
                if (isModelReflection(data.text)) {
                    return;
                }
                
                if (currentSubtitleEntry.speaker === "Сенсей" && currentSubtitleEntry.text === data.text) {
                    currentSubtitleEntry.translated = data.translated || data.text;
                    currentSubtitleEntry = { ...currentSubtitleEntry };
                }
                const lastEntry = chatLog[chatLog.length - 1];
                if (lastEntry && lastEntry.speaker === "Сенсей" && lastEntry.text === data.text) {
                    lastEntry.translated = data.translated || data.text;
                    chatLog = [...chatLog];
                }
            } else if (data.type === "user_text_transcript") {
                if (currentSubtitleEntry.text && currentSubtitleEntry.speaker) {
                    chatLog.push({ ...currentSubtitleEntry, timestamp: Date.now() });
                }
                currentSubtitleEntry = { speaker: username, text: data.text, translated: data.text };
                chatLog.push({ ...currentSubtitleEntry, timestamp: Date.now() });
                chatLog = [...chatLog];
            } else if (data.type === "user_text_translated") {
                const lastEntry = chatLog[chatLog.length - 1];
                if (lastEntry && lastEntry.speaker === username && lastEntry.text === data.text) {
                    lastEntry.translated = data.translated || data.text;
                    chatLog = [...chatLog];
                }
                if (currentSubtitleEntry.speaker === username && currentSubtitleEntry.text === data.text) {
                    currentSubtitleEntry.translated = data.translated || data.text;
                    currentSubtitleEntry = { ...currentSubtitleEntry };
                }
            } else if (data.type === "turn_complete") {
                setTimeout(() => {
                    isSpeaking = false;
                }, 500);
                if (currentSubtitleEntry.speaker === "Сенсей" && currentSubtitleEntry.text) {
                    chatLog.push({ ...currentSubtitleEntry, timestamp: Date.now() });
                    chatLog = [...chatLog];
                }
            } else if (data.type === "error") {
                addNotification(data.message, "error");
            }
        };

        socket.onclose = () => {
            isConnecting = true;
            console.log("Disconnected from AI Conversation");
        };
    }

    function handleAudioChunk(base64Data) {
        if (!playbackContext) {
            playbackContext = new (window.AudioContext ||
                window.webkitAudioContext)({
                sampleRate: 24000,
            });
        }

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const pcmData = new Int16Array(bytes.buffer);
        const floatData = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            floatData[i] = pcmData[i] / 32768.0;
        }

        const buffer = playbackContext.createBuffer(1, floatData.length, 24000);
        buffer.getChannelData(0).set(floatData);

        const source = playbackContext.createBufferSource();
        source.buffer = buffer;
        source.connect(playbackContext.destination);

        const currentTime = playbackContext.currentTime;
        if (nextStartTime < currentTime) {
            nextStartTime = currentTime;
        }

        source.start(nextStartTime);
        nextStartTime += buffer.duration;

        isSpeaking = true;

        if (currentVrm) {
            let max = 0;
            for (let i = 0; i < floatData.length; i++) {
                if (Math.abs(floatData[i]) > max) max = Math.abs(floatData[i]);
            }
            currentVrm.expressionManager.setValue(
                "aa",
                Math.min(1.0, max * 2.5),
            );
            setTimeout(() => {
                if (currentVrm) currentVrm.expressionManager.setValue("aa", 0);
            }, 100);
        }
    }

    function stopConversation() {
        isConversationActive = false;
        stopMicCapture();
        if (socket) {
            socket.send(JSON.stringify({ action: "submit_for_evaluation" }));
        }
        if (playbackContext) {
            playbackContext.close();
            playbackContext = null;
        }
    }

    function sendUserMessage(message) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ action: "chat", message: message }));
        }
    }
</script>

<div class="test-container" style="background-image: {bgImageUrl}">
    <div class="ai-conversation-display">
        <div class="character-viewport">
            <canvas bind:this={canvas}></canvas>

            <div class="overlay-ui">
                {#if isConnecting}
                    <div class="connecting-overlay" transition:fade>
                        <div class="loader"></div>
                        <p>Подключение к сенсею...</p>
                    </div>
                {/if}
            </div>

            <div class="bottom-controls">
                {#if isConversationActive}
                    <div class="interaction-hud">
                        <div class="hud-content">
                            {#if isThinking}
                                <div class="hud-status thinking-state">
                                    <div class="pulse-ring"></div>
                                    <span>Сенсей думает...</span>
                                </div>
                            {:else if isSpeaking}
                                <div class="hud-status speaking-state">
                                    <div class="wave-bars">
                                        <span></span><span></span><span></span>
                                    </div>
                                    <span>Сенсей говорит...</span>
                                </div>
                            {:else}
                                <div class="hud-status listening-state">
                                    <div class="mic-pulse"></div>
                                    <span>Сенсей слушает...</span>
                                </div>
                            {/if}
                        </div>

                        <button
                            class="hud-stop-btn"
                            on:click={stopConversation}
                        >
                            Завершить
                        </button>
                    </div>
                {:else}
                    <button class="start-btn" on:click={startConversation}>
                        <svg
                            viewBox="0 0 24 24"
                            width="24"
                            height="24"
                            fill="currentColor"
                        >
                            <path d="M8 5v14l11-7z" />
                        </svg>
                        Начать разговор
                    </button>
                {/if}
            </div>
        </div>
    </div>
    
    <div class="subtitles-container-wrapper">
        <button 
            class="toggle-subtitles-btn" 
            on:click={() => subtitlesVisible = !subtitlesVisible}
            title={subtitlesVisible ? "Скрыть подтитры" : "Показать подтитры"}
        >
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="currentColor"
            >
                {#if subtitlesVisible}
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm6 0h4v2h-4v-2zm6 0h4v2h-4v-2zM4 16h10v2H4v-2zm12 0h4v2h-4v-2z"/>
                {:else}
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm6 0h4v2h-4v-2zm6 0h4v2h-4v-2zM4 16h10v2H4v-2zm12 0h4v2h-4v-2z" opacity="0.5"/>
                {/if}
            </svg>
            <span>{subtitlesVisible ? "Скрыть подтитры" : "Показать подтитры"}</span>
        </button>
        
        {#if subtitlesVisible}
            <div class="subtitles-panel" transition:fade>
                {#if currentSubtitleEntry.text}
                    <div class="subtitle-entry current" class:sensei={currentSubtitleEntry.speaker === "Сенсей"}>
                        <div class="subtitle-speaker">{currentSubtitleEntry.speaker}:</div>
                        <div class="subtitle-content">
                            {currentSubtitleEntry.translated || currentSubtitleEntry.text}
                        </div>
                    </div>
                {/if}
                {#each chatLog.slice().reverse() as entry (entry.timestamp)}
                    {#if entry.text && entry.speaker}
                        <div class="subtitle-entry" class:sensei={entry.speaker === "Сенсей"}>
                            <div class="subtitle-speaker">{entry.speaker}:</div>
                            <div class="subtitle-content">
                                {entry.translated || entry.text}
                            </div>
                        </div>
                    {/if}
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .test-container {
        width: 100%;
        position: relative;
        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;
        background-color: #2c2c2c;
        border-radius: var(--spacing-border-radius-block, 16px);
        box-shadow: 0 4px 12px rgba(var(--color-primary-rgb, 175, 164, 255), 0.07);
        overflow: hidden;
        margin-bottom: 0;
    }

    .ai-conversation-display {
        width: 100%;
        height: 600px;
        background: transparent;
        position: relative;
    }

    .character-viewport {
        width: 100%;
        height: 100%;
        position: relative;
    }

    canvas {
        width: 100%;
        height: 100%;
        display: block;
    }

    .overlay-ui {
        position: absolute;
        inset: 0;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 40px;
    }

    .connecting-overlay {
        position: absolute;
        inset: 0;
        background: rgba(15, 23, 42, 0.3);
        backdrop-filter: blur(2px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10;
        color: #fff;
    }

    .loader {
        width: 48px;
        height: 48px;
        border: 4px solid rgba(255, 255, 255, 0.1);
        border-left-color: #6366f1;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .subtitles-container-wrapper {
        margin-top: 15px;
        width: 100%;
    }

    .toggle-subtitles-btn {
        background: var(--color-bg-light, #fff);
        border: 1px solid var(--color-border-light, #e7eaf3);
        border-top: none;
        border-radius: 0 0 var(--spacing-border-radius-block, 16px) var(--spacing-border-radius-block, 16px);
        padding: 10px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: var(--color-text-muted, #555);
        font-size: 0.9rem;
        width: 100%;
        justify-content: center;
    }

    .toggle-subtitles-btn:hover {
        background: var(--color-bg-ultra-light, #f8f8f8);
        color: var(--color-primary, #AFA4FF);
    }

    .subtitles-panel {
        background-color: var(--color-bg-light, #fff);
        border: 1px solid var(--color-border-light, #e7eaf3);
        border-top: 1px solid var(--color-border-light, #e7eaf3);
        border-radius: 0 0 var(--spacing-border-radius-block, 16px) var(--spacing-border-radius-block, 16px);
        padding: 20px;
        max-height: 300px;
        overflow-y: auto;
        display: flex;
        flex-direction: column-reverse;
        gap: 12px;
    }

    .subtitle-entry {
        padding: 12px 16px;
        border-radius: var(--spacing-border-radius-small, 8px);
        background-color: var(--color-bg-ultra-light, #f8f8f8);
        border-left: 3px solid var(--color-primary, #AFA4FF);
        transition: all 0.2s ease;
    }

    .subtitle-entry.current {
        background-color: rgba(var(--color-primary-rgb, 175, 164, 255), 0.1);
        border-left-width: 4px;
    }

    .subtitle-entry:not(.sensei) {
        border-left-color: var(--color-secondary, #6D7FC9);
    }

    .subtitle-entry.sensei {
        border-left-color: var(--color-primary, #AFA4FF);
    }

    .subtitle-speaker {
        font-weight: var(--font-weight-semi-bold, 600);
        font-size: 0.85rem;
        color: var(--color-text-muted, #555);
        margin-bottom: 4px;
    }

    .subtitle-entry:not(.sensei) .subtitle-speaker {
        color: var(--color-secondary, #6D7FC9);
    }

    .subtitle-entry.sensei .subtitle-speaker {
        color: var(--color-primary, #AFA4FF);
    }

    .subtitle-content {
        font-size: var(--font-size-p, 0.95rem);
        color: var(--color-text-dark, #333);
        line-height: var(--line-height-body, 1.6);
    }

    .bottom-controls {
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        width: 100%;
        max-width: 500px;
        padding: 0 20px;
        z-index: 5;
    }

    .interaction-hud {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid var(--color-border-light, rgba(0, 0, 0, 0.1));
        border-radius: var(--spacing-border-radius-button, 20px);
        padding: 12px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 4px 12px rgba(var(--color-primary-rgb, 175, 164, 255), 0.15);
    }

    .hud-status {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--color-text-dark, #333);
        font-weight: var(--font-weight-medium, 500);
        font-size: var(--font-size-p, 0.95rem);
    }

    .wave-bars {
        display: flex;
        gap: 3px;
        align-items: center;
        height: 16px;
    }

    .wave-bars span {
        width: 3px;
        height: 100%;
        background: var(--color-primary, #AFA4FF);
        border-radius: 2px;
        animation: wave 1s infinite ease-in-out;
    }

    .wave-bars span:nth-child(2) {
        animation-delay: 0.2s;
    }
    .wave-bars span:nth-child(3) {
        animation-delay: 0.4s;
    }

    @keyframes wave {
        0%,
        100% {
            height: 4px;
        }
        50% {
            height: 16px;
        }
    }

    .mic-pulse {
        width: 12px;
        height: 12px;
        background: var(--color-secondary, #6D7FC9);
        border-radius: 50%;
        animation: breathe 1.5s infinite ease-in-out;
        box-shadow: 0 0 12px var(--color-secondary, #6D7FC9);
    }

    @keyframes breathe {
        0%,
        100% {
            transform: scale(1);
            opacity: 0.8;
        }
        50% {
            transform: scale(1.3);
            opacity: 1;
        }
    }

    .start-btn {
        background: linear-gradient(135deg, var(--color-primary, #AFA4FF) 0%, var(--color-primary-dark, #8679f0) 100%);
        color: var(--color-text-light, #fff);
        border: none;
        padding: var(--spacing-padding-button-large, 16px 30px);
        border-radius: var(--spacing-border-radius-button, 20px);
        font-size: var(--font-size-button, 0.9rem);
        font-weight: var(--font-weight-semi-bold, 600);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0 auto;
        transition: all var(--animation-duration-transition, 0.3s) ease;
        box-shadow: 0 4px 12px rgba(var(--color-primary-rgb, 175, 164, 255), 0.3);
    }

    .start-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(var(--color-primary-rgb, 175, 164, 255), 0.4);
    }

    .hud-stop-btn {
        background: rgba(var(--color-danger-red-rgb, 255, 77, 77), 0.1);
        color: var(--color-danger-red, #ff4d4d);
        border: 1px solid rgba(var(--color-danger-red-rgb, 255, 77, 77), 0.2);
        padding: var(--spacing-padding-button-low, 4px 8px);
        border-radius: var(--spacing-border-radius-button, 20px);
        cursor: pointer;
        font-weight: var(--font-weight-medium, 500);
        font-size: var(--font-size-button, 0.9rem);
        transition: all var(--animation-duration-transition, 0.3s);
    }

    .hud-stop-btn:hover {
        background: var(--color-danger-red, #ff4d4d);
        color: var(--color-text-light, #fff);
    }
</style>
