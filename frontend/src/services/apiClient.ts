import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

interface FailedRequest {
    resolve: (token: string | null) => void;
    reject: (error: Error | null) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

// --- Multi-tab Synchronization ---
const refreshChannel = typeof window !== 'undefined' ? new BroadcastChannel('auth_refresh') : null;

if (refreshChannel) {
    refreshChannel.onmessage = (event) => {
        const { type, token, error } = event.data;
        if (type === 'REFRESH_SUCCESS') {
            isRefreshing = false;
            processQueue(null, token);
        } else if (type === 'REFRESH_ERROR') {
            isRefreshing = false;
            processQueue(new Error(error), null);
            handleLogout();
        } else if (type === 'REFRESH_STARTED') {
            isRefreshing = true;
        }
    };
}

apiClient.interceptors.request.use(
    (config) => {
        const token = Cookies.get('access_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Nếu lỗi 401 và chưa thử lại
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;
            refreshChannel?.postMessage({ type: 'REFRESH_STARTED' });

            const user = typeof window !== 'undefined' ? sessionStorage.getItem('user') : null;
            if (!user) {
                isRefreshing = false;
                handleLogout();
                return Promise.reject(error);
            }

            try {
                const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
                    withCredentials: true,
                });

                const { access_token } = response.data;

                Cookies.set('access_token', access_token, { path: '/' });

                apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`;
                
                // Notify other tabs
                refreshChannel?.postMessage({ type: 'REFRESH_SUCCESS', token: access_token });
                
                processQueue(null, access_token);
                
                return apiClient(originalRequest);
            } catch (refreshError) {
                const normalizedError = refreshError instanceof Error ? refreshError : new Error(String(refreshError));
                refreshChannel?.postMessage({ type: 'REFRESH_ERROR', error: normalizedError.message });
                
                processQueue(normalizedError, null);
                handleLogout();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

function handleLogout() {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    sessionStorage.removeItem('user');
    
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        // Sử dụng href để đảm bảo xóa sạch state khi bị logout cưỡng bức
        window.location.href = '/login';
    }
}

export default apiClient;
