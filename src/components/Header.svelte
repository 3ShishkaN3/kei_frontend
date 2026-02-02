<script>
  import { Link, navigate } from "svelte-routing";
  import { onMount, onDestroy } from "svelte";
  import { user } from "../stores/user.js";
  import { API_BASE_URL } from "../config.js";
  import { apiFetch } from "../api/api.js";
  import { csrfToken } from "../api/csrf.js";
  import { avatar } from "../stores/avatar.js";
  import NotificationBell from "./NotificationBell.svelte";

  let mobileMenuOpen = false;
  let isAuthenticated = false;

  user.subscribe((value) => {
    isAuthenticated = value.isAuthenticated;
  });

  async function handleLogout() {
    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/logout/`, {
        method: "POST",
      });
      if (response.ok) {
        csrfToken.set(null);
        user.set({ isAuthenticated: false });
        navigate("/");
      } else {
        console.error("Ошибка выхода");
      }
    } catch (err) {
      console.error("Ошибка соединения", err);
    }
  }

  const toggleMenu = () => (mobileMenuOpen = !mobileMenuOpen);

  let isScrolled = false;
  let isHidden = false;
  let lastScrollY = 0;

  const handleScroll = () => {
    const scrollY = window.scrollY;
    isScrolled = scrollY > 50;
    if (scrollY > lastScrollY + 20) {
      isHidden = true;
    } else if (scrollY < lastScrollY) {
      isHidden = false;
    }
    lastScrollY = scrollY;
  };

  onMount(async () => {
    window.addEventListener("scroll", handleScroll);
    try {
      const response = await apiFetch(`${API_BASE_URL}/profile/avatar`);
      if (response.ok) {
        const data = await response.json();
        avatar.set(data.avatar || "/avatar.jpg");
      } else {
        console.error("Ошибка загрузки аватара");
      }
    } catch (err) {
      console.error("Ошибка соединения при загрузке аватара", err);
    }
  });

  onDestroy(() => {
    window.removeEventListener("scroll", handleScroll);
  });

  const closeMobileMenu = () => {
    mobileMenuOpen = false;
  };

  function handleProfile() {
    console.log("Переход в личный кабинет пользователя");
    navigate("/statistics");
  }

  function handleInfo() {
    console.log("Нажата кнопка Информация");
    navigate("/info");
  }
  function handleBonuses() {
    console.log("Нажата кнопка Бонусы");
    navigate("/bonuses");
  }
  function handleSettings() {
    console.log("Нажата кнопка Настройки");
    navigate("/profile");
  }
  function handleLessons() {
    console.log("Нажата кнопка Уроки");
    navigate("/courses");
  }
</script>

<header class="{isScrolled ? 'scrolled' : ''} {isHidden ? 'hidden' : ''}">
  <a href="/" aria-label="Главная">
    <img src="/logo.png" alt="Logo" class="logo" />
  </a>

  <div class="nav-buttons">
    {#if isAuthenticated}
      <div class="navigation-buttons">
        <button class="simple-button" on:click={handleInfo}>Блог</button>
        <button class="simple-button primary-action" on:click={handleLessons}
          >Обучение</button
        >
        <button class="simple-button" on:click={handleBonuses}>Бонусы</button>
        <button class="simple-button" on:click={handleSettings}
          >Настройки</button
        >
      </div>

      <div class="divider"></div>

      <div class="navigation-buttons">
        <button class="simple-button" on:click={handleInfo}>О нас</button>
      </div>

      <div class="user-controls">
        <NotificationBell />
        <div
          class="avatar-container"
          on:click={handleProfile}
          on:keydown={(e) =>
            (e.key === "Enter" || e.key === " ") && handleProfile()}
        >
          <img
            src={$avatar || "/avatar.jpg"}
            alt="Аватар"
            class="avatar"
            title="Перейти в личный кабинет"
          />
        </div>
        <button class="logout-button" on:click={handleLogout}>Выход</button>
      </div>
    {:else}
      <Link to="/registration">
        <button class="auth-button">Регистрация</button>
      </Link>
      <Link to="/login">
        <button class="auth-button">Вход</button>
      </Link>
    {/if}
  </div>

  <button
    class="menu-button {mobileMenuOpen ? 'open' : ''}"
    on:click={toggleMenu}
    aria-label="Меню"
  >
    <div class="menu-icon">
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
    </div>
  </button>

  <div class="mobile-menu {mobileMenuOpen ? 'open' : ''}">
    {#if isAuthenticated}
      <div class="mobile-menu-section">
        <button
          class="mobile-nav-item"
          on:click={() => {
            handleInfo();
            closeMobileMenu();
          }}>Блог</button
        >
        <button
          class="mobile-nav-item primary"
          on:click={() => {
            handleLessons();
            closeMobileMenu();
          }}>Обучение</button
        >
        <button
          class="mobile-nav-item"
          on:click={() => {
            handleBonuses();
            closeMobileMenu();
          }}>Бонусы</button
        >
        <button
          class="mobile-nav-item"
          on:click={() => {
            handleSettings();
            closeMobileMenu();
          }}>Настройки</button
        >
      </div>
      
      <div class="mobile-divider"></div>
      
      <div class="mobile-menu-section">
        <button
          class="mobile-nav-item"
          on:click={() => {
            handleInfo();
            closeMobileMenu();
          }}>О нас</button
        >
      </div>
      
      <div class="mobile-profile-row">
        <NotificationBell />
        <div
          class="avatar-container small"
          on:click={() => {
            handleProfile();
            closeMobileMenu();
          }}
        >
          <img src={$avatar || "/avatar.jpg"} alt="Аватар" class="avatar" />
        </div>
        <button
          class="logout-button small"
          on:click={() => {
            handleLogout();
            closeMobileMenu();
          }}>Выход</button
        >
      </div>
    {:else}
      <Link to="/registration" on:click={closeMobileMenu}>
        <button class="auth-button">Регистрация</button>
      </Link>
      <Link to="/login" on:click={closeMobileMenu}>
        <button class="auth-button">Вход</button>
      </Link>
    {/if}
  </div>
</header>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--color-header-bg);
    padding: 16px 64px;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: var(--z-index-header);
    transition: top var(--animation-duration-header-scroll) ease;
  }

  header.scrolled {
    background: var(--color-header-bg-scrolled);
    box-shadow: 0 4px 8px var(--color-header-shadow);
  }

  header.hidden {
    top: var(--header-hidden-top);
  }

  .logo {
    height: 72px;
    cursor: pointer;
  }

  .nav-buttons {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-grow: 1;
    margin-left: var(--spacing-nav-buttons-margin-left);
    gap: var(--spacing-nav-buttons-gap);
  }

  .auth-button {
    background-image: linear-gradient(
      to right,
      var(--color-auth-button-gradient-start) 0%,
      var(--color-auth-button-gradient-end) 100%
    );
    height: var(--spacing-auth-button-height);
    width: var(--spacing-auth-button-width);
    color: var(--color-auth-button-text);
    font-family: var(--font-family-primary);
    font-weight: var(--font-weight-bold);
    border: none;
    border-radius: var(--spacing-auth-button-border-radius);
    cursor: pointer;
    transition: all var(--animation-duration-transition) ease;
    box-shadow: 0 4px 10px var(--color-header-shadow);
  }
  .auth-button:hover {
    background-image: linear-gradient(
      to right,
      var(--color-auth-button-gradient-hover-start) 0%,
      var(--color-auth-button-gradient-hover-end) 100%
    );
    transform: scale(1.05);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
  }
  .auth-button:active {
    background-image: linear-gradient(
      to right,
      var(--color-auth-button-gradient-active-start) 0%,
      var(--color-auth-button-gradient-active-end) 100%
    );
    transform: scale(0.95);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  .logout-button {
    background-image: linear-gradient(
      to top,
      var(--color-logout-button-gradient-start) 0%,
      var(--color-logout-button-gradient-end) 100%
    );
    height: var(--spacing-logout-button-height);
    width: var(--spacing-logout-button-width);
    color: var(--color-logout-button-text);
    font-family: var(--font-family-primary);
    font-weight: var(--font-weight-bold);
    border: none;
    border-radius: var(--spacing-logout-button-border-radius);
    cursor: pointer;
    transition: all var(--animation-duration-transition) ease;
    box-shadow: 0 4px 10px var(--color-header-shadow);
  }
  .logout-button:hover {
    background-image: linear-gradient(
      to top,
      var(--color-logout-button-gradient-hover-start) 0%,
      var(--color-logout-button-gradient-hover-end) 100%
    );
    transform: scale(1.05);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
  }
  .logout-button:active {
    background-image: linear-gradient(
      to top,
      var(--color-logout-button-gradient-active-start) 0%,
      var(--color-logout-button-gradient-active-end) 100%
    );
    transform: scale(0.95);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  .menu-button {
    display: none;
    align-items: center;
    justify-content: center;
    width: var(--spacing-menu-button-size);
    height: var(--spacing-menu-button-size);
    background: var(--color-menu-button-bg);
    border: none;
    border-radius: var(--spacing-menu-button-border-radius);
    cursor: pointer;
    position: relative;
    transition:
      background var(--animation-duration-transition) ease,
      transform var(--animation-duration-transition) ease;
    box-shadow: 0 2px 5px var(--color-menu-button-shadow);
  }

  .menu-button:hover {
    background: var(--color-menu-button-bg-hover);
  }

  .menu-icon {
    width: var(--spacing-menu-icon-width);
    height: var(--spacing-menu-icon-height);
    position: relative;
  }

  .bar {
    position: absolute;
    left: 0;
    width: var(--spacing-menu-icon-width);
    height: var(--spacing-menu-bar-height);
    background: var(--color-menu-icon-bar);
    transition:
      transform var(--animation-duration-transition) ease,
      opacity var(--animation-duration-transition) ease;
  }

  .bar:nth-child(1) {
    top: 0;
  }

  .bar:nth-child(2) {
    top: var(--spacing-menu-bar-offset);
  }

  .bar:nth-child(3) {
    top: calc(var(--spacing-menu-bar-offset) * 2);
  }

  .menu-button.open .bar:nth-child(1) {
    transform: translateY(var(--spacing-menu-bar-offset)) rotate(45deg);
  }

  .menu-button.open .bar:nth-child(2) {
    opacity: 0;
  }

  .menu-button.open .bar:nth-child(3) {
    transform: translateY(calc(var(--spacing-menu-bar-offset) * -1))
      rotate(-45deg);
  }

  @media (max-width: 1200px) {
    header {
      padding: 16px 32px;
    }

    .nav-buttons {
      gap: 15px;
    }

    .simple-button {
      padding: 8px 10px;
    }
  }

  @media (max-width: 992px) {
    header {
      padding: 16px 16px;
    }
  }

  @media (max-width: 768px) {
    .menu-button {
      display: flex;
    }
    .nav-buttons {
      display: none;
    }
  }

  .mobile-menu {
    display: flex;
    flex-direction: column;
    padding: var(--spacing-mobile-menu-padding);
    background: rgba(255, 255, 255, 0.95);
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 0;
    opacity: 0;
    transform: translateY(-20px);
    transition:
      opacity var(--animation-duration-transition) ease,
      transform var(--animation-duration-transition) ease,
      max-height var(--animation-duration-transition) ease,
      padding var(--animation-duration-transition) ease;
    z-index: 10;
    align-items: center;
    box-shadow: 0 4px 8px var(--color-header-shadow);
    pointer-events: none;
    overflow: hidden;
    padding-top: 0;
    padding-bottom: 0;
  }

  .mobile-menu.open {
    max-height: 500px;
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
    padding: var(--spacing-mobile-menu-padding);
  }

  .navigation-buttons {
    display: flex;
    align-items: center;
    gap: 25px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .user-controls {
    display: flex;
    align-items: center;
    gap: 25px;
  }

  .logout-button {
    margin-left: 10px;
  }

  .avatar-container {
    position: relative;
    cursor: pointer;
    transition: transform var(--animation-duration-transition) ease;
    border: var(--spacing-avatar-border-width) solid var(--color-avatar-border);
    border-radius: var(--spacing-border-radius-dot);
    box-shadow: 0 3px 8px var(--color-avatar-shadow);
    width: var(--spacing-avatar-size);
    height: var(--spacing-avatar-size);
    margin-top: -10px;
  }

  .avatar-container:hover {
    transform: scale(1.08);
  }

  .avatar-container:hover::after {
    content: "";
    position: absolute;
    top: calc(var(--spacing-avatar-border-width) * -2);
    left: calc(var(--spacing-avatar-border-width) * -2);
    right: calc(var(--spacing-avatar-border-width) * -2);
    bottom: calc(var(--spacing-avatar-border-width) * -2);
    border-radius: var(--spacing-border-radius-dot);
    border: var(--spacing-avatar-border-width) solid var(--color-avatar-border);
    animation: pulse var(--animation-duration-pulse) infinite;
  }

  .avatar {
    width: var(--spacing-avatar-size);
    height: var(--spacing-avatar-size);
    border-radius: var(--spacing-border-radius-dot);
    object-fit: cover;
    transition: filter var(--animation-duration-transition) ease;
  }

  .avatar-container:hover .avatar {
    filter: brightness(1.1);
  }

  .avatar-container::before {
    content: "";
    position: absolute;
    bottom: -3px;
    right: -3px;
    width: var(--spacing-avatar-indicator-size);
    height: var(--spacing-avatar-indicator-size);
    background-color: var(--color-avatar-border);
    border-radius: var(--spacing-border-radius-dot);
    border: var(--border-width-button) solid var(--color-avatar-indicator);
    z-index: 2;
  }

  header::after {
    content: "";
    position: absolute;
    left: 64px;
    right: 64px;
    bottom: 16px;
    height: var(--spacing-header-bottom-border-height);
    background: rgba(0, 0, 0, 0.2);
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(194, 182, 252, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(194, 182, 252, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(194, 182, 252, 0);
    }
  }

  .avatar {
    width: var(--spacing-avatar-size);
    height: var(--spacing-avatar-size);
    border-radius: var(--spacing-border-radius-dot);
    object-fit: cover;
    transition: filter var(--animation-duration-transition) ease;
  }

  .avatar-container:hover .avatar {
    filter: brightness(1.1);
  }

  .divider {
    width: var(--spacing-divider-width);
    height: var(--spacing-divider-height);
    background: var(--color-divider);
    margin: var(--spacing-divider-margin);
    display: none;
  }

  @media (min-width: 769px) {
    .divider {
      display: block;
    }
  }

  .simple-button {
    background: inherit;
    border: none;
    border-radius: var(--spacing-simple-button-border-radius);
    padding: var(--spacing-simple-button-padding);
    font-family: var(--font-family-primary);
    font-weight: var(--font-weight-extra-bold);
    color: var(--color-text-dark);
    cursor: pointer;
    transition:
      background var(--animation-duration-transition) ease,
      transform var(--animation-duration-transition) ease;
    white-space: nowrap;
  }

  .simple-button:hover {
    background: var(--color-simple-button-hover-bg);
    transform: scale(1.05);
    box-shadow: 0 4px 6px var(--color-header-shadow);
  }

  .simple-button:active {
    transform: scale(0.95);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    background: var(--color-simple-button-active-bg);
  }

  .simple-button.primary-action {
    background: #c3b7fd;
    color: white;
    padding: 10px 24px;
    border-radius: 25px;
    box-shadow: 0 4px 10px rgba(195, 183, 253, 0.4);
  }

  .simple-button.primary-action:hover {
    background: #afa4ff;
    box-shadow: 0 6px 15px rgba(175, 164, 255, 0.5);
  }

  .mobile-nav-item {
    width: 100%;
    background: none;
    border: none;
    padding: 15px;
    font-size: 1.1rem;
    font-weight: bold;
    color: var(--color-text-dark);
    text-align: center;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
  }

  .mobile-nav-item.primary {
    color: #afa4ff;
    font-size: 1.25rem;
  }

  .mobile-divider {
    height: 1px;
    background: #e0e0e0;
    width: 80%;
    margin: 15px auto;
  }

  .mobile-profile-row {
    display: flex;
    align-items: center;
    gap: 25px;
    justify-content: center;
    width: 100%;
    padding-bottom: 20px;
  }

  .logout-button.small {
    margin-left: 10px;
  }

  .avatar-container.small {
    width: 40px;
    height: 40px;
  }

  .logout-button.small {
    width: auto;
    padding: 8px 15px;
    height: auto;
    font-size: 0.9rem;
  }

  .mobile-menu-section {
    width: 100%;
    margin-bottom: var(--spacing-mobile-menu-section-margin-bottom);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .mobile-menu-title {
    font-size: 14px;
    color: #666;
    margin-bottom: var(--spacing-mobile-menu-title-margin-bottom);
    font-weight: var(--font-weight-semi-bold);
  }

  .mobile-nav-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--spacing-mobile-nav-buttons-gap);
    width: 100%;
  }

  .mobile-user-controls {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--spacing-mobile-user-controls-gap);
    margin-top: var(--spacing-mobile-user-controls-margin-top);
    width: 100%;
  }
</style>
