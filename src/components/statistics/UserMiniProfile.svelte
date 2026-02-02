<script>
    import { onMount } from "svelte";
    import { user } from "../../stores/user.js";
    import { avatar } from "../../stores/avatar.js";
    import { getLearningStats } from "../../api/progressApi.js";
    import { apiFetch } from "../../api/api.js";
    import { API_BASE_URL } from "../../config.js";

    let stats = {
        level: 1,
        experience_points: 0,
        coins: 0,
    };

    let currentAvatar = "/avatar.jpg";
    let username = "Ученик";
    let lastLesson = null;
    let loading = true;

    $: nextLevelXp = Math.floor(100 * Math.pow(stats.level + 1, 1.5));
    $: currentLevelBaseXp = Math.floor(100 * Math.pow(stats.level, 1.5));
    $: xpProgress =
        Math.min(
            100,
            Math.max(
                0,
                ((stats.experience_points - currentLevelBaseXp) /
                    (nextLevelXp - currentLevelBaseXp)) *
                    100,
            ),
        ) || 0;

    onMount(async () => {
        try {
            avatar.subscribe((val) => (currentAvatar = val));
            user.subscribe((u) => {
                if (u && u.isAuthenticated) {
                }
            });

            const profileRes = await apiFetch(`${API_BASE_URL}/profile/`);
            if (profileRes.ok) {
                const profile = await profileRes.json();
            }

            const userRes = await apiFetch(`${API_BASE_URL}/auth/user/`);
            if (userRes.ok) {
                const userData = await userRes.json();
                username = userData.username;
            }

            const statsData = await getLearningStats();
            if (statsData) {
                stats = statsData;
            }

            const lessonsRes = await apiFetch(
                `${API_BASE_URL}/progress/lessons/`,
            );
            if (lessonsRes.ok) {
                const data = await lessonsRes.json();
                const lessons = data.results || data;

                const unfinished = lessons.filter(
                    (l) =>
                        l.completion_percentage < 100 &&
                        l.completion_percentage > 0,
                );

                if (unfinished.length > 0) {
                    unfinished.sort(
                        (a, b) =>
                            new Date(b.last_activity) -
                            new Date(a.last_activity),
                    );
                    lastLesson = unfinished[0];
                } else {
                    if (lessons.length > 0) {
                        lessons.sort(
                            (a, b) =>
                                new Date(b.last_activity) -
                                new Date(a.last_activity),
                        );
                        lastLesson = lessons[0];
                    }
                }
            }
        } catch (e) {
            console.error("Error loading mini profile:", e);
        } finally {
            loading = false;
        }
    });
</script>

<div class="mini-profile-card">
    <div class="profile-header">
        <div class="avatar-container">
            <img src={currentAvatar} alt={username} class="avatar-img" />
        </div>
        <div class="user-details">
            <h3 class="username">{username}</h3>
            <div class="stats-badges">
                <div class="badge coin-badge">
                    <svg
                        class="icon-coin"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <circle
                            cx="12"
                            cy="12"
                            r="10"
                            fill="#FFD700"
                            stroke="#B8860B"
                            stroke-width="1.5"
                        />
                        <rect
                            x="8.5"
                            y="8.5"
                            width="7"
                            height="7"
                            rx="1"
                            fill="#FFF8E7"
                            stroke="#B8860B"
                            stroke-width="1"
                        />
                        <path
                            d="M12 4V7M12 17V20M4 12H7M17 12H20"
                            stroke="#B8860B"
                            stroke-width="1.5"
                            stroke-linecap="round"
                        />
                    </svg>
                    <span class="value">{stats.coins}</span>
                </div>
                <div class="badge xp-badge">
                    <span class="label">XP</span>
                    <span class="value">{stats.experience_points}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="level-progress-section">
        <div class="progress-bar-container">
            <div class="progress-track">
                <div class="progress-fill" style="width: {xpProgress}%"></div>
            </div>
            <div class="level-figure" style="left: {xpProgress}%">
                <svg viewBox="0 0 40 40" class="level-svg">
                    <defs>
                        <filter
                            id="shadow"
                            x="-20%"
                            y="-20%"
                            width="140%"
                            height="140%"
                        >
                            <feDropShadow
                                dx="0"
                                dy="2"
                                stdDeviation="2"
                                flood-color="rgba(0,0,0,0.3)"
                            />
                        </filter>
                        <linearGradient
                            id="grad1"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                        >
                            <stop
                                offset="0%"
                                style="stop-color:#AFA4FF;stop-opacity:1"
                            />
                            <stop
                                offset="100%"
                                style="stop-color:#6D7FC9;stop-opacity:1"
                            />
                        </linearGradient>
                    </defs>
                    <path
                        d="M20 2 L36 10 L36 30 L20 38 L4 30 L4 10 Z"
                        fill="url(#grad1)"
                        stroke="white"
                        stroke-width="2"
                        filter="url(#shadow)"
                    />
                    <text
                        x="20"
                        y="26"
                        font-family="'Play', sans-serif"
                        font-weight="bold"
                        font-size="14"
                        fill="white"
                        text-anchor="middle">{stats.level}</text
                    >
                </svg>
            </div>
        </div>
        <div class="xp-details">
            <span>Уровень {stats.level}</span>
            <span>{Math.floor(stats.experience_points)} / {nextLevelXp} XP</span
            >
        </div>
    </div>

    {#if lastLesson}
        <div class="lesson-shortcut">
            <div class="lesson-info">
                <span class="shortcut-label">
                    {#if lastLesson.completion_percentage >= 100}
                        Последний урок:
                    {:else}
                        Продолжить:
                    {/if}
                </span>
                <a
                    href="/courses/{lastLesson.course_id}/lessons/{lastLesson.lesson_id}"
                    class="lesson-link"
                >
                    <span class="lesson-title">{lastLesson.lesson_title}</span>
                    <svg
                        class="arrow-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            d="M5 12h14M12 5l7 7-7 7"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </a>
            </div>
        </div>
    {/if}
</div>

<style>
    .mini-profile-card {
        background: white;
        border-radius: var(--spacing-border-radius-card);
        padding: var(--spacing-padding-block);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        margin-bottom: 2rem;
        position: relative;
        overflow: visible;
        font-family: "Play", sans-serif;
    }

    .profile-header {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
    }

    .avatar-container {
        position: relative;
    }

    .avatar-img {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid var(--color-primary);
        box-shadow: 0 4px 10px rgba(175, 164, 255, 0.3);
    }

    .user-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .username {
        margin: 0;
        font-size: 1.5rem;
        color: var(--color-text-dark);
        font-weight: 700;
    }

    .stats-badges {
        display: flex;
        gap: 0.8rem;
    }

    .badge {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 600;
    }

    .coin-badge {
        background-color: #fff8e7;
        color: #b8860b;
        border: 1px solid #ffe4b5;
    }

    .xp-badge {
        background-color: #f0f4ff;
        color: var(--color-secondary);
        border: 1px solid #e0e7ff;
    }

    .icon-coin {
        width: 20px;
        height: 20px;
    }

    .level-progress-section {
        margin-top: 1rem;
        padding: 0 0.5rem;
    }

    .progress-bar-container {
        position: relative;
        height: 12px;
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
    }

    .progress-track {
        width: 100%;
        height: 100%;
        background-color: #e0e7ff;
        border-radius: 10px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: linear-gradient(
            90deg,
            var(--color-primary) 0%,
            var(--color-secondary) 100%
        );
        border-radius: 10px;
        transition: width 0.5s ease-out;
    }

    .level-figure {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
        z-index: 2;
        transition: left 0.5s ease-out;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    }

    .xp-details {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        color: var(--color-text-muted);
        margin-top: 10px;
    }

    .lesson-shortcut {
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--color-border-light);
    }

    .lesson-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .shortcut-label {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .lesson-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 15px;
        background-color: var(--color-bg-ultra-light);
        border-radius: 12px;
        color: var(--color-text-dark);
        font-weight: 600;
        text-decoration: none;
        transition: all 0.2s ease;
        border: 1px solid transparent;
    }

    .lesson-link:hover {
        background-color: white;
        border-color: var(--color-primary);
        box-shadow: 0 4px 12px rgba(175, 164, 255, 0.15);
        transform: translateY(-2px);
        text-decoration: none;
    }

    .arrow-icon {
        width: 20px;
        height: 20px;
        color: var(--color-primary);
    }
</style>
