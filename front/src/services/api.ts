import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- REQUEST INTERCEPTOR ---
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- RESPONSE INTERCEPTOR (Refresh Token Logic) ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          // Token yeniləmə sorğusu
          const { data } = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken,
          });
          
          // Yeni tokenləri store-a yazırıq
          useAuthStore.getState().setTokens(data.access, data.refresh || refreshToken);
          
          // Köhnə sorğunu yeni tokenlə təkrar göndəririk
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh token də keçərsizdirsə, logout edirik
          useAuthStore.getState().logout();
          window.location.href = "/login";
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

/**
 * --- EVENT REVIEWS API CALLS ---
 */

// Yeni rəy göndərmək üçün
export const postReview = async (eventId: number, rating: number, comment: string = "") => {
  const { data } = await api.post("/reviews/", {
    event: eventId,
    rating: rating,
    comment: comment,
  });
  return data;
};

// Bir event-in bütün rəylərini gətirmək üçün
export const getEventReviews = async (eventId: number) => {
  const { data } = await api.get(`/reviews/?event_id=${eventId}`);
  return data;
};

// Event siyahısını çəkmək üçün (Mövcud metodun varsa yenilə)
export const getEvents = async (params?: any) => {
  const { data } = await api.get("/events/", { params });
  return data;
};

export default api;