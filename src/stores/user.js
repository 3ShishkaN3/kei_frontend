import { writable } from "svelte/store";
import { API_BASE_URL } from "../config.js";
import { apiFetch } from "../api/api.js";

export const user = writable({ isAuthenticated: false, role: null });

export async function checkAuthStatus() {
    try {
        const response = await apiFetch(`${API_BASE_URL}/auth/user/`);
        if (response.ok) {
            const data = await response.json();
            user.set({ 
                isAuthenticated: true, 
                role: data.role 
            });
        } else {
            user.set({ isAuthenticated: false, role: null });
        }
    } catch (err) {
        console.error("Ошибка проверки статуса авторизации:", err);
        user.set({ isAuthenticated: false, role: null });
    }
}
