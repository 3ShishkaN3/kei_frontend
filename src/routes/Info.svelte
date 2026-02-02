<script>
  import { onMount, onDestroy } from "svelte";
  import gsap from "gsap";
  import { ScrollTrigger } from "gsap/ScrollTrigger";
  import { TextPlugin } from "gsap/TextPlugin";
  import Cog from "svelte-material-icons/Cog.svelte";
  gsap.registerPlugin(ScrollTrigger, TextPlugin);

  let container;
  let scrollTriggers = [];

  onMount(() => {
    // Small delay to ensure DOM is fully rendered
    setTimeout(() => {
      createDecorativeElements();
      animateHeadings();
      animateAboutSection();
      animateInfoBlocks();
      animateJapaneseText();
      animateDisclaimer();
      
      // Refresh all ScrollTrigger instances
      ScrollTrigger.refresh();
    }, 100);
  });

  onDestroy(() => {
    // Clean up all ScrollTrigger instances
    scrollTriggers.forEach(trigger => trigger.kill());
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  });

  function createDecorativeElements() {
    const circles = [
      { size: "300px", top: "5%", left: "3%" },
      { size: "200px", top: "30%", right: "5%" },
      { size: "250px", bottom: "10%", left: "10%" },
    ];

    circles.forEach((circle) => {
      const element = document.createElement("div");
      element.classList.add("decorative-circle");

      Object.keys(circle).forEach((key) => {
        element.style[key] = circle[key];
      });

      container.appendChild(element);

      gsap.to(element, {
        scale: 1.2,
        opacity: 0.05,
        duration: 10 + Math.random() * 5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });
  }

  function animateHeadings() {
    gsap.utils.toArray("h1").forEach((heading, i) => {
      gsap.fromTo(
        heading,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          delay: i * 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: heading,
            start: "top 80%",
          },
        },
      );

      gsap.to(heading.querySelector("::after"), {
        width: 80,
        duration: 1.5,
        delay: 0.5 + i * 0.2,
        ease: "elastic.out(1, 0.3)",
        scrollTrigger: {
          trigger: heading,
          start: "top 80%",
        },
      });
    });

    gsap.utils.toArray(".about-content h2").forEach((heading) => {
      gsap.fromTo(
        heading,
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: heading,
            start: "top 80%",
          },
        },
      );
    });

    gsap.utils.toArray(".simple-block h2").forEach((heading) => {
      gsap.fromTo(
        heading,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: heading,
            start: "top 85%",
          },
        },
      );
    });
  }

  function animateAboutSection() {
    gsap.fromTo(
      ".about",
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".about",
          start: "top 80%",
        },
      },
    );

    gsap.fromTo(
      ".about img",
      { opacity: 0, scale: 0.8, rotateY: -10 },
      {
        opacity: 1,
        scale: 1,
        rotateY: 0,
        duration: 1.5,
        ease: "back.out(1.5)",
        scrollTrigger: {
          trigger: ".about",
          start: "top 75%",
        },
      },
    );

    gsap.to(".about img", {
      y: -15,
      duration: 3,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      delay: 2,
    });

    gsap.fromTo(
      ".about h6",
      { opacity: 0, x: 30 },
      {
        opacity: 1,
        x: 0,
        duration: 1,
        delay: 0.4,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".about",
          start: "top 75%",
        },
      },
    );

    gsap.fromTo(
      ".about p",
      { opacity: 0, x: 30 },
      {
        opacity: 1,
        x: 0,
        duration: 1,
        delay: 0.7,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".about",
          start: "top 75%",
        },
      },
    );
  }

  function animateInfoBlocks() {
    gsap.utils.toArray(".simple-block").forEach((block, i) => {
      gsap.fromTo(
        block,
        { opacity: 0, scale: 0.9, rotateZ: i % 2 === 0 ? -2 : 2 },
        {
          opacity: 1,
          scale: 1,
          rotateZ: 0,
          duration: 1,
          delay: i * 0.2,
          ease: "elastic.out(1, 0.5)",
          scrollTrigger: {
            trigger: block,
            start: "top 85%",
          },
        },
      );

      const heading = block.querySelector("h6");
      if (heading) {
        gsap.to(heading.querySelector("::after"), {
          width: 50,
          duration: 1,
          delay: 0.3 + i * 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: block,
            start: "top 85%",
          },
        });
      }

      const listItems = block.querySelectorAll("ul li");
      if (listItems.length) {
        gsap.fromTo(
          listItems,
          { opacity: 0, x: -20, y: 20 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 0.7,
            stagger: 0.15,
            delay: 0.2 + i * 0.1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: block,
              start: "top 85%",
            },
          },
        );
      }

      const buttons = block.querySelectorAll(".contact-button");
      if (buttons.length > 0) {
        gsap.fromTo(
          buttons,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.15,
            delay: 0.5 + i * 0.2,
            ease: "back.out(1.7)",
            scrollTrigger: {
              trigger: block,
              start: "top 75%",
            },
          },
        );

        buttons.forEach((btn) => {
          if (btn.classList.contains("btn-telegram")) {
            gsap.to(btn, {
              boxShadow: "0 0 0 0 rgba(0, 136, 204, 0.4)",
              repeat: -1,
              duration: 2,
              ease: "none",
              yoyo: true,
              delay: 2,
            });
          }
        });
      }
    });
  }

  function animateJapaneseText() {
    const japaneseHeading = document.querySelector(".about-content h2");
    if (japaneseHeading) {
      const text = japaneseHeading.textContent;
      const wrappedText = [...text]
        .map((char) => `<span class="japanese-text">${char}</span>`)
        .join("");
      japaneseHeading.innerHTML = wrappedText;

      gsap.fromTo(
        ".japanese-text",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.07,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: japaneseHeading,
            start: "top 80%",
          },
        },
      );
    }
  }

  function animateDisclaimer() {
    gsap.fromTo(
      ".disclaimer",
      { opacity: 0, y: 10 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".disclaimer",
          start: "top 95%",
        },
      },
    );
  }
</script>

<svelte:head>
  <title>Информация — Kei</title>
  <meta name="og:title" content="Информация — Kei" />
  <meta name="twitter:title" content="Информация — Kei" />
  <meta
    name="description"
    content="О проекте и как связаться с преподавателем на платформе Kei."
  />
</svelte:head>

<div bind:this={container} style="background-color: #f9f9f9; min-height: 100vh;">
  <main>
    <h1></h1>
    <div class="about">
      <img src="banner-info.jpg" alt="Информационный баннер" />
      <div class="about-content">
        <h2>こんにちは！</h2>
        <h6>
          Рада приветствовать вас на моём образовательном сайте. Здесь вынайдёте множество уникальных и полезных уроков по японскому языку, которые помогут обучаться быстро и весело! Весь материал был отобран с любовью.
        </h6>
        <p>
          Японский язык - это не только способ общения, но и ключ к фантастической культуре, традициям и истории Японии. Благодаря языку вы сможете понимать не только слова, но и глубинные значения, стоящие за ними. Каждый символ, каждое выражение в японском языке несет в себе особую энергию и смысл, который открывается лишь тем, кто изучает его.
        </p>
      </div>
    </div>
    <h1>Информация</h1>
    <div class="info">
      <div class="simple-block">
        <h6>Факты о преподавателе</h6>
        <ul>
          <li>
            Закончила Ростовский Государственный Экономический Университет в
            2023 году по специальности «Зарубежное регионоведение» (Восточная
            Азия)
          </li>
          <li>Опыт преподавания более 5 лет, начиная с 2018 года</li>
          <li>Прошла стажировку в г. Кофу (преф. Яманаси)</li>
        </ul>
      </div>

      <div class="simple-block">
        <h2><Cog size="20px" /> Контакты</h2>

        <div class="contact-buttons-container">
          <button
            class="contact-button btn-telegram"
            on:click={() => window.open("https://t.me/keisenpai_com", "_blank")}
          >
            <svg viewBox="0 0 24 24">
              <path
                d="M21.5,2.5c-0.2,0-0.4,0.1-0.5,0.2l-18,8c-0.3,0.1-0.3,0.6,0,0.7l4.3,1.8l1.7,5.1c0.1,0.3,0.5,0.4,0.7,0.2l2.5-2.2l4.2,3.1c0.3,0.2,0.7,0.1,0.8-0.3l2.5-9C22,2.8,21.8,2.5,21.5,2.5z M9.8,13.2L9,12l7.4-3.7L9.8,13.2z"
              />
            </svg>
            Связаться с нами
          </button>

          <button
            class="contact-button btn-telegram"
            on:click={() => window.open("https://t.me/yourjapanese", "_blank")}
          >
            <svg viewBox="0 0 24 24">
              <path
                d="M21.5,2.5c-0.2,0-0.4,0.1-0.5,0.2l-18,8c-0.3,0.1-0.3,0.6,0,0.7l4.3,1.8l1.7,5.1c0.1,0.3,0.5,0.4,0.7,0.2l2.5-2.2l4.2,3.1c0.3,0.2,0.7,0.1,0.8-0.3l2.5-9C22,2.8,21.8,2.5,21.5,2.5z M9.8,13.2L9,12l7.4-3.7L9.8,13.2z"
              />
            </svg>
            Публичная группа
          </button>

          <button
            class="contact-button btn-email"
            on:click={() => (window.location.href = "mailto:contact@gmail.com")}
          >
            <svg viewBox="0 0 24 24">
              <path
                d="M20,4H4C2.9,4,2,4.9,2,6v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V6C22,4.9,21.1,4,20,4z M20,8l-8,5L4,8V6l8,5l8-5V8z"
              />
            </svg>
            GMAIL ПОЧТА
          </button>
        </div>
      </div>
    </div>
    <p class="disclaimer">
      Информация, размещённая на сайте, не является публичной офертой
    </p>
  </main>
</div>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: var(--font-family-secondary);
    line-height: var(--line-height-body);
    color: var(--color-text-dark);
    background-color: #f9f9f9 !important;
    overflow-x: hidden;
  }

  main {
    width: min(95%, 1200px);
    margin: 0 auto;
    padding: 1rem;
  }

  h1 {
    margin: 2rem 0;
    text-align: center;
    font-weight: var(--font-weight-extra-bold);
    font-size: var(--font-size-h1);
    position: relative;
    padding-bottom: 0.5rem;
    opacity: 0;
  }

  h1::after {
    content: "";
    position: absolute;
    width: 0;
    height: 4px;
    background: var(--color-primary);
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 2px;
    transition: width var(--animation-duration-title-underline) ease;
  }

  h2 {
    color: var(--color-primary);
    font-weight: var(--font-weight-extra-bold);
    font-size: var(--font-size-h2);
    margin-bottom: 1rem;
    opacity: 0;
  }

  .about {
    display: flex;
    flex-direction: row;
    gap: 2rem;
    justify-content: space-between;
    margin-bottom: 3rem;
    padding: var(--spacing-padding-section);
    background-color: var(--color-bg-light);
    border-radius: var(--spacing-border-radius-block);
    box-shadow: var(--color-shadow);
    position: relative;
    overflow: hidden;
    opacity: 0;
    transform: translateY(50px);
  }

  .about img {
    width: 40%;
    max-width: 500px;
    height: auto;
    border-radius: var(--spacing-border-radius-card);
    object-fit: cover;
    transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    filter: brightness(0.95);
  }

  .about img:hover {
    transform: scale(1.05) rotate(1deg);
    filter: brightness(1.05);
  }

  .about-content {
    width: 55%;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .about h6 {
    white-space: pre-line;
    font-weight: var(--font-weight-bold);
    font-size: 1rem;
    color: var(--color-text-dark);
    margin: 1.5rem 0;
    line-height: 1.6;
    opacity: 0;
    transform: translateX(30px);
  }

  .about p {
    white-space: pre-line;
    font-weight: var(--font-weight-medium);
    font-size: 0.95rem;
    color: var(--color-text-dark);
    margin: 1.5rem 0;
    line-height: 1.7;
    opacity: 0;
    transform: translateX(30px);
  }

  .info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .simple-block {
    height: auto;
    /* min-height: 350px;  */
    border-radius: var(--spacing-border-radius-block);
    background-color: var(--color-bg-light);
    box-shadow: var(--color-shadow);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-padding-block);
    transition:
      transform var(--animation-duration-block-hover)
        cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow var(--animation-duration-transition) ease;
    opacity: 0;
    transform: scale(0.9);
  }

  .simple-block:hover {
    transform: translateY(-12px) scale(1.02);
    box-shadow: 0px 20px 30px var(--color-shadow-hover);
  }

  .simple-block h6 {
    color: var(--color-secondary);
    font-weight: var(--font-weight-extra-bold);
    font-size: clamp(1.2rem, 3vw, 1.5rem);
    text-align: center;
    margin: 1rem 0 0.5rem;
    position: relative;
    padding-bottom: 0.5rem;
  }

  .simple-block h6::after {
    content: "";
    position: absolute;
    width: 0;
    height: 3px;
    background: var(--color-secondary);
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 1.5px;
    transition: width var(--animation-duration-block-underline) ease 0.2s;
  }

  .simple-block ul {
    list-style-position: inside;
    padding: 0 1rem;
    width: 100%;
  }

  .simple-block ul li {
    font-weight: var(--font-weight-medium);
    margin-top: 1rem;
    position: relative;
    padding-left: 1.5rem;
    list-style-type: none;
    opacity: 0;
    transform: translateY(20px);
  }

  .simple-block ul li::before {
    content: "•";
    color: var(--color-secondary);
    font-weight: var(--font-weight-bold);
    position: absolute;
    left: 0;
  }

  .simple-block h2 {
    text-align: center;
    font-size: clamp(1.2rem, 3vw, 1.5rem);
    margin: 1rem 0 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .contact-buttons-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
    width: 100%;
    align-items: center;
    padding-bottom: 1rem;
  }

  .contact-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-gap-telegram-button);
    padding: 12px 24px;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: clamp(0.9rem, 1.5vw, 1rem);
    font-weight: var(--font-weight-semi-bold);
    transition: all var(--animation-duration-transition) ease;
    width: 85%;
    max-width: 300px;
    box-shadow: 0 4px 6px var(--color-shadow);
    position: relative;
    overflow: hidden;
    opacity: 0;
    transform: translateY(20px);
    color: #fff;
  }

  .btn-telegram {
    background: linear-gradient(
      to right,
      var(--color-telegram-gradient-start),
      var(--color-telegram-gradient-end)
    );
    color: var(--color-telegram-text);
  }

  .btn-email {
    background: linear-gradient(to right, #ff8a8a, var(--color-danger-red));
    color: white;
  }

  .contact-button:before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    transition: 0.5s;
  }

  .contact-button:hover:before {
    left: 100%;
  }

  .contact-button:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px var(--color-shadow-hover);
  }

  .contact-button:active {
    transform: translateY(1px);
    box-shadow: 0 2px 3px var(--color-shadow);
  }

  .contact-button svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
    border-radius: var(--spacing-border-radius-dot);
    padding: 0;
    transition: transform var(--animation-duration-transition) ease;
  }

  .btn-telegram svg {
    fill: var(--color-bg-light);
    background: var(--color-telegram);
    padding: 4px;
  }

  .contact-button:hover svg {
    animation: bounce 0.6s ease-in-out infinite;
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  .japanese-text {
    display: inline-block;
    transform: translateY(30px);
    opacity: 0;
  }

  .disclaimer {
    font-weight: var(--font-weight-medium);
    font-size: 0.9rem;
    color: var(--color-text-muted);
    text-align: center;
    margin: 2rem 0;
    padding: 1rem;
    border-top: var(--border-width-button) solid var(--color-border-light);
    opacity: 0;
  }

  .decorative-circle {
    position: absolute;
    border-radius: var(--spacing-border-radius-dot);
    opacity: 0.1;
    background: linear-gradient(
      120deg,
      var(--color-primary),
      var(--color-secondary)
    );
  }

  @media (max-width: 900px) {
    .about {
      flex-direction: column;
      align-items: center;
    }

    .about img {
      width: 80%;
      max-width: 400px;
      margin-bottom: 1.5rem;
    }

    .about-content {
      width: 100%;
    }
  }

  @media (max-width: 600px) {
    main {
      padding: 0.5rem;
    }

    h1 {
      margin: 1.5rem 0;
    }

    .about {
      padding: 1.5rem;
    }

    .about img {
      width: 100%;
      border-radius: 16px;
    }

    .simple-block {
      padding: 1.2rem;
    }

    .contact-button {
      width: 100%;
    }
  }
</style>
