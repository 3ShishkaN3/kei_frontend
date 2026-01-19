<script>
    import { onMount, onDestroy } from "svelte";
    import { API_BASE_URL, WS_BASE_URL } from "../config.js";
    import { apiFetch } from "../api/api.js";
    import { addNotification as showToast } from "../stores/notifications.js";

    let notifications = [];
    let unreadCount = 0;
    let showDropdown = false;
    let interval;
    let socket;

    const fetchUnreadCount = async () => {
        try {
            const response = await apiFetch(
                `${API_BASE_URL}/notifications/unread_count/`,
            );
            if (response.ok) {
                const data = await response.json();
                unreadCount = data.count;
            }
        } catch (err) {
            console.error("Error fetching unread count:", err);
        }
    };

    const fetchNotifications = async () => {
        try {
            const response = await apiFetch(`${API_BASE_URL}/notifications/`);
            if (response.ok) {
                notifications = await response.json();
            }
        } catch (err) {
            console.error("Error fetching notifications:", err);
        }
    };

    const toggleDropdown = () => {
        showDropdown = !showDropdown;
        if (showDropdown) {
            fetchNotifications();
        }
    };

    const markAsRead = async (id) => {
        try {
            const response = await apiFetch(
                `${API_BASE_URL}/notifications/${id}/mark_as_read/`,
                {
                    method: "POST",
                },
            );
            if (response.ok) {
                notifications = notifications.map((n) =>
                    n.id === id ? { ...n, is_read: true } : n,
                );
                fetchUnreadCount();
            }
        } catch (err) {
            console.error("Error marking as read:", err);
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await apiFetch(
                `${API_BASE_URL}/notifications/mark_all_as_read/`,
                {
                    method: "POST",
                },
            );
            if (response.ok) {
                notifications = notifications.map((n) => ({
                    ...n,
                    is_read: true,
                }));
                unreadCount = 0;
            }
        } catch (err) {
            console.error("Error marking all as read:", err);
        }
    };

    const setupWebSocket = () => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${WS_BASE_URL}/notifications/`;

        socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "notification") {
                const newNotification = data.notification;

                notifications = [newNotification, ...notifications];
                unreadCount += 1;

                showToast(newNotification.message, "info");
            }
        };

        socket.onclose = () => {
            console.log("Notification socket closed. Reconnecting in 5s...");
            setTimeout(setupWebSocket, 5000);
        };

        socket.onerror = (err) => {
            console.error("Notification socket error:", err);
            socket.close();
        };
    };

    onMount(() => {
        fetchUnreadCount();
        setupWebSocket();
    });

    onDestroy(() => {
        if (socket) socket.close();
    });

    const handleClickOutside = (event) => {
        if (
            showDropdown &&
            !event.target.closest(".notification-bell-container")
        ) {
            showDropdown = false;
        }
    };
</script>

<svelte:window on:click={handleClickOutside} />

<div class="notification-bell-container">
    <button
        class="bell-button"
        on:click={toggleDropdown}
        aria-label="Уведомления"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="bell-icon"
        >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {#if unreadCount > 0}
            <span class="badge">{unreadCount}</span>
        {/if}
    </button>

    {#if showDropdown}
        <div class="dropdown">
            <div class="dropdown-header">
                <h3>Уведомления</h3>
                {#if unreadCount > 0}
                    <button class="mark-all-btn" on:click={markAllAsRead}
                        >Прочитать все</button
                    >
                {/if}
            </div>
            <div class="notifications-list">
                {#if notifications.length === 0}
                    <div class="empty-state">Нет уведомлений</div>
                {:else}
                    {#each notifications as notification (notification.id)}
                        <div
                            class="notification-item {notification.is_read
                                ? ''
                                : 'unread'}"
                            on:click={() =>
                                !notification.is_read &&
                                markAsRead(notification.id)}
                            on:keydown={(e) =>
                                (e.key === "Enter" || e.key === " ") &&
                                !notification.is_read &&
                                markAsRead(notification.id)}
                            role="button"
                            tabindex="0"
                        >
                            <div class="notification-content">
                                <p class="notification-title">
                                    {notification.title}
                                </p>
                                <p class="notification-message">
                                    {notification.message}
                                </p>
                                <span class="notification-time"
                                    >{new Date(
                                        notification.created_at,
                                    ).toLocaleString()}</span
                                >
                            </div>
                            {#if !notification.is_read}
                                <span class="unread-dot"></span>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .notification-bell-container {
        position: relative;
        display: inline-block;
    }

    .bell-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        transition: background 0.2s;
        position: relative;
        color: var(--color-text-dark);
    }

    .bell-button:hover {
        background: var(--color-simple-button-hover-bg);
    }

    .bell-icon {
        display: block;
    }

    .badge {
        position: absolute;
        top: 0;
        right: 0;
        background: #ff4d4f;
        color: white;
        font-size: 10px;
        font-weight: bold;
        border-radius: 10px;
        padding: 2px 6px;
        min-width: 18px;
        text-align: center;
        border: 2px solid white;
    }

    .dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        width: 350px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        margin-top: 12px;
        overflow: hidden;
        border: 1px solid #eee;
    }

    .dropdown-header {
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #eee;
        background: #fafafa;
    }

    .dropdown-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
    }

    .mark-all-btn {
        background: none;
        border: none;
        color: #1890ff;
        font-size: 12px;
        cursor: pointer;
        padding: 0;
    }

    .mark-all-btn:hover {
        text-decoration: underline;
    }

    .notifications-list {
        max-height: 400px;
        overflow-y: auto;
    }

    .empty-state {
        padding: 30px;
        text-align: center;
        color: #999;
        font-size: 14px;
    }

    .notification-item {
        padding: 12px 16px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        transition: background 0.2s;
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 12px;
    }

    .notification-item:hover {
        background: #f9f9f9;
    }

    .notification-item.unread {
        background: #e6f7ff;
    }

    .notification-item.unread:hover {
        background: #bae7ff;
    }

    .notification-content {
        flex: 1;
    }

    .notification-title {
        margin: 0 0 4px 0;
        font-weight: 600;
        font-size: 14px;
        color: #333;
    }

    .notification-message {
        margin: 0 0 6px 0;
        font-size: 13px;
        color: #666;
        line-height: 1.4;
    }

    .notification-time {
        font-size: 11px;
        color: #aaa;
    }

    .unread-dot {
        width: 8px;
        height: 8px;
        background: #1890ff;
        border-radius: 50%;
        margin-top: 6px;
        flex-shrink: 0;
    }

    @media (max-width: 480px) {
        .dropdown {
            position: fixed;
            top: 60px;
            left: 10px;
            right: 10px;
            width: auto;
        }
    }
</style>
