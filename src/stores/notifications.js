import { writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';

export const notifications = writable([]);

const defaultDuration = 5000;

export function addNotification(message, type = 'info', duration = defaultDuration) {
    const id = uuidv4();
    notifications.update(items => {
        const newItems = [...items, { id, message, type, duration, startTime: Date.now() }];
        return newItems;
    });
    
    setTimeout(() => {
        removeNotification(id);
    }, duration);
}

export function removeNotification(id) {
    notifications.update(items => items.filter(n => n.id !== id));
}