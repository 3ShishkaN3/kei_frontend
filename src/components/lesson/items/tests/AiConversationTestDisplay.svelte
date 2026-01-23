<script>
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import { fade, slide, scale } from "svelte/transition";
    import * as THREE from "three";
    import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
    import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
    import { WS_CONVERSATION_BASE_URL, API_BASE_URL } from "../../../../config.js";
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

    // Three.js Globals
    let canvas;
    let scene, camera, renderer, clock;
    let currentVrm = null;
    
    // Animation Vars
    let lastBlinkTime = 0;
    let blinkInterval = 3.0;

    // Computed
    $: bgImageUrl = testData?.ai_conversation_question?.background_image_details?.image
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
    });

    onDestroy(() => {
        stopMicCapture();
        if (socket) socket.close();
        if (currentVrm) {
            VRMUtils.deepDispose(currentVrm.scene);
            scene.remove(currentVrm.scene);
        }
        if (renderer) renderer.dispose();
        if (audioContext && audioContext.state !== 'closed') audioContext.close();
        if (playbackContext && playbackContext.state !== 'closed') playbackContext.close();
    });

    // Subtitle Logic
    function updateSubtitle(speaker, text, translated = null, isFinal = false) {
        const lastMsg = subtitlesHistory[0];
        if (lastMsg && lastMsg.speaker === speaker && !lastMsg.isFinal) {
            lastMsg.text = text;
            if (translated) lastMsg.translated = translated;
            lastMsg.isFinal = isFinal;
            subtitlesHistory = [...subtitlesHistory];
        } else {
            const newMsg = {
                id: Date.now(),
                speaker,
                text,
                translated: translated || null,
                isFinal
            };
            subtitlesHistory = [newMsg, ...subtitlesHistory];
        }

        if (speaker === username) {
            hasConversationRecording = true;
            emitState();
        }
    }

    function updateTranslationOnly(textKey, translatedText) {
        const target = subtitlesHistory.find(s => s.text === textKey || s.text.includes(textKey));
        if (target) {
            target.translated = translatedText;
            subtitlesHistory = [...subtitlesHistory];
        }
    }

    // WebSocket Logic
    async function startConversation() {
        if (isInteractionLocked) return;
        resetState();
        isConversationActive = true;
        isConnecting = true;
        try {
            if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === "suspended") await audioContext.resume();
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
        const token = localStorage.getItem("access") || localStorage.getItem("access_token");
        const url = `${WS_CONVERSATION_BASE_URL}/ws/conversation/${testData.id}/${token ? `?token=${token}` : ""}`;
        socket = new WebSocket(url);

        socket.onopen = () => {
            console.log("WS Connected");
            socket.send(JSON.stringify({ action: "start" }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case "ready":
                    isConnecting = false;
                    addNotification("Сенсей готов!", "success");
                    break;
                case "audio_chunk":
                    playAudioChunk(data.data);
                    break;
                case "ai_text_chunk":
                    updateSubtitle("Сенсей", data.text, null, false);
                    break;
                case "ai_text_translated":
                    updateTranslationOnly(data.text, data.translated);
                    break;
                case "user_text_transcript":
                    updateSubtitle(username, data.text, null, data.is_final);
                    break;
                case "user_text_translated":
                    updateTranslationOnly(data.text, data.translated);
                    break;
                case "turn_complete":
                    if (subtitlesHistory.length > 0 && subtitlesHistory[0].speaker === "Сенсей") {
                        subtitlesHistory[0].isFinal = true;
                        subtitlesHistory = [...subtitlesHistory];
                    }
                    setTimeout(() => { isSpeaking = false; }, 200);
                    break;
                case "submission_update":
                    lastSubmission = data.submission;
                    isAwaitingGrading = false;
                    finishConversation(true);
                    addNotification("Оценка получена!", "success");
                    break;
                case "submission_error":
                case "error":
                    addNotification(data.message, "error");
                    if (isAwaitingGrading) isAwaitingGrading = false;
                    emitState();
                    break;
            }
        };

        socket.onclose = () => {
            isConnecting = false;
        };
    }

    // Audio Logic
    async function startMicCapture() {
        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
            const source = audioContext.createMediaStreamSource(micStream);
            processor = audioContext.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioContext.destination);

            processor.onaudioprocess = (e) => {
                if (!isConversationActive || !socket || socket.readyState !== WebSocket.OPEN || isSpeaking) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const nativeRate = audioContext.sampleRate;
                const targetRate = 16000;
                let pcm16 = (nativeRate !== targetRate) 
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
            micStream.getTracks().forEach(t => t.stop());
            micStream = null;
        }
    }

    function downsampleBuffer(buffer, sampleRate, outSampleRate) {
        if (outSampleRate === sampleRate) return floatTo16BitPCM(buffer);
        const ratio = sampleRate / outSampleRate;
        const newLength = Math.round(buffer.length / ratio);
        const result = new Int16Array(newLength);
        let offsetResult = 0, offsetBuffer = 0;
        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
            let accum = 0, count = 0;
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count++;
            }
            let s = Math.max(-1, Math.min(1, accum / count));
            result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }
        return result.buffer;
    }

    function floatTo16BitPCM(input) {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output.buffer;
    }

    function playAudioChunk(base64Data) {
        if (!playbackContext) playbackContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        if (playbackContext.state === "suspended") playbackContext.resume();
        
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        
        let maxVol = 0;
        for(let i=0; i<int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
            if(Math.abs(float32[i]) > maxVol) maxVol = Math.abs(float32[i]);
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
        if (currentVrm) {
            const openAmount = Math.min(1.0, maxVol * 4);
            currentVrm.expressionManager.setValue("aa", openAmount);
            setTimeout(() => { if(currentVrm) currentVrm.expressionManager.setValue("aa", 0); }, buffer.duration * 1000);
        }
    }

    // 3D Logic

    function initThree() {
        scene = new THREE.Scene();
        
        camera = new THREE.PerspectiveCamera(30, canvas.clientWidth / canvas.clientHeight, 0.1, 20);
        camera.position.set(0, 1.45, 1.6); 
        camera.lookAt(0, 1.35, 0);

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
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

            scene.add(vrm.scene);
            currentVrm = vrm;
            
            currentVrm.update(0); // Init bones
            
            resetPose(vrm);
            console.log("VRM Loaded");
        } catch (e) {
            console.error("Failed to load VRM:", e);
            addNotification("Не удалось загрузить 3D модель", "error");
        } finally {
            isModelLoading = false;
        }
    }

    function resetPose(vrm) {
        try {
             const leftArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
             const rightArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
             if (leftArm) leftArm.rotation.z = 1.3;
             if (rightArm) rightArm.rotation.z = -1.3;
        } catch (e) { console.warn(e); }
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
                const blinkValue = Math.min(1.0, (t - lastBlinkTime - blinkInterval) * 10);
                currentVrm.expressionManager.setValue("blink", 1.0 - Math.abs(1.0 - blinkValue * 2));
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
            const leftArm = currentVrm.humanoid.getNormalizedBoneNode('leftUpperArm');
            const rightArm = currentVrm.humanoid.getNormalizedBoneNode('rightUpperArm');
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
    function finishConversation(graded = false) {
        isConversationActive = false;
        isSpeaking = false;
        conversationStopped = true;
        stopMicCapture();
        if (socket && !graded) socket.close();
        emitState();
    }

    async function submitConversation() {
        if (isAwaitingGrading) return;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
             addNotification("Нет соединения.", "error"); return;
        }
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
            lastSubmission
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
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    {:else}
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                    {/if}
                </button>
                
                {#if conversationStopped && hasConversationRecording && !lastSubmission}
                    <button class="glass-btn submit" on:click={submitConversation} disabled={isAwaitingGrading} title="Оценить">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                {/if}

            {:else}
                <div class="glass-panel" transition:scale={{duration: 200}}>
                    
                    <div class="visualizer">
                        {#if isSpeaking}
                            <div class="voice-bars">
                                <span></span><span></span><span></span><span></span>
                            </div>
                        {:else}
                            <div class="recording-dot-wrapper">
                                <div class="rec-dot"></div>
                                <div class="rec-pulse"></div>
                            </div>
                        {/if}
                    </div>

                    <button class="action-icon-btn stop" on:click={() => finishConversation(false)} title="Завершить">
                        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                    </button>
                </div>
            {/if}
        </div>
    </div>

    <div class="subtitles-box">
        <div class="subtitles-header">
            <span class="title">Диалог</span>
            <button class="toggle-subs" on:click={() => subtitlesVisible = !subtitlesVisible}>
                {subtitlesVisible ? "▼" : "▲"}
            </button>
        </div>
        {#if subtitlesVisible}
            <div class="subtitles-list" transition:slide>
                {#each subtitlesHistory as entry (entry.id)}
                    <div class="sub-item" class:sensei={entry.speaker === "Сенсей"} class:user={entry.speaker !== "Сенсей"}>
                        <div class="sub-label">{entry.speaker}</div>
                        <div class="sub-text">
                            {entry.translated || entry.text}
                            {#if !entry.translated && entry.text}<span class="dots">...</span>{/if}
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

    canvas { display: block; width: 100%; height: 100%; }

    /* LOADER */
    .overlay {
        position: absolute; inset: 0;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        z-index: 10;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(5px);
        color: #fff;
    }
    .overlay p { margin-top: 15px; font-weight: 500; letter-spacing: 0.5px; }
    
    .spinner {
        width: 40px; height: 40px;
        border: 3px solid rgba(255,255,255,0.1);
        border-top-color: var(--color-primary);
        border-radius: 50%; 
        animation: spin 0.8s linear infinite;
        will-change: transform;
        z-index: 11;
    }

    /* HUD */
    .hud-wrapper {
        position: absolute;
        bottom: 30px;
        left: 0; right: 0;
        display: flex;
        justify-content: center;
        align-items: flex-end;
        gap: 20px;
        z-index: 20;
        pointer-events: none; 
    }

    .glass-btn {
        pointer-events: auto;
        width: 60px; height: 60px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.4);
        background: rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(10px);
        color: #fff;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s;
    }
    .glass-btn:hover { transform: scale(1.1); background: rgba(255,255,255,0.4); }
    .glass-btn:active { transform: scale(0.95); }
    .glass-btn svg { width: 28px; height: 28px; }

    .glass-btn.start { color: var(--color-primary); background: #fff; }
    .glass-btn.submit { background: var(--color-success); color: #fff; border: none; width: 50px; height: 50px; }

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
        width: 48px; height: 48px;
        border-radius: 50%;
        background: rgba(255, 77, 77, 0.1);
        color: var(--color-danger-red);
        border: none;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
    }
    .action-icon-btn.stop:hover { background: var(--color-danger-red); color: #fff; }
    .action-icon-btn.stop svg { width: 20px; height: 20px; }

    /* ANIMATIONS */
    .voice-bars {
        display: flex; align-items: center; gap: 4px; height: 20px;
    }
    .voice-bars span {
        display: block; width: 4px;
        background: var(--color-primary);
        border-radius: 2px;
        animation: barBounce 1s ease-in-out infinite;
    }
    .voice-bars span:nth-child(1) { height: 8px; animation-delay: 0s; }
    .voice-bars span:nth-child(2) { height: 16px; animation-delay: 0.1s; }
    .voice-bars span:nth-child(3) { height: 12px; animation-delay: 0.2s; }
    .voice-bars span:nth-child(4) { height: 6px; animation-delay: 0.3s; }
    
    @keyframes barBounce { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(2.2); } }

    .recording-dot-wrapper {
        position: relative; width: 24px; height: 24px;
        display: flex; align-items: center; justify-content: center;
    }
    .rec-dot {
        width: 12px; height: 12px;
        background: var(--color-danger-red);
        border-radius: 50%; z-index: 2;
        box-shadow: 0 0 5px rgba(255, 77, 77, 0.5);
    }
    .rec-pulse {
        position: absolute; inset: 0;
        border-radius: 50%;
        background: rgba(255, 77, 77, 0.3);
        animation: recPulse 1.5s infinite;
    }
    @keyframes recPulse { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(2.0); opacity: 0; } }

    /* SUBTITLES */
    .subtitles-box {
        background: var(--color-bg-light);
        border-top: 1px solid var(--color-border-light);
        display: flex; flex-direction: column;
        max-height: 250px;
    }
    .subtitles-header {
        padding: 10px 24px;
        display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid var(--color-bg-ultra-light);
    }
    .subtitles-header .title {
        font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: var(--color-text-muted);
    }
    .toggle-subs {
        background: none; border: none; cursor: pointer; color: #ccc;
        font-size: 0.8rem;
    }
    
    .subtitles-list {
        overflow-y: auto;
        padding: 16px 24px;
        display: flex; flex-direction: column; gap: 12px;
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
        font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 4px; font-weight: 600;
    }
    .sub-item.sensei .sub-label { color: var(--color-primary); }
    .sub-item.user .sub-label { color: var(--color-secondary); }

    .dots { opacity: 0.5; animation: blink 1s infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    
    .empty-subs { text-align: center; font-size: 0.85rem; color: #ccc; font-style: italic; }
</style>