<script>
  import { onMount } from "svelte";
  import { gsap } from "gsap";
  import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
  import { API_BASE_URL } from "../config.js";
  import { apiFetch } from "../api/api.js";
  import { user } from "../stores/user.js";
  import { navigate } from "svelte-routing";
  import { fetchCsrfToken } from "../api/csrf.js";
  import Eye from "svelte-material-icons/Eye.svelte";
  import EyeOff from "svelte-material-icons/EyeOff.svelte";

  let showPassword = false;
  let showPassword2 = false;

  gsap.registerPlugin(ScrollTrigger);

  let registrationContainer;
  let consultationContainer;
  let bannerElement;
  let formElements;

  let username = "";
  let email = "";
  let password = "";
  let password2 = "";

  let confirmCode = "";

  let registrationError = "";
  let confirmationError = "";
  let registrationSuccess = "";
  let confirmationSuccess = "";

  let isRegistered = false;

  let resendCooldown = 0;
  let resendInterval;

  let consultationUsername = "";
  let consultationEmail = "";
  let consultationSubject = "";
  let consultationError = "";
  let consultationSuccess = "";

  onMount(() => {
    formElements = gsap.utils.toArray("form input, form button, form h1");

    const registrationTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: registrationContainer,
        start: "bottom 97%",
        end: "bottom top",
        scrub: 1.5,
        anticipatePin: 1,
      },
    });

    registrationTimeline
      .to(formElements, {
        opacity: 0,
        y: -30,
        stagger: 0.2,
        duration: 1,
        ease: "power2.inOut",
      })
      .to(
        registrationContainer,
        { opacity: 0, scale: 0.7, duration: 1.2, ease: "power2.inOut" },
        "-=1",
      )
      .to(
        bannerElement,
        { scale: 1.3, rotation: "3deg", duration: 1.5, ease: "power3.inOut" },
        0,
      );

    const consultationTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: consultationContainer,
        start: "top 85%",
        end: "top 50%",
        scrub: 1.2,
        toggleActions: "play none none reverse",
      },
    });

    consultationTimeline.fromTo(
      consultationContainer,
      { opacity: 0, y: 150, scale: 0.8 },
      { opacity: 1, y: 0, scale: 1, duration: 1.5, ease: "power2.out" },
    );

    gsap.utils.toArray(".parallax-element").forEach((element, index) => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: element,
            start: "top 90%",
            end: "top 75%",
            scrub: 1.5,
            toggleActions: "play none none reverse",
          },
        })
        .fromTo(
          element,
          { y: 40 + index * 10, opacity: 0, scale: 1 },
          { y: 0, opacity: 1, scale: 1, duration: 1.5, ease: "power2.out" },
        );
    });

    const storedEmail = localStorage.getItem("registrationEmail");
    if (storedEmail) {
      email = storedEmail;
      isRegistered = true;
    }
  });

  async function handleRegistrationSubmit(event) {
    event.preventDefault();
    registrationError = "";
    registrationSuccess = "";

    const registrationData = {
      username: username,
      email: email,
      password: password,
      password2: password2,
    };

    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/register/`, {
        method: "POST",
        body: JSON.stringify(registrationData),
      });
      const data = await response.json();

      if (response.ok) {
        registrationSuccess = data.message;
        isRegistered = true;
        localStorage.setItem("registrationEmail", email);
      } else {
        registrationError = parseErrors(data);
      }
    } catch (err) {
      registrationError = "Ошибка соединения";
      console.error(err);
    }
  }

  async function handleConfirmSubmit(event) {
    event.preventDefault();
    confirmationError = "";
    confirmationSuccess = "";

    const storedEmail = localStorage.getItem("registrationEmail") || email;
    const confirmData = {
      email: storedEmail,
      code: confirmCode,
    };

    try {
      const response = await apiFetch(
        `${API_BASE_URL}/auth/register/confirm/`,
        {
          method: "POST",
          body: JSON.stringify(confirmData),
        },
      );
      const data = await response.json();

      if (response.ok) {
        confirmationSuccess = data.message;
        localStorage.removeItem("registrationEmail");

        await fetchCsrfToken();
        user.set({ isAuthenticated: true });
        navigate("/");
      } else {
        confirmationError = parseErrors(data);
      }
    } catch (err) {
      confirmationError = "Ошибка соединения";
      console.error(err);
    }
  }

  async function resendConfirmationCode() {
    confirmationError = "";
    confirmationSuccess = "";

    if (resendCooldown > 0) return;

    const storedEmail = localStorage.getItem("registrationEmail") || email;
    const resendData = { email: storedEmail };

    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/register/resend/`, {
        method: "POST",
        body: JSON.stringify(resendData),
      });
      const data = await response.json();

      if (response.ok) {
        confirmationSuccess = data.message || "Код выслан повторно.";
        startResendCooldown();
      } else {
        confirmationError = parseErrors(data);
      }
    } catch (err) {
      confirmationError = "Ошибка соединения";
      console.error(err);
    }
  }

  function startResendCooldown() {
    resendCooldown = 60;
    if (resendInterval) clearInterval(resendInterval);
    resendInterval = setInterval(() => {
      resendCooldown--;
      if (resendCooldown <= 0) {
        clearInterval(resendInterval);
      }
    }, 1000);
  }

  function returnToRegistration() {
    isRegistered = false;
    registrationError = "";
    confirmationError = "";
    confirmationSuccess = "";
    confirmCode = "";
    localStorage.removeItem("registrationEmail");
  }

  function parseErrors(errors) {
    let errorText = "";
    for (const key in errors) {
      if (errors.hasOwnProperty(key)) {
        errorText += errors[key].join(" ") + " ";
      }
    }
    return errorText.trim();
  }

  async function handleConsultationSubmit(event) {
    event.preventDefault();
    consultationError = "";
    consultationSuccess = "";

    const consultationData = {
      username: consultationUsername,
      email: consultationEmail,
      subject: consultationSubject,
    };

    try {
      const response = await apiFetch(
        `${API_BASE_URL}/telegram/consultation/`,
        {
          method: "POST",
          body: JSON.stringify(consultationData),
        },
      );
      const data = await response.json();

      if (response.ok) {
        consultationSuccess = data.message || "Запрос успешно отправлен.";
        consultationUsername = "";
        consultationEmail = "";
        consultationSubject = "";
      } else {
        consultationError = parseErrors(data);
      }
    } catch (err) {
      consultationError = "Ошибка соединения";
      console.error(err);
    }
  }
</script>

<svelte:head>
  <title>Регистрация — Kei</title>
  <meta name="og:title" content="Регистрация — Kei" />
  <meta name="twitter:title" content="Регистрация — Kei" />
  <meta
    name="description"
    content="Создайте аккаунт на платформе Kei для доступа к курсам."
  />
</svelte:head>

<div class="registration-container" bind:this={registrationContainer}>
  <div class="form-container">
    <h1 class="parallax-element">Добро пожаловать!</h1>

    {#if !isRegistered}
      <form on:submit={handleRegistrationSubmit}>
        <input
          type="text"
          placeholder="Как вас называть?"
          bind:value={username}
          required
        />
        <input
          type="email"
          placeholder="Электронная почта"
          bind:value={email}
          required
        />
        <div class="password-input-container">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Пароль"
            value={password}
            on:input={(e) => (password = e.target.value)}
            required
          />
          <button
            type="button"
            class="toggle-password"
            on:click={() => (showPassword = !showPassword)}
            tabindex="-1"
          >
            {#if showPassword}
              <EyeOff size="24px" />
            {:else}
              <Eye size="24px" />
            {/if}
          </button>
        </div>
        <div class="password-input-container">
          <input
            type={showPassword2 ? "text" : "password"}
            placeholder="Подтвердить пароль"
            value={password2}
            on:input={(e) => (password2 = e.target.value)}
            required
          />
          <button
            type="button"
            class="toggle-password"
            on:click={() => (showPassword2 = !showPassword2)}
            tabindex="-1"
          >
            {#if showPassword2}
              <EyeOff size="24px" />
            {:else}
              <Eye size="24px" />
            {/if}
          </button>
        </div>
        <button type="submit" class="confirm-email-button"
          >Зарегистрироваться</button
        >
      </form>
      {#if registrationError}
        <div class="error">{registrationError}</div>
      {/if}
      {#if registrationSuccess}
        <div class="success">{registrationSuccess}</div>
      {/if}
    {:else}
      <div class="confirmation-container">
        <p>
          Введите код подтверждения, отправленный на {localStorage.getItem(
            "registrationEmail",
          ) || email}
        </p>
        <form on:submit={handleConfirmSubmit}>
          <input
            type="text"
            placeholder="Код подтверждения"
            bind:value={confirmCode}
            required
          />
          <button type="submit" class="confirm-email-button"
            >Подтвердить email</button
          >
        </form>
        <div class="confirmation-links">
          <a
            href="#"
            on:click|preventDefault={resendConfirmationCode}
            class="resend-link"
            class:disabled={resendCooldown > 0}
          >
            {#if resendCooldown > 0}
              Повторно выслать код ({resendCooldown})
            {:else}
              Выслать код повторно
            {/if}
          </a>
          <a
            href="#"
            on:click|preventDefault={returnToRegistration}
            class="back-link"
          >
            Вернуться к регистрации
          </a>
        </div>
        {#if confirmationError}
          <div class="error">{confirmationError}</div>
        {/if}
        {#if confirmationSuccess}
          <div class="success">{confirmationSuccess}</div>
        {/if}
      </div>
    {/if}

    <div class="contact-text">СВЯЗЬ С ПРЕПОДАВАТЕЛЕМ</div>
    <div class="contact-buttons">
      <button
        class="telegram-button"
        on:click={() => window.open("https://t.me/keisenpai_com", "_blank")}
      >
        <svg viewBox="0 0 24 24">
          <path
            d="M21.5,2.5c-0.2,0-0.4,0.1-0.5,0.2l-18,8c-0.3,0.1-0.3,0.6,0,0.7l4.3,1.8l1.7,5.1c0.1,0.3,0.5,0.4,0.7,0.2l2.5-2.2l4.2,3.1c0.3,0.2,0.7,0.1,0.8-0.3l2.5-9C22,2.8,21.8,2.5,21.5,2.5z M9.8,13.2L9,12l7.4-3.7L9.8,13.2z"
          />
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
    <a href="https://t.me/keisenpai_com" target="_blank">@keisenpai_com</a>
  </div>
  <div class="consultation-form">
    <div class="consultation-inputs parallax-element">
      <input
        type="text"
        placeholder="Имя"
        bind:value={consultationUsername}
        required
      />
      <input
        type="email"
        placeholder="Почта"
        bind:value={consultationEmail}
        required
      />
      <input
        type="text"
        placeholder="Тема"
        bind:value={consultationSubject}
        required
      />
    </div>
    <button
      class="consultation-button parallax-element"
      on:click={handleConsultationSubmit}>Отправить заявку</button
    >
    {#if consultationError}
      <div class="error">{consultationError}</div>
    {/if}
    {#if consultationSuccess}
      <div class="success">{consultationSuccess}</div>
    {/if}
  </div>
</div>

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
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.03);
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }

  .registration-container {
    display: flex;
    width: 100%;
    overflow: hidden;
    background-color: #f8f9fb;
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
    padding: 1.25rem 1.5rem;
    font-weight: 300;
    font-size: 1.25rem;
    color: #333;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-sizing: border-box;
    transition: all 0.3s ease;
    animation: fadeInUp 0.8s ease-out both;
  }

  .password-input-container {
    position: relative;
    width: 100%;
  }

  .password-input-container input {
    width: 100%;
    font-size: 1.25rem !important;
    letter-spacing: normal !important;
  }

  .toggle-password {
    position: absolute;
    right: 15px;
    top: 45%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #bdb4fe;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px;
    transition: color 0.3s;
    z-index: 2;
  }

  .toggle-password:hover {
    color: #8f7ee3;
  }
  form input:focus {
    box-shadow: 0 0 10px #a8a1f5;
    outline: none;
  }
  .confirm-email-button {
    width: 100%;
    padding: 25px 15px;
    border: none;
    border-radius: 20px;
    background-image: linear-gradient(to bottom, #d8a6e2, #a192f1);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    color: #fff;
    font-size: 22px;
    font-weight: 400;
    cursor: pointer;
    margin-top: 15px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    animation: pulse 2s infinite;
  }
  .confirm-email-button:hover {
    background-image: linear-gradient(to bottom, #c88ed5, #8c78e3);
    transform: scale(1.05);
  }
  .confirm-email-button:active {
    transform: scale(0.95);
  }
  .contact-text {
    margin-top: 40px;
    font-weight: bold;
    color: #bdb4fe;
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
    color: #fff;
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
    background: url("/banner.jpg") no-repeat right center;
    background-size: cover;
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
    color: #bdb4fe;
    text-decoration: none;
    font-weight: bold;
  }
  .consultation-text a:hover {
    color: #9e94f5;
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
    box-shadow: 0 0 10px #a8a1f5;
    outline: none;
  }
  .consultation-button {
    padding: 18px 25px;
    border: none;
    border-radius: 20px;
    background-image: linear-gradient(to bottom, #d8a6e2, #a192f1);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    color: #fff;
    font-size: 20px;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    width: 100%;
  }
  .consultation-button:hover {
    background-image: linear-gradient(to bottom, #c88ed5, #8c78e3);
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

  .confirmation-links {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 16px;
    color: #bdb4fe;
    margin-top: 10px;
  }

  .confirmation-links a {
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
  }

  .confirmation-links a:hover {
    color: #8f7ee3;
    opacity: 0.8;
  }

  .confirmation-links a.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
</style>
