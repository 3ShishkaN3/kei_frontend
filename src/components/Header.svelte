<script>
    import { Link } from "svelte-routing";
    let mobileMenuOpen = false;
    const toggleMenu = () => mobileMenuOpen = !mobileMenuOpen;

    let lastScrollY = 0;
    let isHidden = false;
    let isScrolled = false;

    const checkScroll = () => {
        const currentScrollY = window.scrollY;
        const thresholdToHide = 150;
        const thresholdToShow = 100;

        if (currentScrollY > lastScrollY && currentScrollY > thresholdToHide && !isHidden) {
            isHidden = true;
        }

        if (currentScrollY < lastScrollY && currentScrollY < thresholdToShow && isHidden) {
            isHidden = false;
        }

        lastScrollY = currentScrollY;

        isScrolled = currentScrollY > 10;
    };

    window.addEventListener("scroll", checkScroll);
</script>

<style>
header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255);
    padding: 20px 80px;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    transition: top 0.3s ease;
}

header.scrolled {
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

header.hidden {
    top: -100px;
}

header::after {
    content: "";
    position: absolute;
    left: 80px;
    right: 80px;
    bottom: 20px;
    height: 1px;
    background: rgba(0, 0, 0, 0.2);
}

.logo {
    height: 90px;
    cursor: pointer;
}

.nav-buttons {
    display: flex;
    gap: 40px;
}

.auth-button {
    background-image: linear-gradient(to right, #EBC7F2 0%, #C2B6FC 100%);
    height: 45px;
    width: 150px;
    color: #FFF;
    font-family: 'Montserrat', sans-serif;
    font-weight: bold;
    border: none;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}
.auth-button:hover {
    background-image: linear-gradient(to right, #D8A8E8 0%, #A8A1F5 100%);
    transform: scale(1.05);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
}
.auth-button:active {
    background-image: linear-gradient(to right, #C18AD2 0%, #8E8BE0 100%);
    transform: scale(0.95);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.menu-button {
    display: none;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    background: #f0f0f0;
    border: none;
    border-radius: 15px;
    cursor: pointer;
    position: relative;
    transition: background 0.3s ease, transform 0.3s ease;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.menu-button:hover {
    background: #e0e0e0;
}

.menu-icon {
    width: 30px;
    height: 24px;
    position: relative;
}

.bar {
    position: absolute;
    left: 0;
    width: 30px;
    height: 3px;
    background: #666;
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.bar:nth-child(1) {
    top: 0;
}

.bar:nth-child(2) {
    top: 10px;
}

.bar:nth-child(3) {
    top: 20px;
}

.menu-button.open .bar:nth-child(1) {
    transform: translateY(10px) rotate(45deg);
}

.menu-button.open .bar:nth-child(2) {
    opacity: 0;
}

.menu-button.open .bar:nth-child(3) {
    transform: translateY(-10px) rotate(-45deg);
}

@media (max-width: 768px) {
    .menu-button {
    display: flex;
    }
}

.mobile-menu {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    padding: 20px 80px;
    background: rgba(255, 255, 255, 0.95);
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    opacity: 0;
    transform: translateY(-20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    z-index: 10;
    align-items: center;
}
.mobile-menu.open {
    opacity: 1;
    transform: translateY(0);
}

@media (max-width: 768px) {
    header {
    padding: 10px 20px;
    height: auto;
    flex-wrap: wrap;
    }
    header::after {
    left: 20px;
    right: 20px;
    bottom: 10px;
    }
    .nav-buttons {
    display: none;
    }
    .menu-button {
    display: flex;
    }
}
</style>

<header class="{isScrolled ? 'scrolled' : ''} {isHidden ? 'hidden' : ''}">
    <a href="/" aria-label="Главная">
        <img src="/logo.png" alt="Logo" class="logo" />
    </a>

    <div class="nav-buttons">
        <Link to="/registration">
            <button class="auth-button">Регистрация</button>
        </Link>
        <Link to="/login">
            <button class="auth-button">Вход</button>
        </Link>
    </div>

    <button class="menu-button {mobileMenuOpen ? 'open' : ''}" on:click={toggleMenu}>
        <div class="menu-icon">
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
        </div>
    </button>

    <div class="mobile-menu {mobileMenuOpen ? 'open' : ''}">
        <Link to="/registration">
            <button class="auth-button">Регистрация</button>
        </Link>
        <Link to="/login">
            <button class="auth-button">Вход</button>
        </Link>
    </div>
</header>
