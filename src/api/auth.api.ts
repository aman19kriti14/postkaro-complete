import api from "./client";
import type { ApiResponse } from "@/types/api";
import type { AuthResponse, SignupRequest, SigninRequest, User } from "@/types/auth";

const AUTH_BASE = "/v1/auth";

export const authApi = {
  signup(data: SignupRequest) {
    return api.post<ApiResponse<AuthResponse>>(`${AUTH_BASE}/signup`, data);
  },
  signin(data: SigninRequest) {
    return api.post<ApiResponse<AuthResponse>>(`${AUTH_BASE}/signin`, data);
  },
  signout() {
    return api.post<ApiResponse<null>>(`${AUTH_BASE}/signout`);
  },
  me() {
    return api.get<ApiResponse<User>>(`${AUTH_BASE}/me`);
  },
};
