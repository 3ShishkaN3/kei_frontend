console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Base WebSocket URL for notifications
export const WS_NOTIFICATIONS_BASE_URL = import.meta.env?.VITE_WS_NOTIFICATIONS_BASE_URL || (
  API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace('http', 'ws')
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${API_BASE_URL}`
);

// Base WebSocket URL for AI conversations
export const WS_CONVERSATION_BASE_URL = import.meta.env?.VITE_WS_CONVERSATION_BASE_URL || (
  API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace('http', 'ws')
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${API_BASE_URL}`
);

// Legacy WS_BASE_URL for backward compatibility
export const WS_BASE_URL = WS_CONVERSATION_BASE_URL;
