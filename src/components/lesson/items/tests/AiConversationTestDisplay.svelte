<script>
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import { fade } from "svelte/transition";
    import * as THREE from "three";
    import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
    import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
    import { WS_BASE_URL } from "../../../../config.js";

    export let testData = null;
    export let sectionItemId = null;
    export let viewMode = "student";
    export let canStudentInteract = true;

    const dispatch = createEventDispatcher();

    let canvas;
    let scene, camera, renderer, clock;
    let currentVrm = null;
    let mixer = null;
    let socket = null;
    let userMessage = "";
    let subtitles = "";
    let chatLog = [];
    let isConnecting = true;
    let currentVrmAnimation = "idle";

    let lastBlinkTime = 0;
    let blinkInterval = 3.0;

    onMount(async () => {
        initThree();
        await loadVrm("/Khirano.vrm");
        animate();
        connectWebSocket();
    });

    onDestroy(() => {
        if (socket) socket.close();
        if (renderer) renderer.dispose();
    });

    function initThree() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(
            30,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            20,
        );
        camera.position.set(0, 1.4, 1.2);

        renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
        });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const light = new THREE.DirectionalLight(0xffffff);
        light.position.set(1, 1, 1).normalize();
        scene.add(light);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        clock = new THREE.Clock();

        window.addEventListener("resize", onResize);
    }

    function onResize() {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }

    async function loadVrm(url) {
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));

        return new Promise((resolve, reject) => {
            loader.load(
                url,
                (gltf) => {
                    const vrm = gltf.userData.vrm;

                    if (currentVrm) {
                        scene.remove(currentVrm.scene);
                    }

                    currentVrm = vrm;
                    scene.add(vrm.scene);
                    vrm.scene.rotation.y = Math.PI;

                    resolve();
                },
                (progress) =>
                    console.log(
                        "Loading VRM...",
                        (progress.loaded / progress.total) * 100 + "%",
                    ),
                (error) => {
                    console.error(error);
                    reject(error);
                },
            );
        });
    }

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();

        if (currentVrm) {
            currentVrm.humanoid.getNormalizedBoneNode("head").rotation.y =
                Math.sin(elapsed * 0.5) * 0.05;
            currentVrm.humanoid.getNormalizedBoneNode("neck").rotation.y =
                Math.sin(elapsed * 0.5) * 0.02;
            currentVrm.humanoid.getNormalizedBoneNode("chest").rotation.z =
                Math.sin(elapsed * 0.3) * 0.01;

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

            currentVrm.update(delta);
        }

        renderer.render(scene, camera);
    }

    function connectWebSocket() {
        const token = localStorage.getItem("access_token");
        const url = `${WS_BASE_URL}ws/conversation/${testData.id}/?token=${token}`;

        socket = new WebSocket(url);
        socket.onopen = () => {
            isConnecting = false;
            console.log("Connected to AI Conversation");
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "ai_response") {
                processAiResponse(data);
            }
        };

        socket.onclose = () => {
            isConnecting = true;
            console.log("Disconnected from AI Conversation");
        };
    }

    function processAiResponse(data) {
        subtitles = data.subtitles;
        chatLog = [...chatLog, { role: "assistant", text: data.text }];

        if (data.lipsync) {
            applyLipsync(data.lipsync);
        } else {
            simulateSpeaking(data.text.length * 0.1);
        }

        if (data.is_finished) {
            canStudentInteract = false;
        }
    }

    function simulateSpeaking(duration) {
        if (!currentVrm) return;
        const startTime = clock.getElapsedTime();
        const speakInterval = setInterval(() => {
            const elapsed = clock.getElapsedTime() - startTime;
            if (elapsed > duration) {
                clearInterval(speakInterval);
                currentVrm.expressionManager.setValue("aa", 0);
                return;
            }
            const mouthValue = Math.abs(Math.sin(elapsed * 15)) * 0.8;
            currentVrm.expressionManager.setValue("aa", mouthValue);
        }, 16);
    }

    function applyLipsync(lipsyncData) {}

    function sendMessage() {
        if (
            !userMessage.trim() ||
            !socket ||
            socket.readyState !== WebSocket.OPEN
        )
            return;

        chatLog = [...chatLog, { role: "user", text: userMessage }];
        socket.send(JSON.stringify({ message: userMessage }));
        userMessage = "";
    }
</script>

<div class="ai-conversation-container">
    {#if testData?.ai_conversation_question?.background_image_details}
        <div
            class="background-layer"
            style="background-image: url({testData.ai_conversation_question
                .background_image_details.image})"
        ></div>
    {:else}
        <div class="background-layer default-bg"></div>
    {/if}

    <div class="vrm-layer">
        <canvas bind:this={canvas}></canvas>
    </div>

    <div class="ui-layer">
        <div class="subtitles-container">
            {#if subtitles}
                <div class="subtitle-bubble" transition:fade>
                    {subtitles}
                </div>
            {/if}
        </div>

        <div class="bottom-controls">
            <div class="input-group">
                <input
                    type="text"
                    bind:value={userMessage}
                    placeholder="Напишите сенсею..."
                    disabled={!canStudentInteract || isConnecting}
                    on:keydown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                    on:click={sendMessage}
                    disabled={!canStudentInteract ||
                        isConnecting ||
                        !userMessage.trim()}
                >
                    Отправить
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .ai-conversation-container {
        position: relative;
        width: 100%;
        height: 500px;
        background: #000;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }

    .background-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-size: cover;
        background-position: center;
        filter: brightness(0.7);
    }

    .default-bg {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    }

    .vrm-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
    }

    canvas {
        width: 100%;
        height: 100%;
        display: block;
    }

    .ui-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 20px;
        pointer-events: none;
    }

    .subtitles-container {
        flex-grow: 1;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        margin-bottom: 20px;
    }

    .subtitle-bubble {
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(5px);
        color: #fff;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 1.1rem;
        text-align: center;
        max-width: 80%;
        border: 1px solid rgba(255, 255, 255, 0.2);
        animation: fadeIn 0.3s ease;
    }

    .bottom-controls {
        pointer-events: auto;
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
    }

    .input-group {
        display: flex;
        gap: 10px;
        background: rgba(0, 0, 0, 0.4);
        padding: 10px;
        border-radius: 30px;
        backdrop-filter: blur(5px);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    input {
        flex-grow: 1;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        padding: 8px 15px;
        color: #fff;
        outline: none;
    }

    input:focus {
        border-color: #afa4ff;
    }

    button {
        background: #afa4ff;
        color: #fff;
        border: none;
        border-radius: 20px;
        padding: 8px 20px;
        cursor: pointer;
        font-weight: 500;
        transition: 0.2s;
    }

    button:hover:not(:disabled) {
        background: #8679f0;
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
