
import { writable } from 'svelte/store';

const Cookies = {
  get: (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  },
  set: (name, value, days = 30) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `; expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value}${expires}; path=/`;
  }
};
export function createPaginationStore(key, defaultPage = 1, defaultSize = 4) {
  const cookieKey = `pagination_${key}`;
  const storedPage = parseInt(Cookies.get(cookieKey), 4) || defaultPage;
  
  const { subscribe, set, update } = writable({
    page: storedPage,
    size: defaultSize
  });
  
  return {
    subscribe,
    setPage: (page) => {
      update(state => {
        Cookies.set(cookieKey, page);
        return { ...state, page };
      });
    },
    setPageSize: (size) => {
      update(state => ({ ...state, size }));
    },
    reset: () => {
      Cookies.set(cookieKey, defaultPage);
      set({ page: defaultPage, size: defaultSize });
    }
  };
}

export const courseLessonsPagination = createPaginationStore('paginator_lessons');