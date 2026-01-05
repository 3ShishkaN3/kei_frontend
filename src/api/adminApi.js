import { apiFetch } from './api.js';
import { API_BASE_URL } from '../config.js';

const BASE = `${API_BASE_URL}`;

/**
 * Получить статистику по ученику (записи на курсы)
 * @param {number} studentId - ID ученика
 * @returns {Promise<Object>} Статистика ученика
 */
export async function getStudentStatistics(studentId) {
  const res = await apiFetch(`${BASE}/courses/student_statistics/?student_id=${studentId}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to fetch student statistics');
  }
  return res.json();
}

/**
 * Получить полную сводку по ученику
 * @param {number} userId - ID ученика
 * @returns {Promise<Object>} Полная сводка по ученику
 */
export async function getStudentFullSummary(userId) {
  const res = await apiFetch(`${BASE}/progress/users/student_full_summary/?user_id=${userId}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to fetch student summary');
  }
  return res.json();
}

/**
 * Получить профиль пользователя (для админов/преподавателей)
 * @param {number} userId - ID пользователя
 * @returns {Promise<Object>} Профиль пользователя
 */
export async function getUserProfile(userId) {
  const res = await apiFetch(`${BASE}/profile/${userId}/`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to fetch user profile');
  }
  return res.json();
}

/**
 * Обновить профиль пользователя (только для админов)
 * @param {number} userId - ID пользователя
 * @param {Object} profileData - Данные профиля
 * @returns {Promise<Object>} Обновленный профиль
 */
export async function updateUserProfile(userId, profileData) {
  const res = await apiFetch(`${BASE}/profile/${userId}/`, {
    method: 'PUT',
    body: profileData
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to update user profile');
  }
  return res.json();
}

/**
 * Массовая запись учеников на курс
 * @param {number} courseId - ID курса
 * @param {Array<number>} studentIds - Массив ID учеников
 * @returns {Promise<Object>} Результат операции
 */
export async function bulkEnrollStudents(courseId, studentIds) {
  const res = await apiFetch(`${BASE}/courses/${courseId}/bulk_enroll/`, {
    method: 'POST',
    body: { student_ids: studentIds }
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to enroll students');
  }
  return res.json();
}

/**
 * Массовое отчисление учеников с курса
 * @param {number} courseId - ID курса
 * @param {Array<number>} studentIds - Массив ID учеников
 * @returns {Promise<Object>} Результат операции
 */
export async function bulkLeaveStudents(courseId, studentIds) {
  const res = await apiFetch(`${BASE}/courses/${courseId}/bulk_leave/`, {
    method: 'POST',
    body: { student_ids: studentIds }
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to leave students');
  }
  return res.json();
}

/**
 * Получить список курсов
 * @param {Object} params - Параметры запроса (status может быть строкой или массивом)
 * @returns {Promise<Array>} Список курсов
 */
export async function fetchCourses(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) {
    const statusValue = Array.isArray(params.status) ? params.status[0] : params.status;
    queryParams.append('status', statusValue);
  }
  if (params.search) queryParams.append('search', params.search);
  if (params.ordering) queryParams.append('ordering', params.ordering);
  
  const queryString = queryParams.toString();
  const url = `${BASE}/courses/${queryString ? `?${queryString}` : ''}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch courses');
  const data = await res.json();
  // Поддержка как пагинации, так и обычного массива
  return Array.isArray(data) ? data : (data.results || []);
}

/**
 * Получить записи на курсы
 * @param {Object} params - Параметры запроса (course_id, status, student_id, search)
 * @returns {Promise<Array>} Список записей
 */
export async function fetchEnrollments(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.course_id) queryParams.append('course_id', params.course_id);
  if (params.status) queryParams.append('status', params.status);
  if (params.student_id) queryParams.append('student_id', params.student_id);
  if (params.search) queryParams.append('search', params.search);
  
  const queryString = queryParams.toString();
  const url = `${BASE}/courses/enrollments/${queryString ? `?${queryString}` : ''}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch enrollments');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.results || []);
}

/**
 * Получить помощников курса
 * @param {number} courseId - ID курса
 * @returns {Promise<Array>} Список помощников
 */
export async function fetchCourseAssistants(courseId) {
  const res = await apiFetch(`${BASE}/courses/${courseId}/assistants/`);
  if (!res.ok) throw new Error('Failed to fetch course assistants');
  return res.json();
}

/**
 * Добавить помощника на курс
 * @param {number} courseId - ID курса
 * @param {number} assistantId - ID помощника
 * @returns {Promise<Object>} Созданная запись
 */
export async function addCourseAssistant(courseId, assistantId) {
  const res = await apiFetch(`${BASE}/courses/${courseId}/assistants/`, {
    method: 'POST',
    body: { assistant: assistantId }
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to add assistant');
  }
  return res.json();
}

/**
 * Удалить помощника с курса
 * @param {number} courseId - ID курса
 * @param {number} assistantId - ID помощника
 * @returns {Promise<void>}
 */
export async function removeCourseAssistant(courseId, assistantId) {
  const res = await apiFetch(`${BASE}/courses/${courseId}/assistants/${assistantId}/`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to remove assistant');
  }
}

