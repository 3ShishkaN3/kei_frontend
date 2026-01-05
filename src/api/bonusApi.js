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

/**
 * Create a new bonus (Teacher only)
 * @param {FormData} bonusData - Bonus data
 * @returns {Promise<Object>} - Created bonus
 */
export async function createBonus(bonusData) {
    try {
        const response = await apiFetch(`${bonusBaseUrl}/`, {
            method: 'POST',
            body: bonusData
        }, true);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Error creating bonus: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating bonus:', error);
        throw error;
    }
}

/**
 * Update a bonus (Teacher only)
 * @param {number} id - Bonus ID
 * @param {FormData} bonusData - Bonus data
 * @returns {Promise<Object>} - Updated bonus
 */
export async function updateBonus(id, bonusData) {
    try {
        const response = await apiFetch(`${bonusBaseUrl}/${id}/`, {
            method: 'PATCH',
            body: bonusData
        }, true);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Error updating bonus: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating bonus:', error);
        throw error;
    }
}

/**
 * Delete a bonus (Teacher only)
 * @param {number} id - Bonus ID
 * @returns {Promise<void>}
 */
export async function deleteBonus(id) {
    try {
        const response = await apiFetch(`${bonusBaseUrl}/${id}/`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Error deleting bonus: ${response.status}`);
        }
    } catch (error) {
        console.error('Error deleting bonus:', error);
        throw error;
    }
}
