import { apiFetch } from './api.js';
import { API_BASE_URL } from '../config.js';

const BASE = `${API_BASE_URL}/auth`;

/**
 * Получить список всех активных учеников
 * @param {Object} params - Параметры запроса (is_active, search, ordering, page, page_size)
 * @returns {Promise<Array>} Массив учеников
 */
export async function fetchStudents(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.is_active !== undefined && params.is_active !== null) {
    queryParams.append('is_active', String(params.is_active));
  }
  if (params.search) queryParams.append('search', params.search);
  if (params.ordering) queryParams.append('ordering', params.ordering);
  if (params.page) queryParams.append('page', String(params.page));
  if (params.page_size) queryParams.append('page_size', String(params.page_size));
  
  const queryString = queryParams.toString();
  const url = `${BASE}/students/${queryString ? `?${queryString}` : ''}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch students');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.results || []);
}

/**
 * Получить список всех пользователей (для админов)
 * @param {Object} params - Параметры запроса (role, is_active, search, page, page_size)
 * @returns {Promise<Object>} Объект с пагинацией {results: [], count: number, next: string|null, previous: string|null}
 */
export async function fetchUsers(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.role) {
    queryParams.append('role', params.role);
  }
  
  if ('is_active' in params && params.is_active !== undefined && params.is_active !== null) {
    queryParams.append('is_active', String(params.is_active));
  }
  
  if (params.search) {
    queryParams.append('search', params.search);
  }
  if (params.page !== undefined) {
    queryParams.append('page', String(params.page));
  }
  if (params.page_size !== undefined) {
    queryParams.append('page_size', String(params.page_size));
  }
  
  const queryString = queryParams.toString();
  const url = `${BASE}/users/${queryString ? `?${queryString}` : ''}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch users');
  const data = await res.json();
  if (Array.isArray(data)) {
    return { results: data, count: data.length, next: null, previous: null };
  }
  return data;
}

/**
 * Получить информацию о пользователе по ID
 * @param {number} userId - ID пользователя
 * @returns {Promise<Object>} Объект пользователя
 */
export async function fetchUser(userId) {
  const res = await apiFetch(`${BASE}/users/${userId}/`);
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

/**
 * Создать пользователя (только для админов)
 * @param {Object} userData - Данные пользователя (username, email, password, role, is_active)
 * @returns {Promise<Object>} Созданный пользователь
 */
export async function createUser(userData) {
  const res = await apiFetch(`${BASE}/users/`, {
    method: 'POST',
    body: userData
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create user');
  }
  return res.json();
}

/**
 * Обновить пользователя (только для админов)
 * @param {number} userId - ID пользователя
 * @param {Object} userData - Данные для обновления
 * @returns {Promise<Object>} Обновленный пользователь
 */
export async function updateUser(userId, userData) {
  const res = await apiFetch(`${BASE}/users/${userId}/`, {
    method: 'PATCH',
    body: userData
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to update user');
  }
  return res.json();
}

/**
 * Удалить пользователя (только для админов)
 * @param {number} userId - ID пользователя
 * @returns {Promise<void>}
 */
export async function deleteUser(userId) {
  const res = await apiFetch(`${BASE}/users/${userId}/`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to delete user');
  }
}

/**
 * Изменить роль пользователя
 * @param {number} userId - ID пользователя
 * @param {string} role - Новая роль (admin, teacher, assistant, student)
 * @param {boolean} isActive - Статус активности
 * @returns {Promise<Object>} Обновленный пользователь
 */
export async function updateUserRole(userId, role, isActive = null) {
  const body = { role };
  if (isActive !== null) body.is_active = isActive;
  
  const res = await apiFetch(`${BASE}/user/${userId}/role/`, {
    method: 'PATCH',
    body
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to update user role');
  }
  return res.json();
}

/**
 * Массовые операции с пользователями (только для админов)
 * @param {Array<number>} userIds - Массив ID пользователей
 * @param {string} action - Действие: 'activate', 'deactivate', 'delete'
 * @returns {Promise<Object>} Результат операции
 */
export async function bulkUserOperation(userIds, action) {
  const res = await apiFetch(`${BASE}/users/bulk_operation/`, {
    method: 'POST',
    body: { user_ids: userIds, action }
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to perform bulk operation');
  }
  return res.json();
}
