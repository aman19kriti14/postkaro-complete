import axios from "axios";
import { tokenStore } from "@/api/client";
import { env } from "@/config/env";
import type { User } from "@/types/auth";

const BASE = env.API_BASE_URL;

const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenStore.getAccess() ?? ""}`,
});

const unwrap = <T,>(body: any): T => (body && "data" in body && body.data !== undefined ? body.data : body);

export async function verifyOtp(email: string, code: string): Promise<User> {
    const { data } = await axios.post(`${BASE}/v1/auth/verify-otp`, { email, code }, { headers: headers() });
    return unwrap<User>(data);
}

export async function resendOtp(email: string): Promise<void> {
    await axios.post(`${BASE}/v1/auth/resend-otp`, { email }, { headers: headers() });
}
export async function forgotPassword(email: string): Promise<void> {
    await axios.post(`${BASE}/v1/auth/forgot-password`, { email }, { headers: headers() });
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await axios.post(`${BASE}/v1/auth/reset-password`, { email, code, newPassword }, { headers: headers() });
}