import { getCsrfToken } from './csrf';

/**
 * Обёртка для fetch, которая автоматически подставляет CSRF-токен.
 * Обрабатывает как JSON, так и FormData.
 *
 * @param {string} url URL запроса
 * @param {object} options Параметры запроса (включая method, body и т.д.)
 * @returns {Promise<Response>}
 */
export async function apiFetch(url, options = {}) {
    const token = await getCsrfToken();

    const fetchOptions = { ...options };

    fetchOptions.credentials = fetchOptions.credentials || 'include';

    fetchOptions.headers = { ...(fetchOptions.headers || {}) };

    fetchOptions.headers['X-CSRFTOKEN'] = token;

    fetchOptions.headers['Accept'] = 'application/json';

    if (!(fetchOptions.body instanceof FormData)) {
        fetchOptions.headers['Content-Type'] = 'application/json';
        if (typeof fetchOptions.body === 'object' && fetchOptions.body !== null) {
             try {
                 fetchOptions.body = JSON.stringify(fetchOptions.body);
             } catch (e) {
                 console.error("Ошибка при преобразовании тела запроса в JSON:", e);
                 return Promise.reject(new Error("Invalid request body"));
             }
        }
    } else {

        delete fetchOptions.headers['Content-Type'];
    }

    return fetch(url, fetchOptions);
}