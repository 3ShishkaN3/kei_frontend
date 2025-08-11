
<script>
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import { TextPlugin } from 'gsap/TextPlugin';
  import Cog from 'svelte-material-icons/Cog.svelte';
  // Регистрируем плагины
  gsap.registerPlugin(ScrollTrigger, TextPlugin);

  let container;

  onMount(() => {
    // Создаем декоративные элементы
    createDecorativeElements();
    
    // Анимация заголовков
    animateHeadings();
    
    // Анимация секции "О сайте"
    animateAboutSection();
    
    // Анимация блоков информации
    animateInfoBlocks();
    
    // Анимация японского текста
    animateJapaneseText();
    
    // Анимация дисклеймера
    animateDisclaimer();
  });

  function createDecorativeElements() {
    // Создаем несколько декоративных кругов для фона
    const circles = [
      { size: '300px', top: '5%', left: '3%' },
      { size: '200px', top: '30%', right: '5%' },
      { size: '250px', bottom: '10%', left: '10%' }
    ];

    circles.forEach(circle => {
      const element = document.createElement('div');
      element.classList.add('decorative-circle');
      
      // Настраиваем стили
      Object.keys(circle).forEach(key => {
        element.style[key] = circle[key];
      });
      
      container.appendChild(element);
      
      // Анимируем круги
      gsap.to(element, {
        scale: 1.2,
        opacity: 0.05,
        duration: 10 + Math.random() * 5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    });
  }

  function animateHeadings() {
    // Анимация для всех h1
    gsap.utils.toArray('h1').forEach((heading, i) => {
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
            start: "top 80%"
          }
        }
      );
      
      // Анимация линии под заголовком
      gsap.to(heading.querySelector('::after'), {
        width: 80,
        duration: 1.5,
        delay: 0.5 + i * 0.2,
        ease: "elastic.out(1, 0.3)",
        scrollTrigger: {
          trigger: heading,
          start: "top 80%"
        }
      });
    });
    
    // Анимация для всех h2 внутри about-content
    gsap.utils.toArray('.about-content h2').forEach(heading => {
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
            start: "top 80%"
          }
        }
      );
    });
    
    // Анимация для всех h2 внутри simple-block
    gsap.utils.toArray('.simple-block h2').forEach(heading => {
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
            start: "top 85%"
          }
        }
      );
    });
  }

  function animateAboutSection() {
    // Анимация секции about
    gsap.fromTo(
      '.about',
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: '.about',
          start: "top 80%"
        }
      }
    );
    
    // Анимация изображения
    gsap.fromTo(
      '.about img',
      { opacity: 0, scale: 0.8, rotateY: -10 },
      {
        opacity: 1,
        scale: 1,
        rotateY: 0,
        duration: 1.5,
        ease: "back.out(1.5)",
        scrollTrigger: {
          trigger: '.about',
          start: "top 75%"
        }
      }
    );
    
    // Добавим анимацию float к изображению
    gsap.to('.about img', {
      y: -15,
      duration: 3,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      delay: 2
    });
    
    // Анимация текста h6
    gsap.fromTo(
      '.about h6',
      { opacity: 0, x: 30 },
      {
        opacity: 1,
        x: 0,
        duration: 1,
        delay:.4,
        ease: "power2.out",
        scrollTrigger: {
          trigger: '.about',
          start: "top 75%"
        }
      }
    );
    
    // Анимация параграфа
    gsap.fromTo(
      '.about p',
      { opacity: 0, x: 30 },
      {
        opacity: 1,
        x: 0,
        duration: 1,
        delay: .7,
        ease: "power2.out",
        scrollTrigger: {
          trigger: '.about',
          start: "top 75%"
        }
      }
    );
  }

  function animateInfoBlocks() {
    // Анимация для блоков информации
    gsap.utils.toArray('.simple-block').forEach((block, i) => {
      // Сначала анимируем сам блок
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
            start: "top 85%"
          }
        }
      );
      
      // Анимация для заголовка h6 внутри блока
      const heading = block.querySelector('h6');
      if (heading) {
        // Анимируем линию под заголовком
        gsap.to(heading.querySelector('::after'), {
          width: 50,
          duration: 1,
          delay: 0.3 + i * 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: block,
            start: "top 85%"
          }
        });
      }
      
      // Анимация для списка элементов
      const listItems = block.querySelectorAll('ul li');
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
              start: "top 85%"
            }
          }
        );
      }
      
      // Анимация для кнопки Telegram
      const button = block.querySelector('.telegram-button');
      if (button) {
        gsap.fromTo(
          button,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.5 + i * 0.2,
            ease: "back.out(1.7)",
            scrollTrigger: {
              trigger: block,
              start: "top 75%"
            }
          }
        );
        
        // Добавляем пульсирующую анимацию для кнопки
        gsap.to(button, {
          boxShadow: '0 0 0 0 rgba(0, 136, 204, 0.4)',
          repeat: -1,
          duration: 2,
          ease: "none",
          yoyo: true,
          delay: 2
        });
      }
    });
  }

  function animateJapaneseText() {
    // Оборачиваем японский текст в span с классом japanese-text
    const japaneseHeading = document.querySelector('.about-content h2');
    if (japaneseHeading) {
      const text = japaneseHeading.textContent;
      const wrappedText = [...text].map(char => `<span class="japanese-text">${char}</span>`).join('');
      japaneseHeading.innerHTML = wrappedText;
      
      // Анимируем каждый символ отдельно
      gsap.fromTo(
        '.japanese-text',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.07,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: japaneseHeading,
            start: "top 80%"
          }
        }
      );
    }
  }

  function animateDisclaimer() {
    // Анимация для дисклеймера
    gsap.fromTo(
      '.disclaimer',
      { opacity: 0, y: 10 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: '.disclaimer',
          start: "top 95%"
        }
      }
    );
  }
</script>

<style>
/* Основные стили */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: var(--font-family-secondary);
    line-height: var(--line-height-body);
    color: var(--color-text-dark);
    background-color: #f9f9f9; /* Оставил пока так */
    overflow-x: hidden; /* Предотвращаем горизонтальную прокрутку */
}

/* Контейнер */
main {
    width: min(95%, 1200px); /* Оставил пока так */
    margin: 0 auto;
    padding: 1rem; /* Оставил пока так */
}

/* Заголовки */
h1 {
    margin: 2rem 0; /* Оставил пока так */
    text-align: center;
    font-weight: var(--font-weight-extra-bold);
    font-size: var(--font-size-h1);
    position: relative;
    padding-bottom: 0.5rem; /* Оставил пока так */
    opacity: 0; /* Начальная прозрачность для анимации */
}

h1::after {
    content: "";
    position: absolute;
    width: 0; /* Начальная ширина для анимации */
    height: 4px; /* Оставил пока так */
    background: var(--color-primary);
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 2px; /* Оставил пока так */
    transition: width var(--animation-duration-title-underline) ease;
}

h2 {
    color: var(--color-primary);
    font-weight: var(--font-weight-extra-bold);
    font-size: var(--font-size-h2);
    margin-bottom: 1rem; /* Оставил пока так */
    opacity: 0; /* Начальная прозрачность для анимации */
}

/* Секция "О сайте" */
.about {
    display: flex;
    flex-direction: row;
    gap: 2rem; /* Оставил пока так */
    justify-content: space-between;
    margin-bottom: 3rem; /* Оставил пока так */
    padding: var(--spacing-padding-section);
    background-color: var(--color-bg-light);
    border-radius: var(--spacing-border-radius-block);
    box-shadow: var(--color-shadow);
    position: relative;
    overflow: hidden;
    opacity: 0; /* Начальная прозрачность для анимации */
    transform: translateY(50px); /* Начальное положение для анимации */
}

.about img {
    width: 40%; /* Оставил пока так */
    max-width: 500px; /* Оставил пока так */
    height: auto;
    border-radius: var(--spacing-border-radius-card);
    object-fit: cover;
    transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94); /* Оставил пока так */
    filter: brightness(0.95); /* Оставил пока так */
}

.about img:hover {
    transform: scale(1.05) rotate(1deg); /* Оставил пока так */
    filter: brightness(1.05); /* Оставил пока так */
}

.about-content {
    width: 55%; /* Оставил пока так */
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.about h6 {
    white-space: pre-line;
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-h6);
    margin-bottom: 1rem; /* Оставил пока так */
    line-height: var(--line-height-title);
    opacity: 0; /* Начальная прозрачность для анимации */
    transform: translateX(30px); /* Начальное положение для анимации */
}

.about p {
    white-space: pre-line;
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-p);
    color: var(--color-text-dark); /* Исправил на правильную переменную */
    line-height: var(--line-height-title);
    opacity: 0; /* Начальная прозрачность для анимации */
    transform: translateX(30px); /* Начальное положение для анимации */
}

/* Секция "Информация" */
.info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Оставил пока так */
    gap: 2rem; /* Оставил пока так */
    margin-bottom: 2rem; /* Оставил пока так */
}

.simple-block {
    height: auto;
    min-height: 350px; /* Оставил пока так */
    border-radius: var(--spacing-border-radius-block);
    background-color: var(--color-bg-light);
    box-shadow: var(--color-shadow);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-padding-block);
    transition: transform var(--animation-duration-block-hover) cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow var(--animation-duration-transition) ease;
    opacity: 0; /* Начальная прозрачность для анимации */
    transform: scale(0.9); /* Начальное положение для анимации */
}

.simple-block:hover {
    transform: translateY(-12px) scale(1.02); /* Оставил пока так */
    box-shadow: 0px 20px 30px var(--color-shadow-hover); /* Оставил пока так */
}

.simple-block h6 {
    color: var(--color-secondary);
    font-weight: var(--font-weight-extra-bold);
    font-size: clamp(1.2rem, 3vw, 1.5rem); /* Оставил пока так */
    text-align: center;
    margin: 1rem 0 1.5rem; /* Оставил пока так */
    position: relative;
    padding-bottom: 0.5rem; /* Оставил пока так */
}

.simple-block h6::after {
    content: "";
    position: absolute;
    width: 0; /* Начальная ширина для анимации */
    height: 3px; /* Оставил пока так */
    background: var(--color-secondary);
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 1.5px; /* Оставил пока так */
    transition: width var(--animation-duration-block-underline) ease 0.2s;
}

.simple-block ul {
    list-style-position: inside;
    padding: 0 1rem; /* Оставил пока так */
    width: 100%;
}

.simple-block ul li {
    font-weight: var(--font-weight-medium);
    margin-top: 1rem; /* Оставил пока так */
    position: relative;
    padding-left: 1.5rem; /* Оставил пока так */
    list-style-type: none;
    opacity: 0; /* Начальная прозрачность для анимации */
    transform: translateY(20px); /* Начальное положение для анимации */
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
    font-size: clamp(1.2rem, 3vw, 1.5rem); /* Оставил пока так */
    margin: 1rem 0 2rem; /* Оставил пока так */
}

/* Кнопка Telegram */
.telegram-button {
    margin-top: var(--spacing-margin-top-large);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-gap-telegram-button);
    padding: var(--spacing-padding-telegram-button);
    background: linear-gradient(to right, var(--color-telegram-gradient-start), var(--color-telegram-gradient-end));
    color: var(--color-telegram-text);
    border: none;
    border-radius: 12px; /* Оставил пока так */
    cursor: pointer;
    font-size: clamp(0.9rem, 2vw, 1.1rem); /* Оставил пока так */
    font-weight: var(--font-weight-semi-bold);
    transition: all var(--animation-duration-transition) ease;
    width: 80%; /* Оставил пока так */
    max-width: 250px; /* Оставил пока так */
    box-shadow: 0 4px 6px var(--color-shadow); /* Оставил пока так */
    position: relative;
    overflow: hidden;
    opacity: 0; /* Начальная прозрачность для анимации */
    transform: translateY(20px); /* Начальное положение для анимации */
}

.telegram-button:before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); /* Оставил пока так */
    transition: 0.5s; /* Оставил пока так */
}

.telegram-button:hover:before {
    left: 100%;
}

.telegram-button:hover {
    transform: translateY(-5px); /* Оставил пока так */
    box-shadow: 0 8px 15px var(--color-shadow-hover); /* Оставил пока так */
}

.telegram-button:active {
    transform: translateY(1px); /* Оставил пока так */
    box-shadow: 0 2px 3px var(--color-shadow); /* Оставил пока так */
}

.telegram-button svg {
    width: 24px; /* Оставил пока так */
    height: 24px; /* Оставил пока так */
    fill: var(--color-bg-light);
    background: var(--color-telegram);
    border-radius: var(--spacing-border-radius-dot);
    padding: 5px; /* Оставил пока так */
    transition: transform var(--animation-duration-transition) ease;
}

.telegram-button:hover svg {
    animation: bounce 0.6s ease-in-out infinite; /* Оставил пока так */
}

/* Анимации */
@keyframes bounce {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-5px);
    }
}

@keyframes float {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-10px);
    }
}

@keyframes pulse {
    0% {
        box-shadow: 0 0 0 0 rgba(111, 66, 193, 0.4); /* Оставил пока так */
    }
    70% {
        box-shadow: 0 0 0 15px rgba(111, 66, 193, 0); /* Оставил пока так */
    }
    100% {
        box-shadow: 0 0 0 0 rgba(111, 66, 193, 0); /* Оставил пока так */
    }
}

@keyframes gradientMove {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}

/* Класс для японского текста */
.japanese-text {
    display: inline-block;
    transform: translateY(30px); /* Оставил пока так */
    opacity: 0;
}

/* Дисклеймер */
.disclaimer {
    font-weight: var(--font-weight-medium);
    font-size: 0.9rem; /* Оставил пока так */
    color: var(--color-text-muted);
    text-align: center;
    margin: 2rem 0; /* Оставил пока так */
    padding: 1rem; /* Оставил пока так */
    border-top: var(--border-width-button) solid var(--color-border-light);
    opacity: 0; /* Начальная прозрачность для анимации */
}

/* Декоративные элементы для анимаций */
.decorative-circle {
    position: absolute;
    border-radius: var(--spacing-border-radius-dot);
    opacity: 0.1; /* Оставил пока так */
    background: linear-gradient(120deg, var(--color-primary), var(--color-secondary));
}

/* Медиа-запросы */
@media (max-width: 900px) {
    .about {
        flex-direction: column;
        align-items: center;
    }

    .about img {
        width: 80%; /* Оставил пока так */
        max-width: 400px; /* Оставил пока так */
        margin-bottom: 1.5rem; /* Оставил пока так */
    }

    .about-content {
        width: 100%;
    }
}

@media (max-width: 600px) {
    main {
        padding: 0.5rem; /* Оставил пока так */
    }

    h1 {
        margin: 1.5rem 0; /* Оставил пока так */
    }

    .about {
        padding: 1.5rem; /* Оставил пока так */
    }

    .about img {
        width: 100%; /* Оставил пока так */
        border-radius: 16px; /* Оставил пока так */
    }

    .simple-block {
        padding: 1.2rem; /* Оставил пока так */
    }

    .telegram-button {
        width: 100%; /* Оставил пока так */
    }
}
</style>

<div bind:this={container}>
  <main>
    <h1>О сайте</h1>
    <div class="about">
        <img src="banner-info.jpg" alt="Информационный баннер"/>
        <div class="about-content">
            <h2>こんにちは！</h2>
            <h6>Рада приветствовать вас на моём образовательном сайте. Здесь вы найдёте множество уникальных и полезных уроков по японскому языку, которые помогут обучаться быстро и весело! 
                        
                Весь материал был отобран с любовью.
            </h6>
            <p>Японский язык - это не только способ общения, но и ключ к фантастической культуре, традициям и истории Японии. Благодаря языку вы сможете понимать не только слова, но и глубинные значения, стоящие за ними. Каждый символ, каждое выражение в японском языке несет в себе особую энергию и смысл, который открывается лишь тем, кто изучает его.</p>
        </div>
    </div>
    <h1>Информация</h1>
    <div class="info">
        <div class="simple-block">
            <h6>Факты о преподавателе</h6>
            <ul>
                <li>Закончила Ростовский Государственный Экономический Университет в 2023 году по специальности «Зарубежное регионоведение» (Восточная Азия)</li>
                <li>Опыт преподавания более 5 лет, начиная с 2018 года</li>
                <li>На данный момент проживает в Японии</li>
                <li>Прошла стажировку в г. Кофу (преф. Яманаси)</li>
            </ul>
        </div>

        <div class="simple-block">
            <h2> <Cog size="20px" /> Связь с преподавателем</h2>
            <button class="telegram-button" on:click={() => window.open('https://t.me/keisenpai', '_blank')}>
                <svg viewBox="0 0 24 24">
                    <path d="M21.5,2.5c-0.2,0-0.4,0.1-0.5,0.2l-18,8c-0.3,0.1-0.3,0.6,0,0.7l4.3,1.8l1.7,5.1c0.1,0.3,0.5,0.4,0.7,0.2l2.5-2.2l4.2,3.1c0.3,0.2,0.7,0.1,0.8-0.3l2.5-9C22,2.8,21.8,2.5,21.5,2.5z M9.8,13.2L9,12l7.4-3.7L9.8,13.2z"/>
                </svg>
                TELEGRAM
            </button>
        </div>
    </div>
    <p class="disclaimer">Информация, размещённая на сайте, не является публичной офертой</p>
  </main>
</div>