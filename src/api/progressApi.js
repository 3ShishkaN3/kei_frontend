import { apiFetch } from './api.js';
import { API_BASE_URL } from '../config.js';

const progressBaseUrl = `${API_BASE_URL}/progress`;

/**
 * API для работы с прогрессом пользователей
 */

/**
 * Получить прогресс по урокам для конкретного курса
 * @param {number} courseId - ID курса
 * @returns {Promise<Array>} - Массив прогресса по урокам
 */
export async function getLessonProgress(courseId) {
    try {
        console.log('Запрос прогресса уроков для курса:', courseId);
        const response = await apiFetch(`${progressBaseUrl}/lessons/?course_id=${courseId}`);
        
        console.log('Статус ответа:', response.status);
        console.log('Заголовки ответа:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Ошибка HTTP:', errorData);
            throw new Error(errorData.detail || `Ошибка получения прогресса уроков: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Полученные данные прогресса уроков:', data);
        console.log('Результаты:', data.results);
        
        return data.results || data;
    } catch (error) {
        console.error('Ошибка при получении прогресса уроков:', error);
        throw error;
    }
}

/**
 * Получить прогресс по секциям для конкретного урока
 * @param {number} lessonId - ID урока
 * @returns {Promise<Array>} - Массив прогресса по секциям
 */
export async function getSectionProgress(lessonId) {
    try {
        const response = await apiFetch(`${progressBaseUrl}/sections/?lesson_id=${lessonId}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Ошибка получения прогресса секций: ${response.status}`);
        }
        
        const data = await response.json();
        return data.results || data;
    } catch (error) {
        console.error('Ошибка при получении прогресса секций:', error);
        throw error;
    }
}

/**
 * Получить общий прогресс пользователя
 * @returns {Promise<Object>} - Объект с общей статистикой прогресса
 */
export async function getUserProgress() {
    try {
        const response = await apiFetch(`${progressBaseUrl}/user/`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Ошибка получения прогресса пользователя: ${response.status}`);
        }
        
        const data = await response.json();
        return data.results?.[0] || data;
    } catch (error) {
        console.error('Ошибка при получении прогресса пользователя:', error);
        throw error;
    }
}

/**
 * Получить прогресс по курсам
 * @returns {Promise<Array>} - Массив прогресса по курсам
 */
export async function getCourseProgress() {
    try {
        const response = await apiFetch(`${progressBaseUrl}/courses/`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Ошибка получения прогресса курсов: ${response.status}`);
        }
        
        const data = await response.json();
        return data.results || data;
    } catch (error) {
        console.error('Ошибка при получении прогресса курсов:', error);
        throw error;
    }
}

/**
 * Получить статистику обучения
 * @returns {Promise<Object>} - Объект со статистикой обучения
 */
export async function getLearningStats() {
    try {
        const response = await apiFetch(`${progressBaseUrl}/stats/`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Ошибка получения статистики обучения: ${response.status}`);
        }
        
        const data = await response.json();
        return data.results?.[0] || data;
    } catch (error) {
        console.error('Ошибка при получении статистики обучения:', error);
        throw error;
    }
}

/**
 * Получить статистику по дням (для недели и месяца)
 * @param {string} period - Период: 'week' или 'month'
 * @returns {Promise<Array>} - Массив с данными по дням
 */
export async function getDailyStats(period = 'week') {
    try {
        const response = await apiFetch(`${progressBaseUrl}/lessons/`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Ошибка получения прогресса уроков: ${response.status}`);
        }
        
        const data = await response.json();
        const lessonProgress = data.results || data;
        
        return groupLessonsByDays(lessonProgress, period);
    } catch (error) {
        console.error('Ошибка при получении ежедневной статистики:', error);
        throw error;
    }
}

/**
 * @param {Array} lessonProgress - Массив прогресса по урокам
 * @param {string} period - Период: 'week' или 'month'
 * @returns {Array} - Массив с данными по дням
 */
function groupLessonsByDays(lessonProgress, period) {
    const days = period === 'week' ? 7 : 33;
    const dailyStats = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const dateStr = date.toISOString().split('T')[0];
        
        const completedLessons = lessonProgress.filter(lesson => {
            if (!lesson.completed_at) return false;
            
            const completedDate = new Date(lesson.completed_at);
            completedDate.setHours(0, 0, 0, 0);
            
            return completedDate.getTime() === date.getTime();
        }).length;
        
        dailyStats.push({
            date: dateStr,
            completed_lessons: completedLessons,
            day_of_week: date.getDay()
        });
    }
    
    return dailyStats;
}
