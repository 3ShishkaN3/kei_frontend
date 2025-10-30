import { apiFetch } from './api.js';
import { API_BASE_URL } from '../config.js';

const BASE = `${API_BASE_URL}/calendar`;

export async function fetchEvents(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await apiFetch(`${BASE}/events/${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch events');
  const data = await res.json();
  return data.results || data;
}

export async function createEvent(body) {
  const res = await apiFetch(`${BASE}/events/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Failed to create event');
  return res.json();
}

export async function updateEvent(id, body) {
  const res = await apiFetch(`${BASE}/events/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Failed to update event');
  return res.json();
}

export async function deleteEvent(id) {
  const res = await apiFetch(`${BASE}/events/${id}/`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete event');
}

export async function fetchNotes(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await apiFetch(`${BASE}/notes/${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  const data = await res.json();
  return data.results || data;
}

export async function upsertNote(body) {
  // naive create; edit flows will pass id
  if (body.id) {
    const res = await apiFetch(`${BASE}/notes/${body.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Failed to update note');
    return res.json();
  }
  const res = await apiFetch(`${BASE}/notes/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Failed to create note');
  return res.json();
}

export async function deleteNote(id) {
  const res = await apiFetch(`${BASE}/notes/${id}/`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete note');
}


