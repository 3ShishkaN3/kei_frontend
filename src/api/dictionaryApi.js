import { API_BASE_URL } from '../config';
import { apiFetch } from './api';

const dictsBaseUrl = `${API_BASE_URL}/dict`;
const coursesBaseUrl = `${API_BASE_URL}/courses`;

export async function fetchDictionarySectionDetails(sectionId) {
    const url = `${dictsBaseUrl}/${sectionId}/`;
    const response = await apiFetch(url);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error fetching dictionary section details: ${response.status}`);
    }
    return response.json();
}

export async function fetchDictionaryEntries(sectionId, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${dictsBaseUrl}/${sectionId}/entries/?${query}`;
    const response = await apiFetch(url);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error fetching dictionary entries: ${response.status}`);
    }
    return response.json();
}

export async function fetchDictionaryMetadata(sectionId) {
    const url = `${dictsBaseUrl}/${sectionId}/entries/meta/`;
    const response = await apiFetch(url);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error fetching dictionary metadata: ${response.status}`);
    }
    return response.json();
}

export async function markEntryAsLearned(sectionId, entryId) {
    const url = `${dictsBaseUrl}/${sectionId}/entries/${entryId}/mark_learned/`;
    const response = await apiFetch(url, { method: 'POST' });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error marking entry as learned: ${response.status}`);
    }
    return response.json();
}

export async function unmarkEntryAsLearned(sectionId, entryId) {
    const url = `${dictsBaseUrl}/${sectionId}/entries/${entryId}/unmark_learned/`;
    const response = await apiFetch(url, { method: 'POST' });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error unmarking entry: ${response.status}`);
    }
    if (response.status === 204) {
        return { status: 'unmarked' };
    }
    return response.json();
}

export async function createDictionaryEntry(sectionId, entryData) {
    const url = `${dictsBaseUrl}/${sectionId}/entries/`;
    const response = await apiFetch(url, {
        method: 'POST',
        body: entryData
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error creating dictionary entry: ${response.status}`);
    }
    return response.json();
}

export async function updateDictionaryEntry(sectionId, entryId, entryData) {
    const url = `${dictsBaseUrl}/${sectionId}/entries/${entryId}/`;
    const response = await apiFetch(url, {
        method: 'PATCH',
        body: entryData
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error updating dictionary entry: ${response.status}`);
    }
    return response.json();
}

export async function deleteDictionaryEntry(sectionId, entryId) {
    const url = `${dictsBaseUrl}/${sectionId}/entries/${entryId}/`;
    const response = await apiFetch(url, { method: 'DELETE' });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error deleting dictionary entry: ${response.status}`);
    }
}

export async function fetchAllDictionarySections() {
    const url = `${dictsBaseUrl}/`;
    const response = await apiFetch(url);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error fetching dictionary sections: ${response.status}`);
    }
    const data = await response.json();
    // Обрабатываем пагинацию, если есть
    if (data.results) {
        return data.results;
    }
    return Array.isArray(data) ? data : [];
}

export async function fetchPrimaryLessonDictionaryEntries(courseId, lessonId, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${coursesBaseUrl}/${courseId}/lessons/${lessonId}/primary_dictionary_entries/?${query}`;
    const response = await apiFetch(url);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error fetching lesson dictionary entries: ${response.status}`);
    }
    return response.json();
}

export async function fetchPrimaryLessonDictionaryMetadata(courseId, lessonId) {
    const url = `${coursesBaseUrl}/${courseId}/lessons/${lessonId}/primary_dictionary_entries/meta/`;
    const response = await apiFetch(url);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error fetching lesson dictionary metadata: ${response.status}`);
    }
    return response.json();
}