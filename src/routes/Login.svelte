<script>
    import { API_BASE_URL } from "../config.js";
    import { user } from "../stores/user.js";
    import { navigate } from "svelte-routing";
    import { apiFetch } from "../api/api.js";
    import { fetchCsrfToken } from "../api/csrf.js";

    let email = "";
    let password = "";
    let error = "";
    let success = "";

    // Состояние отображения: 'login', 'request_reset', 'confirm_reset'
    let view = "login";

    // Данные для сброса пароля
    let resetEmail = "";
    let resetCode = "";
    let newPassword = "";
    let newPassword2 = "";

    async function handleSubmit(event) {
        event.preventDefault();
        error = "";
        success = "";

        const loginData = {
            username: email,
            password: password,
        };

        try {
            const response = await apiFetch(`${API_BASE_URL}/auth/login/`, {
                method: "POST",
                body: JSON.stringify(loginData),
            });
            const data = await response.json();

            if (response.ok) {
                await fetchCsrfToken();
                user.set({ isAuthenticated: true });
                navigate("/");
            } else {
                error = data.detail || "Ошибка авторизации";
            }
        } catch (err) {
            error = "Ошибка соединения";
            console.error(err);
        }
    }

    async function handleRequestReset(event) {
        event.preventDefault();
        error = "";
        success = "";

        try {
            const response = await apiFetch(
                `${API_BASE_URL}/auth/password/reset/request/`,
                {
                    method: "POST",
                    body: JSON.stringify({ email: resetEmail }),
                },
            );
            const data = await response.json();

            if (response.ok) {
                success =
                    data.message || "Код подтверждения отправлен на email.";
                view = "confirm_reset";
            } else {
                error = parseErrors(data);
            }
        } catch (err) {
            error = "Ошибка соединения";
            console.error(err);
        }
    }

    async function handleConfirmReset(event) {
        event.preventDefault();
        error = "";
        success = "";

        if (newPassword !== newPassword2) {
            error = "Пароли не совпадают";
            return;
        }

        try {
            const response = await apiFetch(
                `${API_BASE_URL}/auth/password/reset/confirm/`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        email: resetEmail,
                        code: resetCode,
                        new_password: newPassword,
                        new_password2: newPassword2,
                    }),
                },
            );
            const data = await response.json();

            if (response.ok) {
                success =
                    data.message ||
                    "Пароль успешно изменён. Теперь вы можете войти.";
                view = "login";
                // Pre-fill email for login
                email = resetEmail;
                password = "";
                newPassword = "";
                newPassword2 = "";
                resetCode = "";
            } else {
                error = parseErrors(data);
            }
        } catch (err) {
            error = "Ошибка соединения";
            console.error(err);
        }
    }

    function parseErrors(errors) {
        if (typeof errors === "string") return errors;
        let errorText = "";
        for (const key in errors) {
            if (errors.hasOwnProperty(key)) {
                errorText += errors[key].join(" ") + " ";
            }
        }
        return errorText.trim() || "Произошла ошибка";
    }

    function switchView(newView) {
        view = newView;
        error = "";
        success = "";
    }
</script>

<svelte:head>
    <title>Вход — Kei</title>
    <meta name="og:title" content="Вход — Kei" />
    <meta name="twitter:title" content="Вход — Kei" />
    <meta
        name="description"
        content="Войдите в свой аккаунт Kei для продолжения обучения."
    />
</svelte:head>

<div class="login-container">
    <div class="form-container">
        {#if view === "login"}
            <h1>С возвращением!</h1>
            {#if error}<div class="error">{error}</div>{/if}
            {#if success}<div class="success">{success}</div>{/if}
            <form on:submit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Электронная почта"
                    bind:value={email}
                    required
                />
                <input
                    type="password"
                    placeholder="Пароль"
                    bind:value={password}
                    required
                />
                <div class="forgot-register-links">
                    <a
                        href="#"
                        on:click|preventDefault={() =>
                            switchView("request_reset")}>Забыли пароль?</a
                    >
                    <a href="/registration">Зарегистрироваться</a>
                </div>
                <button type="submit" class="confirm-email-button">Войти</button
                >
            </form>
        {:else if view === "request_reset"}
            <h1>Сброс пароля</h1>
            <p class="description">
                Введите email, указанный при регистрации. Мы отправим вам код
                подтверждения.
            </p>
            {#if error}<div class="error">{error}</div>{/if}
            <form on:submit={handleRequestReset}>
                <input
                    type="email"
                    placeholder="Электронная почта"
                    bind:value={resetEmail}
                    required
                />
                <div class="forgot-register-links">
                    <a
                        href="#"
                        on:click|preventDefault={() => switchView("login")}
                        >Вернуться ко входу</a
                    >
                </div>
                <button type="submit" class="confirm-email-button"
                    >Отправить код</button
                >
            </form>
        {:else if view === "confirm_reset"}
            <h1>Новый пароль</h1>
            <p class="description">
                Введите код из письма и придумайте новый пароль.
            </p>
            {#if error}<div class="error">{error}</div>{/if}
            {#if success}<div class="success">{success}</div>{/if}
            <form on:submit={handleConfirmReset}>
                <input
                    type="text"
                    placeholder="Код подтверждения"
                    bind:value={resetCode}
                    required
                />
                <input
                    type="password"
                    placeholder="Новый пароль"
                    bind:value={newPassword}
                    required
                />
                <input
                    type="password"
                    placeholder="Подтвердите пароль"
                    bind:value={newPassword2}
                    required
                />
                <div class="forgot-register-links">
                    <a
                        href="#"
                        on:click|preventDefault={() =>
                            switchView("request_reset")}
                        >Отправить код повторно</a
                    >
                    <a
                        href="#"
                        on:click|preventDefault={() => switchView("login")}
                        >Вернуться ко входу</a
                    >
                </div>
                <button type="submit" class="confirm-email-button"
                    >Сохранить пароль</button
                >
            </form>
        {/if}

        <div class="contact-text">СВЯЗЬ С ПРЕПОДАВАТЕЛЕМ</div>
        <div class="contact-buttons">
            <button
                class="telegram-button"
                on:click={() => window.open("https://t.me/keisenpai", "_blank")}
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
    <div class="banner"></div>
</div>

<style>
    .login-container {
        display: flex;
        width: 100%;
        overflow: hidden;
        background-color: #f8f9fb;
        height: 100vh;
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

    .description {
        text-align: center;
        color: #666;
        margin-bottom: 20px;
        font-size: 16px;
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
        box-shadow: 0 0 10px #a8a1f5;
        outline: none;
    }

    .forgot-register-links {
        display: flex;
        justify-content: space-between;
        width: 100%;
        font-size: 16px;
        color: #bdb4fe;
        margin-top: 10px;
    }

    .forgot-register-links a {
        text-decoration: none;
        color: inherit;
        transition: all 0.3s ease; /* Плавное изменение */
    }

    .forgot-register-links a:hover {
        color: #8f7ee3; /* Затемнение при наведении */
        opacity: 0.8; /* Немного уменьшить яркость */
    }

    .confirm-email-button {
        width: 100%;
        padding: 25px 15px;
        border: none;
        border-radius: 20px;
        background-image: linear-gradient(to bottom, #c2b6fc, #ebc7f2);
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
        background-image: linear-gradient(to bottom, #d8a8e8, #a8a1f5);
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
        transition: transform 1.5s ease;
    }

    .banner:hover {
        transform: scale(1.02);
    }

    @media (max-width: 1024px) {
        .login-container {
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

    .error {
        color: red;
        margin-bottom: 10px;
    }

    .success {
        color: green;
        margin-bottom: 10px;
    }
</style>
