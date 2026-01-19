import { API_BASE_URL } from '../config.js';
import { apiFetch } from '../api/api.js';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications not supported');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            const keyResponse = await apiFetch(`${API_BASE_URL}/notifications/vapid_public_key/`);
            if (!keyResponse.ok) throw new Error('Could not fetch VAPID key');

            const { public_key } = await keyResponse.json();
            if (!public_key) {
                console.warn('VAPID public key not configured on server');
                return;
            }

            const applicationServerKey = urlBase64ToUint8Array(public_key);
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });

            const saveResponse = await apiFetch(`${API_BASE_URL}/webpush/save/`, {
                method: 'POST',
                body: JSON.stringify({
                    subscription: subscription,
                    status: 'active'
                })
            });

            if (saveResponse.ok) {
                console.log('Successfully subscribed to push notifications');
            }
        }
    } catch (err) {
        console.error('Push subscription error:', err);
    }
}
