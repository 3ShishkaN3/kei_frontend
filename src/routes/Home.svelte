<script>
    import { onMount } from 'svelte';
    import { gsap } from 'gsap';
    
    onMount(() => {
    const mainImage = document.querySelector('.main-image');
    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        mainImage.style.backgroundPosition = `center ${scrollPosition * 0.5}px`;
    });

        gsap.fromTo('.main-image', 
      { opacity: 0 }, 
      { opacity: 1, duration: 2, ease: 'power3.out' });

        gsap.fromTo('.sakura', 
        { y: 50, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 2, ease: 'power3.out' });
    });

</script>

<style>
.main-image {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 150vh;
    background: url("/main.jpg") no-repeat center center fixed;
    background-size: cover;
    transform: translateZ(0);
    padding-bottom: 100px;
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

.sakura {
    width: 200px;
    height: auto;
    animation: rotate 10s linear infinite, neonPulse 2s ease-in-out infinite alternate, moveUp 5s ease-in-out infinite;
    cursor: pointer;
    position: relative;
    z-index: 2;
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

<div class="main-image">
    <a href="/login">
        <img src="/sakura.png" alt="Sakura" class="sakura" />
    </a>
</div>
