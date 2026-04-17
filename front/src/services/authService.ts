import api from "./api";

export const authService = {
  register: (data: { username: string; email: string; phone: string; password: string }) =>
    api.post("/register/", data),

  verifyOtp: (data: { email: string; otp: string }) =>
    api.post("/verify-otp/", data),

  login: (data: { username: string; password: string }) =>
    api.post("/login/", data),

  forgotPassword: (data: { email: string }) =>
    api.post("/forgot-password/", data),

  resetPassword: (data: { email: string; otp: string; new_password: string }) =>
    api.post("/reset-password/", data),

  logout: (data: { refresh: string }) =>
    api.post("/logout/", data),

  getRoles: () => api.get("/roles/"),

  getProfile: () => api.get("/profile/"),
};
