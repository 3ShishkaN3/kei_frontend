<script>
    import { onMount } from "svelte";
    import { gsap } from "gsap";

    onMount(() => {
        const mainImage = document.querySelector(".main-image");

        const handleScroll = () => {
            const scrollPosition = window.scrollY;
            const width = window.innerWidth;
            const baseOffset = width >= 768 ? 100 : 0;
            mainImage.style.backgroundPosition = `center ${baseOffset + scrollPosition * 0.5}px`;
        };

        window.addEventListener("scroll", handleScroll);
        handleScroll();

        gsap.fromTo(
            ".main-image",
            { opacity: 0 },
            { opacity: 1, duration: 2, ease: "power3.out" },
        );

        gsap.fromTo(
            ".sakura",
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 2, ease: "power3.out" },
        );

        return () => window.removeEventListener("scroll", handleScroll);
    });
</script>

<svelte:head>
    <title>Главная — Kei</title>
    <meta name="og:title" content="Главная — Kei" />
    <meta
        name="description"
        content="Образовательная платформа Keisenpai — изучайте японский с удовольствием."
    />
</svelte:head>

<div class="main-image">
    <a href="/login">
        <img src="/sakura.png" alt="Sakura" class="sakura" />
    </a>
</div>

<style>
    .main-image {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 150vh;

        background-color: #ffffff;
        background-image: url("/main.jpg");
        background-repeat: no-repeat;

        background-size: cover;
        background-position: center top;

        transform: translateZ(0);
        box-sizing: border-box;
    }

    .sakura {
        width: 200px;
        height: auto;
        animation:
            rotate 10s linear infinite,
            neonPulse 2s ease-in-out infinite alternate,
            moveUp 5s ease-in-out infinite;
        cursor: pointer;
        position: relative;
        z-index: 2;
        margin-top: 0;
        margin-bottom: 25px;
    }

    @media (min-width: 768px) and (max-width: 1366px) {
        .main-image {
            background-size: cover;
            background-position: center 100px;
        }

        .sakura {
            width: 160px;
            margin-top: 40px;
        }
    }

    @media (min-width: 1367px) {
        .main-image {
            background-size: 100% auto;
            background-position: center 100px;
        }

        .sakura {
            margin-top: -100px;
            width: 200px;
        }
    }

    @keyframes rotate {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes neonPulse {
        0% {
            filter: drop-shadow(0 0 5px #ff6ec7);
        }
        100% {
            filter: drop-shadow(0 0 20px #ff6ec7);
        }
    }

    @keyframes moveUp {
        0% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-20px);
        }
        100% {
            transform: translateY(0);
        }
    }
</style>
