import { writable, get } from 'svelte/store';
import { API_BASE_URL } from '../config.js';

export const csrfToken = writable(null);

export async function fetchCsrfToken() {
    const response = await fetch(`${API_BASE_URL}/auth/csrf-token/`, {
        credentials: 'include'
    });
    if (!response.ok) {
        throw new Error('Ошибка получения CSRF-токена');
    }
    const data = await response.json();
    csrfToken.set(data.csrf_token);
    return data.csrf_token;
    }

    export async function getCsrfToken() {
    let token = get(csrfToken);
    if (!token) {
        token = await fetchCsrfToken();
    }
    return token;
}
