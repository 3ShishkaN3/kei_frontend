<script>
  import { onMount, onDestroy } from 'svelte';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

  gsap.registerPlugin(ScrollTrigger);

  let registrationContainer;
  let consultationContainer;
  let bannerElement;
  let formElements;

  onMount(() => {
    formElements = gsap.utils.toArray('form input, form button, form h1');

    const registrationTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: registrationContainer,
        start: 'bottom 97%',
        end: 'bottom top',
        scrub: 1.5,
        anticipatePin: 1,
      },
    });

    registrationTimeline
      .to(formElements, { opacity: 0, y: -30, stagger: 0.2, duration: 1, ease: 'power2.inOut' })
      .to(registrationContainer, { opacity: 0, scale: 0.7, duration: 1.2, ease: 'power2.inOut' }, '-=1')
      .to(bannerElement, { scale: 1.3, rotation: '3deg', duration: 1.5, ease: 'power3.inOut' }, 0);

    const consultationTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: consultationContainer,
        start: 'top 85%',
        end: 'top 50%',
        scrub: 1.2,
        toggleActions: 'play none none reverse',
      },
    });

    consultationTimeline.fromTo(
      consultationContainer,
      { opacity: 0, y: 150, scale: 0.8 },
      { opacity: 1, y: 0, scale: 1, duration: 1.5, ease: 'power2.out' }
    );

    gsap.utils.toArray('.parallax-element').forEach((element, index) => {
      gsap.timeline({
        scrollTrigger: {
          trigger: element,
          start: 'top 90%',
          end: 'top 75%',
          scrub: 1.5,
          toggleActions: 'play none none reverse',
        },
      }).fromTo(
        element,
        { y: 40 + index * 10, opacity: 0, scale: 1 },
        { y: 0, opacity: 1, scale: 1, duration: 1.5, ease: 'power2.out' }
      );
    });
  });

</script>




<style>
    .consultation-container {
        will-change: transform, opacity;
        transition: all 0.5s ease;
    }

  @keyframes fadeInUp {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.03); }
    100% { transform: scale(1); }
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  .registration-container {
    display: flex;
    width: 100%;
    overflow: hidden;
    background-color: #F8F9FB;
    min-height: 100vh;
  }
  .form-container {
    width: 43%;
    padding: 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }
  .form-container h1 {
    font-weight: 500;
    color: #333;
    margin-bottom: 30px;
    font-size: 40px;
    text-align: center;
    animation: fadeInUp 0.8s ease-out both;
  }
  form {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  form input {
    width: 100%;
    padding: 20px 24px;
    font-weight: 300;
    font-size: 20px;
    color: #333;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-sizing: border-box;
    transition: all 0.3s ease;
    animation: fadeInUp 0.8s ease-out both;
  }
  form input:focus {
    box-shadow: 0 0 10px #A8A1F5;
    outline: none;
  }
  .confirm-email-button {
    width: 100%;
    padding: 25px 15px;
    border: none;
    border-radius: 20px;
    background-image: linear-gradient(to bottom, #C2B6FC, #EBC7F2);
    color: #FFF;
    font-size: 22px;
    font-weight: 400;
    cursor: pointer;
    margin-top: 15px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    animation: pulse 2s infinite;
  }
  .confirm-email-button:hover {
    background-image: linear-gradient(to bottom, #D8A8E8, #A8A1F5);
    transform: scale(1.05);
  }
  .confirm-email-button:active {
    transform: scale(0.95);
  }
  .contact-text {
    margin-top: 40px;
    font-weight: bold;
    color: #BDB4FE;
    text-transform: uppercase;
    font-size: 20px;
    text-align: center;
  }
  .contact-buttons {
    margin-top: 20px;
    display: flex;
    gap: 20px;
  }
  .telegram-button {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px 30px;
    background: #333;
    color: #FFF;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: 18px;
    font-weight: 300;
    transition: all 0.3s ease;
  }
  .telegram-button:hover {
    background: #444;
    transform: scale(1.05);
  }
  .telegram-button:active {
    background: #222;
    transform: scale(0.95);
  }
  .telegram-button svg {
    width: 24px;
    height: 24px;
    fill: white;
    background: #0088cc;
    border-radius: 50%;
    padding: 5px;
    transition: transform 0.3s ease;
  }
  .telegram-button:hover svg {
    animation: bounce 0.6s ease-in-out infinite;
  }
  .banner {
    width: 57%;
    background: url('/banner.jpg') no-repeat right center;
    background-size: cover;
    transition: transform 1.5s ease;
  }
  .banner:hover {
    transform: scale(1.02);
  }
  @media (max-width: 1024px) {
    .registration-container {
      flex-direction: column;
    }
    .form-container {
      width: 100%;
    }
    .banner {
      width: 100%;
      height: 300px;
    }
  }
  @media (max-width: 768px) {
    .banner {
      display: none;
    }
    .form-container {
      padding: 20px;
    }
    form input {
      font-size: 18px;
    }
    .confirm-email-button {
      font-size: 18px;
      padding: 20px 10px;
    }
  }

  .consultation-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    margin-top: 200px;
    margin-bottom: 200px;
    background: transparent;
    animation: fadeInUp 0.8s ease-out both;
  }
  .consultation-container h1 {
    font-weight: 500;
    color: #333;
    margin-bottom: 30px;
    font-size: 40px;
  }
  .consultation-text {
    font-size: 22px;
    color: #333;
    font-weight: 400;
    margin-bottom: 20px;
  }
  .consultation-text a {
    color: #BDB4FE;
    text-decoration: none;
    font-weight: bold;
  }
  .consultation-text a:hover {
    color: #9E94F5;
  }
  .consultation-form {
    width: 100%;
    background: transparent;
    max-width: 700px;
  }
  .consultation-inputs {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-bottom: 20px;
  }
  .consultation-inputs input {
    width: 100%;
    padding: 20px 24px;
    font-weight: 300;
    font-size: 20px;
    color: #333;
    border: 1px solid #ccc;
    border-radius: 12px;
    box-sizing: border-box;
    transition: all 0.3s ease;
  }
  .consultation-inputs input:focus {
    box-shadow: 0 0 10px #A8A1F5;
    outline: none;
  }
  .consultation-button {
    padding: 18px 25px;
    border: none;
    border-radius: 20px;
    background-image: linear-gradient(to bottom, #C2B6FC, #EBC7F2);
    color: #FFF;
    font-size: 20px;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    width: 100%;
  }
  .consultation-button:hover {
    background-image: linear-gradient(to bottom, #D8A8E8, #A8A1F5);
    transform: scale(1.05);
  }
  .consultation-button:active {
    transform: scale(0.95);
  }
  @media (max-width: 1024px) {
    .consultation-inputs {
      flex-direction: column;
      align-items: center;
    }
    .consultation-inputs input {
      width: 100%;
    }
  }
</style>

<div class="registration-container" bind:this={registrationContainer}>
  <div class="form-container">
    <h1 class="parallax-element">Добро пожаловать!</h1>
    <form>
      <input type="text" placeholder="Как вас называть?" />
      <input type="email" placeholder="Электронная почта" />
      <input type="password" placeholder="Пароль" />
      <input type="password" placeholder="Подтвердить пароль" />
      <button type="submit" class="confirm-email-button parallax-element">Подтвердить почту</button>
    </form>
    <div class="contact-text">СВЯЗЬ С ПРЕПОДАВАТЕЛЕМ</div>
    <div class="contact-buttons">
      <button class="telegram-button" on:click={() => window.open('https://t.me/keisenpai', '_blank')}>
        <svg viewBox="0 0 24 24">
          <path d="M21.5,2.5c-0.2,0-0.4,0.1-0.5,0.2l-18,8c-0.3,0.1-0.3,0.6,0,0.7l4.3,1.8l1.7,5.1c0.1,0.3,0.5,0.4,0.7,0.2l2.5-2.2l4.2,3.1c0.3,0.2,0.7,0.1,0.8-0.3l2.5-9C22,2.8,21.8,2.5,21.5,2.5z M9.8,13.2L9,12l7.4-3.7L9.8,13.2z"/>
        </svg>
        TELEGRAM
      </button>
    </div>
  </div>
  <div class="banner parallax-element"></div>
</div>

<div class="consultation-container" bind:this={consultationContainer}>
  <h1 class="parallax-element">Бесплатная консультация</h1>
  <div class="consultation-text parallax-element">
    Отправьте заявку или напишите нам в Telegram:
    <a href="https://t.me/KeiSenpai" target="_blank">@KeiSenpai</a>
  </div>
  <div class="consultation-form">
    <div class="consultation-inputs parallax-element">
      <input type="text" placeholder="Имя" />
      <input type="tel" placeholder="Телефон" />
      <input type="text" placeholder="Тема" />
    </div>
    <button class="consultation-button parallax-element">Отправить заявку</button>
  </div>
</div>