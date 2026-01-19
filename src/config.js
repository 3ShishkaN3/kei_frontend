export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const WS_BASE_URL = API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace('http', 'ws')
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${API_BASE_URL}`;
