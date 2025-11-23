import { apiFetch } from './api.js';
import { API_BASE_URL } from '../config.js';

const bonusBaseUrl = `${API_BASE_URL}/bonuses`;

/**
 * Get all available bonuses
 * @returns {Promise<Array>} - List of bonuses
 */
export async function getBonuses() {
    try {
        const response = await apiFetch(`${bonusBaseUrl}/`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Error fetching bonuses: ${response.status}`);
        }

        const data = await response.json();
        return data.results || data;
    } catch (error) {
        console.error('Error fetching bonuses:', error);
        throw error;
    }
}

/**
 * Buy a bonus
 * @param {number} bonusId - ID of the bonus to buy
 * @returns {Promise<Object>} - Result of the purchase
 */
export async function buyBonus(bonusId) {
    try {
        const response = await apiFetch(`${bonusBaseUrl}/${bonusId}/buy/`, {
            method: 'POST'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Error buying bonus: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error buying bonus:', error);
        throw error;
    }
}
