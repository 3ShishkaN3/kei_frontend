self.addEventListener('push', function (event) {
    const data = event.data.json();
    const head = data.head || 'Kei Senpai';
    const body = data.body || 'Новое уведомление';
    const icon = data.icon || '/logo.png';
    const url = data.url || '/';

    const options = {
        body: body,
        icon: icon,
        badge: '/logo.png',
        data: { url: url }
    };

    event.waitUntil(
        self.registration.showNotification(head, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
